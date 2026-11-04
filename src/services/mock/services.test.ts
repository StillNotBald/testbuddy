import { beforeEach, describe, expect, it } from 'vitest';
import { ServiceError } from '../interfaces';
import { mockServices as s } from '.';
import { setMockDb, writeSessionUserId } from './core';
import { buildFixtures, IDS } from './fixtures';
import { MockDb, type StorageLike } from './mockdb';

const mem = (): StorageLike => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }; };
const U = IDS.users;
const as = async (id: string) => { await s.auth.signInAs(id); };
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return e instanceof ServiceError ? e.code : 'other'; } };
const firstUntested = async () => (await s.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items[0]!;

beforeEach(() => {
  setMockDb(new MockDb({ storage: mem(), seed: buildFixtures }));
  writeSessionUserId(null);
});

describe('mock auth and access', () => {
  it('rejects inactive users and bad passwords, and needs a session', async () => {
    expect(await code(s.auth.signInAs(U.inactive))).toBe('forbidden');
    expect(await code(s.auth.signInWithPassword('avery@example.test', 'nope'))).toBe('validation');
    expect(await code(s.projects.list({ workspaceId: IDS.workspace }))).toBe('unauthenticated');
    await s.auth.signInWithPassword('avery@example.test', 'demo-only');
    expect((await s.projects.list({ workspaceId: IDS.workspace })).length).toBe(2);
  });

  it('keeps non-members out of a project', async () => {
    await as(U.alex);
    expect(await s.projects.myRole(IDS.projectCore)).toBeNull();
    expect(await code(s.runs.list({ projectId: IDS.projectCore }))).toBe('forbidden');
    expect((await s.projects.list({ workspaceId: IDS.workspace })).map((p) => p.project.id)).toEqual([IDS.projectMob]);
  });

  it('enforces the role matrix', async () => {
    await as(U.mia); // viewer
    expect(await code(s.milestones.create({ project: IDS.projectCore, title: 'X' }))).toBe('forbidden');
    expect(await code(s.members.list(IDS.projectCore))).toBe('forbidden');
    await as(U.dana); // tester
    expect(await code(s.milestones.create({ project: IDS.projectCore, title: 'X' }))).toBe('forbidden');
    expect(await code(s.audit.list({ projectId: IDS.projectCore }))).toBe('forbidden');
    await as(U.raj); // manager
    expect(await code(s.audit.list({ projectId: IDS.projectCore }))).toBe('forbidden');
    expect(await code(s.milestones.create({ project: IDS.projectCore, title: 'Release 2.5' }))).toBe('ok');
    await as(U.avery); // admin
    expect((await s.audit.list({ projectId: IDS.projectCore })).total).toBe(61); // 60 seeded + the milestone raj created (BR-11)
    expect(await code(s.automation.createToken(IDS.projectCore, 'tmp', IDS.mappings.junit))).toBe('ok');
  });
});

describe('results', () => {
  it('add_result updates the test status, run progress and audit trail', async () => {
    await as(U.dana);
    const t = await firstUntested();
    const before = (await s.runs.get(IDS.runs.web)).progress.counts;
    await s.results.add({ testId: t.test.id, statusId: IDS.status.passed, elapsed: 30 });
    const after = await s.tests.get(t.test.id);
    expect(after.item.status_key).toBe('passed');
    expect(after.results).toHaveLength(1);
    const counts = (await s.runs.get(IDS.runs.web)).progress.counts;
    expect([counts.passed, counts.untested]).toEqual([before.passed + 1, before.untested - 1]);
  });

  it('blocks viewers, requires comments on Failed, and refuses Untested', async () => {
    await as(U.mia);
    const t = await firstUntested();
    expect(await code(s.results.add({ testId: t.test.id, statusId: IDS.status.passed }))).toBe('forbidden');
    await as(U.dana);
    expect(await code(s.results.add({ testId: t.test.id, statusId: IDS.status.failed }))).toBe('validation');
    expect(await code(s.results.add({ testId: t.test.id, statusId: IDS.status.untested }))).toBe('validation');
    expect(await code(s.results.add({ testId: t.test.id, statusId: IDS.status.failed, comment: 'Broken' }))).toBe('ok');
  });

  it('undo restores the previous status; only admin can delete a result', async () => {
    await as(U.dana);
    const t = await firstUntested();
    const r = await s.results.add({ testId: t.test.id, statusId: IDS.status.passed });
    await as(U.sam);
    expect(await code(s.results.undo(r.id))).toBe('forbidden');
    await as(U.dana);
    await s.results.undo(r.id);
    expect((await s.tests.get(t.test.id)).item.status_key).toBe('untested');
    const r2 = await s.results.add({ testId: t.test.id, statusId: IDS.status.passed });
    expect(await code(s.results.remove(r2.id))).toBe('forbidden');
    await as(U.avery);
    await s.results.remove(r2.id);
    expect((await s.tests.get(t.test.id)).item.status_key).toBe('untested');
  });

  it('closing a run is irreversible and freezes results', async () => {
    await as(U.dana);
    const t = await firstUntested();
    await s.runs.close(IDS.runs.web);
    expect(await code(s.results.add({ testId: t.test.id, statusId: IDS.status.passed }))).toBe('closed');
    expect(await code(s.runs.close(IDS.runs.web))).toBe('closed');
  });
});

describe('cases', () => {
  it('creates with the next ref and saves new versions with conflict detection', async () => {
    await as(U.dana);
    const created = await s.cases.create({ project: IDS.projectCore, suite: IDS.suites.web, section: 'sec_login', title: 'New case', steps: [{ description: 'Do it' }], tag_ids: [] });
    expect(created.case.ref).toBe('CORE-C121');
    const v2 = await s.cases.update(created.case.id, { title: 'Renamed' }, { expectedVersion: 1, note: 'rename' });
    expect(v2.case.version).toBe(2);
    expect(await code(s.cases.update(created.case.id, { title: 'Again' }, { expectedVersion: 1 }))).toBe('conflict');
    expect((await s.cases.versions(created.case.id)).map((v) => v.version.version)).toEqual([2, 1]);
  });

  it('deprecates instead of deleting cases that have results', async () => {
    await as(U.dana);
    const res = await s.cases.remove(['c_1']);
    expect(res).toEqual({ deleted: 0, deprecated: 1 });
    expect((await s.cases.get('c_1')).case.deprecated).toBe(true);
  });
});
