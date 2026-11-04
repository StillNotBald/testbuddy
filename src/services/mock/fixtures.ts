import type {
  AuditLog, AutomationExecution, AutomationMapping, BaseRecord, CaseType, CiToken, Milestone, Priority, Project,
  ProjectMember, ProjectRole, Status, Tag, TestAttachment, TestCase, TestCaseTag, TestCaseVersion, TestPlan,
  TestResult, TestRun, TestRunCase, TestSection, TestStep, TestStepResult, TestSuite, User, Workspace, WorkspaceMember,
  AutomationStatus,
} from '../types';
import type { DbData } from './mockdb';
import { createRng, distribute, int, pick, shuffle, type Rng } from './rng';
import {
  BLOCK_COMMENTS, CONTENT_BANK, FAIL_COMMENTS, FILLER_STEP, MOB_TITLES, PASS_COMMENTS, RETEST_COMMENTS,
  SECTION_DEFS, STEP_BANK, VERSION_NOTES, type Family,
} from './fixtures-text';

/**
 * Deterministic mock dataset implementing docs/design/mock-data.md.
 * Fixed seed, fixed "now". See the report for the two documented deviations
 * (run sizes follow one-suite-per-run; counts are scaled accordingly).
 */
export const FIXTURE_NOW = '2026-11-04T09:00:00.000Z';
export const FIXTURE_SEED = 20261104;
const NOW = Date.parse(FIXTURE_NOW);
const DAY = 86_400_000;
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (d: number) => iso(NOW - d * DAY);

export const IDS = {
  workspace: 'ws_acme',
  projectCore: 'prj_core',
  projectMob: 'prj_mob',
  users: { avery: 'u_avery', raj: 'u_raj', dana: 'u_dana', sam: 'u_sam', mia: 'u_mia', ci: 'u_ci', alex: 'u_alex', inactive: 'u_inactive' },
  suites: { web: 'suite_web', api: 'suite_api', mobile: 'suite_mobile', mob: 'suite_mob' },
  milestones: { r24: 'ms_24', r23: 'ms_23' },
  plan: 'plan_24',
  runs: { web: 'run_web', api: 'run_api', r23: 'run_23', mob: 'run_mob' },
  status: { untested: 'st_untested', passed: 'st_passed', blocked: 'st_blocked', retest: 'st_retest', failed: 'st_failed' },
  mappings: { junit: 'am_junit', robot: 'am_robot' },
} as const;

const U = IDS.users;
export const DEMO_PASSWORD = 'demo-only';

type Fields<T extends BaseRecord> = Omit<T, 'created' | 'updated'> & { created?: string; updated?: string };
function rec<T extends BaseRecord>(f: Fields<T>, created: string): T {
  return { created, updated: created, ...f } as T;
}

interface Snapshot { case: Record<string, unknown>; steps: Array<Record<string, unknown>> }

export function buildFixtures(): DbData {
  const rng = createRng(FIXTURE_SEED);
  const db: Record<string, BaseRecord[]> = {};
  const add = <T extends BaseRecord>(name: string, rows: T[]) => { (db[name] ??= []).push(...rows); };
  const firstUsers = [U.avery, U.raj, U.dana, U.sam];

  // ---- identity ----------------------------------------------------------------------------
  const userDefs: Array<[string, string, string, boolean, number]> = [
    [U.avery, 'Avery Quinn', 'avery@example.test', true, 0.1],
    [U.raj, 'Raj Patel', 'raj@example.test', true, 0.5],
    [U.dana, 'Dana Lee', 'dana@example.test', true, 0.1],
    [U.sam, 'Sam Ortiz', 'sam@example.test', true, 1.2],
    [U.mia, 'Mia Chen', 'mia@example.test', true, 3],
    [U.ci, 'CI Bot', 'ci@example.test', true, 0.08],
    [U.alex, 'Alex Kim', 'alex@example.test', true, 6],
    [U.inactive, 'Pat Doe', 'pat@example.test', false, 90],
  ];
  add<User>('users', userDefs.map(([id, name, email, is_active, seen]) => rec<User>({ id, name, email, is_active, last_access: daysAgo(seen / 3) }, daysAgo(200))));
  add<Workspace>('workspaces', [rec<Workspace>({ id: IDS.workspace, name: 'Acme QA', owner: U.avery, settings: {} }, daysAgo(200))]);
  add<WorkspaceMember>('workspace_members', userDefs.map(([id]) => rec<WorkspaceMember>({ id: `wm_${id}`, workspace: IDS.workspace, user: id, role: id === U.avery ? 'admin' : 'member' }, daysAgo(200))));
  add<Project>('projects', [
    rec<Project>({ id: IDS.projectCore, workspace: IDS.workspace, name: 'Core platform', announcement: 'Release freeze Friday 18:00', ref_prefix: 'CORE', case_counter: 120, is_archived: false }, daysAgo(190)),
    rec<Project>({ id: IDS.projectMob, workspace: IDS.workspace, name: 'Mobile app', ref_prefix: 'MOB', case_counter: 20, is_archived: false }, daysAgo(120)),
  ]);
  const coreRoles: Array<[string, ProjectRole]> = [[U.avery, 'admin'], [U.raj, 'manager'], [U.dana, 'tester'], [U.sam, 'tester'], [U.mia, 'viewer'], [U.ci, 'tester']];
  const mobRoles: Array<[string, ProjectRole]> = [[U.avery, 'manager'], [U.raj, 'admin'], [U.alex, 'tester'], [U.dana, 'tester'], [U.mia, 'viewer'], [U.sam, 'viewer']];
  add<ProjectMember>('project_members', [
    ...coreRoles.map(([u, role]) => rec<ProjectMember>({ id: `pm_core_${u}`, project: IDS.projectCore, user: u, role }, daysAgo(180))),
    ...mobRoles.map(([u, role]) => rec<ProjectMember>({ id: `pm_mob_${u}`, project: IDS.projectMob, user: u, role }, daysAgo(110))),
  ]);

  // ---- lookups -----------------------------------------------------------------------------
  const typeNames = ['Functional', 'Smoke', 'Regression', 'UI', 'Performance', 'Security'];
  add<CaseType>('case_types', typeNames.map((name, i) => rec<CaseType>({ id: `ct_${name.toLowerCase()}`, name, sort_order: i }, daysAgo(200))));
  const prios: Array<[string, string, string]> = [['P1', 'Critical', '#d03a2f'], ['P2', 'Major', '#c27803'], ['P3', 'Minor', '#2d6bf5'], ['P4', 'Trivial', '#6b7080']];
  add<Priority>('priorities', prios.map(([short, name, color], i) => rec<Priority>({ id: `pr_${short.toLowerCase()}`, name, short_name: short, color, sort_order: i }, daysAgo(200))));
  const st: Array<[string, string, string, boolean, boolean, string | undefined]> = [
    [IDS.status.untested, 'Untested', '#8e93a1', false, false, undefined],
    [IDS.status.passed, 'Passed', '#0b8a6a', true, false, undefined],
    [IDS.status.blocked, 'Blocked', '#c27803', false, true, 'require_comment'],
    [IDS.status.retest, 'Retest', '#0072b2', false, false, undefined],
    [IDS.status.failed, 'Failed', '#d03a2f', false, true, 'require_comment'],
  ];
  add<Status>('statuses', st.map(([id, name, color, is_passing, is_failing, flags], i) => rec<Status>({ id, name, color, is_passing, is_failing, flags, sort_order: i }, daysAgo(200))));

  const tagDefs: Array<[string, string]> = [['smoke', '#0b8a6a'], ['regression', '#2d6bf5'], ['auth', '#7a5af8'], ['checkout', '#c27803'], ['api', '#0072b2'], ['mobile', '#d03a2f'], ['flaky', '#c27803'], ['slow', '#6b7080'], ['a11y', '#0b8a6a'], ['payments', '#2d6bf5']];
  add<Tag>('tags', tagDefs.map(([name, color]) => rec<Tag>({ id: `tag_${name}`, project: IDS.projectCore, name, color }, daysAgo(180))));

  // ---- CORE suites and sections ------------------------------------------------------------
  add<TestSuite>('test_suites', [
    rec<TestSuite>({ id: IDS.suites.web, project: IDS.projectCore, name: 'Web app', description: 'Customer-facing web application.', is_baseline: true, is_completed: false }, daysAgo(180)),
    rec<TestSuite>({ id: IDS.suites.api, project: IDS.projectCore, name: 'API', description: 'Public REST API.', is_baseline: false, is_completed: false }, daysAgo(180)),
    rec<TestSuite>({ id: IDS.suites.mobile, project: IDS.projectCore, name: 'Mobile web', description: 'Responsive behaviour on phones.', is_baseline: false, is_completed: false }, daysAgo(170)),
    rec<TestSuite>({ id: IDS.suites.mob, project: IDS.projectMob, name: 'Mobile app', is_baseline: false, is_completed: false }, daysAgo(110)),
  ]);
  const suiteOf = { web: IDS.suites.web, api: IDS.suites.api, mobile: IDS.suites.mobile } as const;
  const sections = SECTION_DEFS.map((s, i) =>
    rec<TestSection>({ id: s.id, project: IDS.projectCore, suite: suiteOf[s.suite], parent: s.parent, name: s.name, position: i }, daysAgo(180)));
  sections.push(rec<TestSection>({ id: 'sec_mob_all', project: IDS.projectMob, suite: IDS.suites.mob, name: 'Smoke', position: 0 }, daysAgo(110)));
  add('test_sections', sections);

  // ---- cases -------------------------------------------------------------------------------
  interface Draft { n: number; project: string; suite: string; sectionId: string; family: Family; title: string }
  const drafts: Draft[] = [];
  for (const s of SECTION_DEFS) for (const title of s.titles) drafts.push({ n: drafts.length + 1, project: IDS.projectCore, suite: suiteOf[s.suite], sectionId: s.id, family: s.family, title });
  const coreCount = drafts.length; // 120
  const long = (n: number, base: string, tail: string) => (base + tail);
  const T = (n: number, f: (t: string) => string) => { const d = drafts[n - 1]; if (d) d.title = f(d.title); };
  T(14, (t) => long(14, t, ' when the user opens the page in two tabs, switches language and reloads before the session refresh completes'));
  T(28, (t) => long(28, t, ' after the user has changed their shipping country twice and removed the last item from the basket'));
  T(47, (t) => long(47, t, ' with a very long value that exceeds the maximum length shown in the list view and wraps onto several lines'));
  T(66, (t) => long(66, t, ' when the upstream service responds slowly, times out once and then recovers within the retry budget'));
  T(118, (t) => `${t} – صفحات التخزين المؤقت`);
  MOB_TITLES.forEach((title, i) => drafts.push({ n: coreCount + i + 1, project: IDS.projectMob, suite: IDS.suites.mob, sectionId: 'sec_mob_all', family: 'mobile', title }));

  const deprecatedN = new Set([8, 21, 35, 52, 107, 115]);
  const manyStepsN = new Set([24, 63, 90]);
  const noTagsN = new Set([31, 70, 109]);
  const refsN: Record<number, string> = { 3: 'JIRA-123, JIRA-456', 63: 'JIRA-123, JIRA-456', 12: 'JIRA-201', 40: 'JIRA-318', 77: 'JIRA-402' };
  const multiVersionN = [3, 2, 5, 9, 12, 16, 19, 22, 26, 30, 33, 37, 40, 44, 48, 53, 57, 63, 68, 72, 78, 84, 90, 96, 99, 102, 106, 110, 113, 117];
  const staleN = [2, 5, 9, 12, 16];

  const prioIds = distribute(rng, drafts.length, [['pr_p1', 15], ['pr_p2', 35], ['pr_p3', 35], ['pr_p4', 15]] as const);
  const typeIds = distribute(rng, drafts.length, [['ct_functional', 50], ['ct_regression', 20], ['ct_smoke', 15], ['ct_ui', 8], ['ct_security', 5], ['ct_performance', 2]] as const);
  const autoVals = distribute<AutomationStatus>(rng, drafts.length, [['automated', 35], ['needs_automation', 20], ['needs_review', 10], ['in_progress', 5], ['not_specified', 25], ['not_automatable', 5]]);
  const stepCountWeights: Array<[number, number]> = [[2, 15], [3, 25], [4, 25], [5, 15], [6, 10], [7, 5], [8, 5]];

  const cases: TestCase[] = [];
  const steps: TestStep[] = [];
  const caseTags: TestCaseTag[] = [];
  const versions: TestCaseVersion[] = [];
  const snapshotsLive = new Map<string, Snapshot>();
  const stepsOf = new Map<string, TestStep[]>();
  const caseIdOf = (n: number) => `c_${n}`;

  const extraVersions = new Map<number, number>(multiVersionN.map((n, i) => [n, i === 0 ? 4 : int(rng, 1, 4)]));

  drafts.forEach((d, idx) => {
    const id = caseIdOf(d.n);
    const created = iso(NOW - int(rng, 30, 150) * DAY - int(rng, 0, 20) * HOUR);
    const nSteps = manyStepsN.has(d.n) ? int(rng, 12, 14) : distributeOne(rng, stepCountWeights);
    const bank = STEP_BANK[d.family];
    const rows: TestStep[] = [];
    for (let k = 0; k < nSteps; k += 1) {
      const [description, expected] = k < bank.length ? (bank[k] as [string, string]) : [`${FILLER_STEP[0]} (${k + 1})`, FILLER_STEP[1]];
      rows.push(rec<TestStep>({ id: `st_${d.n}_${k + 1}`, case: id, position: k + 1, description, expected_result: expected }, created));
    }
    const seq = extraVersions.get(d.n);
    const version = 1 + (seq ?? 0);
    const deprecated = deprecatedN.has(d.n);
    const tc = rec<TestCase>({
      id, project: d.project, suite: d.suite, section: d.sectionId,
      ref: `${d.project === IDS.projectCore ? 'CORE' : 'MOB'}-C${d.project === IDS.projectCore ? d.n : d.n - coreCount}`,
      title: d.title,
      content: d.n === 45 ? '<script>alert("x")</script> <b>Preconditions</b> & "quoted" <img src=x onerror=alert(1)>' : CONTENT_BANK[d.family],
      priority: prioIds[idx], type: typeIds[idx], automation_status: autoVals[idx] as AutomationStatus,
      estimate: rng() < 0.7 ? int(rng, 2, 60) * 30 : undefined,
      version, deprecated,
      deprecated_reason: deprecated ? pick(rng, ['Feature removed in 2.4', 'Replaced by an API-level check', 'Duplicate of another case']) : undefined,
      refs: refsN[d.n] ?? (rng() < 0.08 ? `JIRA-${int(rng, 100, 999)}` : undefined),
      created_by: pick(rng, firstUsers), updated_by: pick(rng, firstUsers),
      updated: iso(NOW - int(rng, 1, 25) * DAY),
    }, created);
    cases.push(tc);
    steps.push(...rows);
    stepsOf.set(id, rows);

    // tags
    if (!noTagsN.has(d.n)) {
      const t = new Set<string>();
      const sec = d.sectionId;
      if (sec === 'sec_login' || sec === 'sec_auth' || sec === 'sec_registration') t.add('auth');
      if (sec === 'sec_checkout') t.add('checkout');
      if (sec === 'sec_payments') { t.add('payments'); t.add('checkout'); }
      if (d.family === 'api' || d.family === 'webhook') t.add('api');
      if (d.family === 'mobile' && d.project === IDS.projectCore) t.add('mobile');
      if (rng() < 0.3) t.add('smoke'); if (rng() < 0.35) t.add('regression');
      if (rng() < 0.06) t.add('flaky'); if (rng() < 0.06) t.add('slow'); if (rng() < 0.05) t.add('a11y');
      if (t.size === 0) t.add('regression');
      if (d.project === IDS.projectCore) for (const name of t) caseTags.push(rec<TestCaseTag>({ id: `ctag_${d.n}_${name}`, case: id, tag: `tag_${name}` }, created));
    }
  });
  add('test_cases', cases);
  add('test_steps', steps);
  add('test_case_tags', caseTags);

  // versions: live snapshot is the highest; earlier versions are derived by degrading it
  const snapOf = (tc: TestCase, rows: TestStep[]): Snapshot => ({
    case: { ref: tc.ref, title: tc.title, content: tc.content, priority: tc.priority, type: tc.type, automation_status: tc.automation_status, estimate: tc.estimate, refs: tc.refs, version: tc.version },
    steps: rows.map((s) => ({ position: s.position, description: s.description, expected_result: s.expected_result })),
  });
  for (const tc of cases) {
    const rows = stepsOf.get(tc.id) ?? [];
    const live = snapOf(tc, rows);
    snapshotsLive.set(tc.id, live);
    let cur = live;
    const list: Snapshot[] = [live];
    for (let v = tc.version - 1; v >= 1; v -= 1) {
      cur = degrade(rng, cur, v);
      list.push(cur);
    }
    list.forEach((snap, i) => {
      const v = tc.version - i;
      const createdMs = Date.parse(tc.created) + (v - 1) * ((NOW - Date.parse(tc.created)) / (tc.version + 1));
      versions.push(rec<TestCaseVersion>({
        id: `cv_${tc.id}_${v}`, case: tc.id, project: tc.project, version: v,
        snapshot: { ...snap, case: { ...snap.case, version: v } },
        note: v === 1 ? undefined : pick(rng, VERSION_NOTES), saved_by: pick(rng, firstUsers),
      }, iso(createdMs)));
    });
  }
  add('test_case_versions', versions);

  // ---- milestones, plan ---------------------------------------------------------------------
  add<Milestone>('milestones', [
    rec<Milestone>({ id: IDS.milestones.r24, project: IDS.projectCore, title: 'Release 2.4', description: 'Checkout redesign and API v2 rollout.', expires_on: iso(NOW + 6 * DAY), is_completed: false, refs: 'JIRA-500' }, daysAgo(40)),
    rec<Milestone>({ id: IDS.milestones.r23, project: IDS.projectCore, title: 'Release 2.3', description: 'Login hardening release.', expires_on: iso(NOW - 20 * DAY), is_completed: true }, daysAgo(90)),
  ]);
  add<TestPlan>('test_plans', [
    rec<TestPlan>({ id: IDS.plan, project: IDS.projectCore, name: 'Release 2.4 regression', description: 'Regression across web and API for 2.4.', type: 'Regression', milestones: [IDS.milestones.r24], builds: '2.4-rc1', owner: U.raj, is_completed: false }, daysAgo(12)),
  ]);

  // ---- runs, tests, results ------------------------------------------------------------------
  const nonDeprecated = (suite: string) => cases.filter((c) => c.suite === suite && !c.deprecated);
  const webCases = nonDeprecated(IDS.suites.web);
  const staleIds = new Set(staleN.map(caseIdOf));
  const webPick = [...staleN.map(caseIdOf), ...shuffle(rng, webCases.map((c) => c.id).filter((id) => !staleIds.has(id))).slice(0, 33)];
  webPick.sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));

  interface RunSpec {
    id: string; project: string; suite: string; plan?: string; milestone?: string; name: string; build: string; assigned: string; caseIds: string[];
    counts: Record<'passed' | 'failed' | 'blocked' | 'retest' | 'untested', number>; startDaysAgo: number; endDaysAgo: number; closed: boolean; includeAll: boolean; stale?: Set<string>; description?: string; createdBy: string;
  }
  const specs: RunSpec[] = [
    { id: IDS.runs.web, project: IDS.projectCore, suite: IDS.suites.web, plan: IDS.plan, milestone: IDS.milestones.r24, name: 'Web smoke 2.4-rc1', build: '2.4-rc1', assigned: U.dana, caseIds: webPick, counts: { passed: 20, failed: 3, blocked: 1, retest: 0, untested: 14 }, startDaysAgo: 3, endDaysAgo: 0, closed: false, includeAll: false, stale: staleIds, description: 'Smoke pass over the main web flows for the 2.4 release candidate.', createdBy: U.raj },
    { id: IDS.runs.api, project: IDS.projectCore, suite: IDS.suites.api, plan: IDS.plan, milestone: IDS.milestones.r24, name: 'API regression 2.4-rc1', build: '2.4-rc1', assigned: U.sam, caseIds: nonDeprecated(IDS.suites.api).map((c) => c.id), counts: { passed: 27, failed: 4, blocked: 1, retest: 3, untested: 5 }, startDaysAgo: 3, endDaysAgo: 0, closed: false, includeAll: true, createdBy: U.raj },
    { id: IDS.runs.r23, project: IDS.projectCore, suite: IDS.suites.web, milestone: IDS.milestones.r23, name: 'Release 2.3 full regression', build: '2.3.0', assigned: U.raj, caseIds: cases.filter((c) => c.suite === IDS.suites.web).map((c) => c.id), counts: { passed: 54, failed: 3, blocked: 2, retest: 0, untested: 1 }, startDaysAgo: 30, endDaysAgo: 21, closed: true, includeAll: true, createdBy: U.raj },
    { id: IDS.runs.mob, project: IDS.projectMob, suite: IDS.suites.mob, name: 'Mobile smoke 2.4-rc1', build: '2.4-rc1', assigned: U.alex, caseIds: cases.filter((c) => c.project === IDS.projectMob).map((c) => c.id), counts: { passed: 12, failed: 2, blocked: 1, retest: 1, untested: 4 }, startDaysAgo: 2, endDaysAgo: 0, closed: false, includeAll: true, createdBy: U.avery },
  ];
  const statusId = { passed: IDS.status.passed, failed: IDS.status.failed, blocked: IDS.status.blocked, retest: IDS.status.retest, untested: IDS.status.untested } as const;
  const runs: TestRun[] = [];
  const tests: TestRunCase[] = [];
  const results: TestResult[] = [];
  const stepResults: TestStepResult[] = [];
  const attachments: TestAttachment[] = [];
  const caseById = new Map(cases.map((c) => [c.id, c]));
  let resultSeq = 0;
  let failedWithDefects = 0;
  let twoDefects = 0;
  const historyBudget = { web: 5, api: 7 };
  const attachPool: Array<[string, string]> = [
    ['screenshot-1.png', 'png'], ['screenshot-2.png', 'png'], ['console-error.png', 'png'], ['layout-375px.png', 'png'], ['network-tab.png', 'png'],
    ['response-body.png', 'png'], ['mobile-safari.png', 'png'], ['error-banner.png', 'png'], ['totals.png', 'png'], ['spinner.png', 'png'],
    ['spec-excerpt.pdf', 'pdf'], ['trace-report.pdf', 'pdf'], ['request.json', 'json'], ['server.log.txt', 'txt'],
  ];
  let attachSeq = 0;
  let steppedTests = 0;

  for (const sp of specs) {
    const start = NOW - sp.startDaysAgo * DAY;
    const end = NOW - sp.endDaysAgo * DAY - (sp.closed ? 0 : 20 * 60_000);
    runs.push(rec<TestRun>({
      id: sp.id, project: sp.project, suite: sp.suite, plan: sp.plan, name: sp.name, description: sp.description, milestone: sp.milestone,
      include_all: sp.includeAll, case_ids: sp.includeAll ? undefined : sp.caseIds, build: sp.build, assigned_to: sp.assigned,
      started_on: iso(start), finished_on: sp.closed ? iso(NOW - sp.endDaysAgo * DAY) : undefined, is_closed: sp.closed, created_by: sp.createdBy,
      updated: sp.closed ? iso(NOW - sp.endDaysAgo * DAY) : iso(NOW - 25 * 60_000),
    }, iso(start - HOUR)));
    const keys = shuffle(rng, (Object.keys(sp.counts) as Array<keyof typeof sp.counts>).flatMap((k) => Array<keyof typeof sp.counts>(sp.counts[k]).fill(k)));
    const isWeb = sp.id === IDS.runs.web;
    const isApi = sp.id === IDS.runs.api;
    // choose which passed tests get a Failed -> Retest -> Passed history (open runs only)
    let historyLeft = isWeb ? historyBudget.web : isApi ? historyBudget.api : 0;
    sp.caseIds.forEach((cid, i) => {
      const tc = caseById.get(cid) as TestCase;
      const snap = snapshotsLive.get(cid) as Snapshot;
      const snapVersion = sp.stale?.has(cid) ? Math.max(1, tc.version - 1) : tc.version;
      const snapshot = sp.stale?.has(cid)
        ? (versions.find((v) => v.case === cid && v.version === snapVersion) as TestCaseVersion).snapshot
        : { case: snap.case, steps: snap.steps };
      const finalKey = keys[i] as keyof typeof sp.counts;
      const testId = `t_${sp.id}_${i + 1}`;
      const assigned = isWeb ? (rng() < 0.9 ? U.dana : undefined) : isApi ? (rng() < 0.85 ? U.sam : pick(rng, [U.dana, U.raj])) : sp.id === IDS.runs.mob ? U.alex : (rng() < 0.7 ? sp.assigned : undefined);
      // sequence of statuses for this test
      let seq: Array<keyof typeof sp.counts> = finalKey === 'untested' ? [] : [finalKey];
      if (finalKey === 'passed' && historyLeft > 0 && !sp.closed) {
        seq = pick(rng, [['failed', 'passed'], ['failed', 'retest', 'passed'], ['failed', 'retest', 'failed', 'passed']] as Array<Array<keyof typeof sp.counts>>);
        historyLeft -= 1;
      }
      const lastRaw = seq[seq.length - 1];
      const winStart = sp.closed ? start + HOUR : start + HOUR;
      const first = winStart + rng() * 0.6 * (end - winStart);
      const gap = (end - first) / (seq.length + 1);
      let lastResultId: string | undefined;
      let lastResult: TestResult | undefined;
      seq.forEach((k, j) => {
        resultSeq += 1;
        const at = iso(Math.min(end, first + gap * j * (0.6 + rng() * 0.4)));
        const flagged = k === 'failed' || k === 'blocked';
        const comment = k === 'failed' ? FAIL_COMMENTS[(resultSeq - 1) % FAIL_COMMENTS.length] : k === 'blocked' ? pick(rng, BLOCK_COMMENTS) : k === 'retest' ? pick(rng, RETEST_COMMENTS) : rng() < 0.4 ? pick(rng, PASS_COMMENTS) : undefined;
        let defects: string[] | undefined;
        if (k === 'failed' && failedWithDefects < 8) {
          failedWithDefects += 1;
          defects = twoDefects < 3 && failedWithDefects % 3 === 0 ? (twoDefects += 1, [`JIRA-${500 + failedWithDefects}`, `JIRA-${520 + failedWithDefects}`]) : [`JIRA-${500 + failedWithDefects}`];
        }
        const res = rec<TestResult>({
          id: `r_${resultSeq}`, project: sp.project, run: sp.id, test: testId, case: cid, status: statusId[k], comment: flagged && !comment ? 'See notes.' : comment, version: snapVersion,
          elapsed: rng() < 0.8 ? int(rng, 20, 900) : undefined, defects, build: sp.build, assigned_to: assigned,
          created_by: j === seq.length - 1 && sp.id === IDS.runs.web ? (assigned ?? U.dana) : pick(rng, [U.dana, U.sam, U.raj, U.avery]), updated: at,
        }, at);
        results.push(res);
        lastResultId = res.id;
        lastResult = res;
        if (k === 'failed' && attachSeq < attachPool.length && rng() < 0.7) {
          const [name] = attachPool[attachSeq] as [string, string];
          attachSeq += 1;
          attachments.push(rec<TestAttachment>({ id: `att_${attachSeq}`, result: res.id, project: sp.project, run: sp.id, file: `${res.id}_${name}`, original_name: name, created_by: res.created_by }, at));
        }
      });
      // 2 tests in Web smoke have per-step results (Failed on step 3)
      if (isWeb && lastRaw === 'failed' && lastResult && steppedTests < 2 && (snapshot.steps.length >= 3)) {
        steppedTests += 1;
        for (let p = 1; p <= 3; p += 1) {
          stepResults.push(rec<TestStepResult>({
            id: `sr_${lastResult.id}_${p}`, result: lastResult.id, test: testId, step_position: p,
            status: p < 3 ? IDS.status.passed : IDS.status.failed, comment: p === 3 ? 'Expected result not met at this step.' : undefined,
          }, lastResult.created));
        }
      }
      tests.push(rec<TestRunCase>({
        id: testId, run: sp.id, project: sp.project, case: cid, version: snapVersion, case_snapshot: snapshot, assigned_to: assigned,
        status: lastRaw ? statusId[lastRaw] : IDS.status.untested, updated: lastResult?.created ?? iso(start),
      }, iso(start - HOUR)));
      void lastResultId;
    });
  }
  // attach any remaining pool entries to failed results so there are 14 attachments
  if (attachSeq < attachPool.length) {
    const failed = results.filter((r) => r.status === IDS.status.failed && !attachments.some((a) => a.result === r.id));
    for (const r of failed) {
      if (attachSeq >= attachPool.length) break;
      const [name] = attachPool[attachSeq] as [string, string];
      attachSeq += 1;
      attachments.push(rec<TestAttachment>({ id: `att_${attachSeq}`, result: r.id, project: r.project, run: r.run, file: `${r.id}_${name}`, original_name: name, created_by: r.created_by }, r.created));
    }
  }
  add('test_runs', runs);
  add('test_run_cases', tests);
  add('test_results', results);
  add('test_step_results', stepResults);
  add('test_attachments', attachments);

  // ---- automation ---------------------------------------------------------------------------
  add<AutomationMapping>('automation_mappings', [
    rec<AutomationMapping>({ id: IDS.mappings.junit, project: IDS.projectCore, framework: 'junit', field_map: { match: 'classname.name', strip_prefix: 'com.acme.' }, token_prefix: 'tb_demo_9f3a', run_as: U.ci, is_active: true }, daysAgo(60)),
    rec<AutomationMapping>({ id: IDS.mappings.robot, project: IDS.projectCore, framework: 'robot', field_map: { match: 'name' }, token_prefix: 'tb_demo_71d0', run_as: U.ci, is_active: false }, daysAgo(30)),
  ]);
  const ex = (id: string, ext: string, build: string, branch: string, commit: string, status: AutomationExecution['status'], summary: Record<string, unknown>, ago: number, run?: string) =>
    rec<AutomationExecution>({ id, mapping: IDS.mappings.junit, external_execution_id: ext, run, build, branch, commit, summary, status }, iso(NOW - ago));
  add<AutomationExecution>('automation_executions', [
    ex('ex_1', 'gh-4411', '2.4-rc1', 'main', 'a1b2c3d', 'completed', { passed: 120, failed: 3, skipped: 0, duration_s: 412, unmatched: [], errors: [] }, 3 * HOUR, IDS.runs.api),
    ex('ex_2', 'gh-4410', '2.4-rc0', 'main', '9f8e7d6', 'completed', { passed: 118, failed: 5, skipped: 1, duration_s: 398, unmatched: [], errors: [] }, 26 * HOUR),
    ex('ex_3', 'gh-4409', '2.4-rc0', 'feature/login-lockout', '5d4c3b2', 'completed', { passed: 61, failed: 0, skipped: 2, duration_s: 210, unmatched: ['LoginTest.lockout_after_five', 'LoginTest.lockout_reset'], errors: [] }, 2 * DAY),
    ex('ex_4', 'gh-4408', '2.3.1', 'release/2.3', '1c2d3e4', 'failed', { passed: 0, failed: 0, skipped: 0, duration_s: 4, unmatched: [], errors: [{ id: 'import', message: 'Malformed XML at line 88' }] }, 9 * DAY),
    ex('ex_5', 'gh-4412', '2.4-rc1', 'main', 'c0ffee1', 'in_progress', { passed: 0, failed: 0, skipped: 0, duration_s: 0, unmatched: [], errors: [] }, 6 * 60_000),
    ex('ex_6', 'gh-4400', '2.3.0', 'main', 'deadbee', 'completed', { passed: 119, failed: 4, skipped: 0, duration_s: 405, unmatched: [], errors: [] }, 22 * DAY),
  ]);
  add<CiToken>('ci_tokens', [
    rec<CiToken>({ id: 'tok_gh', project: IDS.projectCore, name: 'gh-actions', mapping: IDS.mappings.junit, prefix: 'tb_demo_9f3a', last4: 'c21e', last_used: iso(NOW - 2 * HOUR), revoked: false }, daysAgo(5)),
    rec<CiToken>({ id: 'tok_nightly', project: IDS.projectCore, name: 'nightly', mapping: IDS.mappings.robot, prefix: 'tb_demo_71d0', last4: '88af', revoked: false }, daysAgo(3)),
  ]);

  // ---- audit log (60 rows) ------------------------------------------------------------------
  add<AuditLog>('audit_logs', buildAudit(rng, results, runs));

  return db as DbData;
}

function distributeOne(rng: Rng, weights: Array<[number, number]>): number {
  return distribute(rng, 20, weights)[0] as number;
}

/** Produce an earlier version of a snapshot by undoing one small change. */
function degrade(rng: Rng, snap: Snapshot, toVersion: number): Snapshot {
  const next: Snapshot = { case: { ...snap.case }, steps: snap.steps.map((s) => ({ ...s })) };
  const kind = (toVersion + Math.floor(rng() * 4)) % 5;
  const title = String(next.case.title ?? '');
  if (kind === 0) next.case.title = title.replace(/^(\S+ \S+)/, '$1 (draft)').slice(0, 120);
  else if (kind === 1 && next.steps.length > 2) next.steps = next.steps.slice(0, -1);
  else if (kind === 2 && next.steps.length > 1) { const s = next.steps[0] as Record<string, unknown>; next.steps[0] = { ...s, expected_result: `${String(s.expected_result ?? '')} (old wording)` }; }
  else if (kind === 3 && next.steps.length > 2) { const [a, b] = [next.steps[0], next.steps[1]] as Array<Record<string, unknown>>; next.steps[0] = { ...(b as object), position: 1 }; next.steps[1] = { ...(a as object), position: 2 }; }
  else next.case.priority = next.case.priority === 'pr_p1' ? 'pr_p2' : 'pr_p1';
  return next;
}

function buildAudit(rng: Rng, results: TestResult[], runs: TestRun[]): AuditLog[] {
  const rows: AuditLog[] = [];
  const actors = [U.dana, U.raj, U.sam, U.avery];
  const fixed: string[] = ['case.create', 'case.update', 'case.delete', 'run.create', 'run.close', 'result.create', 'result.delete', 'result.delete', 'member.add', 'member.role_change', 'member.remove', 'project.update', 'token.create', 'token.revoke'];
  const weighted: string[] = ['result.create', 'result.create', 'result.create', 'result.create', 'case.update', 'case.update', 'case.create', 'run.create', 'member.role_change', 'project.update'];
  const actions = [...fixed];
  while (actions.length < 60) actions.push(pick(rng, weighted));
  const ordered = shuffle(rng, actions);
  const gone = new Set([5, 22, 41]); // rows whose entity no longer exists
  ordered.forEach((action, i) => {
    const at = iso(NOW - (i * 5.3 + rng() * 2) * HOUR);
    const [entityType] = action.split('.') as [string];
    const actor = i === 11 || i === 37 ? undefined : pick(rng, actors);
    let entity_id = '';
    let before: Record<string, unknown> | undefined;
    let after: Record<string, unknown> | undefined;
    switch (entityType) {
      case 'case': entity_id = `c_${int(rng, 1, 120)}`; before = action === 'case.create' ? undefined : { title: 'Old title', priority: 'pr_p2' }; after = action === 'case.delete' ? undefined : { title: 'Updated title', priority: 'pr_p1', version: int(rng, 2, 5) }; break;
      case 'run': entity_id = (pick(rng, runs.slice(0, 3)) as TestRun).id; before = action === 'run.close' ? { is_closed: false } : undefined; after = action === 'run.close' ? { is_closed: true } : { name: 'New run', build: '2.4-rc1' }; break;
      case 'result': { const r = pick(rng, results); entity_id = r.id; before = action === 'result.delete' ? { status: r.status, comment: r.comment } : { status: IDS.status.retest }; after = action === 'result.delete' ? undefined : { status: r.status, elapsed: r.elapsed ?? 0 }; break; }
      case 'member': entity_id = pick(rng, [`pm_core_${U.mia}`, `pm_core_${U.sam}`, `pm_core_${U.dana}`]); before = action === 'member.add' ? undefined : { role: 'tester' }; after = action === 'member.remove' ? undefined : { role: action === 'member.add' ? 'viewer' : 'manager' }; break;
      case 'project': entity_id = IDS.projectCore; before = { announcement: 'Old announcement' }; after = { announcement: 'Release freeze Friday 18:00' }; break;
      default: entity_id = pick(rng, ['tok_gh', 'tok_nightly']); before = action === 'token.revoke' ? { revoked: false } : undefined; after = action === 'token.revoke' ? { revoked: true } : { name: 'nightly' };
    }
    if (gone.has(i)) entity_id = `deleted_${i}`;
    rows.push(rec<AuditLog>({
      id: `al_${i + 1}`, project: IDS.projectCore, project_name: 'Core platform', actor, action, entity_type: entityType === 'token' ? 'ci_token' : entityType,
      entity_id, before, after, ip: `10.0.${int(rng, 0, 9)}.${int(rng, 2, 250)}`,
    }, at));
  });
  return rows;
}

export function seedFixtures(): DbData {
  return buildFixtures();
}
