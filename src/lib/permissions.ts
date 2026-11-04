import type { ProjectRole } from '@/services/types';

/**
 * Role matrix from docs/design/DESIGN.md section 8. Single source for the UI (RoleGate,
 * nav config) and the mock services. The server stays authoritative in M1.
 */
export type Action =
  | 'project.create'
  | 'cases.write'
  | 'suites.write'
  | 'milestones.write'
  | 'plans.write'
  | 'runs.write'
  | 'runs.attach'
  | 'results.write'
  | 'results.delete'
  | 'runs.close'
  | 'reports.export'
  | 'automation.mappings'
  | 'automation.tokens'
  | 'members.view'
  | 'members.write'
  | 'audit.view'
  | 'settings.general'
  | 'settings.announcement'
  | 'settings.import'
  | 'project.archive'
  | 'attachments.write';

const A: ProjectRole[] = ['admin'];
const AM: ProjectRole[] = ['admin', 'manager'];
const AMT: ProjectRole[] = ['admin', 'manager', 'tester'];

const MATRIX: Record<Action, ProjectRole[]> = {
  'project.create': AM,
  'cases.write': AMT,
  'suites.write': AMT,
  'milestones.write': AM,
  'plans.write': AM,
  'runs.write': AMT,
  'runs.attach': AM,
  'results.write': AMT,
  'results.delete': A,
  'runs.close': AMT,
  'reports.export': AM,
  'automation.mappings': AM,
  'automation.tokens': A,
  'members.view': AM,
  'members.write': A,
  'audit.view': A,
  'settings.general': A,
  'settings.announcement': AM,
  'settings.import': AM,
  'project.archive': A,
  'attachments.write': AMT,
};

export function can(role: ProjectRole | null | undefined, action: Action): boolean {
  return !!role && MATRIX[action].includes(role);
}

export const ROLE_LABEL: Record<ProjectRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  tester: 'Tester',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTION: Record<ProjectRole, string> = {
  admin: 'Everything, including members, tokens, audit log and project settings.',
  manager: 'Manage milestones, plans, runs and cases; import; view members and mappings.',
  tester: 'Write cases, create runs, record results and close runs.',
  viewer: 'Read-only access to cases, runs and reports.',
};

/** Why a write is disabled in a given state (used by tooltips). */
export const DISABLED_REASON = {
  archived: 'This project is archived. Read-only.',
  closedRun: 'This run is closed. Results can no longer be changed.',
  completedMilestone: 'This milestone is completed.',
  completedPlan: 'This plan is completed.',
  role: 'Your role does not allow this.',
} as const;
