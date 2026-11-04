import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ServiceError } from '../interfaces';
import type { AuditLog, TestCase, TestCaseVersion, TestRunCase, TestSection } from '../types';
import { mockServices as s } from '.';
import { getMockDb, setMockDb, writeSessionUserId } from './core';
import { buildFixtures, IDS } from './fixtures';
import { MockDb } from './mockdb';

const U = IDS.users;
const as = async (id: string) => { await s.auth.signInAs(id); };
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return e instanceof ServiceError ? e.code : 'other'; } };
const db = () => getMockDb();
const auditTotal = async () => (await s.audit.list({ projectId: IDS.projectCore, pageSize: 1 })).total;
const auditRows = (action: string, entity?: string) => db().list<AuditLog>('audit_logs', (a) => a.action === action && (entity === undefined || a.entity_id === entity));
const untested = async (runId: string, n = 1) => (await s.tests.list({ runId, status: ['untested'] })).items.slice(0, n).map((i) => i.test.id);
async function newCase(title = 'Fresh case', section = 'sec_login') {
  return (await s.cases.create({ project: IDS.projectCore, suite: IDS.suites.web, section, title, steps: [{ description: 'Do it' }], tag_ids: [] })).case;
}

beforeEach(() => {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(U.avery);
});

describe('finding 1: batch operations check every test and one run', () => {
  it('rejects mixed-run batches in addMany, assign and removeTests, and checks every run is open', async () => {
    await as(U.dana);
    const [webTest] = await untested(IDS.runs.web);
    const [apiTest] = await untested(IDS.runs.api);
    const closedTest = (await s.tests.list({ runId: IDS.runs.r23 })).items[0]!.test.id;
    expect(await code(s.results.addMany([webTest!, apiTest!], IDS.status.passed))).toBe('validation');
    expect(await code(s.tests.assign([webTest!, apiTest!], U.sam))).toBe('validation');
    expect(await code(s.runs.removeTests(IDS.runs.web, [webTest!, apiTest!]))).toBe('validation');
    // the open first id used to hide a closed run behind it
    expect(await code(s.results.addMany([webTest!, closedTest], IDS.status.passed))).toBe('validation');
    expect(await code(s.results.addMany([closedTest], IDS.status.passed))).toBe('closed');
    expect((await s.tests.get(webTest!)).item.status_key).toBe('untested');
    expect(await s.results.addMany([webTest!], IDS.status.passed)).toBe(1);
  });
});

describe('finding 2: undo keeps the audit trail and is gated', () => {
  it('writes result.undo, keeps result.create, and refuses a demoted or archived author', async () => {
    await as(U.dana);
    const [t1, t2] = await untested(IDS.runs.web, 2);
    const r1 = await s.results.add({ testId: t1!, statusId: IDS.status.passed });
    const r2 = await s.results.add({ testId: t2!, statusId: IDS.status.passed });
    await s.results.undo(r1.id);
    expect(auditRows('result.create', r1.id)).toHaveLength(1);
    expect(auditRows('result.undo', r1.id)).toHaveLength(1);
    expect((await s.tests.get(t1!)).item.status_key).toBe('untested');

    await as(U.avery);
    const dana = (await s.members.list(IDS.projectCore)).find((m) => m.user.id === U.dana)!;
    await s.members.setRole(IDS.projectCore, dana.member.id, 'viewer');
    await as(U.dana);
    expect(await code(s.results.undo(r2.id))).toBe('forbidden');
    await as(U.avery);
    await s.members.setRole(IDS.projectCore, dana.member.id, 'tester');
    await s.projects.setArchived(IDS.projectCore, true);
    await as(U.dana);
    expect(await code(s.results.undo(r2.id))).toBe('archived');
  });
});

describe('finding 3: deleting a section or suite never strands results (option: refuse)', () => {
  it('refuses when cases have results, naming the count', async () => {
    await as(U.dana);
    const withResults = (await s.cases.get('c_1')).case;
    const before = db().count<TestCase>('test_cases');
    let msg = '';
    try { await s.suites.removeSection(withResults.section); } catch (e) { msg = (e as ServiceError).message; expect((e as ServiceError).code).toBe('conflict'); }
    expect(msg).toMatch(/\d+ cases? with results/);
    expect(db().count<TestCase>('test_cases')).toBe(before);
    await as(U.avery);
    expect(await code(s.suites.removeSuite(withResults.suite))).toBe('conflict');
  });

  it('deletes a result-free section, clears its tests from open runs and writes an audit row', async () => {
    await as(U.dana);
    const sec = await s.suites.createSection(IDS.suites.web, 'Temp section');
    const c = await newCase('Temp case', sec.id);
    await s.runs.addCases(IDS.runs.web, [c.id]);
    expect(db().count<TestRunCase>('test_run_cases', (t) => t.case === c.id)).toBe(1);
    await s.suites.removeSection(sec.id);
    expect(db().count<TestRunCase>('test_run_cases', (t) => t.case === c.id)).toBe(0);
    expect(db().get('test_cases', c.id)).toBeUndefined();
    expect(auditRows('section.delete', sec.id)).toHaveLength(1);
  });

  it('refuses a section whose case sits in a closed run even without results', async () => {
    await as(U.avery);
    const sec = await s.suites.createSection(IDS.suites.web, 'Closed holder');
    const c = await newCase('In a closed run', sec.id);
    const run = await s.runs.create({ project: IDS.projectCore, suite: IDS.suites.web, name: 'Tiny', include_all: false, case_ids: [c.id], assigned_to: U.avery });
    await s.runs.close(run.id);
    expect(await code(s.suites.removeSection(sec.id))).toBe('conflict');
  });
});

describe('finding 4 and 7: case remove and bulk update', () => {
  it('checks every id\'s project and deprecates cases that sit in a closed run', async () => {
    await as(U.sam); // tester in core, viewer in mobile
    const mine = await newCase('Mine');
    const mobCase = db().list<TestCase>('test_cases', (c) => c.project === IDS.projectMob)[0]!;
    expect(await code(s.cases.remove([mine.id, mobCase.id]))).toBe('forbidden');
    expect(db().get('test_cases', mobCase.id)).toBeDefined();
    expect(db().get('test_cases', mine.id)).toBeDefined();

    await as(U.avery);
    const run = await s.runs.create({ project: IDS.projectCore, suite: IDS.suites.web, name: 'Holder', include_all: false, case_ids: [mine.id] });
    await s.runs.close(run.id);
    expect(await s.cases.remove([mine.id])).toEqual({ deleted: 0, deprecated: 1 });
    expect((await s.cases.get(mine.id)).case.deprecated).toBe(true);
  });

  it('bulk deprecate leaves open runs, adds a version and an audit row per case, and checks the section\'s project', async () => {
    await as(U.dana);
    const a = await newCase('Bulk A');
    const b = await newCase('Bulk B');
    await s.runs.addCases(IDS.runs.web, [a.id, b.id]);
    const auditBefore = db().count<AuditLog>('audit_logs', (x) => x.action === 'case.update');
    expect(await s.cases.bulkUpdate([a.id, b.id], { deprecated: true, deprecated_reason: 'old' })).toBe(2);
    expect(db().count<TestRunCase>('test_run_cases', (t) => t.case === a.id || t.case === b.id)).toBe(0);
    for (const c of [a, b]) {
      expect(db().list<TestCaseVersion>('test_case_versions', (v) => v.case === c.id).map((v) => v.version).sort()).toEqual([1, 2]);
      expect((await s.cases.get(c.id)).case.version).toBe(2);
    }
    expect(db().count<AuditLog>('audit_logs', (x) => x.action === 'case.update')).toBe(auditBefore + 2);

    const foreign = db().list<TestSection>('test_sections', (x) => x.project === IDS.projectMob)[0]!;
    expect(await code(s.cases.bulkUpdate([a.id], { section: foreign.id }))).toBe('validation');
  });
});

describe('finding 5: pass rate is passed over executed', () => {
  it('excludes untested tests from the pass rate and keeps completion separate', async () => {
    const p = (await s.runs.get(IDS.runs.web)).progress;
    const executed = p.total - p.counts.untested;
    expect(p.counts.untested).toBeGreaterThan(0);
    expect(p.pass_pct).toBe(Math.round((p.counts.passed / executed) * 100));
    expect(p.pass_pct).not.toBe(Math.round((p.counts.passed / p.total) * 100));
    expect(p.done_pct).toBe(Math.round((executed / p.total) * 100));
  });
});

describe('finding 6: results of closed runs are immutable for admins too', () => {
  it('refuses to delete a result of a closed run, allows it while open', async () => {
    const closed = (await s.tests.list({ runId: IDS.runs.r23 })).items.find((i) => i.last_result_id)!;
    expect(await code(s.results.remove(closed.last_result_id!))).toBe('closed');
    const [t] = await untested(IDS.runs.web);
    const r = await s.results.add({ testId: t!, statusId: IDS.status.passed });
    expect(await code(s.results.remove(r.id))).toBe('ok');
  });
});

describe('finding 8 and 9: TestRail import wired in, idempotent, malformed input is a validation error', () => {
  const fx = (n: string) => readFileSync(join(__dirname, '../../lib/import/__fixtures__', n), 'utf8');
  const opts = { mapPriorities: true, skipDuplicates: false };

  it('imports TestRail XML and CSV with source keys and creates 0 duplicates on re-import', async () => {
    await as(U.raj);
    const count = () => db().count<TestCase>('test_cases', (c) => c.project === IDS.projectCore);
    const start = count();
    const first = await s.settings.runImport(IDS.projectCore, { name: 'a.xml', text: fx('account-portal.xml') }, opts);
    expect(first.imported).toBeGreaterThan(0);
    expect(count()).toBe(start + first.imported);
    expect(db().list<TestCase>('test_cases', (c) => c.project === IDS.projectCore && !!c.source_key).length).toBe(first.imported);
    const again = await s.settings.runImport(IDS.projectCore, { name: 'a.xml', text: fx('account-portal.xml') }, opts);
    expect(again.imported).toBe(0);
    expect(again.skipped).toBe(first.imported);
    expect(count()).toBe(start + first.imported);
    // the CSV export of the same suite carries the same TestRail ids
    const viaCsv = await s.settings.runImport(IDS.projectCore, { name: 'a.csv', text: fx('account-portal.csv') }, opts);
    expect(viaCsv.imported).toBe(0);
    const preview = await s.settings.previewImport(IDS.projectCore, { name: 'a.xml', text: fx('account-portal.xml') });
    expect(preview).toMatchObject({ format: 'testrail-xml', duplicates: first.imported });
  });

  it('still imports the JSON format', async () => {
    await as(U.raj);
    const text = JSON.stringify({ suites: [{ name: 'J', sections: [{ name: 'S', cases: [{ title: 'One', priority: 'Critical' }, { title: 'Two' }] }] }] });
    expect(await s.settings.runImport(IDS.projectCore, { name: 'a.json', text }, opts)).toMatchObject({ imported: 2, skipped: 0 });
  });

  it('answers malformed JSON shapes with a validation error, never a TypeError', async () => {
    await as(U.raj);
    for (const text of ['null', '[]', '{"suites":[null]}', '{"suites":[{"name":"x"}]}', '{"suites":[{"sections":[{"name":"a"}]}]}', '{"suites":[{"sections":[{"cases":[null]}]}]}', '{"suites":[{"sections":[{"cases":[{"title":5}]}]}]}']) {
      expect(await code(s.settings.previewImport(IDS.projectCore, { name: 'x.json', text }))).toBe('validation');
      expect(await code(s.settings.runImport(IDS.projectCore, { name: 'x.json', text }, opts))).toBe('validation');
    }
  });
});

describe('finding 10: every mutation writes exactly one audit row per entity changed', () => {
  it('counts audit rows for each mutation', async () => {
    await as(U.avery);
    const P = IDS.projectCore;
    const [t1, t2] = await untested(IDS.runs.web, 2);
    const res = await s.results.add({ testId: t1!, statusId: IDS.status.passed });
    const extra = await newCase('Audit extra');
    const ctx: { att?: string; tag?: string; sec?: string; ms?: string; plan?: string; map?: string; test?: string } = {};
    const steps: Array<[string, () => Promise<unknown>, number]> = [
      ['results.update', () => s.results.update(res.id, { comment: 'edited' }), 1],
      ['results.addAttachment', async () => { ctx.att = (await s.results.addAttachment(res.id, { name: 'a.png', size: 10, type: 'image/png' })).id; }, 1],
      ['results.removeAttachment', () => s.results.removeAttachment(ctx.att!), 1],
      ['lookups.createTag', async () => { ctx.tag = (await s.lookups.createTag(P, 'audit-tag')).id; }, 1],
      ['lookups.updateTag', () => s.lookups.updateTag(ctx.tag!, { name: 'audit-tag-2' }), 1],
      ['lookups.removeTag', () => s.lookups.removeTag(ctx.tag!), 1],
      ['suites.updateSuite', () => s.suites.updateSuite(IDS.suites.web, { description: 'edited' }), 1],
      ['suites.createSection', async () => { ctx.sec = (await s.suites.createSection(IDS.suites.web, 'Audit section')).id; }, 1],
      ['suites.renameSection', () => s.suites.renameSection(ctx.sec!, 'Audit section 2'), 1],
      ['milestones.create', async () => { ctx.ms = (await s.milestones.create({ project: P, title: 'Audit ms' })).id; }, 1],
      ['milestones.update', () => s.milestones.update(ctx.ms!, { description: 'x' }), 1],
      ['milestones.complete', () => s.milestones.complete(ctx.ms!), 1],
      ['plans.create', async () => { ctx.plan = (await s.plans.create({ project: P, name: 'Audit plan' })).id; }, 1],
      ['plans.update', () => s.plans.update(ctx.plan!, { description: 'x' }), 1],
      ['plans.complete', () => s.plans.complete(ctx.plan!), 1],
      ['runs.update', () => s.runs.update(IDS.runs.web, { build: 'audit-build' }), 1],
      ['tests.assign (two tests)', () => s.tests.assign([t1!, t2!], U.alex), 2],
      ['automation.saveMapping (create)', async () => { ctx.map = (await s.automation.saveMapping(P, null, { framework: 'junit', field_map: {}, is_active: true })).id; }, 1],
      ['automation.saveMapping (update)', () => s.automation.saveMapping(P, ctx.map!, { framework: 'junit', field_map: {}, is_active: false }), 1],
      ['runs.addCases', () => s.runs.addCases(IDS.runs.web, [extra.id]), 1],
      ['runs.removeTests', async () => { ctx.test = db().find<TestRunCase>('test_run_cases', (t) => t.run === IDS.runs.web && t.case === extra.id)!.id; await s.runs.removeTests(IDS.runs.web, [ctx.test]); }, 1],
    ];
    for (const [name, fn, expected] of steps) {
      const before = await auditTotal();
      await fn();
      expect(await auditTotal() - before, name).toBe(expected);
    }
  });
});

describe('finding 11: restore refreshes open-run snapshots like update', () => {
  it('refreshes a result-free snapshot and keeps a frozen one', async () => {
    await as(U.dana);
    const c = await newCase('Original title');
    await s.runs.addCases(IDS.runs.web, [c.id]);
    const test = () => db().find<TestRunCase>('test_run_cases', (t) => t.run === IDS.runs.web && t.case === c.id)!;
    const title = () => (test().case_snapshot.case as { title?: string }).title;
    await s.cases.update(c.id, { title: 'Changed' }, { expectedVersion: 1 });
    expect(title()).toBe('Changed');
    await s.cases.restore(c.id, 1);
    expect(title()).toBe('Original title');
    expect(test().version).toBe(3);

    await s.results.add({ testId: test().id, statusId: IDS.status.passed });
    await s.cases.update(c.id, { title: 'Later' }, { expectedVersion: 3 });
    await s.cases.restore(c.id, 1);
    expect(title()).toBe('Original title'); // frozen at the version the result was recorded on
    expect(test().version).toBe(3);
  });
});

describe('finding 15: patch inputs are whitelisted at runtime', () => {
  it('ignores fields outside the allowed set', async () => {
    await as(U.avery);
    const evil = { is_closed: true, project: IDS.projectMob, id: 'x', suite: 'nope' } as never;
    await s.runs.update(IDS.runs.web, { name: 'Renamed', ...(evil as object) });
    const run = (await s.runs.get(IDS.runs.web)).run;
    expect([run.name, run.is_closed, run.project]).toEqual(['Renamed', false, IDS.projectCore]);
    const ms = await s.milestones.update(IDS.milestones.r24, { title: 'M', ...(evil as object) });
    expect([ms.title, ms.project, ms.is_completed]).toEqual(['M', IDS.projectCore, false]);
    const plan = await s.plans.update(IDS.plan, { name: 'P', ...(evil as object) });
    expect([plan.name, plan.project, plan.is_completed]).toEqual(['P', IDS.projectCore, false]);
    const suite = await s.suites.updateSuite(IDS.suites.web, { name: 'S', ...(evil as object) });
    expect([suite.name, suite.project]).toEqual(['S', IDS.projectCore]);
    const c = (await s.cases.get('c_1')).case;
    const next = await s.cases.update('c_1', { title: 'T', ...(evil as object) }, { expectedVersion: c.version });
    expect([next.case.title, next.case.project, next.case.suite]).toEqual(['T', IDS.projectCore, c.suite]);
  });
});

describe('D26: who may close a run', () => {
  it('lets the assignee, a manager and an admin close; refuses a tester who is not the assignee', async () => {
    await as(U.sam); // tester, but run_web is assigned to dana
    expect(await code(s.runs.close(IDS.runs.web))).toBe('forbidden');
    expect((await s.runs.get(IDS.runs.web)).run.is_closed).toBe(false);
    await as(U.dana);
    expect(await code(s.runs.close(IDS.runs.web))).toBe('ok');
    await as(U.raj);
    expect(await code(s.runs.close(IDS.runs.api))).toBe('ok');
    await as(U.avery);
    const run = await s.runs.create({ project: IDS.projectCore, suite: IDS.suites.web, name: 'Admin closes', include_all: true });
    expect(await code(s.runs.close(run.id))).toBe('ok');
  });
});
