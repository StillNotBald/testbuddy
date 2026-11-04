import type {
  AuditLog, AutomationExecution, AutomationFramework, AutomationMapping, AutomationStatus, CaseType, CiToken, Id,
  ListResult, Milestone, Priority, Project, ProjectMember, ProjectRole, Status, Tag, TestAttachment, TestCase,
  TestCaseVersion, TestPlan, TestResult, TestRun, TestRunCase, TestSection, TestStatusKey, TestStep, TestStepResult,
  TestSuite, User, Workspace, WorkspaceRole,
} from './types';

/**
 * Service interfaces. Every screen talks to these (through hooks in ./hooks), never to a data
 * source directly. Implementations: ./mock (local MockDb, M0) and ./pocketbase (M1 stub).
 */

export type ServiceErrorCode = 'unauthenticated' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'closed' | 'archived' | 'network' | 'not_implemented';

export class ServiceError extends Error {
  constructor(public code: ServiceErrorCode, message: string, public details?: Record<string, string>) {
    super(message);
    this.name = 'ServiceError';
  }
  get status(): number {
    return { unauthenticated: 401, forbidden: 403, not_found: 404, validation: 422, conflict: 409, closed: 409, archived: 409, network: 0, not_implemented: 501 }[this.code];
  }
}

export interface Page { page?: number; pageSize?: number }
export type SortDir = 'asc' | 'desc';

// ---- view models -----------------------------------------------------------------------------
export type StatusCounts = Record<Exclude<TestStatusKey, 'custom'>, number>;

export interface Progress {
  counts: StatusCounts;
  total: number;
  /** Percent of tests with a result (not untested), 0-100. */
  done_pct: number;
  /** Percent passed of executed tests (untested excluded; blocked counts as not passed). Completion is done_pct. */
  pass_pct: number;
}

export interface Session { user: User; workspace_role: WorkspaceRole }
export interface DemoUser { user: User; workspace_role: WorkspaceRole; core_role: ProjectRole | null }

export interface ProjectSummary {
  project: Project;
  my_role: ProjectRole | null;
  case_count: number;
  open_runs: number;
  latest_run?: { id: Id; name: string; progress: Progress };
  last_activity?: string;
}

export interface RunSummary {
  run: TestRun;
  progress: Progress;
  assignee?: User;
  plan_name?: string;
  milestone_title?: string;
  suite_name: string;
  closed_by_name?: string;
}

export interface ProjectOverview {
  project: Project;
  case_count: number;
  cases_added_7d: number;
  open_runs: number;
  pass_rate_7d: number | null;
  failing_tests: number;
  active_milestone?: { milestone: Milestone; progress: Progress; days_left: number | null };
  open_run_list: RunSummary[];
  activity: Array<{ id: Id; at: string; actor?: User; text: string }>;
  my_assigned: { count: number; next_test_id?: Id; next_run_id?: Id };
}

export interface MemberView { member: ProjectMember; user: User }

export interface SectionNode { section: TestSection; count: number; children: SectionNode[] }
export interface SuiteNode { suite: TestSuite; count: number; sections: SectionNode[] }

export interface CaseFilters {
  projectId: Id;
  suiteId?: Id;
  sectionId?: Id;
  q?: string;
  priority?: Id[];
  type?: Id[];
  automation?: AutomationStatus[];
  tag?: Id[];
  deprecated?: boolean;
  sort?: 'ref' | 'title' | 'priority' | 'updated' | 'version';
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}
export interface CaseListItem { case: TestCase; tag_ids: Id[]; section_name: string }
export interface CaseDetail { case: TestCase; steps: TestStep[]; tag_ids: Id[]; section_name: string; suite_name: string }
export interface StepInput { description: string; expected_result?: string }
export interface CaseInput {
  project: Id; suite: Id; section: Id; title: string; content?: string; priority?: Id; type?: Id;
  automation_status?: AutomationStatus; estimate?: number; refs?: string; milestone?: Id; steps: StepInput[]; tag_ids: Id[];
}
export interface VersionView { version: TestCaseVersion; saved_by?: User }
export interface CaseUsage { test: TestRunCase; run: TestRun; status_key: TestStatusKey }

export interface MilestoneSummary {
  milestone: Milestone; progress: Progress; run_count: number; plan_count: number; test_count: number; failed_count: number; past_due: boolean; days_left: number | null;
}
export interface MilestoneDetail extends MilestoneSummary { runs: RunSummary[]; plans: PlanSummary[] }

export interface PlanSummary { plan: TestPlan; progress: Progress; run_count: number; owner?: User; milestone_titles: string[] }
export interface PlanDetail extends PlanSummary { runs: RunSummary[] }

export interface RunListFilters { projectId: Id; state?: 'open' | 'closed' | 'all'; milestone?: Id; plan?: Id; assignee?: Id; q?: string }
export interface RunInput {
  project: Id; suite: Id; name: string; description?: string; plan?: Id; milestone?: Id; build?: string; refs?: string; assigned_to?: Id;
  include_all: boolean; case_ids?: Id[];
}

export interface TestFilters {
  runId: Id;
  status?: TestStatusKey[];
  assignee?: Id | 'none';
  section?: Id;
  q?: string;
  page?: number;
  pageSize?: number;
}
export interface TestListItem {
  test: TestRunCase;
  status_key: TestStatusKey;
  status: Status;
  last_result_id: Id | null;
  last_result_at?: string;
  title: string;
  ref: string;
  priority?: Priority;
  section_name: string;
  assignee?: User;
  result_count: number;
  defect_count: number;
}
export interface ResultView { result: TestResult; status: Status; status_key: TestStatusKey; user?: User; attachments: TestAttachment[]; step_results: TestStepResult[] }
export interface TestDetail {
  item: TestListItem;
  run: TestRun;
  results: ResultView[];
  live_case_version?: number;
  /** True when the live case has a newer version than the snapshot. */
  has_newer_version: boolean;
}
export interface AddResultInput {
  testId: Id; statusId: Id; comment?: string; elapsed?: number; defects?: string[];
  step_results?: Array<{ step_position: number; statusId: Id; comment?: string }>;
}
export interface AttachmentInput { name: string; size: number; type: string }
/** Editable parts of a saved result (status and history never change, Q-RES-3). Author only, run open. */
export interface ResultPatch { comment?: string; elapsed?: number; defects?: string[] }

export interface ReportBlock { run: RunSummary; }
export interface MilestoneReport {
  milestone: Milestone; progress: Progress; by_run: ReportBlock[];
  by_suite: Array<{ id: Id; name: string; progress: Progress }>;
  by_assignee: Array<{ id: Id; name: string; progress: Progress }>;
  top_failing: Array<{ case_id: Id; ref: string; title: string; failures: number; runs: number }>;
  trend: Array<{ date: string; pass_rate: number; total: number }>;
}
export interface RunReport {
  run: RunSummary; progress: Progress;
  by_section: Array<{ id: Id; name: string; progress: Progress }>;
  by_assignee: Array<{ id: Id; name: string; progress: Progress }>;
  slowest: Array<{ test_id: Id; ref: string; title: string; elapsed: number }>;
  with_defects: Array<{ test_id: Id; ref: string; title: string; defects: string[] }>;
  trend: Array<{ date: string; pass_rate: number; total: number }>;
}

export type ChangeKind = 'fixed' | 'regressed' | 'new_failing' | 'still_failing';
/** "Changes since previous run": compares each case's latest status with the previous run of the same suite. */
export interface RunChanges {
  previous_run?: { id: Id; name: string; closed: boolean };
  counts: Record<ChangeKind, number>;
  items: Array<{ test_id: Id; case_id?: Id; ref: string; title: string; kind: ChangeKind; from: TestStatusKey | 'none'; to: TestStatusKey }>;
}

export interface MappingInput { framework: AutomationFramework; field_map: Record<string, unknown>; is_active: boolean; run_as?: Id }
export interface ExecutionView { execution: AutomationExecution; mapping?: AutomationMapping; run?: TestRun }
export interface TokenCreated { token: CiToken; secret: string }

export interface AuditFilters { projectId: Id; actor?: Id; action?: string; entity?: string; from?: string; to?: string; page?: number; pageSize?: number }
export interface AuditView { log: AuditLog; actor?: User; entity_exists: boolean }

export interface ImportPreview { format: 'testrail-xml' | 'testrail-csv' | 'json'; suites: number; sections: number; cases: number; warnings: string[]; duplicates: number }
export interface ImportOptions { mapPriorities: boolean; skipDuplicates: boolean }
export interface ImportResult { imported: number; skipped: number; errors: Array<{ row: number; message: string }> }

// ---- service interfaces ----------------------------------------------------------------------
export interface AuthService {
  listDemoUsers(): Promise<DemoUser[]>;
  signInAs(userId: Id): Promise<Session>;
  signInWithPassword(email: string, password: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
}

export interface WorkspacesService {
  list(): Promise<Workspace[]>;
  get(id: Id): Promise<Workspace>;
  /** My role in the workspace (admin/member), null if not a member. */
  myRole(id: Id): Promise<WorkspaceRole | null>;
}

export interface ProjectsService {
  list(params: { workspaceId: Id; includeArchived?: boolean; q?: string }): Promise<ProjectSummary[]>;
  get(id: Id): Promise<Project>;
  /** Role of the signed-in user in the project, null when not a member. */
  myRole(id: Id): Promise<ProjectRole | null>;
  create(input: { workspace: Id; name: string; ref_prefix: string; announcement?: string }): Promise<Project>;
  prefixAvailable(workspaceId: Id, prefix: string): Promise<boolean>;
  update(id: Id, patch: Partial<Pick<Project, 'name' | 'announcement'>>): Promise<Project>;
  setArchived(id: Id, archived: boolean): Promise<Project>;
  remove(id: Id, confirmName: string): Promise<void>;
  overview(id: Id): Promise<ProjectOverview>;
  /** Counts shown in the delete confirmation. */
  impact(id: Id): Promise<{ cases: number; runs: number; results: number }>;
  /** D-7 "Create sample project": two suites, 24 cases, one open run and one milestone, named "Sample". Admins and managers. */
  createSample(workspaceId: Id): Promise<Project>;
}

export interface MembersService {
  list(projectId: Id): Promise<MemberView[]>;
  searchCandidates(projectId: Id, q: string): Promise<User[]>;
  add(projectId: Id, userId: Id, role: ProjectRole): Promise<MemberView>;
  setRole(projectId: Id, memberId: Id, role: ProjectRole): Promise<MemberView>;
  remove(projectId: Id, memberId: Id): Promise<void>;
}

export interface LookupsService {
  caseTypes(): Promise<CaseType[]>;
  priorities(): Promise<Priority[]>;
  statuses(): Promise<Status[]>;
  tags(projectId: Id): Promise<Tag[]>;
  createTag(projectId: Id, name: string, color?: string): Promise<Tag>;
  updateTag(id: Id, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag>;
  removeTag(id: Id): Promise<void>;
}

export interface SuitesService {
  tree(projectId: Id): Promise<SuiteNode[]>;
  createSuite(projectId: Id, name: string, description?: string): Promise<TestSuite>;
  updateSuite(id: Id, patch: Partial<Pick<TestSuite, 'name' | 'description' | 'is_baseline' | 'is_completed'>>): Promise<TestSuite>;
  removeSuite(id: Id): Promise<void>;
  createSection(suiteId: Id, name: string, parent?: Id): Promise<TestSection>;
  renameSection(id: Id, name: string): Promise<TestSection>;
  removeSection(id: Id): Promise<void>;
  /** Move a section to the top level of a suite (no parent) or under another top-level section. Cases move with it. */
  moveSection(id: Id, target: { suite: Id; parent?: Id }): Promise<TestSection>;
}

export interface CasesService {
  list(filters: CaseFilters): Promise<ListResult<CaseListItem>>;
  /** Ids of every case matching the filters (ignores paging); for "select all matching". */
  matchingIds(filters: CaseFilters): Promise<Id[]>;
  get(id: Id): Promise<CaseDetail>;
  create(input: CaseInput): Promise<CaseDetail>;
  /** Saves a new version. Throws `conflict` when `expectedVersion` is stale. */
  update(id: Id, input: Partial<CaseInput>, opts: { note?: string; expectedVersion: number; coalesce?: boolean }): Promise<CaseDetail>;
  bulkUpdate(ids: Id[], patch: Partial<Pick<TestCase, 'priority' | 'type' | 'automation_status' | 'section' | 'suite' | 'deprecated' | 'deprecated_reason'>>): Promise<number>;
  /** Hard-deletes cases without results; deprecates the others. Returns counts. */
  remove(ids: Id[]): Promise<{ deleted: number; deprecated: number }>;
  versions(id: Id): Promise<VersionView[]>;
  restore(id: Id, version: number, note?: string): Promise<CaseDetail>;
  usedIn(id: Id): Promise<CaseUsage[]>;
}

export interface MilestonesService {
  list(projectId: Id, state?: 'open' | 'completed'): Promise<MilestoneSummary[]>;
  get(id: Id): Promise<MilestoneDetail>;
  create(input: { project: Id; title: string; description?: string; expires_on?: string; refs?: string }): Promise<Milestone>;
  update(id: Id, patch: Partial<Pick<Milestone, 'title' | 'description' | 'expires_on' | 'refs'>>): Promise<Milestone>;
  complete(id: Id): Promise<Milestone>;
}

export interface PlansService {
  list(projectId: Id): Promise<PlanSummary[]>;
  get(id: Id): Promise<PlanDetail>;
  create(input: { project: Id; name: string; description?: string; type?: string; milestones?: Id[]; builds?: string; refs?: string; owner?: Id }): Promise<TestPlan>;
  update(id: Id, patch: Partial<Omit<TestPlan, 'id' | 'created' | 'updated' | 'project'>>): Promise<TestPlan>;
  complete(id: Id): Promise<TestPlan>;
}

export interface RunsService {
  list(filters: RunListFilters): Promise<RunSummary[]>;
  get(id: Id): Promise<RunSummary>;
  create(input: RunInput): Promise<TestRun>;
  update(id: Id, patch: Partial<Pick<TestRun, 'name' | 'description' | 'build' | 'refs' | 'assigned_to' | 'milestone' | 'plan'>>): Promise<TestRun>;
  /** Irreversible. */
  close(id: Id): Promise<TestRun>;
  addCases(id: Id, caseIds: Id[]): Promise<number>;
  removeTests(id: Id, testIds: Id[]): Promise<number>;
}

export interface TestsService {
  list(filters: TestFilters): Promise<ListResult<TestListItem>>;
  /** All tests of a run in display order, for next/previous navigation. */
  order(runId: Id, filters?: Pick<TestFilters, 'status' | 'assignee' | 'section' | 'q'>): Promise<Id[]>;
  get(testId: Id): Promise<TestDetail>;
  assign(testIds: Id[], userId: Id | null): Promise<number>;
}

export interface ResultsService {
  add(input: AddResultInput): Promise<TestResult>;
  /** Bulk set a status on several tests (one result each). */
  addMany(testIds: Id[], statusId: Id, comment?: string): Promise<number>;
  /** Undo the result you just saved (creator only, recomputes the test status). */
  undo(resultId: Id): Promise<void>;
  /** Edit comment, elapsed and defects of your own result while the run is open. Status never changes. */
  update(resultId: Id, patch: ResultPatch): Promise<TestResult>;
  /** Admin only. */
  remove(resultId: Id): Promise<void>;
  addAttachment(resultId: Id, file: AttachmentInput): Promise<TestAttachment>;
  removeAttachment(id: Id): Promise<void>;
}

export interface ReportsService {
  milestone(milestoneId: Id): Promise<MilestoneReport>;
  run(runId: Id): Promise<RunReport>;
  /** Fixed / Regressed / New failing / Still failing versus the previous run of the same suite. */
  changes(runId: Id): Promise<RunChanges>;
  /** CSV text; manager+ only. */
  exportCsv(kind: 'milestone' | 'run', id: Id): Promise<string>;
}

export interface AutomationService {
  mappings(projectId: Id): Promise<AutomationMapping[]>;
  saveMapping(projectId: Id, id: Id | null, input: MappingInput): Promise<AutomationMapping>;
  tokens(projectId: Id): Promise<CiToken[]>;
  createToken(projectId: Id, name: string, mappingId: Id): Promise<TokenCreated>;
  revokeToken(id: Id): Promise<void>;
  executions(projectId: Id): Promise<ExecutionView[]>;
  execution(id: Id): Promise<ExecutionView>;
}

export interface AuditService {
  list(filters: AuditFilters): Promise<ListResult<AuditView>>;
}

export interface SettingsService {
  previewImport(projectId: Id, file: { name: string; text: string }): Promise<ImportPreview>;
  runImport(projectId: Id, file: { name: string; text: string }, options: ImportOptions): Promise<ImportResult>;
}

export interface Services {
  auth: AuthService;
  workspaces: WorkspacesService;
  projects: ProjectsService;
  members: MembersService;
  lookups: LookupsService;
  suites: SuitesService;
  cases: CasesService;
  milestones: MilestonesService;
  plans: PlansService;
  runs: RunsService;
  tests: TestsService;
  results: ResultsService;
  reports: ReportsService;
  automation: AutomationService;
  audit: AuditService;
  settings: SettingsService;
}
