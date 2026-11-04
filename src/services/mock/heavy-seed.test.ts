import { beforeAll, describe, expect, it } from 'vitest';
import { mockServices as s } from '.';
import { setMockDb, writeSessionUserId } from './core';
import { buildFixtures, IDS } from './fixtures';
import { buildHeavyFixtures, HEAVY_SIZE_BUDGET } from './heavy-seed';
import { MockDb, MOCKDB_SCHEMA_VERSION, type DbData, type StorageLike } from './mockdb';
import type { BaseRecord, TestCase, TestResult, TestRun, TestRunCase } from '../types';

const mem = (): StorageLike => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }; };

let heavy: DbData;
beforeAll(() => { heavy = buildHeavyFixtures(); });

describe('heavy seed: size and determinism', () => {
  it('serialises under the 4 MB localStorage budget (with the envelope)', () => {
    const size = JSON.stringify({ v: MOCKDB_SCHEMA_VERSION, data: heavy }).length;
    expect(size).toBeLessThanOrEqual(HEAVY_SIZE_BUDGET);
    expect(size).toBeGreaterThan(2_000_000); // it really is the heavy layer, not a stub
  });

  it('returns the same data twice', () => {
    expect(JSON.stringify(buildHeavyFixtures())).toBe(JSON.stringify(heavy));
  });

  it('keeps every standard fixture row (same ids, same content) and only adds on top', () => {
    const std = buildFixtures();
    for (const [name, rows] of Object.entries(std)) {
      const byId = new Map((heavy[name] ?? []).map((r) => [r.id, r]));
      for (const row of rows) {
        const got = byId.get(row.id);
        expect(got, `${name}/${row.id}`).toBeDefined();
        if (name !== 'projects') expect(got).toEqual(row);
      }
    }
    expect((heavy.projects ?? []).length).toBeGreaterThanOrEqual(6);
    expect((heavy.projects ?? []).filter((p) => (p as unknown as { is_archived: boolean }).is_archived).length).toBeGreaterThanOrEqual(1);
  });

  it('has the heavy shape', () => {
    const n = (c: string) => (heavy[c] ?? []).length;
    expect(n('users')).toBeGreaterThanOrEqual(20);
    expect(n('test_cases')).toBeGreaterThanOrEqual(1200);
    expect(n('milestones')).toBeGreaterThanOrEqual(12);
    expect(n('test_plans')).toBeGreaterThanOrEqual(10);
    expect(n('test_runs')).toBeGreaterThanOrEqual(30);
    expect(n('automation_executions')).toBeGreaterThanOrEqual(30);
    expect(n('audit_logs')).toBeGreaterThanOrEqual(500);
    expect((heavy.projects as unknown as Array<{ announcement?: string }>).filter((p) => p.announcement).length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(heavy)).not.toMatch(/tb_live_/);
  });
});

type Ref = [collection: string, field: string, target: string, opts?: { many?: boolean; optional?: boolean }];
const REFS: Ref[] = [
  ['projects', 'workspace', 'workspaces'], ['workspace_members', 'workspace', 'workspaces'], ['workspace_members', 'user', 'users'],
  ['project_members', 'project', 'projects'], ['project_members', 'user', 'users'],
  ['test_suites', 'project', 'projects'], ['test_sections', 'project', 'projects'], ['test_sections', 'suite', 'test_suites'], ['test_sections', 'parent', 'test_sections'],
  ['tags', 'project', 'projects'],
  ['test_cases', 'project', 'projects'], ['test_cases', 'suite', 'test_suites'], ['test_cases', 'section', 'test_sections'], ['test_cases', 'priority', 'priorities'],
  ['test_cases', 'type', 'case_types'], ['test_cases', 'created_by', 'users'], ['test_cases', 'updated_by', 'users'],
  ['test_steps', 'case', 'test_cases'], ['test_case_tags', 'case', 'test_cases'], ['test_case_tags', 'tag', 'tags'],
  ['test_case_versions', 'case', 'test_cases'], ['test_case_versions', 'project', 'projects'], ['test_case_versions', 'saved_by', 'users'],
  ['milestones', 'project', 'projects'], ['test_plans', 'project', 'projects'], ['test_plans', 'owner', 'users'], ['test_plans', 'milestones', 'milestones', { many: true }],
  ['test_runs', 'project', 'projects'], ['test_runs', 'suite', 'test_suites'], ['test_runs', 'plan', 'test_plans'], ['test_runs', 'milestone', 'milestones'],
  ['test_runs', 'assigned_to', 'users'], ['test_runs', 'created_by', 'users'], ['test_runs', 'case_ids', 'test_cases', { many: true }],
  ['test_run_cases', 'run', 'test_runs'], ['test_run_cases', 'project', 'projects'], ['test_run_cases', 'case', 'test_cases'], ['test_run_cases', 'status', 'statuses'], ['test_run_cases', 'assigned_to', 'users'],
  ['test_results', 'project', 'projects'], ['test_results', 'run', 'test_runs'], ['test_results', 'test', 'test_run_cases'], ['test_results', 'case', 'test_cases'],
  ['test_results', 'status', 'statuses'], ['test_results', 'assigned_to', 'users'], ['test_results', 'created_by', 'users'],
  ['automation_mappings', 'project', 'projects'], ['automation_mappings', 'run_as', 'users'], ['automation_executions', 'mapping', 'automation_mappings'], ['automation_executions', 'run', 'test_runs'],
  ['ci_tokens', 'project', 'projects'], ['ci_tokens', 'mapping', 'automation_mappings'], ['audit_logs', 'project', 'projects'], ['audit_logs', 'actor', 'users'],
];

describe('heavy seed: referential integrity', () => {
  it('has unique ids in every collection', () => {
    for (const [name, rows] of Object.entries(heavy)) expect(new Set(rows.map((r) => r.id)).size, name).toBe(rows.length);
  });

  it('resolves every foreign key', () => {
    const ids = new Map(Object.entries(heavy).map(([k, rows]) => [k, new Set(rows.map((r) => r.id))]));
    const bad: string[] = [];
    for (const [col, field, target, opts] of REFS) {
      for (const row of heavy[col] ?? []) {
        const v = (row as unknown as Record<string, unknown>)[field];
        if (v === undefined || v === null) continue;
        for (const id of opts?.many ? (v as string[]) : [v as string]) if (!ids.get(target)?.has(id)) bad.push(`${col}/${row.id}.${field} -> ${target}/${id}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('keeps parent/child projects consistent and refs unique', () => {
    const byId = (c: string) => new Map((heavy[c] ?? []).map((r) => [r.id, r as unknown as Record<string, string>]));
    const suites = byId('test_suites'); const secs = byId('test_sections'); const cases = byId('test_cases'); const runs = byId('test_runs'); const tests = byId('test_run_cases');
    for (const sec of secs.values()) expect(suites.get(sec.suite!)?.project).toBe(sec.project);
    for (const sec of secs.values()) if (sec.parent) expect(secs.get(sec.parent)?.suite).toBe(sec.suite);
    for (const c of cases.values()) { expect(secs.get(c.section!)?.suite).toBe(c.suite); expect(suites.get(c.suite!)?.project).toBe(c.project); }
    for (const t of tests.values()) { expect(runs.get(t.run!)?.project).toBe(t.project); expect(cases.get(t.case!)?.project).toBe(t.project); }
    const refs = new Set<string>();
    for (const c of cases.values()) { expect(refs.has(c.ref!)).toBe(false); refs.add(c.ref!); }
    // project counters cover the refs handed out
    for (const p of heavy.projects as unknown as Array<{ id: string; ref_prefix: string; case_counter: number }>) {
      const max = Math.max(0, ...[...cases.values()].filter((c) => c.project === p.id).map((c) => Number(c.ref!.split('-C')[1])));
      expect(p.case_counter).toBeGreaterThanOrEqual(max);
    }
  });

  it('has results that agree with test status and closed runs', () => {
    const tests = new Map((heavy.test_run_cases as TestRunCase[]).map((t) => [t.id, t]));
    const runs = new Map((heavy.test_runs as TestRun[]).map((r) => [r.id, r]));
    const lastOf = new Map<string, TestResult>();
    for (const r of heavy.test_results as TestResult[]) {
      const cur = lastOf.get(r.test);
      if (!cur || cur.created < r.created) lastOf.set(r.test, r);
      const run = runs.get(r.run)!;
      if (run.is_closed) expect(r.created <= run.finished_on!).toBe(true);
    }
    for (const t of tests.values()) expect(t.status, t.id).toBe(lastOf.get(t.id)?.status ?? IDS.status.untested);
    // flagged results carry a comment
    for (const r of heavy.test_results as TestResult[]) if (r.status === IDS.status.failed || r.status === IDS.status.blocked) expect(r.comment, r.id).toBeTruthy();
  });

  it('points audit rows at real entities, or at ones that were deleted', () => {
    const coll: Record<string, string> = { case: 'test_cases', run: 'test_runs', result: 'test_results', member: 'project_members', project: 'projects', ci_token: 'ci_tokens', suite: 'test_suites' };
    let gone = 0;
    for (const a of heavy.audit_logs as unknown as Array<BaseRecord & { entity_type: string; entity_id: string }>) {
      const ok = (heavy[coll[a.entity_type] as string] ?? []).some((r) => r.id === a.entity_id);
      if (!ok) { gone += 1; expect(a.entity_id.startsWith('deleted'), a.id).toBe(true); }
    }
    expect(gone).toBeLessThan(80);
  });

  it('has realistic content: retest history, defects, blocked comments, deprecated and v5+ cases', () => {
    const results = heavy.test_results as TestResult[];
    const byTest = new Map<string, TestResult[]>();
    for (const r of results) byTest.set(r.test, [...(byTest.get(r.test) ?? []), r]);
    const retested = [...byTest.values()].filter((l) => l.some((r) => r.status === IDS.status.failed) && l.some((r) => r.status === IDS.status.retest) && l[l.length - 1]!.status === IDS.status.passed);
    expect(retested.length).toBeGreaterThan(3);
    expect(results.some((r) => r.defects?.some((d) => /^BUG-\d+$/.test(d)))).toBe(true);
    expect(results.some((r) => r.status === IDS.status.blocked && r.comment)).toBe(true);
    const cases = heavy.test_cases as TestCase[];
    expect(cases.filter((c) => c.deprecated).length).toBeGreaterThan(10);
    expect(cases.filter((c) => c.version >= 5).length).toBeGreaterThan(5);
    expect(new Set((heavy.test_runs as TestRun[]).map((r) => r.assigned_to)).size).toBeGreaterThan(5);
  });
});

describe('heavy seed: query timings against the BRD targets', () => {
  const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
  const time = async (fn: () => Promise<unknown>) => { const out: number[] = []; for (let i = 0; i < 5; i += 1) { const t = performance.now(); await fn(); out.push(performance.now() - t); } return median(out); };

  it('case list (CORE, 5,000 cases) <= 300 ms and run dashboard (1,000 tests) <= 500 ms', async () => {
    const big = buildHeavyFixtures({ coreCases: 5000, bigRunTests: 1000 });
    setMockDb(new MockDb({ storage: mem(), seed: () => big }));
    writeSessionUserId(IDS.users.avery);
    const coreCases = (big.test_cases as TestCase[]).filter((c) => c.project === IDS.projectCore).length;
    const counts = new Map<string, number>();
    for (const t of big.test_run_cases as TestRunCase[]) counts.set(t.run, (counts.get(t.run) ?? 0) + 1);
    const [runId, tests] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] as [string, number];
    expect(coreCases).toBeGreaterThanOrEqual(4900);
    expect(tests).toBe(1000);

    const list = await time(() => s.cases.list({ projectId: IDS.projectCore, pageSize: 50 }));
    const filtered = await time(() => s.cases.list({ projectId: IDS.projectCore, q: 'checkout', sort: 'updated', dir: 'desc', pageSize: 50 }));
    const dash = await time(() => Promise.all([s.runs.get(runId), s.tests.list({ runId, pageSize: 50 }), s.reports.run(runId), s.reports.changes(runId)]));
    process.stdout.write(`\n[heavy perf] case list ${coreCases} cases: ${list.toFixed(1)} ms (search+sort ${filtered.toFixed(1)} ms); run dashboard ${tests} tests: ${dash.toFixed(1)} ms\n`);
    expect(list).toBeLessThanOrEqual(300);
    expect(filtered).toBeLessThanOrEqual(300);
    expect(dash).toBeLessThanOrEqual(500);
    setMockDb(null);
  });
});
