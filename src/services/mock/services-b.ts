import { can } from '@/lib/permissions';
import {
  ServiceError, type AuditService, type AutomationService, type ExecutionView, type MilestoneDetail, type MilestoneReport,
  type MilestonesService, type MilestoneSummary, type PlanSummary, type PlansService, type Progress, type ReportsService,
  type ResultView, type ResultsService, type RunReport, type RunsService, type SettingsService, type TestListItem,
  type TestsService, type TestFilters, type TestDetail, type RunSummary, type ImportPreview, type AuditView, type RunChanges, type ChangeKind, type StepInput,
} from '../interfaces';
import type {
  AuditLog, AutomationExecution, AutomationMapping, CaseType, CiToken, Id, ListResult, Milestone, Priority, Project, ProjectMember, Status, TestAttachment, TestCase,
  TestCaseVersion, TestPlan, TestResult, TestRun, TestRunCase, TestSection, TestStatusKey, TestStep, TestStepResult, TestSuite, User,
} from '../types';
import {
  audit, getMockDb, me, mergeProgress, need, needMember, pickFields, progressOf, project, requireText, sim, statusKeyById, statusKeyOf, userMap,
} from './core';
import { buildRunSummary, caseDetail, snapshotOf, stepsFor, describeAudit } from './services-a';
import { IDS } from './fixtures';
import { parseTestRailCsv, parseTestRailXml, planImport, type ImportBundle, type ExistingCase } from '@/lib/import';
import type { ProjectRole } from '../types';

const db = () => getMockDb();
const DAY = 86_400_000;

function runOrThrow(id: Id): TestRun {
  const r = db().get<TestRun>('test_runs', id);
  if (!r) throw new ServiceError('not_found', 'Run not found.');
  return r;
}
function testOrThrow(id: Id): TestRunCase {
  const t = db().get<TestRunCase>('test_run_cases', id);
  if (!t) throw new ServiceError('not_found', 'Test not found.');
  return t;
}
function runTests(runId: Id): TestRunCase[] {
  return db().list<TestRunCase>('test_run_cases', (t) => t.run === runId);
}
function assertOpen(run: TestRun): void {
  if (run.is_closed) throw new ServiceError('closed', 'Run is closed. Results can no longer be changed.');
}
/** Load every test of a batch; all must belong to one run (mixed batches are rejected). */
function loadBatch(testIds: Id[], targetRun?: Id): { run: TestRun; tests: TestRunCase[] } {
  const ids = [...new Set(testIds)];
  const tests = (ids.length ? ids : ['']).map(testOrThrow);
  const runId = targetRun ?? (tests[0] as TestRunCase).run;
  if (tests.some((t) => t.run !== runId)) throw new ServiceError('validation', 'These tests belong to different runs. Select tests from one run.');
  return { run: runOrThrow(runId), tests };
}
const num = (ref: string) => Number(ref.split('-C')[1] ?? 0);

// ---- milestones --------------------------------------------------------------------------------
function milestoneSummary(m: Milestone): MilestoneSummary {
  const runs = db().list<TestRun>('test_runs', (r) => r.milestone === m.id);
  const progress = mergeProgress(runs.map((r) => progressOf(runTests(r.id))));
  const days = m.expires_on ? Math.ceil((Date.parse(m.expires_on) - Date.now()) / DAY) : null;
  return {
    milestone: m, progress, run_count: runs.length,
    plan_count: db().count<TestPlan>('test_plans', (p) => p.milestones?.includes(m.id) ?? false),
    test_count: progress.total, failed_count: progress.counts.failed,
    past_due: !m.is_completed && days !== null && days < 0, days_left: days,
  };
}

export const milestonesService: MilestonesService = {
  list: (projectId, state) => sim(() => {
    needMember(projectId);
    return db().list<Milestone>('milestones', (m) => m.project === projectId && (state === undefined || (state === 'completed') === m.is_completed))
      .sort((a, b) => (a.expires_on ?? '9').localeCompare(b.expires_on ?? '9')).map(milestoneSummary);
  }),
  get: (id) => sim((): MilestoneDetail => {
    const m = db().get<Milestone>('milestones', id);
    if (!m) throw new ServiceError('not_found', 'Milestone not found.');
    needMember(m.project);
    const users = userMap();
    return {
      ...milestoneSummary(m),
      runs: db().list<TestRun>('test_runs', (r) => r.milestone === id).map((r) => buildRunSummary(r, users)),
      plans: db().list<TestPlan>('test_plans', (p) => p.milestones?.includes(id) ?? false).map((p) => planSummary(p)),
    };
  }),
  create: (input) => sim(() => {
    need(input.project, 'milestones.write');
    const title = requireText(input.title, 'Title');
    if (db().find<Milestone>('milestones', (m) => m.project === input.project && m.title.toLowerCase() === title.toLowerCase())) throw new ServiceError('conflict', 'A milestone with this title already exists.', { title: 'taken' });
    const m = db().create<Milestone>('milestones', { ...input, title, is_completed: false });
    audit(m.project, 'milestone.create', 'milestone', m.id, undefined, { title });
    return m;
  }, { write: true }),
  update: (id, patch) => sim(() => {
    const m = db().get<Milestone>('milestones', id);
    if (!m) throw new ServiceError('not_found', 'Milestone not found.');
    need(m.project, 'milestones.write');
    if (m.is_completed) throw new ServiceError('closed', 'This milestone is completed.');
    const next = db().update<Milestone>('milestones', id, pickFields(patch, ['title', 'description', 'expires_on', 'refs']));
    audit(m.project, 'milestone.update', 'milestone', id, { title: m.title }, { title: next.title });
    return next;
  }, { write: true }),
  complete: (id) => sim(() => {
    const m = db().get<Milestone>('milestones', id);
    if (!m) throw new ServiceError('not_found', 'Milestone not found.');
    need(m.project, 'milestones.write');
    const next = db().update<Milestone>('milestones', id, { is_completed: true });
    audit(m.project, 'milestone.complete', 'milestone', id, { is_completed: m.is_completed }, { is_completed: true });
    return next;
  }, { write: true }),
};

// ---- plans -------------------------------------------------------------------------------------
function planSummary(p: TestPlan): PlanSummary {
  const runs = db().list<TestRun>('test_runs', (r) => r.plan === p.id);
  return {
    plan: p, run_count: runs.length, progress: mergeProgress(runs.map((r) => progressOf(runTests(r.id)))),
    owner: p.owner ? db().get<User>('users', p.owner) : undefined,
    milestone_titles: (p.milestones ?? []).map((id) => db().get<Milestone>('milestones', id)?.title ?? ''),
  };
}

export const plansService: PlansService = {
  list: (projectId) => sim(() => { needMember(projectId); return db().list<TestPlan>('test_plans', (p) => p.project === projectId).map(planSummary); }),
  get: (id) => sim(() => {
    const p = db().get<TestPlan>('test_plans', id);
    if (!p) throw new ServiceError('not_found', 'Plan not found.');
    needMember(p.project);
    const users = userMap();
    return { ...planSummary(p), runs: db().list<TestRun>('test_runs', (r) => r.plan === id).map((r) => buildRunSummary(r, users)) };
  }),
  create: (input) => sim(() => {
    need(input.project, 'plans.write');
    const name = requireText(input.name, 'Name');
    if (db().find<TestPlan>('test_plans', (p) => p.project === input.project && p.name.toLowerCase() === name.toLowerCase())) throw new ServiceError('conflict', 'A plan with this name already exists.', { name: 'taken' });
    const p = db().create<TestPlan>('test_plans', { ...input, name, is_completed: false });
    audit(p.project, 'plan.create', 'plan', p.id, undefined, { name });
    return p;
  }, { write: true }),
  update: (id, patch) => sim(() => {
    const p = db().get<TestPlan>('test_plans', id);
    if (!p) throw new ServiceError('not_found', 'Plan not found.');
    need(p.project, 'plans.write');
    if (p.is_completed) throw new ServiceError('closed', 'This plan is completed.');
    const next = db().update<TestPlan>('test_plans', id, pickFields(patch, ['name', 'description', 'type', 'milestones', 'builds', 'refs', 'owner']));
    audit(p.project, 'plan.update', 'plan', id, { name: p.name }, { name: next.name });
    return next;
  }, { write: true }),
  complete: (id) => sim(() => {
    const p = db().get<TestPlan>('test_plans', id);
    if (!p) throw new ServiceError('not_found', 'Plan not found.');
    need(p.project, 'plans.write');
    const next = db().update<TestPlan>('test_plans', id, { is_completed: true });
    audit(p.project, 'plan.complete', 'plan', id, { is_completed: p.is_completed }, { is_completed: true });
    return next;
  }, { write: true }),
};

// ---- runs --------------------------------------------------------------------------------------
function snapshotFor(caseId: Id): { snapshot: TestCaseVersion['snapshot']; version: number } {
  const c = db().get<TestCase>('test_cases', caseId) as TestCase;
  return { snapshot: snapshotOf(c, stepsFor(caseId)), version: c.version };
}

function addTests(tx: ReturnType<typeof db>, run: TestRun, caseIds: Id[], assigned?: Id): number {
  const existing = new Set(tx.list<TestRunCase>('test_run_cases', (t) => t.run === run.id).map((t) => t.case));
  let n = 0;
  for (const cid of caseIds) {
    const c = tx.get<TestCase>('test_cases', cid);
    if (!c || c.deprecated || c.project !== run.project || existing.has(cid)) continue;
    const { snapshot, version } = snapshotFor(cid);
    tx.create<TestRunCase>('test_run_cases', { run: run.id, project: run.project, case: cid, version, case_snapshot: snapshot, assigned_to: assigned, status: IDS.status.untested });
    n += 1;
  }
  return n;
}

export const runsService: RunsService = {
  list: (f) => sim(() => {
    needMember(f.projectId);
    const users = userMap();
    const q = f.q?.toLowerCase();
    return db().list<TestRun>('test_runs', (r) =>
      r.project === f.projectId
      && (f.state === 'closed' ? r.is_closed : f.state === 'all' ? true : !r.is_closed)
      && (!f.milestone || r.milestone === f.milestone) && (!f.plan || r.plan === f.plan) && (!f.assignee || r.assigned_to === f.assignee)
      && (!q || r.name.toLowerCase().includes(q) || (r.build ?? '').toLowerCase().includes(q)))
      .sort((a, b) => (b.started_on ?? b.created).localeCompare(a.started_on ?? a.created)).map((r) => buildRunSummary(r, users));
  }),
  get: (id) => sim(() => {
    const r = runOrThrow(id);
    needMember(r.project);
    const s = buildRunSummary(r);
    if (r.is_closed) {
      const closer = db().find<AuditLog>('audit_logs', (a) => a.action === 'run.close' && a.entity_id === id);
      s.closed_by_name = (closer?.actor ? db().get<User>('users', closer.actor)?.name : undefined) ?? (r.created_by ? db().get<User>('users', r.created_by)?.name : undefined);
    }
    return s;
  }),
  create: (input) => sim(() => {
    need(input.project, 'runs.write');
    if ((input.plan || input.milestone)) need(input.project, 'runs.attach');
    const name = requireText(input.name, 'Name');
    if (!db().get<TestSuite>('test_suites', input.suite)) throw new ServiceError('validation', 'Choose a suite.', { suite: 'required' });
    const pool = input.include_all
      ? db().list<TestCase>('test_cases', (c) => c.suite === input.suite && !c.deprecated).map((c) => c.id)
      : (input.case_ids ?? []);
    if (!pool.length) throw new ServiceError('validation', input.include_all ? 'This suite has no active cases.' : 'Select at least one case.', { cases: 'required' });
    return db().transaction((tx) => {
      const run = tx.create<TestRun>('test_runs', {
        project: input.project, suite: input.suite, plan: input.plan, name, description: input.description, milestone: input.milestone,
        include_all: input.include_all, case_ids: input.include_all ? undefined : pool, build: input.build, refs: input.refs,
        assigned_to: input.assigned_to, started_on: new Date().toISOString(), is_closed: false, created_by: me().id,
      });
      addTests(tx, run, pool, input.assigned_to);
      audit(input.project, 'run.create', 'run', run.id, undefined, { name, tests: pool.length });
      return run;
    });
  }, { write: true }),
  update: (id, patch) => sim(() => {
    const r = runOrThrow(id);
    need(r.project, 'runs.write');
    assertOpen(r);
    if (patch.plan !== undefined || patch.milestone !== undefined) need(r.project, 'runs.attach');
    const next = db().update<TestRun>('test_runs', id, pickFields(patch, ['name', 'description', 'build', 'refs', 'assigned_to', 'milestone', 'plan']));
    audit(r.project, 'run.update', 'run', id, { name: r.name, build: r.build }, { name: next.name, build: next.build });
    return next;
  }, { write: true }),
  close: (id) => sim(() => {
    const r = runOrThrow(id);
    const role = need(r.project, 'runs.close');
    // D26: a tester may close only a run assigned to them; managers and admins may close any run.
    if (role === 'tester' && r.assigned_to !== me().id) throw new ServiceError('forbidden', 'Only the run assignee, a manager or an admin can close this run.');
    assertOpen(r);
    const next = db().update<TestRun>('test_runs', id, { is_closed: true, finished_on: new Date().toISOString() });
    audit(r.project, 'run.close', 'run', id, { is_closed: false }, { is_closed: true });
    return next;
  }, { write: true }),
  addCases: (id, caseIds) => sim(() => {
    const r = runOrThrow(id);
    need(r.project, 'runs.write');
    assertOpen(r);
    return db().transaction((tx) => {
      const n = addTests(tx, r, caseIds);
      if (!r.include_all) tx.update<TestRun>('test_runs', id, { case_ids: [...new Set([...(r.case_ids ?? []), ...caseIds])] });
      if (n > 0) audit(r.project, 'run.add_cases', 'run', id, undefined, { added: n });
      return n;
    });
  }, { write: true }),
  removeTests: (id, testIds) => sim(() => {
    const r = runOrThrow(id);
    need(r.project, 'runs.write');
    assertOpen(r);
    const { tests } = loadBatch(testIds, id);
    return db().transaction((tx) => {
      let n = 0;
      for (const t of tests) {
        if (tx.count<TestResult>('test_results', (x) => x.test === t.id) > 0) continue; // only before results
        if (tx.delete('test_run_cases', t.id)) n += 1;
      }
      if (n > 0) audit(r.project, 'run.remove_tests', 'run', id, undefined, { removed: n });
      return n;
    });
  }, { write: true }),
};

// ---- tests -------------------------------------------------------------------------------------
function allStatuses(): Map<Id, Status> {
  return new Map(db().list<Status>('statuses').map((s) => [s.id, s]));
}

function toListItems(tests: TestRunCase[]): TestListItem[] {
  const statuses = allStatuses();
  const users = userMap();
  const prios = new Map(db().list<Priority>('priorities').map((p) => [p.id, p]));
  const sections = new Map(db().list<TestSection>('test_sections').map((s) => [s.id, s.name]));
  const runIds = new Set(tests.map((t) => t.run));
  const resultsByTest = new Map<Id, TestResult[]>();
  db().list<TestResult>('test_results', (r) => runIds.has(r.run)).forEach((r) => resultsByTest.set(r.test, [...(resultsByTest.get(r.test) ?? []), r]));
  return tests.map((test) => {
    const live = test.case ? db().get<TestCase>('test_cases', test.case) : undefined;
    const sc = test.case_snapshot.case as { title?: string; ref?: string; priority?: Id };
    const rs = (resultsByTest.get(test.id) ?? []).sort((a, b) => b.created.localeCompare(a.created));
    const last = rs[0];
    const status = statuses.get(last ? last.status : test.status) ?? (statuses.get(IDS.status.untested) as Status);
    return {
      test, status, status_key: last ? statusKeyOf(status) : 'untested', last_result_id: last?.id ?? null, last_result_at: last?.created,
      title: sc.title ?? live?.title ?? 'Deleted case', ref: sc.ref ?? live?.ref ?? '',
      priority: sc.priority ? prios.get(sc.priority) : undefined,
      section_name: live ? sections.get(live.section) ?? '' : '',
      assignee: test.assigned_to ? users.get(test.assigned_to) : undefined,
      result_count: rs.length, defect_count: rs.reduce((n, r) => n + (r.defects?.length ?? 0), 0),
    };
  });
}

function filteredTests(f: Pick<TestFilters, 'runId' | 'status' | 'assignee' | 'section' | 'q'>): TestListItem[] {
  const run = runOrThrow(f.runId);
  needMember(run.project);
  const q = f.q?.toLowerCase();
  const secs = f.section ? new Set([f.section, ...db().list<TestSection>('test_sections', (s) => s.parent === f.section).map((s) => s.id)]) : null;
  return toListItems(runTests(f.runId))
    .filter((i) => (!f.status?.length || f.status.includes(i.status_key))
      && (!f.assignee || (f.assignee === 'none' ? !i.test.assigned_to : i.test.assigned_to === f.assignee))
      && (!secs || (i.test.case ? secs.has(db().get<TestCase>('test_cases', i.test.case)?.section ?? '') : false))
      && (!q || i.title.toLowerCase().includes(q) || i.ref.toLowerCase().includes(q)))
    .sort((a, b) => num(a.ref) - num(b.ref));
}

function resultViews(testId: Id): ResultView[] {
  const statuses = allStatuses();
  const users = userMap();
  return db().list<TestResult>('test_results', (r) => r.test === testId).sort((a, b) => b.created.localeCompare(a.created)).map((result) => {
    const status = statuses.get(result.status) as Status;
    return {
      result, status, status_key: statusKeyOf(status), user: result.created_by ? users.get(result.created_by) : undefined,
      attachments: db().list<TestAttachment>('test_attachments', (a) => a.result === result.id),
      step_results: db().list<TestStepResult>('test_step_results', (s) => s.result === result.id).sort((a, b) => a.step_position - b.step_position),
    };
  });
}

export const testsService: TestsService = {
  list: (f) => sim((): ListResult<TestListItem> => {
    const rows = filteredTests(f);
    const size = f.pageSize ?? 1000;
    const page = f.page ?? 1;
    return { total: rows.length, items: rows.slice((page - 1) * size, page * size) };
  }),
  order: (runId, filters) => sim(() => filteredTests({ runId, ...filters }).map((i) => i.test.id)),
  get: (testId) => sim((): TestDetail => {
    const test = testOrThrow(testId);
    const run = runOrThrow(test.run);
    needMember(run.project);
    const item = toListItems([test])[0] as TestListItem;
    const live = test.case ? db().get<TestCase>('test_cases', test.case) : undefined;
    return { item, run, results: resultViews(testId), live_case_version: live?.version, has_newer_version: !!live && live.version > test.version };
  }),
  assign: (testIds, userId) => sim(() => {
    const { run, tests } = loadBatch(testIds);
    need(run.project, 'runs.write');
    assertOpen(run);
    return db().transaction((tx) => {
      tests.forEach((t) => {
        tx.update<TestRunCase>('test_run_cases', t.id, { assigned_to: userId ?? undefined });
        if (t.assigned_to !== (userId ?? undefined)) audit(run.project, 'test.assign', 'test', t.id, { assigned_to: t.assigned_to }, { assigned_to: userId ?? undefined });
      });
      return tests.length;
    });
  }, { write: true }),
};

// ---- results -----------------------------------------------------------------------------------
const ALLOWED_TYPE = /^(image\/.+|application\/pdf|text\/plain|text\/xml|application\/json|video\/mp4|application\/zip)$/;
const MAX_ATTACHMENT = 25 * 1024 * 1024;

function recompute(tx: ReturnType<typeof db>, testId: Id): void {
  const last = tx.list<TestResult>('test_results', (r) => r.test === testId).sort((a, b) => b.created.localeCompare(a.created))[0];
  tx.update<TestRunCase>('test_run_cases', testId, { status: last ? last.status : IDS.status.untested });
}

function createResult(tx: ReturnType<typeof db>, test: TestRunCase, run: TestRun, input: { statusId: Id; comment?: string; elapsed?: number; defects?: string[]; step_results?: Array<{ step_position: number; statusId: Id; comment?: string }> }): TestResult {
  const status = tx.get<Status>('statuses', input.statusId);
  if (!status) throw new ServiceError('validation', 'Choose a status.', { status: 'required' });
  if (statusKeyOf(status) === 'untested') throw new ServiceError('validation', 'Untested cannot be recorded as a result.');
  if (status.flags?.includes('require_comment') && !input.comment?.trim()) throw new ServiceError('validation', `${status.name} needs a comment.`, { comment: 'required' });
  const result = tx.create<TestResult>('test_results', {
    project: run.project, run: run.id, test: test.id, case: test.case, status: status.id, comment: input.comment?.trim() || undefined, version: test.version,
    elapsed: input.elapsed, defects: input.defects?.length ? input.defects : undefined, build: run.build, assigned_to: test.assigned_to, created_by: me().id,
  });
  input.step_results?.forEach((s) => tx.create<TestStepResult>('test_step_results', { result: result.id, test: test.id, step_position: s.step_position, status: s.statusId, comment: s.comment }));
  tx.update<TestRunCase>('test_run_cases', test.id, { status: status.id });
  audit(run.project, 'result.create', 'result', result.id, undefined, { status: status.name });
  return result;
}

export const resultsService: ResultsService = {
  add: (input) => sim(() => {
    const test = testOrThrow(input.testId);
    const run = runOrThrow(test.run);
    need(run.project, 'results.write');
    assertOpen(run);
    return db().transaction((tx) => createResult(tx, test, run, { ...input }));
  }, { write: true }),
  addMany: (testIds, statusId, comment) => sim(() => {
    const { run, tests } = loadBatch(testIds);
    need(run.project, 'results.write');
    assertOpen(run);
    return db().transaction((tx) => {
      tests.forEach((t) => createResult(tx, t, run, { statusId, comment }));
      return tests.length;
    });
  }, { write: true }),
  undo: (resultId) => sim(() => {
    const r = db().get<TestResult>('test_results', resultId);
    if (!r) return;
    need(r.project, 'results.write'); // same gate as recording a result (role, archived project)
    if (r.created_by !== me().id) throw new ServiceError('forbidden', 'Only the person who saved a result can undo it.');
    assertOpen(runOrThrow(r.run));
    db().transaction((tx) => {
      tx.deleteWhere<TestStepResult>('test_step_results', (s) => s.result === resultId);
      tx.deleteWhere<TestAttachment>('test_attachments', (a) => a.result === resultId);
      tx.delete('test_results', resultId);
      recompute(tx, r.test); // the audit trail is append-only (BR-1): the original result.create row stays
      audit(r.project, 'result.undo', 'result', resultId, { status: r.status, comment: r.comment }, undefined);
    });
  }, { write: true }),
  update: (resultId, patch) => sim(() => {
    const r = db().get<TestResult>('test_results', resultId);
    if (!r) throw new ServiceError('not_found', 'Not found');
    need(r.project, 'results.write');
    assertOpen(runOrThrow(r.run));
    if (r.created_by !== me().id) throw new ServiceError('forbidden', 'Only the person who saved a result can edit it.');
    const test = testOrThrow(r.test);
    const status = db().get<Status>('statuses', r.status) as Status;
    const comment = patch.comment !== undefined ? patch.comment.trim() || undefined : r.comment;
    if (status.flags?.includes('require_comment') && !comment) throw new ServiceError('validation', 'A comment is required for this status.', { comment: 'required' });
    void test;
    const next = db().update<TestResult>('test_results', resultId, {
      comment, elapsed: patch.elapsed !== undefined ? patch.elapsed : r.elapsed, defects: patch.defects !== undefined ? (patch.defects.length ? patch.defects : undefined) : r.defects,
    });
    audit(r.project, 'result.update', 'result', resultId, { comment: r.comment, elapsed: r.elapsed, defects: r.defects }, { comment: next.comment, elapsed: next.elapsed, defects: next.defects });
    return next;
  }, { write: true }),
  remove: (resultId) => sim(() => {
    const r = db().get<TestResult>('test_results', resultId);
    if (!r) throw new ServiceError('not_found', 'Result not found.');
    need(r.project, 'results.delete');
    assertOpen(runOrThrow(r.run)); // results of closed runs are immutable (BR-1), even for admins
    db().transaction((tx) => {
      tx.deleteWhere<TestStepResult>('test_step_results', (s) => s.result === resultId);
      tx.deleteWhere<TestAttachment>('test_attachments', (a) => a.result === resultId);
      tx.delete('test_results', resultId);
      recompute(tx, r.test);
      audit(r.project, 'result.delete', 'result', resultId, { status: r.status, comment: r.comment }, undefined);
    });
  }, { write: true }),
  addAttachment: (resultId, file) => sim(() => {
    const r = db().get<TestResult>('test_results', resultId);
    if (!r) throw new ServiceError('not_found', 'Result not found.');
    need(r.project, 'attachments.write');
    assertOpen(runOrThrow(r.run));
    if (!ALLOWED_TYPE.test(file.type)) throw new ServiceError('validation', `${file.name} is not an allowed type.`);
    if (file.size > MAX_ATTACHMENT) throw new ServiceError('validation', `${file.name} is larger than 25 MB.`);
    const att = db().create<TestAttachment>('test_attachments', { result: resultId, project: r.project, run: r.run, file: `${resultId}_${file.name}`, original_name: file.name, created_by: me().id });
    audit(r.project, 'attachment.add', 'attachment', att.id, undefined, { name: file.name });
    return att;
  }, { write: true }),
  removeAttachment: (id) => sim(() => {
    const a = db().get<TestAttachment>('test_attachments', id);
    if (!a) return;
    const role = need(a.project, 'attachments.write');
    if (a.created_by !== me().id && role !== 'admin') throw new ServiceError('forbidden', 'You can only delete your own attachments.');
    db().delete('test_attachments', id);
    audit(a.project, 'attachment.remove', 'attachment', id, { name: a.original_name }, undefined);
  }, { write: true }),
};

// ---- reports -----------------------------------------------------------------------------------
function groupProgress(tests: TestRunCase[], key: (t: TestRunCase) => { id: Id; name: string }): Array<{ id: Id; name: string; progress: Progress }> {
  const groups = new Map<Id, { name: string; tests: TestRunCase[] }>();
  tests.forEach((t) => {
    const k = key(t);
    const g = groups.get(k.id) ?? { name: k.name, tests: [] };
    g.tests.push(t);
    groups.set(k.id, g);
  });
  return [...groups.entries()].map(([id, g]) => ({ id, name: g.name, progress: progressOf(g.tests) }));
}

function trendOf(results: TestResult[]): Array<{ date: string; pass_rate: number; total: number }> {
  const byDay = new Map<string, { p: number; n: number }>();
  results.forEach((r) => {
    const d = r.created.slice(0, 10);
    const e = byDay.get(d) ?? { p: 0, n: 0 };
    e.n += 1;
    if (statusKeyById(r.status) === 'passed') e.p += 1;
    byDay.set(d, e);
  });
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, e]) => ({ date, pass_rate: Math.round((e.p / e.n) * 100), total: e.n }));
}

function caseLabel(cid?: Id): { ref: string; title: string } {
  const c = cid ? db().get<TestCase>('test_cases', cid) : undefined;
  return { ref: c?.ref ?? '', title: c?.title ?? 'Deleted case' };
}

function assigneeKey(t: TestRunCase) {
  const u = t.assigned_to ? db().get<User>('users', t.assigned_to) : undefined;
  return { id: t.assigned_to ?? 'none', name: u?.name ?? 'Unassigned' };
}

function buildMilestoneReport(id: Id): MilestoneReport {
  const m = db().get<Milestone>('milestones', id);
  if (!m) throw new ServiceError('not_found', 'Milestone not found.');
  needMember(m.project);
  const runs = db().list<TestRun>('test_runs', (r) => r.milestone === id);
  const runIds = new Set(runs.map((r) => r.id));
  const tests = db().list<TestRunCase>('test_run_cases', (t) => runIds.has(t.run));
  const results = db().list<TestResult>('test_results', (r) => runIds.has(r.run));
  const fails = new Map<Id, { n: number; runs: Set<Id> }>();
  results.filter((r) => statusKeyById(r.status) === 'failed' && r.case).forEach((r) => {
    const e = fails.get(r.case as Id) ?? { n: 0, runs: new Set<Id>() };
    e.n += 1; e.runs.add(r.run);
    fails.set(r.case as Id, e);
  });
  const users = userMap();
  return {
    milestone: m, progress: progressOf(tests),
    by_run: runs.map((r) => ({ run: buildRunSummary(r, users) })),
    by_suite: groupProgress(tests, (t) => { const r = runs.find((x) => x.id === t.run) as TestRun; return { id: r.suite, name: db().get<TestSuite>('test_suites', r.suite)?.name ?? '' }; }),
    by_assignee: groupProgress(tests, assigneeKey),
    top_failing: [...fails.entries()].sort(([, a], [, b]) => b.n - a.n).slice(0, 8).map(([cid, e]) => ({ case_id: cid, ...caseLabel(cid), failures: e.n, runs: e.runs.size })),
    trend: trendOf(results),
  };
}

function buildRunReport(id: Id): RunReport {
  const run = runOrThrow(id);
  needMember(run.project);
  const tests = runTests(id);
  const results = db().list<TestResult>('test_results', (r) => r.run === id);
  const labelOfTest = (tid: Id) => { const t = db().get<TestRunCase>('test_run_cases', tid); const sc = t?.case_snapshot.case as { ref?: string; title?: string } | undefined; return { ref: sc?.ref ?? '', title: sc?.title ?? '' }; };
  const sectionOf = (t: TestRunCase) => { const sid = t.case ? db().get<TestCase>('test_cases', t.case)?.section : undefined; return { id: sid ?? 'none', name: (sid ? db().get<TestSection>('test_sections', sid)?.name : undefined) ?? 'No section' }; };
  return {
    run: buildRunSummary(run), progress: progressOf(tests),
    by_section: groupProgress(tests, sectionOf), by_assignee: groupProgress(tests, assigneeKey),
    slowest: results.filter((r) => r.elapsed).sort((a, b) => (b.elapsed ?? 0) - (a.elapsed ?? 0)).slice(0, 5).map((r) => ({ test_id: r.test, ...labelOfTest(r.test), elapsed: r.elapsed as number })),
    with_defects: results.filter((r) => r.defects?.length).map((r) => ({ test_id: r.test, ...labelOfTest(r.test), defects: r.defects as string[] })),
    trend: trendOf(results),
  };
}

export const reportsService: ReportsService = {
  milestone: (id) => sim(() => buildMilestoneReport(id)),
  run: (id) => sim(() => buildRunReport(id)),
  changes: (id) => sim((): RunChanges => {
    const run = runOrThrow(id);
    needMember(run.project);
    const empty = { fixed: 0, regressed: 0, new_failing: 0, still_failing: 0 };
    const prev = db().list<TestRun>('test_runs', (r) => r.project === run.project && r.suite === run.suite && r.id !== id && (r.started_on ?? r.created) < (run.started_on ?? run.created))
      .sort((a, b) => (b.started_on ?? b.created).localeCompare(a.started_on ?? a.created))[0];
    const prevByCase = new Map<Id, TestStatusKey>();
    if (prev) toListItems(runTests(prev.id)).forEach((i) => { if (i.test.case) prevByCase.set(i.test.case, i.status_key); });
    const counts = { ...empty };
    const items: RunChanges['items'] = [];
    toListItems(runTests(id)).forEach((i) => {
      const from = (i.test.case ? prevByCase.get(i.test.case) : undefined) ?? 'none';
      const to = i.status_key;
      let kind: ChangeKind | null = null;
      if (to === 'passed' && (from === 'failed' || from === 'blocked')) kind = 'fixed';
      else if (to === 'failed' && from === 'passed') kind = 'regressed';
      else if (to === 'failed' && (from === 'none' || from === 'untested')) kind = 'new_failing';
      else if (to === 'failed' && from === 'failed') kind = 'still_failing';
      if (!kind) return;
      counts[kind] += 1;
      items.push({ test_id: i.test.id, case_id: i.test.case, ref: i.ref, title: i.title, kind, from, to });
    });
    return { previous_run: prev ? { id: prev.id, name: prev.name, closed: prev.is_closed } : undefined, counts, items };
  }),
  exportCsv: (kind, id) => sim(() => {
    const csv = (rows: Array<Array<string | number>>) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (kind === 'milestone') {
      const m = db().get<Milestone>('milestones', id);
      if (!m) throw new ServiceError('not_found', 'Milestone not found.');
      need(m.project, 'reports.export', { allowArchived: true });
      const rep = buildMilestoneReport(id);
      return csv([['Run', 'Passed', 'Failed', 'Blocked', 'Retest', 'Untested', 'Done %'], ...rep.by_run.map(({ run }) => [run.run.name, run.progress.counts.passed, run.progress.counts.failed, run.progress.counts.blocked, run.progress.counts.retest, run.progress.counts.untested, run.progress.done_pct])]);
    }
    const run = runOrThrow(id);
    need(run.project, 'reports.export', { allowArchived: true });
    return csv([['Ref', 'Title', 'Status', 'Assignee'], ...toListItems(runTests(id)).map((i) => [i.ref, i.title, i.status.name, i.assignee?.name ?? ''])]);
  }),
};

// ---- automation --------------------------------------------------------------------------------
function randomToken(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function execView(e: AutomationExecution): ExecutionView {
  return { execution: e, mapping: db().get<AutomationMapping>('automation_mappings', e.mapping), run: e.run ? db().get<TestRun>('test_runs', e.run) : undefined };
}

export const automationService: AutomationService = {
  mappings: (projectId) => sim(() => { need(projectId, 'automation.mappings', { allowArchived: true }); return db().list<AutomationMapping>('automation_mappings', (m) => m.project === projectId); }),
  saveMapping: (projectId, id, input) => sim(() => {
    need(projectId, 'automation.mappings');
    if (id) {
      const cur = db().get<AutomationMapping>('automation_mappings', id);
      if (!cur || cur.project !== projectId) throw new ServiceError('not_found', 'Mapping not found.');
      const next = db().update<AutomationMapping>('automation_mappings', id, { framework: input.framework, field_map: input.field_map, is_active: input.is_active, run_as: input.run_as });
      audit(projectId, 'mapping.update', 'mapping', id, { framework: cur.framework, is_active: cur.is_active }, { framework: next.framework, is_active: next.is_active });
      return next;
    }
    const m = db().create<AutomationMapping>('automation_mappings', { project: projectId, framework: input.framework, field_map: input.field_map, is_active: input.is_active, run_as: input.run_as ?? IDS.users.ci, token_prefix: `tb_demo_${randomToken(4)}` });
    audit(projectId, 'mapping.create', 'mapping', m.id, undefined, { framework: m.framework });
    return m;
  }, { write: true }),
  tokens: (projectId) => sim(() => { need(projectId, 'automation.tokens', { allowArchived: true }); return db().list<CiToken>('ci_tokens', (t) => t.project === projectId && !t.revoked); }),
  createToken: (projectId, name, mappingId) => sim(() => {
    need(projectId, 'automation.tokens');
    const n = requireText(name, 'Name');
    if (db().find<CiToken>('ci_tokens', (t) => t.project === projectId && !t.revoked && t.name === n)) throw new ServiceError('conflict', 'A token with this name already exists.');
    const body = randomToken(4);
    const tail = randomToken(28);
    const secret = `tb_demo_${body}${tail}`;
    const token = db().create<CiToken>('ci_tokens', { project: projectId, name: n, mapping: mappingId, prefix: `tb_demo_${body}`, last4: secret.slice(-4), revoked: false });
    audit(projectId, 'token.create', 'ci_token', token.id, undefined, { name: n });
    return { token, secret };
  }, { write: true }),
  revokeToken: (id) => sim(() => {
    const t = db().get<CiToken>('ci_tokens', id);
    if (!t) throw new ServiceError('not_found', 'Token not found.');
    need(t.project, 'automation.tokens');
    db().update<CiToken>('ci_tokens', id, { revoked: true });
    audit(t.project, 'token.revoke', 'ci_token', id, { revoked: false }, { revoked: true });
  }, { write: true }),
  executions: (projectId) => sim(() => {
    needMember(projectId);
    const maps = new Set(db().list<AutomationMapping>('automation_mappings', (m) => m.project === projectId).map((m) => m.id));
    return db().list<AutomationExecution>('automation_executions', (e) => maps.has(e.mapping)).sort((a, b) => b.created.localeCompare(a.created)).map(execView);
  }),
  execution: (id) => sim(() => {
    const e = db().get<AutomationExecution>('automation_executions', id);
    if (!e) throw new ServiceError('not_found', 'Execution not found.');
    const m = db().get<AutomationMapping>('automation_mappings', e.mapping);
    if (m) needMember(m.project);
    return execView(e);
  }),
};

// ---- audit -------------------------------------------------------------------------------------
const ENTITY_COLLECTION: Record<string, string> = {
  case: 'test_cases', run: 'test_runs', result: 'test_results', member: 'project_members', project: 'projects', ci_token: 'ci_tokens', suite: 'test_suites',
  section: 'test_sections', test: 'test_run_cases', tag: 'tags', milestone: 'milestones', plan: 'test_plans', attachment: 'test_attachments', mapping: 'automation_mappings',
};

export const auditService: AuditService = {
  list: (f) => sim((): ListResult<AuditView> => {
    need(f.projectId, 'audit.view', { allowArchived: true });
    const users = userMap();
    const rows = db().list<AuditLog>('audit_logs', (a) =>
      a.project === f.projectId && (!f.actor || a.actor === f.actor) && (!f.action || a.action === f.action) && (!f.entity || a.entity_type === f.entity)
      && (!f.from || a.created >= f.from) && (!f.to || a.created <= `${f.to}T23:59:59.999Z`)).sort((a, b) => b.created.localeCompare(a.created));
    const size = f.pageSize ?? 25;
    const page = f.page ?? 1;
    return {
      total: rows.length,
      items: rows.slice((page - 1) * size, page * size).map((log) => ({
        log, actor: log.actor ? users.get(log.actor) : undefined,
        entity_exists: !!ENTITY_COLLECTION[log.entity_type] && !!db().get(ENTITY_COLLECTION[log.entity_type] as string, log.entity_id),
      })),
    };
  }),
};

// ---- settings / import ---------------------------------------------------------------------------
/** One case ready to create. `source_key` (TestRail "C123") makes a re-import idempotent (BR-5). */
interface ImportRow {
  suite: string; sectionPath: string[]; title: string; priority?: string; type?: string; content?: string; refs?: string; estimate?: number;
  steps: StepInput[]; source_key?: string; index: number;
}
interface Prepared {
  format: ImportPreview['format']; suites: number; sections: number; cases: number;
  /** Cases to create (source keys already in the project are left out). */
  rows: ImportRow[]; alreadyImported: number; errors: Array<{ row: number; message: string }>; warnings: string[];
}

const bad = (msg: string) => new ServiceError('validation', msg);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const JSON_SHAPE = 'The file is not valid JSON in the expected shape ({ "suites": [{ "sections": [{ "cases": [...] }] }] }).';

/** Parse + validate the file into a bundle (TestRail XML/CSV) or JSON rows. Malformed input is always a validation error. */
function readImport(file: { name: string; text: string }): { format: ImportPreview['format']; bundle?: ImportBundle; json?: ImportRow[] } {
  const text = file.text.replace(/^﻿/, '').trim();
  if (!text) throw bad('The file is empty.');
  const fromBundle = (format: 'testrail-xml' | 'testrail-csv', b: ImportBundle) => {
    const fatal = b.issues.find((i) => i.severity === 'error');
    if (fatal && !b.suites.length) throw bad(fatal.message);
    return { format, bundle: b };
  };
  if (text.startsWith('<')) {
    if (typeof DOMParser === 'undefined') throw bad('XML import is not available here.');
    return fromBundle('testrail-xml', parseTestRailXml(text));
  }
  if (/\.csv$/i.test(file.name)) return fromBundle('testrail-csv', parseTestRailCsv(text));
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw bad(JSON_SHAPE); }
  if (!isObj(json) || !Array.isArray(json.suites)) throw bad(JSON_SHAPE);
  const rows: ImportRow[] = [];
  json.suites.forEach((su: unknown) => {
    if (!isObj(su) || !Array.isArray(su.sections)) throw bad(JSON_SHAPE);
    const suite = typeof su.name === 'string' && su.name.trim() ? su.name.trim() : 'Imported suite';
    su.sections.forEach((sec: unknown) => {
      if (!isObj(sec) || !Array.isArray(sec.cases)) throw bad(JSON_SHAPE);
      const secName = typeof sec.name === 'string' && sec.name.trim() ? sec.name.trim() : 'Imported';
      sec.cases.forEach((c: unknown) => {
        if (!isObj(c)) throw bad(JSON_SHAPE);
        if (c.title !== undefined && typeof c.title !== 'string') throw bad(JSON_SHAPE);
        rows.push({
          suite, sectionPath: [secName], title: (c.title as string | undefined) ?? '', priority: typeof c.priority === 'string' ? c.priority : undefined,
          source_key: typeof c.source_key === 'string' && c.source_key.trim() ? c.source_key.trim() : undefined, steps: [], index: rows.length + 1,
        });
      });
    });
  });
  return { format: 'json', json: rows };
}

function prepareImport(projectId: Id, file: { name: string; text: string }): Prepared {
  const parsed = readImport(file);
  const keys = new Map<string, string>();
  db().list<TestCase>('test_cases', (c) => c.project === projectId && !!c.source_key).forEach((c) => keys.set(c.source_key as string, c.id));
  if (parsed.bundle) {
    const existing: ExistingCase[] = [...keys.entries()].map(([source_key, id]) => ({ id, source_key, title: '', steps: [] }));
    const plan = planImport(parsed.bundle, existing);
    return {
      format: parsed.format, suites: plan.summary.suites, sections: plan.summary.sections, cases: plan.summary.cases, alreadyImported: plan.update.length + plan.unchanged.length,
      rows: plan.create.map((it) => ({
        suite: it.flat.suite, sectionPath: it.flat.sectionPath, title: it.flat.case.title.trim(), priority: it.priority, type: it.type, content: it.flat.case.content || undefined,
        refs: it.flat.case.refs || undefined, estimate: it.flat.case.estimate, steps: it.flat.case.steps, source_key: it.flat.case.sourceKey || undefined, index: it.flat.index,
      })),
      errors: plan.conflicts.map((c) => ({ row: c.flat.index, message: c.reason ?? 'Case was not imported.' })),
      warnings: plan.warnings.filter((w) => w.severity !== 'info').map((w) => w.message),
    };
  }
  const all = parsed.json ?? [];
  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  let alreadyImported = 0;
  for (const r of all) {
    if (r.source_key && (keys.has(r.source_key) || seen.has(r.source_key))) { alreadyImported += 1; continue; }
    if (r.source_key) seen.add(r.source_key);
    rows.push(r);
  }
  return {
    format: 'json', suites: new Set(all.map((r) => r.suite)).size, sections: new Set(all.map((r) => `${r.suite}\u0000${r.sectionPath.join('\u0000')}`)).size, cases: all.length,
    rows, alreadyImported, errors: [], warnings: [],
  };
}

export const settingsService: SettingsService = {
  previewImport: (projectId, file) => sim((): ImportPreview => {
    need(projectId, 'settings.import');
    const p = prepareImport(projectId, file);
    const titles = new Set(db().list<TestCase>('test_cases', (c) => c.project === projectId).map((c) => c.title.toLowerCase()));
    return {
      format: p.format, suites: p.suites, sections: p.sections, cases: p.cases, warnings: p.warnings,
      duplicates: p.alreadyImported + p.rows.filter((r) => titles.has(r.title.toLowerCase())).length,
    };
  }),
  runImport: (projectId, file, options) => sim(() => {
    need(projectId, 'settings.import');
    const p = prepareImport(projectId, file);
    return db().transaction((tx) => {
      const proj = project(projectId);
      let counter = proj.case_counter;
      let imported = 0;
      let skipped = p.alreadyImported; // same source key as an existing case: BR-5, no duplicate
      const errors = [...p.errors];
      const existing = new Set(tx.list<TestCase>('test_cases', (c) => c.project === projectId).map((c) => c.title.toLowerCase()));
      const prios = tx.list<Priority>('priorities');
      const types = tx.list<CaseType>('case_types');
      const suites = new Map<string, TestSuite>();
      const sections = new Map<string, TestSection>();
      const suiteFor = (name: string): TestSuite => {
        const hit = suites.get(name) ?? tx.find<TestSuite>('test_suites', (x) => x.project === projectId && x.name === name);
        if (hit) { suites.set(name, hit); return hit; }
        const made = tx.create<TestSuite>('test_suites', { project: projectId, name, is_baseline: false, is_completed: false });
        audit(projectId, 'suite.create', 'suite', made.id, undefined, { name });
        suites.set(name, made);
        return made;
      };
      const sectionFor = (suite: TestSuite, path: string[]): TestSection => {
        // Sections nest one level only: deeper TestRail paths collapse into one sub-section name.
        const top = path[0] ?? 'Imported';
        const sub = path.length > 1 ? path.slice(1).join(' / ') : undefined;
        const mk = (name: string, parent?: Id): TestSection => {
          const k = `${suite.id}\u0000${parent ?? ''}\u0000${name}`;
          const cached = sections.get(k);
          if (cached) return cached;
          const hit = tx.find<TestSection>('test_sections', (x) => x.suite === suite.id && x.name === name && x.parent === parent)
            ?? (() => {
              const made = tx.create<TestSection>('test_sections', { project: projectId, suite: suite.id, parent, name, position: tx.count<TestSection>('test_sections', (x) => x.suite === suite.id && x.parent === parent) });
              audit(projectId, 'section.create', 'section', made.id, undefined, { name });
              return made;
            })();
          sections.set(k, hit);
          return hit;
        };
        const parent = mk(top);
        return sub ? mk(sub, parent.id) : parent;
      };
      for (const r of p.rows) {
        if (!r.title.trim()) { errors.push({ row: r.index, message: 'Case has no title.' }); continue; }
        if (options.skipDuplicates && existing.has(r.title.trim().toLowerCase())) { skipped += 1; continue; }
        const suite = suiteFor(r.suite);
        const section = sectionFor(suite, r.sectionPath);
        counter += 1;
        const prio = options.mapPriorities && r.priority ? prios.find((x) => x.name.toLowerCase() === r.priority?.toLowerCase())?.id : undefined;
        const type = r.type ? types.find((x) => x.name.toLowerCase() === r.type?.toLowerCase())?.id : undefined;
        const tc = tx.create<TestCase>('test_cases', {
          project: projectId, suite: suite.id, section: section.id, ref: `${proj.ref_prefix}-C${counter}`, source_key: r.source_key, title: r.title.trim(), content: r.content,
          priority: prio, type, refs: r.refs, estimate: r.estimate, automation_status: 'not_specified', version: 1, deprecated: false, created_by: me().id, updated_by: me().id,
        });
        const steps = r.steps.map((s, i) => tx.create<TestStep>('test_steps', { case: tc.id, position: i + 1, description: s.description, expected_result: s.expected_result || undefined }));
        tx.create<TestCaseVersion>('test_case_versions', { case: tc.id, project: projectId, version: 1, snapshot: snapshotOf(tc, steps), saved_by: me().id });
        audit(projectId, 'case.create', 'case', tc.id, undefined, { ref: tc.ref, title: tc.title, source_key: r.source_key });
        existing.add(r.title.trim().toLowerCase());
        imported += 1;
      }
      tx.update<Project>('projects', projectId, { case_counter: counter });
      return { imported, skipped, errors };
    });
  }, { write: true }),
};

export type { RunSummary, ProjectMember, ProjectRole, TestStatusKey };
void can; void caseDetail; void describeAudit;
