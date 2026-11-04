import type {
  AuditLog, AutomationExecution, AutomationMapping, AutomationStatus, BaseRecord, CiToken, Milestone, Project, ProjectMember,
  ProjectRole, Tag, TestCase, TestCaseTag, TestCaseVersion, TestPlan, TestResult, TestRun, TestRunCase, TestSection, TestStep,
  TestSuite, User, WorkspaceMember,
} from '../types';
import type { DbData } from './mockdb';
import { buildFixtures, FIXTURE_NOW, IDS } from './fixtures';
import { BLOCK_COMMENTS, FAIL_COMMENTS, PASS_COMMENTS, RETEST_COMMENTS, VERSION_NOTES } from './fixtures-text';
import { createRng, distribute, int, pick, shuffle, type Rng } from './rng';

/**
 * "Busy team" demo seed: the standard fixtures (same ids, untouched) plus a large invented layer on top.
 * Deterministic: a fixed seed and the fixed "now" of the standard fixtures. All people are fictional (@example.test),
 * all titles are invented. See docs/design/mock-data.md ("Heavy seed").
 *
 * The default counts are sized so the JSON stays under 4 MB (localStorage). `HeavyOptions` can scale it up for
 * the performance check, which does not persist anything.
 */
export const HEAVY_SEED = 20261105;
/** The serialised size the default seed must stay under (localStorage budget). */
export const HEAVY_SIZE_BUDGET = 4 * 1024 * 1024;

export interface HeavyOptions {
  /** Total CORE cases including the 120 standard ones. */
  coreCases?: number;
  /** Total cases for the other projects: Mobile app, Payments API, Admin console, Data pipeline, Legacy portal. */
  otherCases?: [mob: number, pay: number, adm: number, dat: number, leg: number];
  runs?: number;
  /** Tests in the single largest run (a CORE web run). */
  bigRunTests?: number;
  auditRows?: number;
  /** Also write a version-1 history row for never-edited cases. */
  versionOneRows?: boolean;
}

export const HEAVY_DEFAULTS: Required<HeavyOptions> = {
  coreCases: 900,
  otherCases: [100, 100, 90, 90, 50],
  runs: 34,
  bigRunTests: 300,
  auditRows: 600,
  versionOneRows: false,
};

const NOW = Date.parse(FIXTURE_NOW);
const DAY = 86_400_000;
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const ago = (days: number) => iso(NOW - days * DAY);
const U = IDS.users;
const ST = IDS.status;

// ---- people --------------------------------------------------------------------------------------
const NEW_USERS: Array<[id: string, name: string, email: string, active: boolean, seenDays: number]> = [
  ['u_priya', 'Priya Nair', 'priya@example.test', true, 0.1],
  ['u_tomas', 'Tomas Berg', 'tomas@example.test', true, 0.3],
  ['u_lena', 'Lena Fischer', 'lena@example.test', true, 0.2],
  ['u_omar', 'Omar Haddad', 'omar@example.test', true, 1],
  ['u_yuki', 'Yuki Tanaka', 'yuki@example.test', true, 0.4],
  ['u_grace', 'Grace Mensah', 'grace@example.test', true, 0.1],
  ['u_diego', 'Diego Alvarez', 'diego@example.test', true, 2],
  ['u_hannah', 'Hannah Cohen', 'hannah@example.test', true, 0.6],
  ['u_mateo', 'Mateo Rossi', 'mateo@example.test', true, 5],
  ['u_ines', 'Ines Duarte', 'ines@example.test', true, 0.2],
  ['u_kofi', 'Kofi Boateng', 'kofi@example.test', true, 3],
  ['u_zara', 'Zara Ahmed', 'zara@example.test', true, 0.5],
  ['u_noah', 'Noah Lindqvist', 'noah@example.test', false, 75],
  ['u_elif', 'Elif Demir', 'elif@example.test', false, 120],
];

type Roles = Array<[string, ProjectRole]>;
interface ProjDef {
  key: string; id: string; name: string; prefix: string; created: number; archived: boolean; announcement?: string; roles: Roles;
}
const PAY: ProjDef = {
  key: 'pay', id: 'h_pay', name: 'Payments API', prefix: 'PAY', created: 140, archived: false,
  announcement: 'Sandbox maintenance Thursday 02:00-04:00 UTC. Expect blocked runs.',
  roles: [[U.avery, 'admin'], [U.raj, 'manager'], ['u_priya', 'manager'], ['u_tomas', 'tester'], ['u_lena', 'tester'], ['u_omar', 'tester'], [U.ci, 'tester'], [U.mia, 'viewer'], ['u_noah', 'tester']],
};
const ADM: ProjDef = {
  key: 'adm', id: 'h_adm', name: 'Admin console', prefix: 'ADM', created: 120, archived: false,
  announcement: 'Role editor beta: please log UI defects against the ADM label.',
  roles: [[U.avery, 'admin'], [U.sam, 'manager'], ['u_yuki', 'tester'], ['u_grace', 'tester'], ['u_diego', 'tester'], ['u_hannah', 'viewer'], [U.dana, 'tester']],
};
const DAT: ProjDef = {
  key: 'dat', id: 'h_dat', name: 'Data pipeline', prefix: 'DAT', created: 100, archived: false,
  roles: [[U.avery, 'admin'], ['u_mateo', 'manager'], ['u_ines', 'tester'], ['u_kofi', 'tester'], ['u_zara', 'tester'], [U.ci, 'tester'], [U.raj, 'viewer'], ['u_elif', 'tester']],
};
const LEG: ProjDef = {
  key: 'leg', id: 'h_leg', name: 'Legacy portal', prefix: 'LEG', created: 400, archived: true,
  roles: [[U.avery, 'admin'], [U.raj, 'manager'], ['u_noah', 'tester'], ['u_elif', 'tester']],
};
const NEW_PROJECTS = [PAY, ADM, DAT, LEG];
const CORE_EXTRA_ROLES: Roles = [['u_priya', 'tester'], ['u_tomas', 'tester'], ['u_lena', 'manager'], ['u_yuki', 'tester'], ['u_grace', 'tester'], ['u_ines', 'viewer'], ['u_zara', 'tester'], ['u_kofi', 'tester']];
const MOB_EXTRA_ROLES: Roles = [['u_omar', 'tester'], ['u_diego', 'tester'], ['u_hannah', 'manager'], ['u_mateo', 'tester'], ['u_zara', 'tester']];

// ---- case domains --------------------------------------------------------------------------------
type FeatureDef = [name: string, objects: string[]];
interface SuiteDef { id: string; name?: string; description?: string; weight: number; areas: Array<[area: string, features: string[]]> }
const feature = (s: string): FeatureDef => { const [n, o] = s.split('='); return [n as string, (o as string).split('|')]; };

const CORE_SUITES: SuiteDef[] = [
  { id: IDS.suites.web, weight: 40, areas: [
    ['Account', ['Sign-in=a wrong password|an expired session|a locked account|a remembered device|a new device|a disabled user', 'Password reset=an expired link|a reused link|an unknown email|a weak new password', 'Profile settings=a changed email|an avatar upload|a very long display name|a removed phone number|a changed language']],
    ['Shopping', ['Basket=a removed item|a sold-out item|a changed quantity|a saved basket|a merged guest basket', 'Checkout flow=an expired card|a declined card|a discount code|a gift message|a split shipment|a changed address', 'Wishlist=a shared list|an out-of-stock item|a price drop|a duplicate entry']],
    ['Orders', ['Order history=a cancelled order|a partial refund|a reorder|a very long order list|a filter by date', 'Returns=a late return|a damaged item|a label download|a refund to store credit']],
    ['Discovery', ['Product search=a misspelt query|an empty result|a price filter|a sorted list|a long query', 'Recommendations=a new visitor|a returning customer|a hidden item']],
  ] },
  { id: IDS.suites.api, weight: 17, areas: [
    ['Authentication', ['Token endpoint=an expired token|a revoked token|a missing scope|a clock skew']],
    ['Resources', ['Orders endpoint=a duplicate request|an invalid address|a large payload|a missing field|an unknown id', 'Products endpoint=a paged request|a sparse update|a deleted product|a currency filter']],
    ['Delivery', ['Webhook delivery=a failed delivery|a replayed event|a bad signature|a slow receiver', 'Rate limiting=a burst of requests|a retry header|a shared key']],
  ] },
  { id: IDS.suites.mobile, weight: 7, areas: [
    ['Layout', ['Navigation menu=a narrow screen|a landscape view|a long label|a text size increase']],
    ['Input', ['Forms on phones=a paste event|an autofill|a hardware keyboard|a voice input']],
  ] },
  { id: 'h_s_core_bill', name: 'Billing', description: 'Invoices, subscriptions and tax.', weight: 18, areas: [
    ['Invoices', ['Invoice list=a PDF download|a credit note|a rounding case|a currency change|a void invoice']],
    ['Subscriptions', ['Plan changes=a mid-cycle upgrade|a downgrade|a paused plan|a cancelled plan|a promo code', 'Payment retries=a failed renewal|an updated card|a grace period']],
    ['Tax', ['Tax rules=a reverse-charge customer|a regional rate|a tax-exempt account']],
  ] },
  { id: 'h_s_core_rep', name: 'Reporting', description: 'Dashboards and exports.', weight: 18, areas: [
    ['Dashboards', ['Usage dashboard=a date range|a timezone shift|an empty dataset|a very large dataset']],
    ['Exports', ['CSV export=a comma in a field|a large export|a scheduled export|a cancelled export']],
  ] },
];
const MOB_SUITES: SuiteDef[] = [{ id: IDS.suites.mob, weight: 1, areas: [
  ['Onboarding', ['Welcome tour=a skipped step|a back gesture|a small screen', 'Account creation=a used email|a weak password|a pasted code']],
  ['Device features', ['Push notifications=a muted channel|a denied permission|a delayed delivery', 'Camera upload=a large photo|a denied access|a cancelled capture', 'Biometric unlock=a failed scan|a changed fingerprint|a disabled setting']],
  ['Connectivity', ['Offline mode=a lost connection|a queued action|a restored connection|a long outage', 'Sync=a conflicting edit|a large backlog']],
] }];
const PAY_SUITES: SuiteDef[] = [
  { id: 'h_s_pay_chg', name: 'Charges and captures', weight: 45, areas: [
    ['Charges', ['Create charge=a valid card|an expired card|a declined card|a 3-D Secure challenge|a duplicate idempotency key|a currency mismatch', 'Capture=a partial capture|an expired hold|a voided hold|a second capture']],
    ['Customers', ['Saved cards=a removed card|an expired saved card|a default card change', 'Customer records=a merged customer|a deleted customer|a very long name']],
  ] },
  { id: 'h_s_pay_ref', name: 'Refunds and payouts', weight: 30, areas: [
    ['Refunds', ['Full refund=a settled charge|a pending charge|a disputed charge', 'Partial refund=a rounding case|a second refund|an over-limit amount']],
    ['Payouts', ['Payout schedule=a weekend date|a bank holiday|a negative balance|a minimum threshold', 'Reconciliation report=a missing line|a currency split|a late adjustment']],
  ] },
  { id: 'h_s_pay_web', name: 'Webhooks and security', weight: 25, areas: [
    ['Webhooks', ['Event delivery=a failed delivery|a replayed event|a bad signature|a slow receiver|an out-of-order event']],
    ['Access', ['API keys=a rotated key|a revoked key|a restricted key|a leaked key alert', 'Rate limits=a burst of requests|a retry header|a shared key']],
  ] },
];
const ADM_SUITES: SuiteDef[] = [
  { id: 'h_s_adm_usr', name: 'Users and roles', weight: 60, areas: [
    ['Users', ['User list=a large directory|a search by email|a bulk deactivate|a filter by role', 'Invitations=an expired invite|a resent invite|an existing user|a wrong domain']],
    ['Roles', ['Role editor=a custom role|a removed permission|a role in use|a duplicated role', 'Permission checks=a viewer account|a manager account|a revoked role']],
  ] },
  { id: 'h_s_adm_set', name: 'Settings and audit', weight: 40, areas: [
    ['Settings', ['Workspace settings=a changed name|a changed logo|a locale change', 'Single sign-on setup=a bad certificate|a missing attribute|a test login']],
    ['Audit', ['Audit log viewer=a date range|an actor filter|a large export|a deleted entity']],
  ] },
];
const DAT_SUITES: SuiteDef[] = [
  { id: 'h_s_dat_ing', name: 'Ingestion', weight: 50, areas: [
    ['Sources', ['File ingest=an empty file|a malformed row|a duplicate file|a very large file|a changed header', 'API ingest=a paged response|a rate-limited source|a schema change']],
    ['Streaming', ['Event stream=a late event|a duplicate event|an out-of-order batch|a consumer restart']],
  ] },
  { id: 'h_s_dat_trf', name: 'Transforms and delivery', weight: 50, areas: [
    ['Transforms', ['Cleaning rules=a null value|a trimmed string|a mixed date format|a currency symbol', 'Joins=a missing key|a duplicate key|a late-arriving row']],
    ['Delivery', ['Warehouse load=a failed batch|a partial load|a rerun|a schema drift', 'Data quality alerts=a threshold breach|a muted alert|a recovered metric']],
  ] },
];
const LEG_SUITES: SuiteDef[] = [{ id: 'h_s_leg_por', name: 'Portal', weight: 1, areas: [
  ['Customer portal', ['Login page=a forgotten password|a lockout|a stale bookmark', 'Statements=a PDF download|an old statement|a missing month']],
  ['Back office', ['Report builder=a saved report|a slow query|a retired field']],
] }];

const CURATED: Record<string, string[]> = {
  'Checkout flow': ['Checkout rejects expired card', 'Checkout applies a discount code once', 'Checkout keeps the basket after a failed payment'],
  'Password reset': ['Password reset link expires after 1 hour', 'Password reset does not reveal whether the email exists'],
  'Sign-in': ['Sign-in locks the account after 5 failed attempts', 'Sign-in remembers the device for 30 days'],
  'Create charge': ['Create charge rejects a duplicate idempotency key', 'Create charge returns 402 for a declined card'],
  'Event delivery': ['Event delivery retries with exponential backoff'],
  'File ingest': ['File ingest quarantines a malformed row and loads the rest'],
  'Role editor': ['Role editor warns before removing a permission that is in use'],
};
const PATTERNS: Array<(f: string, o: string) => string> = [
  (f, o) => `${f} handles ${o}`,
  (f, o) => `${f} shows a clear message for ${o}`,
  (f, o) => `${f} keeps data consistent after ${o}`,
  (f, o) => `${f} recovers from ${o}`,
  (f, o) => `${f} works with ${o}`,
  (f, o) => `${f} records ${o} in the audit log`,
];
const CONDITIONS = ['', '', '', '', ' on a slow connection', ' for a new user', ' for an admin user', ' after a session timeout', ' in a second browser tab', ' with a non-English locale', ' when the request is retried', ' on the staging build'];
const GROUPS = ['Happy path', 'Validation', 'Edge cases', 'Error handling', 'Permissions', 'Regression'];
const STEP_TEXT: Array<[(f: string, o: string) => string, string]> = [
  [(f) => `Open the ${f.toLowerCase()} area`, 'The page or endpoint is available.'],
  [(_f, o) => `Prepare ${o}`, 'The test data is in place.'],
  [() => 'Run the main action', 'The action completes without an unexpected error.'],
  [() => 'Check the result shown to the user', 'The outcome matches the requirement.'],
  [() => 'Check the audit log entry', 'One entry is recorded with the right actor.'],
  [() => 'Repeat the action once more', 'The second attempt gives the same outcome.'],
  [() => 'Reload and check the state', 'The state is unchanged after the reload.'],
  [() => 'Sign out and sign in again', 'The state is still correct.'],
  [() => 'Clean up the test data', 'No test data is left behind.'],
];
const EXTRA_FAIL = ['Intermittent: passes on the second attempt.', 'Wrong error code returned; expected 422.', 'Value is saved but not shown until a reload.', 'Timeout after 30 seconds on the staging build.', 'Duplicate row created when the request is retried.'];
const EXTRA_BLOCK = ['Blocked by BUG-1203; cannot reach the screen.', 'Blocked: staging data refresh in progress.', 'Blocked: no test card available for this region.'];

// ---- generator -------------------------------------------------------------------------------------
interface PD { id: string; prefix: string; key: string; suites: SuiteDef[]; target: number; startCounter: number }
interface GenCase { tc: TestCase; steps: TestStep[]; feature: string; object: string }

export function buildHeavyFixtures(options: HeavyOptions = {}): DbData {
  const o = { ...HEAVY_DEFAULTS, ...options };
  const rng = createRng(HEAVY_SEED);
  const db = buildFixtures();
  const add = <T extends BaseRecord>(name: string, rows: T[]) => { (db[name] ??= []).push(...rows); };
  const mk = <T extends BaseRecord>(f: Omit<T, 'created' | 'updated'> & { created: string; updated?: string }): T => ({ updated: f.created, ...f }) as unknown as T;

  // ---- people and projects ------------------------------------------------------------------------
  add<User>('users', NEW_USERS.map(([id, name, email, is_active, seen]) => mk<User>({ id, name, email, is_active, last_access: ago(seen / 3), created: ago(180) })));
  add<WorkspaceMember>('workspace_members', NEW_USERS.map(([id]) => mk<WorkspaceMember>({ id: `wm_${id}`, workspace: IDS.workspace, user: id, role: 'member', created: ago(150) })));
  add<Project>('projects', NEW_PROJECTS.map((p) => mk<Project>({
    id: p.id, workspace: IDS.workspace, name: p.name, announcement: p.announcement, ref_prefix: p.prefix, case_counter: 0, is_archived: p.archived, created: ago(p.created),
  })));
  const pm = (project: string, roles: Roles, days: number) => roles.map(([u, role]) => mk<ProjectMember>({ id: `pm_${project}_${u}`, project: project === 'core' ? IDS.projectCore : project === 'mob' ? IDS.projectMob : `h_${project}`, user: u, role, created: ago(days) }));
  add('project_members', [...pm('core', CORE_EXTRA_ROLES, 150), ...pm('mob', MOB_EXTRA_ROLES, 100), ...NEW_PROJECTS.flatMap((p) => pm(p.key, p.roles, p.created - 3))]);

  const membersOf = new Map<string, Array<{ user: string; role: ProjectRole }>>();
  const userActive = new Map<string, boolean>([...(db.users as User[]).map((u) => [u.id, u.is_active] as [string, boolean])]);
  for (const m of db.project_members as ProjectMember[]) {
    const l = membersOf.get(m.project) ?? [];
    l.push({ user: m.user, role: m.role });
    membersOf.set(m.project, l);
  }
  const testersOf = (proj: string) => (membersOf.get(proj) ?? []).filter((m) => (m.role === 'tester' || m.role === 'manager' || m.role === 'admin') && userActive.get(m.user) && m.user !== U.ci).map((m) => m.user);

  // ---- suites, sections, tags --------------------------------------------------------------------------
  const projectsMeta: PD[] = [
    { id: IDS.projectCore, prefix: 'CORE', key: 'core', suites: CORE_SUITES, target: o.coreCases - 120, startCounter: 120 },
    { id: IDS.projectMob, prefix: 'MOB', key: 'mob', suites: MOB_SUITES, target: o.otherCases[0] - 20, startCounter: 20 },
    { id: PAY.id, prefix: 'PAY', key: 'pay', suites: PAY_SUITES, target: o.otherCases[1], startCounter: 0 },
    { id: ADM.id, prefix: 'ADM', key: 'adm', suites: ADM_SUITES, target: o.otherCases[2], startCounter: 0 },
    { id: DAT.id, prefix: 'DAT', key: 'dat', suites: DAT_SUITES, target: o.otherCases[3], startCounter: 0 },
    { id: LEG.id, prefix: 'LEG', key: 'leg', suites: LEG_SUITES, target: o.otherCases[4], startCounter: 0 },
  ];
  const projCreated: Record<string, number> = { [IDS.projectCore]: 190, [IDS.projectMob]: 120, h_pay: 140, h_adm: 120, h_dat: 100, h_leg: 400 };
  const suiteRows: TestSuite[] = [];
  const sectionRows: TestSection[] = [];
  let secSeq = 0;
  let secPos = 1000;
  // leaf: a section that holds cases
  interface Leaf { suite: string; section: string; feature: string; objects: string[]; curated: string[] }
  const leavesOf = new Map<string, Leaf[]>(); // by suite id
  const suiteWeight = new Map<string, number>();
  for (const p of projectsMeta) {
    for (const s of p.suites) {
      suiteWeight.set(s.id, s.weight);
      if (s.name) suiteRows.push(mk<TestSuite>({ id: s.id, project: p.id, name: s.name, description: s.description, is_baseline: false, is_completed: p.key === 'leg', created: ago(projCreated[p.id] as number - 3) }));
      const leaves: Leaf[] = [];
      for (const [areaName, features] of s.areas) {
        const area = mk<TestSection>({ id: `hsec${++secSeq}`, project: p.id, suite: s.id, name: areaName, position: secPos++, created: ago(projCreated[p.id] as number - 4) });
        sectionRows.push(area);
        for (const fs of features) {
          const [fname, objects] = feature(fs);
          const fsec = mk<TestSection>({ id: `hsec${++secSeq}`, project: p.id, suite: s.id, parent: area.id, name: fname, position: secPos++, created: area.created });
          sectionRows.push(fsec);
          const groups = shuffle(rng, GROUPS).slice(0, int(rng, 2, 3));
          for (const g of groups) {
            const gsec = mk<TestSection>({ id: `hsec${++secSeq}`, project: p.id, suite: s.id, parent: fsec.id, name: g, position: secPos++, created: area.created });
            sectionRows.push(gsec);
            leaves.push({ suite: s.id, section: gsec.id, feature: fname, objects, curated: [] });
          }
        }
      }
      leavesOf.set(s.id, leaves);
    }
  }
  add('test_suites', suiteRows);
  add('test_sections', sectionRows);

  const tagNames = ['smoke', 'regression', 'api', 'flaky', 'slow', 'security', 'a11y'];
  const tagIdsOf = new Map<string, string[]>();
  const tagRows: Tag[] = [];
  for (const p of projectsMeta) {
    if (p.key === 'core') { tagIdsOf.set(p.id, ['tag_smoke', 'tag_regression', 'tag_api', 'tag_flaky', 'tag_slow', 'tag_a11y', 'tag_auth', 'tag_checkout', 'tag_payments', 'tag_mobile']); continue; }
    const ids = tagNames.map((n) => `htag_${p.key}_${n}`);
    ids.forEach((id, i) => tagRows.push(mk<Tag>({ id, project: p.id, name: tagNames[i] as string, color: ['#0b8a6a', '#2d6bf5', '#0072b2', '#c27803', '#6b7080', '#d03a2f', '#7a5af8'][i], created: ago(projCreated[p.id] as number - 5) })));
    tagIdsOf.set(p.id, ids);
  }
  add('tags', tagRows);

  // ---- cases ---------------------------------------------------------------------------------------------
  const cases: TestCase[] = [];
  const steps: TestStep[] = [];
  const caseTags: TestCaseTag[] = [];
  const versions: TestCaseVersion[] = [];
  const genByCase = new Map<string, GenCase>();
  const casesBySuite = new Map<string, TestCase[]>();
  const counters: Record<string, number> = {};
  let caseSeq = 0;
  let stepSeq = 0;
  let tagSeq = 0;
  const stepWeights: Array<[number, number]> = [[0, 5], [1, 10], [2, 35], [3, 28], [4, 12], [5, 6], [7, 3], [9, 1]];
  const verWeights: Array<[number, number]> = [[1, 88], [2, 6], [3, 3], [4, 1.5], [5, 1], [6, 0.4], [8, 0.1]];

  for (const p of projectsMeta) {
    const total = Math.max(0, p.target);
    const shares = distribute(rng, total, p.suites.map((s) => [s.id, s.weight] as const));
    const bySuite = new Map<string, number>();
    shares.forEach((id) => bySuite.set(id, (bySuite.get(id) ?? 0) + 1));
    const prios = distribute(rng, total, [['pr_p1', 12], ['pr_p2', 33], ['pr_p3', 40], ['pr_p4', 15]] as const);
    const types = distribute(rng, total, [['ct_functional', 45], ['ct_regression', 22], ['ct_smoke', 13], ['ct_ui', 9], ['ct_security', 7], ['ct_performance', 4]] as const);
    const autos = distribute<AutomationStatus>(rng, total, [['automated', 38], ['needs_automation', 18], ['needs_review', 8], ['in_progress', 5], ['not_specified', 26], ['not_automatable', 5]]);
    const vers = distribute(rng, total, verWeights);
    const deprecatedFlags = distribute(rng, total, [[true, 3], [false, 97]] as const);
    const members = testersOf(p.id);
    const tagPool = tagIdsOf.get(p.id) as string[];
    const used = new Set<string>();
    let idx = 0;
    counters[p.id] = p.startCounter;

    for (const s of p.suites) {
      const leaves = leavesOf.get(s.id) as Leaf[];
      const n = bySuite.get(s.id) ?? 0;
      if (!n || !leaves.length) continue;
      // spread cases over the leaves with uneven weights
      const leafPick = distribute(rng, n, leaves.map((l, i) => [i, 1 + (i % 3)] as const));
      // per-feature combination pools, shuffled once
      const pools = new Map<string, Array<[string, string]>>();
      const curatedLeft = new Map<string, string[]>();
      for (const l of leaves) {
        if (pools.has(l.feature)) continue;
        const combos: Array<[string, string]> = [];
        for (const ob of l.objects) for (const pat of PATTERNS) for (const c of CONDITIONS) combos.push([pat(l.feature, ob) + c, ob]);
        pools.set(l.feature, shuffle(rng, combos));
        curatedLeft.set(l.feature, (CURATED[l.feature] ?? []).slice());
      }
      for (let k = 0; k < n; k += 1, idx += 1) {
        const leaf = leaves[leafPick[k] as number] as Leaf;
        const pool = pools.get(leaf.feature) as Array<[string, string]>;
        let title = '';
        let object = leaf.objects[0] as string;
        const cur = curatedLeft.get(leaf.feature) as string[];
        if (cur.length && !used.has(cur[0] as string)) { title = cur.shift() as string; }
        while (!title) {
          const next = pool.pop();
          if (!next) { title = `${leaf.feature} handles scenario ${k + 1}`; break; }
          if (!used.has(next[0])) { title = next[0]; object = next[1]; }
        }
        let t = title;
        for (let dup = 2; used.has(t); dup += 1) t = `${title} (${dup})`;
        title = t;
        used.add(title);
        counters[p.id] = (counters[p.id] as number) + 1;
        const id = `hc${++caseSeq}`;
        const createdMs = NOW - (4 + rng() * ((projCreated[p.id] as number) - 6)) * DAY;
        const version = vers[idx] as number;
        const dep = deprecatedFlags[idx] as boolean;
        const author = pick(rng, members);
        const nSteps = distribute(rng, 20, stepWeights)[0] as number;
        const created = iso(createdMs);
        const tc = mk<TestCase>({
          id, project: p.id, suite: s.id, section: leaf.section, ref: `${p.prefix}-C${counters[p.id]}`, title,
          priority: prios[idx], type: types[idx], automation_status: autos[idx] as AutomationStatus,
          estimate: rng() < 0.5 ? int(rng, 2, 40) * 30 : undefined, version, deprecated: dep,
          deprecated_reason: dep ? pick(rng, ['Feature removed in the last release', 'Replaced by an API-level check', 'Duplicate of another case']) : undefined,
          refs: rng() < 0.06 ? `BUG-${int(rng, 1100, 1400)}` : undefined,
          created_by: author, updated_by: version > 1 ? pick(rng, members) : author,
          created, updated: iso(Math.min(NOW - HOUR, createdMs + (version > 1 ? rng() * (NOW - createdMs) : rng() * 3 * DAY))),
        });
        cases.push(tc);
        (casesBySuite.get(s.id) ?? casesBySuite.set(s.id, []).get(s.id) as TestCase[]).push(tc);
        const rows: TestStep[] = [];
        for (let i = 0; i < nSteps; i += 1) {
          const [d, e] = STEP_TEXT[i % STEP_TEXT.length] as [(f: string, o: string) => string, string];
          rows.push(mk<TestStep>({ id: `hst${++stepSeq}`, case: id, position: i + 1, description: d(leaf.feature, object), expected_result: i === 0 && rng() < 0.4 ? undefined : e, created }));
        }
        steps.push(...rows);
        genByCase.set(id, { tc, steps: rows, feature: leaf.feature, object });
        // tags
        if (rng() < 0.93) {
          const tn = new Set<string>([pick(rng, tagPool)]);
          if (rng() < 0.3) tn.add(pick(rng, tagPool));
          for (const tag of tn) caseTags.push(mk<TestCaseTag>({ id: `hct${++tagSeq}`, case: id, tag, created }));
        }
        // versions (oldest first)
        if (version > 1 || o.versionOneRows) {
          for (let v = 1; v <= version; v += 1) {
            const old = v < version;
            versions.push(mk<TestCaseVersion>({
              id: `hcv${caseSeq}_${v}`, case: id, project: p.id, version: v,
              snapshot: {
                case: { ref: tc.ref, title: v === 1 && version > 1 ? `${title} (draft)` : title, priority: tc.priority, type: tc.type, version: v },
                steps: (old ? rows.slice(0, 2) : rows).map((r) => ({ position: r.position, description: r.description, expected_result: r.expected_result })),
              },
              note: v === 1 ? undefined : pick(rng, VERSION_NOTES), saved_by: pick(rng, members),
              created: iso(createdMs + ((v - 1) / version) * (Date.parse(tc.updated) - createdMs)),
            }));
          }
        }
      }
    }
  }
  add('test_cases', cases);
  add('test_steps', steps);
  add('test_case_tags', caseTags);
  add('test_case_versions', versions);
  db.projects = (db.projects as Project[]).map((p) => (counters[p.id] !== undefined ? { ...p, case_counter: counters[p.id] as number } : p));

  // existing + new cases per suite for run building (standard cases are real rows too)
  const allCases = db.test_cases as TestCase[];
  const liveBySuite = (suite: string) => allCases.filter((c) => c.suite === suite && !c.deprecated);

  // ---- milestones and plans ------------------------------------------------------------------------------
  const msDefs: Array<[id: string, project: string, title: string, desc: string, dueDays: number, done: boolean]> = [
    ['hms_core_22', IDS.projectCore, 'Release 2.2', 'Search and wishlist release.', -70, true],
    ['hms_core_241', IDS.projectCore, 'Hotfix 2.4.1', 'Payment retry hotfix, still open after the due date.', -4, false],
    ['hms_core_25', IDS.projectCore, 'Release 2.5', 'Billing rework and reporting exports.', 40, false],
    ['hms_pay_v3', 'h_pay', 'Payments v3 launch', 'Idempotency keys and the new payout schedule.', 20, false],
    ['hms_pay_sbx', 'h_pay', 'Sandbox migration', 'Move partners to the new sandbox.', -30, true],
    ['hms_adm_role', 'h_adm', 'Role editor rework', 'Custom roles and permission checks.', 9, false],
    ['hms_adm_aud', 'h_adm', 'Audit export', 'CSV export of the audit log, past due.', -10, false],
    ['hms_dat_cut', 'h_dat', 'Warehouse cutover', 'Switch deliveries to the new warehouse.', 25, false],
    ['hms_dat_bf', 'h_dat', 'Backfill of last year', 'Historical backfill, completed.', -15, true],
    ['hms_mob_32', IDS.projectMob, 'App 3.2', 'Offline mode and biometric unlock.', 14, false],
    ['hms_mob_31', IDS.projectMob, 'App 3.1', 'Onboarding refresh.', -25, true],
    ['hms_leg_sun', 'h_leg', 'Portal sunset', 'Final checks before the portal was retired.', -120, true],
  ];
  add<Milestone>('milestones', msDefs.map(([id, project, title, description, due, done]) => mk<Milestone>({
    id, project, title, description, expires_on: iso(NOW + due * DAY), is_completed: done, created: iso(NOW + (due - 45) * DAY),
  })));
  const planDefs: Array<[id: string, project: string, name: string, desc: string, ms: string[], builds: string, owner: string, done: boolean]> = [
    ['hpl_core_25', IDS.projectCore, 'Release 2.5 regression', 'Full regression for 2.5.', ['hms_core_25'], '2.5-rc1', U.raj, false],
    ['hpl_core_241', IDS.projectCore, 'Hotfix 2.4.1 verification', 'Targeted checks on the retry fix.', ['hms_core_241'], '2.4.1', 'u_lena', false],
    ['hpl_core_q', IDS.projectCore, 'Quarterly full regression', 'Last quarter, completed.', ['hms_core_22'], '2.2.0', U.raj, true],
    ['hpl_pay_v3', 'h_pay', 'Payments v3 certification', 'Partner certification pass.', ['hms_pay_v3'], 'v3.0-beta', 'u_priya', false],
    ['hpl_adm_role', 'h_adm', 'Role editor acceptance', 'Acceptance pass for the new role editor.', ['hms_adm_role'], '1.8.0', U.sam, false],
    ['hpl_dat_cut', 'h_dat', 'Cutover rehearsal', 'Dry run of the warehouse cutover.', ['hms_dat_cut'], 'wh-2', 'u_mateo', false],
    ['hpl_mob_32', IDS.projectMob, 'App 3.2 release checklist', 'Device matrix for 3.2.', ['hms_mob_32'], '3.2.0-rc2', 'u_hannah', false],
    ['hpl_mob_31', IDS.projectMob, 'App 3.1 regression', 'Completed.', ['hms_mob_31'], '3.1.0', U.avery, true],
    ['hpl_leg_sun', 'h_leg', 'Sunset verification', 'Completed.', ['hms_leg_sun'], 'final', U.raj, true],
    ['hpl_pay_sbx', 'h_pay', 'Sandbox migration checks', 'Completed.', ['hms_pay_sbx'], 'sbx-1', 'u_priya', true],
  ];
  add<TestPlan>('test_plans', planDefs.map(([id, project, name, description, ms, builds, owner, done]) => mk<TestPlan>({
    id, project, name, description, type: 'Regression', milestones: ms, builds, owner, is_completed: done, created: ago(done ? 60 : 14),
  })));

  // ---- runs -------------------------------------------------------------------------------------------------
  const RUN_PROJECTS = [[IDS.projectCore, 38], [IDS.projectMob, 15], [PAY.id, 14], [ADM.id, 10], [DAT.id, 13], [LEG.id, 4]] as const;
  const runProj = distribute(rng, o.runs, RUN_PROJECTS);
  const runRows: TestRun[] = [];
  const testRows: TestRunCase[] = [];
  const resultRows: TestResult[] = [];
  const bugPool = new Map<string, number[]>();
  let bugNext = 1180;
  let testSeq = 0;
  let resSeq = 0;
  const ci = IDS.projectCore;
  const nameKinds = ['Smoke', 'Regression', 'Nightly', 'Release candidate', 'Exploratory sweep', 'Hotfix check'];
  const msOf = new Map<string, Milestone[]>();
  for (const m of db.milestones as Milestone[]) (msOf.get(m.project) ?? msOf.set(m.project, []).get(m.project) as Milestone[]).push(m);
  const planOf = new Map<string, TestPlan[]>();
  for (const p of db.test_plans as TestPlan[]) (planOf.get(p.project) ?? planOf.set(p.project, []).get(p.project) as TestPlan[]).push(p);

  const plans = runProj.map((proj, i) => ({ proj, slot: i }));
  let bigDone = false;
  plans.forEach(({ proj }, i) => {
    const archived = proj === LEG.id;
    const startDays = archived ? 50 + rng() * 6 : Math.max(0.3, 55 - (i / o.runs) * 54.5 + (rng() - 0.5) * 2);
    const pdef = projectsMeta.find((p) => p.id === proj) as PD;
    // suite: CORE's first run is the big web run
    const isBig = !bigDone && proj === ci && startDays < 4;
    let suite = isBig ? IDS.suites.web : (pick(rng, pdef.suites.flatMap((s) => Array<string>(Math.ceil(s.weight / 10)).fill(s.id))));
    if (proj === IDS.projectMob) suite = IDS.suites.mob;
    const live = liveBySuite(suite);
    const size = isBig ? Math.min(o.bigRunTests, live.length) : Math.min(live.length, 50 + Math.floor(rng() ** 4 * 100));
    if (isBig) bigDone = true;
    if (size < 1) return;
    const closed = archived || startDays > 4 || (!isBig && rng() < 0.12 && startDays > 1.5);
    const stale = !closed && startDays > 9;
    const ends = closed ? NOW - Math.max(0, startDays - (0.3 + rng() * 2)) * DAY : NOW - 20 * 60_000;
    const start = NOW - startDays * DAY;
    const people = testersOf(proj);
    const assigned = pick(rng, people);
    const kind = pick(rng, nameKinds);
    const build = `${pdef.key === 'core' ? '2.4' : pdef.key === 'mob' ? '3.1' : pdef.key === 'pay' ? '3.0' : pdef.key === 'adm' ? '1.7' : pdef.key === 'dat' ? '0.9' : '1.0'}.${Math.max(0, Math.round(56 - startDays))}`;
    const suiteName = ((db.test_suites as TestSuite[]).find((s) => s.id === suite) as TestSuite).name;
    const name = isBig ? `Web regression ${build}` : `${suiteName} ${kind.toLowerCase()} ${build}`;
    // milestone and plan
    const mss = msOf.get(proj) ?? [];
    const pickable = closed ? mss.filter((m) => m.is_completed || Date.parse(m.expires_on as string) < NOW) : mss.filter((m) => !m.is_completed);
    const milestone = proj === ci && closed && startDays > 20 ? mss.find((m) => m.id === IDS.milestones.r23)?.id : rng() < 0.85 && pickable.length ? pick(rng, pickable).id : undefined;
    const plan = milestone ? (planOf.get(proj) ?? []).find((p) => p.milestones?.includes(milestone))?.id : undefined;
    const caseSet = isBig ? live.slice(0, size) : shuffle(rng, live).slice(0, size);
    const runId = `hrun${runRows.length + 1}`;
    const run = mk<TestRun>({
      id: runId, project: proj, suite, plan: rng() < 0.7 ? plan : undefined, name, description: closed ? undefined : `${kind} on build ${build}.`, milestone, include_all: false, case_ids: caseSet.map((c) => c.id),
      build, assigned_to: assigned, started_on: iso(start), finished_on: closed ? iso(ends) : undefined, is_closed: closed, created_by: pick(rng, people),
      created: iso(start - HOUR), updated: iso(closed ? ends : stale ? start + 2 * DAY : ends),
    });
    runRows.push(run);

    const passRate = Math.min(0.97, Math.max(0.6, 0.78 + 0.14 * (1 - startDays / 56) + (rng() - 0.5) * 0.06));
    const doneFraction = closed ? 0.99 : stale ? 0.55 : 0.35 + rng() * 0.55;
    const bugs = bugPool.get(proj) ?? bugPool.set(proj, []).get(proj) as number[];
    const resEnd = stale ? start + 2 * DAY : ends;
    caseSet.forEach((tc) => {
      const gen = genByCase.get(tc.id);
      const testId = `ht${++testSeq}`;
      const assignee = rng() < 0.75 ? assigned : pick(rng, people);
      const mkSnap = () => (closed
        ? { case: { ref: tc.ref, title: tc.title, version: tc.version }, steps: [] as Array<Record<string, unknown>> }
        : { case: { ref: tc.ref, title: tc.title, version: tc.version }, steps: (gen?.steps ?? (db.test_steps as TestStep[]).filter((s) => s.case === tc.id)).map((s) => ({ position: s.position, description: s.description, expected_result: s.expected_result })) });
      let seq: Array<'passed' | 'failed' | 'blocked' | 'retest'> = [];
      if (rng() < doneFraction) {
        const x = rng();
        let fin: 'passed' | 'failed' | 'blocked' | 'retest' = 'passed';
        if (x >= passRate) {
          const rem = (x - passRate) / (1 - passRate);
          fin = rem < 0.58 ? 'failed' : rem < (closed ? 0.97 : 0.8) ? 'blocked' : 'retest';
        }
        seq = [fin];
        if (fin === 'passed' && rng() < (closed ? 0.05 : 0.09)) seq = pick(rng, [['failed', 'passed'], ['failed', 'retest', 'passed']] as typeof seq[]);
        else if (fin === 'failed' && rng() < 0.1) seq = ['failed', 'retest', 'failed'];
      }
      const firstAt = start + HOUR + rng() * 0.7 * (resEnd - start - HOUR);
      const gap = (resEnd - firstAt) / (seq.length + 1);
      let lastAt = start;
      seq.forEach((k, j) => {
        const at = Math.min(resEnd, firstAt + gap * j * (0.6 + rng() * 0.4));
        lastAt = at;
        let comment: string | undefined;
        let defects: string[] | undefined;
        if (k === 'failed') {
          comment = pick(rng, [...FAIL_COMMENTS, ...EXTRA_FAIL]);
          if (rng() < 0.65) {
            if (!bugs.length || rng() < 0.45) { bugNext += int(rng, 1, 4); bugs.push(bugNext); }
            defects = [`BUG-${pick(rng, bugs.slice(-25))}`];
            if (rng() < 0.12) defects.push(`BUG-${pick(rng, bugs.slice(-25))}`);
            defects = [...new Set(defects)];
          }
        } else if (k === 'blocked') {
          comment = pick(rng, [...BLOCK_COMMENTS, ...EXTRA_BLOCK]);
          if (comment.includes('BUG-1203')) defects = ['BUG-1203'];
        } else if (k === 'retest') comment = pick(rng, RETEST_COMMENTS);
        else if (rng() < 0.15) comment = pick(rng, PASS_COMMENTS);
        resultRows.push(mk<TestResult>({
          id: `hr${++resSeq}`, project: proj, run: runId, test: testId, case: tc.id, status: ST[k], comment, version: tc.version,
          elapsed: rng() < 0.8 ? int(rng, 20, 900) : undefined, defects, assigned_to: assignee,
          created_by: j === seq.length - 1 && rng() < 0.7 ? assignee : pick(rng, people), created: iso(at),
        }));
      });
      testRows.push(mk<TestRunCase>({
        id: testId, run: runId, project: proj, case: tc.id, version: tc.version, case_snapshot: mkSnap(), assigned_to: assignee,
        status: seq.length ? ST[seq[seq.length - 1] as 'passed'] : ST.untested, created: iso(start - HOUR), updated: iso(seq.length ? lastAt : start),
      }));
    });
  });
  add('test_runs', runRows);
  add('test_run_cases', testRows);
  add('test_results', resultRows);

  // ---- automation ------------------------------------------------------------------------------------------
  const maps: Array<[id: string, project: string, fw: AutomationMapping['framework'], prefix: string]> = [
    ['h_am_pay', PAY.id, 'junit', 'tb_demo_pa01'], ['h_am_adm', ADM.id, 'pytest', 'tb_demo_ad02'], ['h_am_dat', DAT.id, 'pytest', 'tb_demo_da03'],
  ];
  add<AutomationMapping>('automation_mappings', maps.map(([id, project, framework, token_prefix]) => mk<AutomationMapping>({
    id, project, framework, field_map: { match: 'classname.name' }, token_prefix, run_as: U.ci, is_active: true, created: ago(60),
  })));
  const hex = () => Array.from({ length: 7 }, () => '0123456789abcdef'[int(rng, 0, 15)]).join('');
  const execPlan: Array<[mapping: string, project: string, count: number, branches: string[], prefix: string, base: number]> = [
    [IDS.mappings.junit, ci, 14, ['main', 'main', 'main', 'release/2.5', 'feature/basket-merge', 'feature/tax-rules'], 'gh-', 4413],
    ['h_am_pay', PAY.id, 6, ['main', 'main', 'feature/idempotency'], 'ci-', 880],
    ['h_am_dat', DAT.id, 6, ['main', 'dev', 'feature/late-events'], 'ci-', 310],
    ['h_am_adm', ADM.id, 4, ['main', 'feature/role-editor'], 'ci-', 120],
  ];
  const execs: AutomationExecution[] = [];
  let exSeq = 0;
  for (const [mapping, project, count, branches, prefix, base] of execPlan) {
    const projRuns = runRows.filter((r) => r.project === project);
    for (let i = 0; i < count; i += 1) {
      exSeq += 1;
      const fresh = i === 0 && project === ci;
      const status: AutomationExecution['status'] = fresh ? 'in_progress' : rng() < 0.12 ? 'failed' : 'completed';
      const failed = status === 'failed';
      const agoMs = fresh ? 9 * 60_000 : (i + 0.3 + rng() * 0.6) * (project === ci ? 0.9 : 3.2) * DAY;
      execs.push(mk<AutomationExecution>({
        id: `hex${exSeq}`, mapping, external_execution_id: `${prefix}${base - i}`, run: failed || fresh || !projRuns.length ? undefined : pick(rng, projRuns).id,
        build: `${project === ci ? '2.5' : '1.0'}-rc${Math.max(0, 3 - Math.floor(i / 4))}`, branch: pick(rng, branches), commit: hex(), status,
        summary: failed ? { passed: 0, failed: 0, skipped: 0, duration_s: int(rng, 2, 9), unmatched: [], errors: [{ id: 'import', message: 'Malformed XML at line 61' }] }
          : fresh ? { passed: 0, failed: 0, skipped: 0, duration_s: 0, unmatched: [], errors: [] }
          : { passed: int(rng, 80, 240), failed: rng() < 0.4 ? int(rng, 1, 6) : 0, skipped: int(rng, 0, 4), duration_s: int(rng, 120, 520), unmatched: rng() < 0.15 ? ['CheckoutTest.gift_message'] : [], errors: [] },
        created: iso(NOW - agoMs),
      }));
    }
  }
  add('automation_executions', execs);
  add<CiToken>('ci_tokens', [
    mk<CiToken>({ id: 'htok_pay', project: PAY.id, name: 'pay-ci', mapping: 'h_am_pay', prefix: 'tb_demo_pa01', last4: 'x7d2', last_used: ago(0.2), revoked: false, created: ago(50) }),
    mk<CiToken>({ id: 'htok_dat', project: DAT.id, name: 'dat-nightly', mapping: 'h_am_dat', prefix: 'tb_demo_da03', last4: 'k3m9', last_used: ago(1.1), revoked: false, created: ago(40) }),
    mk<CiToken>({ id: 'htok_old', project: PAY.id, name: 'old-runner', mapping: 'h_am_pay', prefix: 'tb_demo_pa00', last4: 'q1w5', last_used: ago(45), revoked: true, created: ago(120) }),
  ]);

  // ---- audit log --------------------------------------------------------------------------------------------
  add('audit_logs', buildAudit(rng, o.auditRows, { cases: db.test_cases as TestCase[], fresh: cases, runs: runRows, results: resultRows, db, testersOf, projectName: new Map((db.projects as Project[]).map((p) => [p.id, p.name])) }));

  return db;
}

interface AuditCtx {
  cases: TestCase[]; fresh: TestCase[]; runs: TestRun[]; results: TestResult[]; db: DbData; testersOf: (p: string) => string[]; projectName: Map<string, string>;
}

function buildAudit(rng: Rng, target: number, c: AuditCtx): AuditLog[] {
  const rows: AuditLog[] = [];
  let seq = 0;
  const push = (project: string, actor: string | undefined, action: string, entityType: string, entityId: string, at: number, before?: unknown, after?: unknown) => {
    seq += 1;
    const t = iso(Math.min(NOW - 60_000, Math.max(NOW - 400 * DAY, at)));
    rows.push({ id: `hal${seq}`, created: t, updated: t, project, project_name: c.projectName.get(project), actor, action, entity_type: entityType, entity_id: entityId, before, after, ip: `10.${int(rng, 0, 9)}.${int(rng, 0, 9)}.${int(rng, 2, 250)}` });
  };
  const who = (p: string) => pick(rng, c.testersOf(p));
  // structural events first (keep all of these), then fill with a weighted mix up to the target
  for (const r of c.runs) {
    push(r.project, r.created_by, 'run.create', 'run', r.id, Date.parse(r.created), undefined, { name: r.name, build: r.build });
    if (r.is_closed) push(r.project, r.assigned_to, 'run.close', 'run', r.id, Date.parse(r.finished_on as string), { is_closed: false }, { is_closed: true });
  }
  for (const m of c.db.project_members as ProjectMember[]) {
    if (!m.id.startsWith('pm_')) continue;
    if (NEW_USERS.some(([id]) => id === m.user) || m.project.startsWith('h_')) push(m.project, U.avery, 'member.add', 'member', m.id, Date.parse(m.created), undefined, { role: m.role });
  }
  for (const s of c.db.test_suites as TestSuite[]) if (s.id.startsWith('h_s_')) push(s.project, who(s.project), 'suite.create', 'suite', s.id, Date.parse(s.created), undefined, { name: s.name });
  for (const t of c.db.ci_tokens as CiToken[]) {
    if (!t.id.startsWith('htok_')) continue;
    push(t.project, U.avery, 'token.create', 'ci_token', t.id, Date.parse(t.created), undefined, { name: t.name });
    if (t.revoked) push(t.project, U.avery, 'token.revoke', 'ci_token', t.id, Date.parse(t.created) + 70 * DAY, { revoked: false }, { revoked: true });
  }
  for (const p of c.db.projects as Project[]) if (p.id.startsWith('h_')) push(p.id, U.avery, 'project.update', 'project', p.id, Date.parse(p.created) + DAY, { announcement: undefined }, { announcement: p.announcement ?? 'Archived', is_archived: p.is_archived });
  // a few role changes and removals for members that no longer exist
  for (let i = 0; i < 6; i += 1) {
    const p = pick(rng, [IDS.projectCore, 'h_pay']);
    push(p, U.avery, i % 2 ? 'member.role_change' : 'member.remove', 'member', i % 2 ? `pm_${p === IDS.projectCore ? 'core' : 'pay'}_${U.mia}` : `deleted_pm_${i}`, NOW - int(rng, 2, 50) * DAY, { role: 'tester' }, i % 2 ? { role: 'viewer' } : undefined);
  }
  // case history: create for new cases, update for each extra version
  const freshCases = c.fresh;
  const budget = Math.max(0, target - rows.length);
  const caseCreates = Math.floor(budget * 0.3);
  const caseUpdates = Math.floor(budget * 0.25);
  const resultCreates = budget - caseCreates - caseUpdates - 12;
  shuffle(rng, freshCases).slice(0, caseCreates).forEach((tc) => push(tc.project, tc.created_by, 'case.create', 'case', tc.id, Date.parse(tc.created), undefined, { ref: tc.ref, title: tc.title }));
  shuffle(rng, freshCases.filter((tc) => tc.version > 1)).concat(shuffle(rng, freshCases)).slice(0, caseUpdates).forEach((tc) => {
    push(tc.project, tc.updated_by, 'case.update', 'case', tc.id, Date.parse(tc.updated) - rng() * DAY, { priority: 'pr_p3', version: Math.max(1, tc.version - 1) }, { priority: tc.priority, version: tc.version });
  });
  shuffle(rng, c.results).slice(0, Math.max(0, resultCreates)).forEach((r) => push(r.project, r.created_by, 'result.create', 'result', r.id, Date.parse(r.created), { status: ST.untested }, { status: r.status, elapsed: r.elapsed ?? 0 }));
  for (let i = 0; i < 8; i += 1) {
    const r = pick(rng, c.results);
    push(r.project, U.avery, 'result.delete', 'result', `deleted_hr${i}`, NOW - int(rng, 1, 30) * DAY, { status: r.status, comment: r.comment }, undefined);
  }
  for (let i = 0; i < 4; i += 1) {
    const tc = pick(rng, freshCases);
    push(tc.project, who(tc.project), 'case.delete', 'case', `deleted_hc${i}`, NOW - int(rng, 3, 40) * DAY, { title: 'Removed duplicate case' }, undefined);
  }
  return rows;
}
