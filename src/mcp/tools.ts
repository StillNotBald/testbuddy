/**
 * MCP tool registry for TestBuddy. Each tool: name, description, JSON schema, handler.
 *
 * Handlers are thin: they check the caller's project role with lib/permissions (the same matrix as
 * the UI), then call the service layer through `ctx.services`. No domain logic lives here
 * (R-137). Data comes from ./data-source (M0 demo data; M1 PocketBase).
 *
 * Pattern adapted from an Apache-2.0 reference credited in NOTICE.
 */
import { can, type Action } from '@/lib/permissions';
import { ServiceError, type CaseInput, type Services } from '@/services/interfaces';
import type { AutomationStatus, Id, TestStatusKey } from '@/services/types';
import { DATA_SOURCE_NOTE, demoData } from './data-source';
import type { Principal } from './auth';

export const NOTE = `Data: ${DATA_SOURCE_NOTE}.`;

export interface ToolContext { principal: Principal; services: Services; client?: string }

export type JsonSchema = {
  type?: 'object' | 'string' | 'integer' | 'number' | 'boolean' | 'array';
  description?: string;
  enum?: readonly (string | number)[];
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  default?: unknown;
  additionalProperties?: boolean;
  const?: unknown;
};

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema & { type: 'object' };
  write: boolean;
  /** Irreversible or destructive (annotation hint for clients). */
  destructive?: boolean;
  handler: (args: Args, ctx: ToolContext) => Promise<unknown>;
}

type Args = Record<string, unknown>;

/** Tool-level failure with a stable code. Never carries a stack trace to the client (R-138). */
export class ToolError extends Error {
  constructor(public code: string, public status: number, message: string, public details?: Record<string, string>) {
    super(message);
    this.name = 'ToolError';
  }
}

export function toToolError(e: unknown): ToolError {
  if (e instanceof ToolError) return e;
  if (e instanceof ServiceError) return new ToolError(e.code, e.status || 500, e.message, e.details);
  return new ToolError('internal', 500, 'Internal error. The call was not completed.');
}

// ---- helpers ---------------------------------------------------------------------------------
const str = (a: Args, k: string) => (typeof a[k] === 'string' ? (a[k] as string) : undefined);
const num = (a: Args, k: string) => (typeof a[k] === 'number' ? (a[k] as number) : undefined);
const strs = (a: Args, k: string) => (Array.isArray(a[k]) ? (a[k] as string[]) : undefined);

async function requireMember(ctx: ToolContext, projectId: Id) {
  const role = await ctx.services.projects.myRole(projectId);
  if (!role) throw new ToolError('forbidden', 403, 'You do not have access to this project. Ask an admin.');
  return role;
}

async function requireCan(ctx: ToolContext, projectId: Id, action: Action, what: string) {
  const role = await requireMember(ctx, projectId);
  if (!can(role, action)) throw new ToolError('forbidden', 403, `Your role (${role}) does not allow ${what}.`);
  return role;
}

const encodeCursor = (offset: number) => Buffer.from(`o:${offset}`).toString('base64url');
function decodeCursor(c: string | undefined): number {
  if (!c) return 0;
  const m = /^o:(\d+)$/.exec(Buffer.from(c, 'base64url').toString());
  if (!m) throw new ToolError('validation', 422, 'Invalid cursor. Use the next_cursor value from the previous page.');
  return Number(m[1]);
}
function page<T>(items: T[], a: Args) {
  const limit = num(a, 'limit') ?? 25;
  const offset = decodeCursor(str(a, 'cursor'));
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? encodeCursor(offset + limit) : null;
  return { items: slice, total: items.length, next_cursor: next };
}

const STATUS_KEYS = ['passed', 'failed', 'blocked', 'retest'] as const;
const AUTOMATION = ['not_specified', 'needs_review', 'needs_automation', 'in_progress', 'automated', 'not_automatable'] as const;

async function statusIdFor(ctx: ToolContext, key: string) {
  const all = await ctx.services.lookups.statuses();
  const s = all.find((x) => x.name.toLowerCase() === key);
  if (!s) throw new ToolError('validation', 422, `Unknown status "${key}".`);
  return s;
}

async function auditAgent(ctx: ToolContext, tool: string, projectId: Id, entityType: string, entityId: Id, detail?: unknown) {
  demoData.recordAgentAudit({ actorId: ctx.principal.userId, projectId, action: `agent.${tool}`, entityType, entityId, tool, client: ctx.client, detail });
}

// ---- shared schema fragments -----------------------------------------------------------------
const limitProp: JsonSchema = { type: 'integer', minimum: 1, maximum: 200, description: 'Page size, 1-200 (default 25).' };
const cursorProp: JsonSchema = { type: 'string', maxLength: 200, description: 'Opaque cursor from the previous page\'s next_cursor.' };
const idProp = (d: string): JsonSchema => ({ type: 'string', minLength: 1, maxLength: 64, description: d });
const stepsProp: JsonSchema = {
  type: 'array', maxItems: 100, description: 'Ordered test steps.',
  items: { type: 'object', required: ['description'], additionalProperties: false, properties: { description: { type: 'string', minLength: 1, maxLength: 2000 }, expected_result: { type: 'string', maxLength: 2000 } } },
};

// ---- tools -----------------------------------------------------------------------------------
export const TOOLS: ToolDef[] = [
  {
    name: 'list_projects', title: 'List projects', write: false,
    description: `List the projects you are a member of, with your role, case count and open runs. ${NOTE}`,
    inputSchema: { type: 'object', additionalProperties: false, properties: { include_archived: { type: 'boolean', description: 'Include archived projects (default false).' } } },
    async handler(a, ctx) {
      const ws = (await ctx.services.workspaces.list())[0];
      if (!ws) return { items: [] };
      const list = await ctx.services.projects.list({ workspaceId: ws.id, includeArchived: a.include_archived === true });
      return { items: list.map((p) => ({ id: p.project.id, name: p.project.name, ref_prefix: p.project.ref_prefix, is_archived: p.project.is_archived, my_role: p.my_role, case_count: p.case_count, open_runs: p.open_runs, last_activity: p.last_activity })) };
    },
  },
  {
    name: 'get_project', title: 'Get project', write: false,
    description: `Get one project with its overview: counts, active milestone, open runs and failing tests. ${NOTE}`,
    inputSchema: { type: 'object', required: ['project_id'], additionalProperties: false, properties: { project_id: idProp('Project id, for example from list_projects.') } },
    async handler(a, ctx) {
      const id = str(a, 'project_id')!;
      const role = await requireMember(ctx, id);
      const o = await ctx.services.projects.overview(id);
      return {
        project: o.project, my_role: role, case_count: o.case_count, cases_added_7d: o.cases_added_7d, open_runs: o.open_runs, pass_rate_7d: o.pass_rate_7d,
        failing_tests: o.failing_tests, active_milestone: o.active_milestone ? { id: o.active_milestone.milestone.id, title: o.active_milestone.milestone.title, progress: o.active_milestone.progress, days_left: o.active_milestone.days_left } : null,
        open_runs_list: o.open_run_list.map((r) => ({ id: r.run.id, name: r.run.name, progress: r.progress })),
      };
    },
  },
  {
    name: 'list_suites', title: 'List suites and sections', write: false,
    description: `List a project's suites with their section tree and case counts. Use the ids when filtering or adding cases. ${NOTE}`,
    inputSchema: { type: 'object', required: ['project_id'], additionalProperties: false, properties: { project_id: idProp('Project id.') } },
    async handler(a, ctx) {
      const id = str(a, 'project_id')!;
      await requireMember(ctx, id);
      type Sec = Awaited<ReturnType<Services['suites']['tree']>>[number]['sections'][number];
      const sec = (s: Sec): unknown => ({ id: s.section.id, name: s.section.name, case_count: s.count, children: s.children.map(sec) });
      const tree = await ctx.services.suites.tree(id);
      return { items: tree.map((n) => ({ id: n.suite.id, name: n.suite.name, description: n.suite.description, is_baseline: n.suite.is_baseline, is_completed: n.suite.is_completed, case_count: n.count, sections: n.sections.map(sec) })) };
    },
  },
  {
    name: 'list_cases', title: 'List test cases', write: false,
    description: `List test cases in a project with optional filters. Paged: pass next_cursor back as cursor. Deprecated cases are hidden unless include_deprecated is true. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['project_id'], additionalProperties: false,
      properties: {
        project_id: idProp('Project id.'), suite_id: idProp('Only this suite.'), section_id: idProp('Only this section (and its child sections).'),
        q: { type: 'string', maxLength: 200, description: 'Text search on title or ref.' },
        priority_ids: { type: 'array', items: { type: 'string' }, maxItems: 10, description: 'Priority ids, for example "pr_p1".' },
        type_ids: { type: 'array', items: { type: 'string' }, maxItems: 10, description: 'Case type ids.' },
        automation_status: { type: 'array', items: { type: 'string', enum: AUTOMATION }, maxItems: 6 },
        tag_ids: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        include_deprecated: { type: 'boolean' }, limit: limitProp, cursor: cursorProp,
      },
    },
    async handler(a, ctx) {
      const projectId = str(a, 'project_id')!;
      await requireMember(ctx, projectId);
      const res = await ctx.services.cases.list({
        projectId, suiteId: str(a, 'suite_id'), sectionId: str(a, 'section_id'), q: str(a, 'q'), priority: strs(a, 'priority_ids'), type: strs(a, 'type_ids'),
        automation: strs(a, 'automation_status') as AutomationStatus[] | undefined, tag: strs(a, 'tag_ids'), deprecated: a.include_deprecated === true, pageSize: 1_000_000, page: 1,
      });
      const p = page(res.items, a);
      return {
        total: p.total, next_cursor: p.next_cursor,
        items: p.items.map((i) => ({ id: i.case.id, ref: i.case.ref, title: i.case.title, section: i.section_name, priority: i.case.priority, type: i.case.type, automation_status: i.case.automation_status, version: i.case.version, deprecated: i.case.deprecated, tag_ids: i.tag_ids, updated: i.case.updated })),
      };
    },
  },
  {
    name: 'get_case', title: 'Get test case', write: false,
    description: `Get one test case with its steps, current version and tags. ${NOTE}`,
    inputSchema: { type: 'object', required: ['case_id'], additionalProperties: false, properties: { case_id: idProp('Case id.') } },
    async handler(a, ctx) {
      const d = await ctx.services.cases.get(str(a, 'case_id')!);
      await requireMember(ctx, d.case.project);
      return d;
    },
  },
  {
    name: 'list_milestones', title: 'List milestones', write: false,
    description: `List a project's milestones with progress and days left. ${NOTE}`,
    inputSchema: { type: 'object', required: ['project_id'], additionalProperties: false, properties: { project_id: idProp('Project id.'), state: { type: 'string', enum: ['open', 'completed'], description: 'Filter by state; default all.' } } },
    async handler(a, ctx) {
      const id = str(a, 'project_id')!;
      await requireMember(ctx, id);
      const list = await ctx.services.milestones.list(id, str(a, 'state') as 'open' | 'completed' | undefined);
      return { items: list.map((m) => ({ id: m.milestone.id, title: m.milestone.title, expires_on: m.milestone.expires_on, is_completed: m.milestone.is_completed, progress: m.progress, run_count: m.run_count, failed_count: m.failed_count, past_due: m.past_due, days_left: m.days_left })) };
    },
  },
  {
    name: 'list_runs', title: 'List test runs', write: false,
    description: `List test runs in a project with progress per run. Paged. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['project_id'], additionalProperties: false,
      properties: { project_id: idProp('Project id.'), state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Default all.' }, milestone_id: idProp('Only runs of this milestone.'), q: { type: 'string', maxLength: 200 }, limit: limitProp, cursor: cursorProp },
    },
    async handler(a, ctx) {
      const projectId = str(a, 'project_id')!;
      await requireMember(ctx, projectId);
      const list = await ctx.services.runs.list({ projectId, state: (str(a, 'state') as 'open' | 'closed' | 'all' | undefined) ?? 'all', milestone: str(a, 'milestone_id'), q: str(a, 'q') });
      const p = page(list, a);
      return { total: p.total, next_cursor: p.next_cursor, items: p.items.map(runView) };
    },
  },
  {
    name: 'get_run', title: 'Get test run', write: false,
    description: `Get one test run with its progress (counts per status, done % and pass %). ${NOTE}`,
    inputSchema: { type: 'object', required: ['run_id'], additionalProperties: false, properties: { run_id: idProp('Run id.') } },
    async handler(a, ctx) {
      const r = await ctx.services.runs.get(str(a, 'run_id')!);
      await requireMember(ctx, r.run.project);
      return runView(r);
    },
  },
  {
    name: 'list_run_tests', title: 'List tests in a run', write: false,
    description: `List the tests (case snapshots with status) of a run. Filter by status keys. Paged. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['run_id'], additionalProperties: false,
      properties: { run_id: idProp('Run id.'), status: { type: 'array', maxItems: 5, items: { type: 'string', enum: ['passed', 'failed', 'blocked', 'retest', 'untested'] }, description: 'Only tests in these statuses.' }, q: { type: 'string', maxLength: 200 }, limit: limitProp, cursor: cursorProp },
    },
    async handler(a, ctx) {
      const runId = str(a, 'run_id')!;
      const run = await ctx.services.runs.get(runId);
      await requireMember(ctx, run.run.project);
      const res = await ctx.services.tests.list({ runId, status: strs(a, 'status') as TestStatusKey[] | undefined, q: str(a, 'q'), page: 1, pageSize: 1_000_000 });
      const p = page(res.items, a);
      return {
        total: p.total, next_cursor: p.next_cursor,
        items: p.items.map((t) => ({ id: t.test.id, ref: t.ref, title: t.title, status: t.status_key, section: t.section_name, priority: t.priority?.short_name, assignee: t.assignee?.name, result_count: t.result_count, defect_count: t.defect_count, last_result_at: t.last_result_at })),
      };
    },
  },
  {
    name: 'get_test', title: 'Get test with result history', write: false,
    description: `Get one test of a run: the case snapshot fields, current status and the full result history (comments, defects, who and when). ${NOTE}`,
    inputSchema: { type: 'object', required: ['test_id'], additionalProperties: false, properties: { test_id: idProp('Test id, from list_run_tests.') } },
    async handler(a, ctx) {
      const d = await ctx.services.tests.get(str(a, 'test_id')!);
      await requireMember(ctx, d.run.project);
      return {
        id: d.item.test.id, run_id: d.run.id, ref: d.item.ref, title: d.item.title, status: d.item.status_key, section: d.item.section_name, case_version: d.item.test.version,
        has_newer_version: d.has_newer_version, steps: d.item.test.case_snapshot.steps,
        results: d.results.map((r) => ({ id: r.result.id, status: r.status_key, comment: r.result.comment, elapsed: r.result.elapsed, defects: r.result.defects, by: r.user?.name, at: r.result.created })),
      };
    },
  },

  // ---- writes ----------------------------------------------------------------------------------
  {
    name: 'add_case', title: 'Add test case', write: true,
    description: `Create a test case in a section (needs Tester role or higher in the project). It starts at version 1. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['project_id', 'suite_id', 'section_id', 'title'], additionalProperties: false,
      properties: {
        project_id: idProp('Project id.'), suite_id: idProp('Suite id (list_suites).'), section_id: idProp('Section id inside that suite.'),
        title: { type: 'string', minLength: 1, maxLength: 300 }, content: { type: 'string', maxLength: 10000, description: 'Preconditions or description.' },
        priority_id: idProp('Priority id, for example "pr_p2".'), type_id: idProp('Case type id.'), automation_status: { type: 'string', enum: AUTOMATION },
        estimate: { type: 'integer', minimum: 0, maximum: 86400, description: 'Estimate in seconds.' }, refs: { type: 'string', maxLength: 500 },
        steps: stepsProp, tag_ids: { type: 'array', items: { type: 'string' }, maxItems: 20 },
      },
    },
    async handler(a, ctx) {
      const project = str(a, 'project_id')!;
      await requireCan(ctx, project, 'cases.write', 'adding cases');
      const input: CaseInput = {
        project, suite: str(a, 'suite_id')!, section: str(a, 'section_id')!, title: str(a, 'title')!, content: str(a, 'content'), priority: str(a, 'priority_id'), type: str(a, 'type_id'),
        automation_status: str(a, 'automation_status') as AutomationStatus | undefined, estimate: num(a, 'estimate'), refs: str(a, 'refs'),
        steps: (a.steps as CaseInput['steps'] | undefined) ?? [], tag_ids: strs(a, 'tag_ids') ?? [],
      };
      const d = await ctx.services.cases.create(input);
      await auditAgent(ctx, 'add_case', project, 'case', d.case.id, { ref: d.case.ref });
      return { id: d.case.id, ref: d.case.ref, version: d.case.version, title: d.case.title };
    },
  },
  {
    name: 'update_case', title: 'Update test case (new version)', write: true,
    description: `Edit a test case. Every update saves a NEW VERSION; older versions stay in history. Pass expected_version (from get_case) to avoid overwriting someone else's edit; if omitted the current version is used. Needs Tester role or higher. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['case_id'], additionalProperties: false,
      properties: {
        case_id: idProp('Case id.'), expected_version: { type: 'integer', minimum: 1, description: 'Version you last read. A stale value returns a conflict error.' },
        title: { type: 'string', minLength: 1, maxLength: 300 }, content: { type: 'string', maxLength: 10000 }, priority_id: idProp('Priority id.'), type_id: idProp('Case type id.'),
        automation_status: { type: 'string', enum: AUTOMATION }, estimate: { type: 'integer', minimum: 0, maximum: 86400 }, refs: { type: 'string', maxLength: 500 },
        steps: { ...stepsProp, description: 'Replaces ALL steps when given.' }, tag_ids: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Replaces all tags when given.' },
        note: { type: 'string', maxLength: 500, description: 'Version note.' },
      },
    },
    async handler(a, ctx) {
      const caseId = str(a, 'case_id')!;
      const cur = await ctx.services.cases.get(caseId);
      await requireCan(ctx, cur.case.project, 'cases.write', 'editing cases');
      const patch: Partial<CaseInput> = {};
      if (a.title !== undefined) patch.title = str(a, 'title');
      if (a.content !== undefined) patch.content = str(a, 'content');
      if (a.priority_id !== undefined) patch.priority = str(a, 'priority_id');
      if (a.type_id !== undefined) patch.type = str(a, 'type_id');
      if (a.automation_status !== undefined) patch.automation_status = str(a, 'automation_status') as AutomationStatus;
      if (a.estimate !== undefined) patch.estimate = num(a, 'estimate');
      if (a.refs !== undefined) patch.refs = str(a, 'refs');
      if (a.steps !== undefined) patch.steps = a.steps as CaseInput['steps'];
      if (a.tag_ids !== undefined) patch.tag_ids = strs(a, 'tag_ids');
      if (!Object.keys(patch).length) throw new ToolError('validation', 422, 'Nothing to update. Give at least one field to change.');
      const d = await ctx.services.cases.update(caseId, patch, { note: str(a, 'note'), expectedVersion: num(a, 'expected_version') ?? cur.case.version, coalesce: false });
      await auditAgent(ctx, 'update_case', cur.case.project, 'case', caseId, { from_version: cur.case.version, to_version: d.case.version });
      return { id: d.case.id, ref: d.case.ref, previous_version: cur.case.version, version: d.case.version, title: d.case.title };
    },
  },
  {
    name: 'add_run', title: 'Add test run', write: true,
    description: `Create a test run from a list of case ids (case_ids) or from every active case of the suite (include_all). The run snapshots each case at its current version. Needs Tester role or higher; attaching a milestone needs Manager. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['project_id', 'suite_id', 'name'], additionalProperties: false,
      properties: {
        project_id: idProp('Project id.'), suite_id: idProp('Suite id; all cases must belong to it.'), name: { type: 'string', minLength: 1, maxLength: 200 }, description: { type: 'string', maxLength: 2000 },
        case_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 1000, description: 'Case ids to include. Required unless include_all is true.' },
        include_all: { type: 'boolean', description: 'Include every active case of the suite instead of case_ids.' },
        milestone_id: idProp('Milestone id (Manager or higher).'), build: { type: 'string', maxLength: 100 }, assigned_to: idProp('User id to assign all tests to.'),
      },
    },
    async handler(a, ctx) {
      const project = str(a, 'project_id')!;
      await requireCan(ctx, project, 'runs.write', 'creating runs');
      const includeAll = a.include_all === true;
      const caseIds = strs(a, 'case_ids');
      if (!includeAll && !caseIds?.length) throw new ToolError('validation', 422, 'Give case_ids, or set include_all to true.');
      const run = await ctx.services.runs.create({ project, suite: str(a, 'suite_id')!, name: str(a, 'name')!, description: str(a, 'description'), milestone: str(a, 'milestone_id'), build: str(a, 'build'), assigned_to: str(a, 'assigned_to'), include_all: includeAll, case_ids: includeAll ? undefined : caseIds });
      const s = await ctx.services.runs.get(run.id);
      await auditAgent(ctx, 'add_run', project, 'run', run.id, { name: run.name, tests: s.progress.total });
      return runView(s);
    },
  },
  {
    name: 'add_result', title: 'Add test result', write: true,
    description: `Record a result for one test in an open run. status is passed, failed, blocked or retest ("untested" cannot be posted). Failed and Blocked REQUIRE a comment. Each call adds a history entry; the test status becomes the new status. Needs Tester role or higher. ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['test_id', 'status'], additionalProperties: false,
      properties: {
        test_id: idProp('Test id (list_run_tests).'), status: { type: 'string', enum: STATUS_KEYS },
        comment: { type: 'string', maxLength: 4000, description: 'Required for failed and blocked.' }, elapsed: { type: 'integer', minimum: 0, maximum: 86400, description: 'Seconds spent.' },
        defects: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 20, description: 'Defect or ticket references.' },
      },
    },
    async handler(a, ctx) {
      const testId = str(a, 'test_id')!;
      const key = str(a, 'status')!;
      const d = await ctx.services.tests.get(testId);
      const project = d.run.project;
      await requireCan(ctx, project, 'results.write', 'recording results');
      if (d.run.is_closed) throw new ToolError('closed', 409, 'This run is closed. Results can no longer be changed.');
      const status = await statusIdFor(ctx, key);
      const comment = str(a, 'comment')?.trim();
      if ((key === 'failed' || key === 'blocked' || status.flags?.includes('require_comment')) && !comment) throw new ToolError('validation', 422, `A comment is required for ${key} results.`, { comment: 'required' });
      const r = await ctx.services.results.add({ testId, statusId: status.id, comment, elapsed: num(a, 'elapsed'), defects: strs(a, 'defects') });
      await auditAgent(ctx, 'add_result', project, 'result', r.id, { test: testId, status: key });
      const after = await ctx.services.runs.get(d.run.id);
      return { result_id: r.id, test_id: testId, status: key, run_progress: after.progress };
    },
  },
  {
    name: 'close_run', title: 'Close test run (irreversible)', write: true, destructive: true,
    description: `CLOSE a run. This is IRREVERSIBLE: a closed run can never be reopened and no more results can be added. You must pass confirm: true, and should confirm with the user first. Needs Tester role or higher; a Tester can close only a run assigned to them (managers and admins can close any). ${NOTE}`,
    inputSchema: {
      type: 'object', required: ['run_id', 'confirm'], additionalProperties: false,
      properties: { run_id: idProp('Run id.'), confirm: { type: 'boolean', description: 'Must be true. Without it nothing happens.' } },
    },
    async handler(a, ctx) {
      const runId = str(a, 'run_id')!;
      const r = await ctx.services.runs.get(runId);
      await requireCan(ctx, r.run.project, 'runs.close', 'closing runs');
      if (a.confirm !== true) throw new ToolError('confirmation_required', 422, 'Closing a run is irreversible. Ask the user, then call again with confirm: true.');
      if (r.run.is_closed) throw new ToolError('closed', 409, 'This run is already closed.');
      const closed = await ctx.services.runs.close(runId);
      await auditAgent(ctx, 'close_run', r.run.project, 'run', runId, { name: r.run.name });
      return { id: closed.id, name: closed.name, is_closed: true, finished_on: closed.finished_on, progress: r.progress };
    },
  },
];

type RunSummaryLike = Awaited<ReturnType<Services['runs']['get']>>;
function runView(r: RunSummaryLike) {
  return {
    id: r.run.id, name: r.run.name, project_id: r.run.project, suite: r.suite_name, milestone: r.milestone_title, plan: r.plan_name, build: r.run.build, assignee: r.assignee?.name,
    is_closed: r.run.is_closed, started_on: r.run.started_on, finished_on: r.run.finished_on, progress: r.progress,
  };
}

export const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
