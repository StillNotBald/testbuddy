// Types mirror docs/database-schema.md. PocketBase ids are strings; relations are id strings.
export type Id = string;
export type IsoDateTime = string;

export interface BaseRecord {
  id: Id;
  created: IsoDateTime;
  updated: IsoDateTime;
}

export type ProjectRole = 'admin' | 'manager' | 'tester' | 'viewer';
export type WorkspaceRole = 'admin' | 'member';
export type AutomationStatus =
  | 'not_specified'
  | 'needs_review'
  | 'needs_automation'
  | 'in_progress'
  | 'automated'
  | 'not_automatable';
export type IntegrationType = 'jira' | 'xray' | 'webhook' | 'git';
export type IntegrationAuthType = 'basic' | 'bearer' | 'api_token';
export type AutomationFramework = 'robot' | 'junit' | 'pytest' | 'custom';
export type ExecutionStatus = 'in_progress' | 'completed' | 'failed';
export type Tracker = 'jira' | 'other';

/** Derived status key. `untested` is derived (no result yet); `custom` = any other status row. */
export type TestStatusKey = 'passed' | 'failed' | 'blocked' | 'retest' | 'untested' | 'custom';

export interface User extends BaseRecord {
  name: string;
  email: string;
  avatar?: string;
  is_active: boolean;
  last_access?: IsoDateTime;
}

export interface Workspace extends BaseRecord {
  name: string;
  owner: Id;
  settings: Record<string, unknown>;
}

export interface WorkspaceMember extends BaseRecord {
  workspace: Id;
  user: Id;
  role: WorkspaceRole;
}

export interface Project extends BaseRecord {
  workspace: Id;
  name: string;
  announcement?: string;
  ref_prefix: string;
  case_counter: number;
  is_archived: boolean;
}

export interface ProjectMember extends BaseRecord {
  project: Id;
  user: Id;
  role: ProjectRole;
}

export interface TestSuite extends BaseRecord {
  project: Id;
  name: string;
  description?: string;
  is_baseline: boolean;
  is_completed: boolean;
}

export interface TestSection extends BaseRecord {
  project: Id;
  suite: Id;
  parent?: Id;
  name: string;
  position: number;
}

export interface CaseType extends BaseRecord {
  name: string;
  sort_order: number;
}

export interface Priority extends BaseRecord {
  name: string;
  short_name: string;
  color: string;
  sort_order: number;
}

export interface Status extends BaseRecord {
  name: string;
  color: string;
  is_passing: boolean;
  is_failing: boolean;
  flags?: string;
  sort_order: number;
}

export interface Tag extends BaseRecord {
  project: Id;
  name: string;
  color?: string;
}

export interface TestCaseTag extends BaseRecord {
  case: Id;
  tag: Id;
}

export interface TestCase extends BaseRecord {
  project: Id;
  suite: Id;
  section: Id;
  ref: string;
  source_key?: string;
  title: string;
  content?: string;
  priority?: Id;
  type?: Id;
  automation_status: AutomationStatus;
  estimate?: number; // seconds
  version: number;
  deprecated: boolean;
  deprecated_reason?: string;
  refs?: string;
  milestone?: Id;
  created_by?: Id;
  updated_by?: Id;
}

export interface TestStep extends BaseRecord {
  case: Id;
  position: number;
  description: string;
  expected_result?: string;
}

export interface TestCaseVersion extends BaseRecord {
  case: Id;
  project: Id;
  version: number;
  snapshot: { case: Record<string, unknown>; steps: Array<Record<string, unknown>> };
  note?: string;
  saved_by?: Id;
}

export interface Milestone extends BaseRecord {
  project: Id;
  title: string;
  description?: string;
  expires_on?: IsoDateTime;
  is_completed: boolean;
  refs?: string;
}

export interface TestPlan extends BaseRecord {
  project: Id;
  name: string;
  description?: string;
  type?: string;
  milestones?: Id[];
  builds?: string;
  refs?: string;
  owner?: Id;
  is_completed: boolean;
}

export interface TestRun extends BaseRecord {
  project: Id;
  suite: Id;
  plan?: Id;
  name: string;
  description?: string;
  milestone?: Id;
  include_all: boolean;
  case_ids?: Id[];
  build?: string;
  refs?: string;
  assigned_to?: Id;
  started_on?: IsoDateTime;
  finished_on?: IsoDateTime;
  is_closed: boolean;
  created_by?: Id;
}

export interface TestRunCase extends BaseRecord {
  run: Id;
  project: Id;
  case?: Id;
  version: number;
  case_snapshot: TestCaseVersion['snapshot'];
  refs?: string;
  assigned_to?: Id;
  status: Id;
}

export interface TestResult extends BaseRecord {
  project: Id;
  run: Id;
  test: Id;
  case?: Id;
  status: Id;
  comment?: string;
  version: number;
  elapsed?: number; // seconds
  defects?: string[];
  build?: string;
  refs?: string;
  assigned_to?: Id;
  created_by?: Id;
}

export interface TestStepResult extends BaseRecord {
  result: Id;
  test: Id;
  step_position: number;
  status: Id;
  comment?: string;
}

export interface TestAttachment extends BaseRecord {
  result: Id;
  project: Id;
  run: Id;
  file: string;
  original_name?: string;
  created_by?: Id;
}

export interface AuditLog extends BaseRecord {
  project?: Id;
  project_name?: string;
  actor?: Id;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

export interface IntegrationConfig extends BaseRecord {
  workspace: Id;
  name: string;
  type: IntegrationType;
  base_url?: string;
  auth_type?: IntegrationAuthType;
  credential_env?: string;
  is_active: boolean;
}

export interface AutomationMapping extends BaseRecord {
  project: Id;
  framework: AutomationFramework;
  config?: Id;
  field_map?: Record<string, unknown>;
  token_prefix?: string; // token_hash is hidden, never returned
  run_as: Id;
  is_active: boolean;
}

export interface AutomationExecution extends BaseRecord {
  mapping: Id;
  external_execution_id: string;
  run?: Id;
  build?: string;
  branch?: string;
  commit?: string;
  summary?: Record<string, unknown>;
  status: ExecutionStatus;
}

export interface DefectRef extends BaseRecord {
  project: Id;
  result: Id;
  external_key: string;
  url?: string;
  tracker: Tracker;
  summary?: string;
  status?: string;
}

export interface Requirement extends BaseRecord {
  project: Id;
  key: string;
  title: string;
  description?: string;
  source_url?: string;
}

export interface RequirementCoverage extends BaseRecord {
  requirement: Id;
  case: Id;
  project: Id;
}

/**
 * Mock-only (M0): CI token metadata. The schema stores only `automation_mappings.token_prefix`
 * and a hidden hash; the secret value is never stored and is returned once on creation.
 * M1 decides whether this becomes its own collection.
 */
export interface CiToken extends BaseRecord {
  project: Id;
  name: string;
  mapping: Id;
  prefix: string;
  last4: string;
  last_used?: IsoDateTime;
  revoked: boolean;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}
