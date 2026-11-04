import { can } from '@/lib/permissions';
import {
  ServiceError, type AuthService, type CaseDetail, type CaseFilters, type CaseInput, type CaseListItem, type CasesService,
  type DemoUser, type LookupsService, type MemberView, type MembersService, type ProjectSummary, type ProjectsService,
  type SectionNode, type Session, type SuiteNode, type SuitesService, type WorkspacesService, type ProjectOverview, type RunSummary,
} from '../interfaces';
import type {
  AuditLog, CaseType, Id, Priority, Project, ProjectMember, ProjectRole, Status, Tag, TestCase, TestCaseTag, TestCaseVersion, TestResult,
  TestRun, TestRunCase, TestSection, TestStep, TestSuite, User, Workspace, WorkspaceMember, Milestone, ListResult,
} from '../types';
import {
  audit, getMockDb, me, mergeProgress, need, needMember, pickFields, progressOf, project, readSessionUserId, requireText, roleIn, sim, statusKeyById, userMap, writeSessionUserId,
} from './core';
import { DEMO_PASSWORD, IDS } from './fixtures';
import { createSampleProject } from './sample-project';

const db = () => getMockDb();

// ---- auth -------------------------------------------------------------------------------------
function sessionFor(user: User): Session {
  const wm = db().find<WorkspaceMember>('workspace_members', (m) => m.user === user.id);
  return { user, workspace_role: wm?.role ?? 'member' };
}

export const authService: AuthService = {
  listDemoUsers: () => sim(() => db().list<User>('users').map<DemoUser>((user) => ({
    user,
    workspace_role: sessionFor(user).workspace_role,
    core_role: db().find<ProjectMember>('project_members', (m) => m.project === IDS.projectCore && m.user === user.id)?.role ?? null,
  }))),
  signInAs: (userId) => sim(() => {
    const user = db().get<User>('users', userId);
    if (!user) throw new ServiceError('validation', 'Email or password is incorrect.');
    if (!user.is_active) throw new ServiceError('forbidden', 'This account is disabled. Ask an admin.');
    writeSessionUserId(user.id);
    return sessionFor(user);
  }),
  signInWithPassword: (email, password) => sim(() => {
    const user = db().find<User>('users', (u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password !== DEMO_PASSWORD) throw new ServiceError('validation', 'Email or password is incorrect.');
    if (!user.is_active) throw new ServiceError('forbidden', 'This account is disabled. Ask an admin.');
    writeSessionUserId(user.id);
    return sessionFor(user);
  }),
  getSession: () => sim(() => {
    const id = readSessionUserId();
    const user = id ? db().get<User>('users', id) : undefined;
    return user && user.is_active ? sessionFor(user) : null;
  }),
  signOut: () => sim(() => { writeSessionUserId(null); }),
};

// ---- workspaces --------------------------------------------------------------------------------
export const workspacesService: WorkspacesService = {
  list: () => sim(() => {
    const u = me();
    const ids = new Set(db().list<WorkspaceMember>('workspace_members', (m) => m.user === u.id).map((m) => m.workspace));
    return db().list<Workspace>('workspaces', (w) => ids.has(w.id));
  }),
  get: (id) => sim(() => {
    me();
    const w = db().get<Workspace>('workspaces', id);
    if (!w) throw new ServiceError('not_found', 'Workspace not found.');
    return w;
  }),
  myRole: (id) => sim(() => db().find<WorkspaceMember>('workspace_members', (m) => m.workspace === id && m.user === me().id)?.role ?? null),
};

// ---- projects ----------------------------------------------------------------------------------
function runSummaryLite(run: TestRun) {
  const tests = db().list<TestRunCase>('test_run_cases', (t) => t.run === run.id);
  return progressOf(tests);
}

function lastActivity(projectId: Id): string | undefined {
  return db().list<AuditLog>('audit_logs', (a) => a.project === projectId).map((a) => a.created).sort().pop();
}

export function buildRunSummary(run: TestRun, users = userMap()): RunSummary {
  return {
    run,
    progress: runSummaryLite(run),
    assignee: run.assigned_to ? users.get(run.assigned_to) : undefined,
    plan_name: run.plan ? db().get<{ name: string } & { id: Id; created: string; updated: string }>('test_plans', run.plan)?.name : undefined,
    milestone_title: run.milestone ? db().get<Milestone>('milestones', run.milestone)?.title : undefined,
    suite_name: db().get<TestSuite>('test_suites', run.suite)?.name ?? '',
  };
}

export const projectsService: ProjectsService = {
  list: ({ workspaceId, includeArchived, q }) => sim(() => {
    const u = me();
    const memberships = new Map(db().list<ProjectMember>('project_members', (m) => m.user === u.id).map((m) => [m.project, m.role]));
    return db().list<Project>('projects', (p) => p.workspace === workspaceId && memberships.has(p.id) && (includeArchived || !p.is_archived) && (!q || `${p.name} ${p.ref_prefix}`.toLowerCase().includes(q.toLowerCase())))
      .map<ProjectSummary>((project) => {
        const runs = db().list<TestRun>('test_runs', (r) => r.project === project.id).sort((a, b) => (b.started_on ?? '').localeCompare(a.started_on ?? ''));
        const latest = runs[0];
        return {
          project,
          my_role: memberships.get(project.id) ?? null,
          case_count: db().count<TestCase>('test_cases', (c) => c.project === project.id && !c.deprecated),
          open_runs: runs.filter((r) => !r.is_closed).length,
          latest_run: latest ? { id: latest.id, name: latest.name, progress: runSummaryLite(latest) } : undefined,
          last_activity: lastActivity(project.id) ?? project.updated,
        };
      });
  }),
  get: (id) => sim(() => { needMember(id); return project(id); }),
  myRole: (id) => sim(() => { project(id); return roleIn(id); }),
  create: (input) => sim(() => {
    const u = me();
    const wm = db().find<WorkspaceMember>('workspace_members', (m) => m.workspace === input.workspace && m.user === u.id);
    const isMgr = wm?.role === 'admin' || db().list<ProjectMember>('project_members', (m) => m.user === u.id).some((m) => can(m.role, 'project.create'));
    if (!wm || !isMgr) throw new ServiceError('forbidden', 'Your role does not allow this.');
    const name = requireText(input.name, 'Name');
    const prefix = input.ref_prefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,10}$/.test(prefix)) throw new ServiceError('validation', 'Use 2-10 characters: A-Z and 0-9.', { ref_prefix: 'invalid' });
    if (db().find<Project>('projects', (p) => p.workspace === input.workspace && p.ref_prefix === prefix)) throw new ServiceError('conflict', 'This prefix is already used.', { ref_prefix: 'taken' });
    if (db().find<Project>('projects', (p) => p.workspace === input.workspace && p.name.toLowerCase() === name.toLowerCase())) throw new ServiceError('conflict', 'A project with this name already exists.', { name: 'taken' });
    return db().transaction((tx) => {
      const p = tx.create<Project>('projects', { workspace: input.workspace, name, announcement: input.announcement?.trim() || undefined, ref_prefix: prefix, case_counter: 0, is_archived: false });
      tx.create<ProjectMember>('project_members', { project: p.id, user: u.id, role: 'admin' });
      audit(p.id, 'project.create', 'project', p.id, undefined, { name, ref_prefix: prefix });
      return p;
    });
  }, { write: true }),
  prefixAvailable: (workspaceId, prefix) => sim(() => !db().find<Project>('projects', (p) => p.workspace === workspaceId && p.ref_prefix === prefix.trim().toUpperCase())),
  update: (id, patch) => sim(() => {
    const role = need(id, 'settings.announcement');
    if (patch.name !== undefined && !can(role, 'settings.general')) throw new ServiceError('forbidden', 'Your role does not allow this.');
    const before = project(id);
    const next = db().update<Project>('projects', id, { ...patch, name: patch.name !== undefined ? requireText(patch.name, 'Name') : before.name });
    audit(id, 'project.update', 'project', id, { name: before.name, announcement: before.announcement }, { name: next.name, announcement: next.announcement });
    return next;
  }, { write: true }),
  setArchived: (id, archived) => sim(() => {
    need(id, 'project.archive', { allowArchived: true });
    const next = db().update<Project>('projects', id, { is_archived: archived });
    audit(id, 'project.update', 'project', id, { is_archived: !archived }, { is_archived: archived });
    return next;
  }, { write: true }),
  remove: (id, confirmName) => sim(() => {
    need(id, 'project.archive', { allowArchived: true });
    if (project(id).name !== confirmName) throw new ServiceError('validation', 'Type the project name to confirm.');
    db().transaction((tx) => {
      const runIds = new Set(tx.list<TestRun>('test_runs', (r) => r.project === id).map((r) => r.id));
      const caseIds = new Set(tx.list<TestCase>('test_cases', (c) => c.project === id).map((c) => c.id));
      const resultIds = new Set(tx.list<TestResult>('test_results', (r) => r.project === id).map((r) => r.id));
      tx.deleteWhere('test_step_results', (s: { result: Id } & { id: Id; created: string; updated: string }) => resultIds.has(s.result));
      for (const col of ['test_attachments', 'test_results', 'test_run_cases', 'test_case_versions', 'milestones', 'test_plans', 'tags', 'test_suites', 'test_sections', 'project_members', 'automation_mappings', 'ci_tokens', 'test_cases']) {
        tx.deleteWhere(col, (r: { project?: Id } & { id: Id; created: string; updated: string }) => r.project === id);
      }
      tx.deleteWhere('test_steps', (s: { case: Id } & { id: Id; created: string; updated: string }) => caseIds.has(s.case));
      tx.deleteWhere('test_case_tags', (s: { case: Id } & { id: Id; created: string; updated: string }) => caseIds.has(s.case));
      tx.deleteWhere('test_runs', (r) => runIds.has(r.id));
      tx.delete('projects', id);
    });
  }, { write: true }),
  createSample: (workspaceId) => sim(() => createSampleProject(workspaceId), { write: true }),
  impact: (id) => sim(() => {
    need(id, 'project.archive', { allowArchived: true });
    return {
      cases: db().count<TestCase>('test_cases', (c) => c.project === id),
      runs: db().count<TestRun>('test_runs', (r) => r.project === id),
      results: db().count<TestResult>('test_results', (r) => r.project === id),
    };
  }),
  overview: (id): Promise<ProjectOverview> => sim(() => {
    needMember(id);
    const p = project(id);
    const u = me();
    const users = userMap();
    const weekAgo = Date.now() - 7 * 86_400_000;
    const cases = db().list<TestCase>('test_cases', (c) => c.project === id && !c.deprecated);
    const runs = db().list<TestRun>('test_runs', (r) => r.project === id);
    const openRuns = runs.filter((r) => !r.is_closed);
    const openIds = new Set(openRuns.map((r) => r.id));
    const recent = db().list<TestResult>('test_results', (r) => r.project === id && Date.parse(r.created) >= weekAgo);
    const passed = recent.filter((r) => statusKeyById(r.status) === 'passed').length;
    const openTests = db().list<TestRunCase>('test_run_cases', (t) => openIds.has(t.run));
    const active = db().list<Milestone>('milestones', (m) => m.project === id && !m.is_completed).sort((a, b) => (a.expires_on ?? '9').localeCompare(b.expires_on ?? '9'))[0];
    const mine = openTests.filter((t) => t.assigned_to === u.id && statusKeyById(t.status) === 'untested');
    const titleOf = (cid?: Id) => { const c = cid ? db().get<TestCase>('test_cases', cid) : undefined; return c ? `${c.ref}` : 'a test'; };
    const activity = db().list<AuditLog>('audit_logs', (a) => a.project === id).sort((a, b) => b.created.localeCompare(a.created)).slice(0, 8).map((a) => ({
      id: a.id, at: a.created, actor: a.actor ? users.get(a.actor) : undefined,
      text: describeAudit(a, titleOf),
    }));
    return {
      project: p,
      case_count: cases.length,
      cases_added_7d: cases.filter((c) => Date.parse(c.created) >= weekAgo).length,
      open_runs: openRuns.length,
      pass_rate_7d: recent.length ? Math.round((passed / recent.length) * 100) : null,
      failing_tests: openTests.filter((t) => statusKeyById(t.status) === 'failed').length,
      active_milestone: active ? {
        milestone: active,
        progress: mergeProgress(db().list<TestRun>('test_runs', (r) => r.milestone === active.id).map(runSummaryLite)),
        days_left: active.expires_on ? Math.ceil((Date.parse(active.expires_on) - Date.now()) / 86_400_000) : null,
      } : undefined,
      open_run_list: openRuns.map((r) => buildRunSummary(r, users)),
      activity,
      my_assigned: { count: mine.length, next_test_id: mine[0]?.id, next_run_id: mine[0]?.run },
    };
  }),
};

export function describeAudit(a: AuditLog, ref: (cid?: Id) => string): string {
  const [type, verb] = a.action.split('.') as [string, string];
  switch (a.action) {
    case 'result.create': return `recorded a result on ${ref(db().get<TestResult>('test_results', a.entity_id)?.case)}`;
    case 'result.delete': return 'deleted a result';
    case 'run.create': return 'created a run';
    case 'run.close': return 'closed a run';
    case 'case.create': return 'created a case';
    case 'case.update': return 'updated a case';
    case 'case.delete': return 'deleted a case';
    case 'member.add': return 'added a member';
    case 'member.role_change': return 'changed a member role';
    case 'member.remove': return 'removed a member';
    case 'project.update': return 'updated the project';
    case 'token.create': return 'created a CI token';
    case 'token.revoke': return 'revoked a CI token';
    default: return `${verb} ${type}`;
  }
}

// ---- members ---------------------------------------------------------------------------------
function memberView(m: ProjectMember): MemberView {
  return { member: m, user: db().get<User>('users', m.user) as User };
}

export const membersService: MembersService = {
  list: (projectId) => sim(() => {
    const role = needMember(projectId);
    if (!can(role, 'members.view')) throw new ServiceError('forbidden', 'Your role does not allow this.');
    return db().list<ProjectMember>('project_members', (m) => m.project === projectId).map(memberView);
  }),
  searchCandidates: (projectId, q) => sim(() => {
    need(projectId, 'members.write');
    const ws = project(projectId).workspace;
    const inProject = new Set(db().list<ProjectMember>('project_members', (m) => m.project === projectId).map((m) => m.user));
    const wsUsers = new Set(db().list<WorkspaceMember>('workspace_members', (m) => m.workspace === ws).map((m) => m.user));
    return db().list<User>('users', (u) => wsUsers.has(u.id) && !inProject.has(u.id) && u.is_active && `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  }),
  add: (projectId, userId, role) => sim(() => {
    need(projectId, 'members.write');
    if (db().find<ProjectMember>('project_members', (m) => m.project === projectId && m.user === userId)) throw new ServiceError('conflict', 'This person is already a member.');
    const m = db().create<ProjectMember>('project_members', { project: projectId, user: userId, role });
    audit(projectId, 'member.add', 'member', m.id, undefined, { user: userId, role });
    return memberView(m);
  }, { write: true }),
  setRole: (projectId, memberId, role) => sim(() => {
    need(projectId, 'members.write');
    const cur = db().get<ProjectMember>('project_members', memberId);
    if (!cur || cur.project !== projectId) throw new ServiceError('not_found', 'Member not found.');
    if (cur.role === 'admin' && role !== 'admin' && db().count<ProjectMember>('project_members', (m) => m.project === projectId && m.role === 'admin') <= 1) {
      throw new ServiceError('validation', 'The last admin cannot be demoted.');
    }
    const m = db().update<ProjectMember>('project_members', memberId, { role });
    audit(projectId, 'member.role_change', 'member', memberId, { role: cur.role }, { role });
    return memberView(m);
  }, { write: true }),
  remove: (projectId, memberId) => sim(() => {
    need(projectId, 'members.write');
    const cur = db().get<ProjectMember>('project_members', memberId);
    if (!cur || cur.project !== projectId) throw new ServiceError('not_found', 'Member not found.');
    if (cur.role === 'admin' && db().count<ProjectMember>('project_members', (m) => m.project === projectId && m.role === 'admin') <= 1) {
      throw new ServiceError('validation', 'The last admin cannot be removed.');
    }
    db().delete('project_members', memberId);
    audit(projectId, 'member.remove', 'member', memberId, { role: cur.role }, undefined);
  }, { write: true }),
};

// ---- lookups -----------------------------------------------------------------------------------
export const lookupsService: LookupsService = {
  caseTypes: () => sim(() => db().list<CaseType>('case_types').sort((a, b) => a.sort_order - b.sort_order)),
  priorities: () => sim(() => db().list<Priority>('priorities').sort((a, b) => a.sort_order - b.sort_order)),
  statuses: () => sim(() => db().list<Status>('statuses').sort((a, b) => a.sort_order - b.sort_order)),
  tags: (projectId) => sim(() => { needMember(projectId); return db().list<Tag>('tags', (t) => t.project === projectId).sort((a, b) => a.name.localeCompare(b.name)); }),
  createTag: (projectId, name, color) => sim(() => {
    need(projectId, 'cases.write');
    const n = requireText(name, 'Name');
    if (db().find<Tag>('tags', (t) => t.project === projectId && t.name.toLowerCase() === n.toLowerCase())) throw new ServiceError('conflict', 'This tag already exists.');
    const tag = db().create<Tag>('tags', { project: projectId, name: n, color });
    audit(projectId, 'tag.create', 'tag', tag.id, undefined, { name: n });
    return tag;
  }, { write: true }),
  updateTag: (id, patch) => sim(() => {
    const t = db().get<Tag>('tags', id);
    if (!t) throw new ServiceError('not_found', 'Tag not found.');
    need(t.project, 'cases.write');
    const next = db().update<Tag>('tags', id, pickFields(patch, ['name', 'color']));
    audit(t.project, 'tag.update', 'tag', id, { name: t.name, color: t.color }, { name: next.name, color: next.color });
    return next;
  }, { write: true }),
  removeTag: (id) => sim(() => {
    const t = db().get<Tag>('tags', id);
    if (!t) throw new ServiceError('not_found', 'Tag not found.');
    need(t.project, 'cases.write');
    db().transaction((tx) => {
      tx.deleteWhere<TestCaseTag>('test_case_tags', (x) => x.tag === id);
      tx.delete('tags', id);
      audit(t.project, 'tag.delete', 'tag', id, { name: t.name }, undefined);
    });
  }, { write: true }),
};

// ---- shared case-lifecycle helpers ------------------------------------------------------------
type Tx = ReturnType<typeof db>;

/** Cases that may not be hard-deleted: they have results (BR-4) or appear in a closed run (BR-1). */
function caseIsPinned(tx: Tx, caseId: Id): boolean {
  if (tx.count<TestResult>('test_results', (r) => r.case === caseId) > 0) return true;
  return tx.list<TestRunCase>('test_run_cases', (t) => t.case === caseId).some((t) => tx.get<TestRun>('test_runs', t.run)?.is_closed === true);
}

/** Remove a case from open runs. Tests that already have results stay (their snapshot is frozen). */
function dropFromOpenRuns(tx: Tx, caseId: Id): void {
  const withResults = new Set(tx.list<TestResult>('test_results', (r) => r.case === caseId).map((r) => r.test));
  tx.list<TestRunCase>('test_run_cases', (t) => t.case === caseId && !withResults.has(t.id) && tx.get<TestRun>('test_runs', t.run)?.is_closed === false)
    .forEach((t) => tx.delete('test_run_cases', t.id));
}

/** Open-run tests without results follow the case (BR-3); a snapshot that already has results stays frozen. */
function refreshOpenSnapshots(tx: Tx, caseId: Id, snap: TestCaseVersion['snapshot'], version: number): void {
  const withResults = new Set(tx.list<TestResult>('test_results', (r) => r.case === caseId).map((r) => r.test));
  tx.list<TestRunCase>('test_run_cases', (t) => t.case === caseId && !withResults.has(t.id)).forEach((t) => {
    if (tx.get<TestRun>('test_runs', t.run)?.is_closed === false) tx.update<TestRunCase>('test_run_cases', t.id, { case_snapshot: snap, version });
  });
}

/** Refuse a hard delete of a scope (suite or section) that holds pinned cases; otherwise clear them from open runs. */
function assertScopeDeletable(tx: Tx, caseIds: Set<Id>, what: string): void {
  const pinned = [...caseIds].filter((cid) => caseIsPinned(tx, cid)).length;
  if (pinned > 0) {
    throw new ServiceError('conflict', `This ${what} has ${pinned} case${pinned === 1 ? '' : 's'} with results or in a closed run, so it cannot be deleted. Deprecate those cases instead.`, { cases: String(pinned) });
  }
  caseIds.forEach((cid) => dropFromOpenRuns(tx, cid));
}

// ---- suites ------------------------------------------------------------------------------------
export const suitesService: SuitesService = {
  tree: (projectId) => sim(() => {
    needMember(projectId);
    const cases = db().list<TestCase>('test_cases', (c) => c.project === projectId);
    const secCount = new Map<Id, number>();
    cases.forEach((c) => secCount.set(c.section, (secCount.get(c.section) ?? 0) + 1));
    const sections = db().list<TestSection>('test_sections', (s) => s.project === projectId).sort((a, b) => a.position - b.position);
    const build = (suiteId: Id, parent?: Id): SectionNode[] =>
      sections.filter((s) => s.suite === suiteId && s.parent === parent).map((section) => {
        const children = build(suiteId, section.id);
        return { section, children, count: (secCount.get(section.id) ?? 0) + children.reduce((n, c) => n + c.count, 0) };
      });
    return db().list<TestSuite>('test_suites', (s) => s.project === projectId).map<SuiteNode>((suite) => {
      const secs = build(suite.id);
      return { suite, sections: secs, count: secs.reduce((n, s) => n + s.count, 0) };
    });
  }),
  createSuite: (projectId, name, description) => sim(() => {
    need(projectId, 'suites.write');
    const n = requireText(name, 'Name');
    if (db().find<TestSuite>('test_suites', (s) => s.project === projectId && s.name.toLowerCase() === n.toLowerCase())) throw new ServiceError('conflict', 'A suite with this name already exists.');
    const s = db().create<TestSuite>('test_suites', { project: projectId, name: n, description, is_baseline: false, is_completed: false });
    audit(projectId, 'suite.create', 'suite', s.id, undefined, { name: n });
    return s;
  }, { write: true }),
  updateSuite: (id, patch) => sim(() => {
    const s = db().get<TestSuite>('test_suites', id);
    if (!s) throw new ServiceError('not_found', 'Suite not found.');
    need(s.project, 'suites.write');
    const clean = pickFields(patch, ['name', 'description', 'is_baseline', 'is_completed']);
    const next = db().update<TestSuite>('test_suites', id, clean);
    audit(s.project, 'suite.update', 'suite', id, { name: s.name }, { name: next.name });
    return next;
  }, { write: true }),
  removeSuite: (id) => sim(() => {
    const s = db().get<TestSuite>('test_suites', id);
    if (!s) throw new ServiceError('not_found', 'Suite not found.');
    need(s.project, 'project.archive');
    db().transaction((tx) => {
      const caseIds = new Set(tx.list<TestCase>('test_cases', (c) => c.suite === id).map((c) => c.id));
      assertScopeDeletable(tx, caseIds, 'suite');
      tx.deleteWhere<TestStep>('test_steps', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCaseTag>('test_case_tags', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCaseVersion>('test_case_versions', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCase>('test_cases', (c) => c.suite === id);
      tx.deleteWhere<TestSection>('test_sections', (x) => x.suite === id);
      tx.delete('test_suites', id);
      audit(s.project, 'suite.delete', 'suite', id, { name: s.name, cases: caseIds.size }, undefined);
    });
  }, { write: true }),
  createSection: (suiteId, name, parent) => sim(() => {
    const s = db().get<TestSuite>('test_suites', suiteId);
    if (!s) throw new ServiceError('not_found', 'Suite not found.');
    need(s.project, 'suites.write');
    const n = requireText(name, 'Name');
    if (parent && db().get<TestSection>('test_sections', parent)?.parent) throw new ServiceError('validation', 'Sections can be nested one level only.');
    if (db().find<TestSection>('test_sections', (x) => x.suite === suiteId && x.parent === parent && x.name.toLowerCase() === n.toLowerCase())) throw new ServiceError('conflict', 'A section with this name already exists here.');
    const position = db().count<TestSection>('test_sections', (x) => x.suite === suiteId && x.parent === parent);
    const sec = db().create<TestSection>('test_sections', { project: s.project, suite: suiteId, parent, name: n, position });
    audit(s.project, 'section.create', 'section', sec.id, undefined, { name: n });
    return sec;
  }, { write: true }),
  renameSection: (id, name) => sim(() => {
    const s = db().get<TestSection>('test_sections', id);
    if (!s) throw new ServiceError('not_found', 'Section not found.');
    need(s.project, 'suites.write');
    const next = db().update<TestSection>('test_sections', id, { name: requireText(name, 'Name') });
    audit(s.project, 'section.rename', 'section', id, { name: s.name }, { name: next.name });
    return next;
  }, { write: true }),
  removeSection: (id) => sim(() => {
    const s = db().get<TestSection>('test_sections', id);
    if (!s) throw new ServiceError('not_found', 'Section not found.');
    need(s.project, 'suites.write');
    db().transaction((tx) => {
      const ids = new Set([id, ...tx.list<TestSection>('test_sections', (x) => x.parent === id).map((x) => x.id)]);
      const caseIds = new Set(tx.list<TestCase>('test_cases', (c) => ids.has(c.section)).map((c) => c.id));
      assertScopeDeletable(tx, caseIds, 'section');
      tx.deleteWhere<TestStep>('test_steps', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCaseTag>('test_case_tags', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCaseVersion>('test_case_versions', (x) => caseIds.has(x.case));
      tx.deleteWhere<TestCase>('test_cases', (c) => ids.has(c.section));
      tx.deleteWhere<TestSection>('test_sections', (x) => ids.has(x.id));
      audit(s.project, 'section.delete', 'section', id, { name: s.name, cases: caseIds.size }, undefined);
    });
  }, { write: true }),
  moveSection: (id, target) => sim(() => {
    const sec = db().get<TestSection>('test_sections', id);
    if (!sec) throw new ServiceError('not_found', 'Section not found.');
    need(sec.project, 'suites.write');
    const suite = db().get<TestSuite>('test_suites', target.suite);
    if (!suite || suite.project !== sec.project) throw new ServiceError('validation', 'Choose a suite in this project.');
    if (target.parent) {
      const parent = db().get<TestSection>('test_sections', target.parent);
      if (!parent || parent.suite !== target.suite) throw new ServiceError('validation', 'Choose a section in the selected suite.');
      if (parent.parent) throw new ServiceError('validation', 'Sections can be nested one level only.');
      if (parent.id === id) throw new ServiceError('validation', 'A section cannot be moved into itself.');
      if (db().count<TestSection>('test_sections', (x) => x.parent === id) > 0) throw new ServiceError('validation', 'This section has sub-sections. Move it to the top level of a suite.');
    }
    return db().transaction((tx) => {
      const kids = tx.list<TestSection>('test_sections', (x) => x.parent === id);
      const ids = new Set([id, ...kids.map((k) => k.id)]);
      kids.forEach((k) => tx.update<TestSection>('test_sections', k.id, { suite: target.suite }));
      tx.list<TestCase>('test_cases', (c) => ids.has(c.section)).forEach((c) => tx.update<TestCase>('test_cases', c.id, { suite: target.suite }));
      const position = tx.count<TestSection>('test_sections', (x) => x.suite === target.suite && x.parent === target.parent && x.id !== id);
      return tx.update<TestSection>('test_sections', id, { suite: target.suite, parent: target.parent, position });
    });
  }, { write: true }),
};

// ---- cases -------------------------------------------------------------------------------------
function tagIdsOf(caseId: Id): Id[] {
  return db().list<TestCaseTag>('test_case_tags', (t) => t.case === caseId).map((t) => t.tag);
}

function snapshotOf(tc: TestCase, steps: TestStep[]): TestCaseVersion['snapshot'] {
  return {
    case: { ref: tc.ref, title: tc.title, content: tc.content, priority: tc.priority, type: tc.type, automation_status: tc.automation_status, estimate: tc.estimate, refs: tc.refs, version: tc.version },
    steps: steps.map((s) => ({ position: s.position, description: s.description, expected_result: s.expected_result })),
  };
}

function stepsFor(caseId: Id): TestStep[] {
  return db().list<TestStep>('test_steps', (s) => s.case === caseId).sort((a, b) => a.position - b.position);
}

function detail(c: TestCase): CaseDetail {
  return {
    case: c, steps: stepsFor(c.id), tag_ids: tagIdsOf(c.id),
    section_name: db().get<TestSection>('test_sections', c.section)?.name ?? '',
    suite_name: db().get<TestSuite>('test_suites', c.suite)?.name ?? '',
  };
}

function validateSteps(steps: CaseInput['steps']): void {
  steps.forEach((s, i) => { if (!s.description.trim()) throw new ServiceError('validation', `Step ${i + 1} needs a description.`, { [`step_${i + 1}`]: 'required' }); });
}

function sectionIdsUnder(sectionId: Id): Set<Id> {
  return new Set([sectionId, ...db().list<TestSection>('test_sections', (s) => s.parent === sectionId).map((s) => s.id)]);
}

function matching(f: CaseFilters): TestCase[] {
  needMember(f.projectId);
  const q = f.q?.trim().toLowerCase();
  const secs = f.sectionId ? sectionIdsUnder(f.sectionId) : null;
  const tagCases = f.tag?.length ? new Set(db().list<TestCaseTag>('test_case_tags', (t) => f.tag?.includes(t.tag) ?? false).map((t) => t.case)) : null;
  let rows = db().list<TestCase>('test_cases', (c) =>
    c.project === f.projectId
    && (!f.suiteId || c.suite === f.suiteId)
    && (!secs || secs.has(c.section))
    && (f.deprecated ? true : !c.deprecated)
    && (!f.priority?.length || (c.priority !== undefined && f.priority.includes(c.priority)))
    && (!f.type?.length || (c.type !== undefined && f.type.includes(c.type)))
    && (!f.automation?.length || f.automation.includes(c.automation_status))
    && (!tagCases || tagCases.has(c.id))
    && (!q || c.title.toLowerCase().includes(q) || c.ref.toLowerCase().includes(q)));
  const dir = f.dir === 'desc' ? -1 : 1;
  const sort = f.sort ?? 'ref';
  const num = (c: TestCase) => Number(c.ref.split('-C')[1] ?? 0);
  rows = rows.sort((a, b) => {
    const r = sort === 'title' ? a.title.localeCompare(b.title)
      : sort === 'priority' ? (a.priority ?? 'z').localeCompare(b.priority ?? 'z')
        : sort === 'updated' ? a.updated.localeCompare(b.updated)
          : sort === 'version' ? a.version - b.version : num(a) - num(b);
    return r * dir;
  });
  return rows;
}

export const casesService: CasesService = {
  list: (f) => sim((): ListResult<CaseListItem> => {
    const rows = matching(f);
    const pageSize = f.pageSize ?? 50;
    const page = f.page ?? 1;
    const names = new Map(db().list<TestSection>('test_sections', (s) => s.project === f.projectId).map((s) => [s.id, s.name]));
    const tagMap = new Map<Id, Id[]>();
    db().list<TestCaseTag>('test_case_tags').forEach((t) => tagMap.set(t.case, [...(tagMap.get(t.case) ?? []), t.tag]));
    return {
      total: rows.length,
      items: rows.slice((page - 1) * pageSize, page * pageSize).map((c) => ({ case: c, tag_ids: tagMap.get(c.id) ?? [], section_name: names.get(c.section) ?? '' })),
    };
  }),
  matchingIds: (f) => sim(() => matching(f).map((c) => c.id)),
  get: (id) => sim(() => {
    const c = db().get<TestCase>('test_cases', id);
    if (!c) throw new ServiceError('not_found', 'Case not found.');
    needMember(c.project);
    return detail(c);
  }),
  create: (input) => sim(() => {
    need(input.project, 'cases.write');
    const title = requireText(input.title, 'Title');
    validateSteps(input.steps);
    const sec = db().get<TestSection>('test_sections', input.section);
    if (!sec || sec.suite !== input.suite) throw new ServiceError('validation', 'Choose a section in the selected suite.', { section: 'invalid' });
    return db().transaction((tx) => {
      const p = project(input.project);
      const counter = p.case_counter + 1;
      tx.update<Project>('projects', p.id, { case_counter: counter });
      const c = tx.create<TestCase>('test_cases', {
        project: p.id, suite: input.suite, section: input.section, ref: `${p.ref_prefix}-C${counter}`, title, content: input.content, priority: input.priority, type: input.type,
        automation_status: input.automation_status ?? 'not_specified', estimate: input.estimate, version: 1, deprecated: false, refs: input.refs, milestone: input.milestone,
        created_by: me().id, updated_by: me().id,
      });
      const steps = input.steps.map((s, i) => tx.create<TestStep>('test_steps', { case: c.id, position: i + 1, description: s.description.trim(), expected_result: s.expected_result?.trim() || undefined }));
      input.tag_ids.forEach((tag) => tx.create<TestCaseTag>('test_case_tags', { case: c.id, tag }));
      tx.create<TestCaseVersion>('test_case_versions', { case: c.id, project: p.id, version: 1, snapshot: snapshotOf(c, steps), saved_by: me().id });
      audit(p.id, 'case.create', 'case', c.id, undefined, { ref: c.ref, title });
      return detail(c);
    });
  }, { write: true }),
  update: (id, input, opts) => sim(() => {
    const cur = db().get<TestCase>('test_cases', id);
    if (!cur) throw new ServiceError('not_found', 'Case not found.');
    need(cur.project, 'cases.write');
    if (cur.version !== opts.expectedVersion) throw new ServiceError('conflict', `Someone saved v${cur.version} while you were editing.`, { version: String(cur.version) });
    if (input.title !== undefined) requireText(input.title, 'Title');
    if (input.steps) validateSteps(input.steps);
    return db().transaction((tx) => {
      const { steps: newSteps, tag_ids } = input;
      const fields: Partial<TestCase> = pickFields(input, ['title', 'content', 'priority', 'type', 'automation_status', 'estimate', 'refs', 'milestone', 'section']);
      if (fields.section !== undefined) {
        const sec = tx.get<TestSection>('test_sections', fields.section);
        if (!sec || sec.project !== cur.project) throw new ServiceError('validation', 'Choose a section in this project.', { section: 'invalid' });
        fields.suite = sec.suite;
      }
      // D-5: edits by the same author inside a short window merge into one version, unless results exist for the case.
      const latest = opts.coalesce ? tx.list<TestCaseVersion>('test_case_versions', (v) => v.case === id && v.version === cur.version)[0] : undefined;
      const merge = !!latest && latest.saved_by === me().id && Date.now() - Date.parse(latest.updated) < 30 * 60 * 1000
        && tx.count<TestResult>('test_results', (r) => r.case === id) === 0;
      const version = merge ? cur.version : cur.version + 1;
      const next = tx.update<TestCase>('test_cases', id, { ...fields, title: fields.title?.trim() ?? cur.title, version, updated_by: me().id });
      let steps = stepsFor(id);
      if (newSteps) {
        tx.deleteWhere<TestStep>('test_steps', (s) => s.case === id);
        steps = newSteps.map((s, i) => tx.create<TestStep>('test_steps', { case: id, position: i + 1, description: s.description.trim(), expected_result: s.expected_result?.trim() || undefined }));
      }
      if (tag_ids) {
        tx.deleteWhere<TestCaseTag>('test_case_tags', (t) => t.case === id);
        tag_ids.forEach((tag) => tx.create<TestCaseTag>('test_case_tags', { case: id, tag }));
      }
      const snap = snapshotOf(next, steps);
      if (merge && latest) tx.update<TestCaseVersion>('test_case_versions', latest.id, { snapshot: snap, note: opts.note?.trim() || latest.note });
      else tx.create<TestCaseVersion>('test_case_versions', { case: id, project: cur.project, version, snapshot: snap, note: opts.note?.trim() || undefined, saved_by: me().id });
      refreshOpenSnapshots(tx, id, snap, version);
      audit(cur.project, 'case.update', 'case', id, { title: cur.title, version: cur.version }, { title: next.title, version });
      return detail(next);
    });
  }, { write: true }),
  bulkUpdate: (rawIds, rawPatch) => sim(() => {
    const ids = [...new Set(rawIds)];
    const patch = pickFields(rawPatch, ['priority', 'type', 'automation_status', 'section', 'suite', 'deprecated', 'deprecated_reason']);
    const rows = ids.map((id) => db().get<TestCase>('test_cases', id)).filter((c): c is TestCase => !!c);
    if (!rows.length) return 0;
    new Set(rows.map((c) => c.project)).forEach((pid) => need(pid, 'cases.write'));
    return db().transaction((tx) => {
      let n = 0;
      for (const c of rows) {
        const extra: Partial<TestCase> = {};
        if (patch.section) {
          const sec = tx.get<TestSection>('test_sections', patch.section);
          if (!sec || sec.project !== c.project) throw new ServiceError('validation', 'Section not found in this project.');
          extra.suite = sec.suite;
        } else if (patch.suite) {
          const suite = tx.get<TestSuite>('test_suites', patch.suite);
          if (!suite || suite.project !== c.project) throw new ServiceError('validation', 'Suite not found in this project.');
        }
        const version = c.version + 1;
        const next = tx.update<TestCase>('test_cases', c.id, { ...patch, ...extra, version, updated_by: me().id });
        const snap = snapshotOf(next, stepsFor(c.id));
        tx.create<TestCaseVersion>('test_case_versions', { case: c.id, project: c.project, version, snapshot: snap, note: 'Bulk update', saved_by: me().id });
        if (next.deprecated) dropFromOpenRuns(tx, c.id);
        else refreshOpenSnapshots(tx, c.id, snap, version);
        audit(c.project, 'case.update', 'case', c.id, { version: c.version, deprecated: c.deprecated, section: c.section }, { version, deprecated: next.deprecated, section: next.section });
        n += 1;
      }
      return n;
    });
  }, { write: true }),
  remove: (ids) => sim(() => {
    const rows = [...new Set(ids)].map((id) => db().get<TestCase>('test_cases', id)).filter((c): c is TestCase => !!c);
    if (!rows.length) return { deleted: 0, deprecated: 0 };
    new Set(rows.map((c) => c.project)).forEach((pid) => need(pid, 'cases.write'));
    return db().transaction((tx) => {
      let deleted = 0;
      let deprecated = 0;
      for (const c of rows) {
        const id = c.id;
        const pinned = caseIsPinned(tx, id); // results (BR-4) or a place in a closed run (BR-1): deprecate, never delete
        dropFromOpenRuns(tx, id);
        if (pinned) {
          tx.update<TestCase>('test_cases', id, { deprecated: true, deprecated_reason: 'Deleted by a user; results are kept.' });
          deprecated += 1;
        } else {
          tx.deleteWhere<TestStep>('test_steps', (s) => s.case === id);
          tx.deleteWhere<TestCaseTag>('test_case_tags', (s) => s.case === id);
          tx.deleteWhere<TestCaseVersion>('test_case_versions', (s) => s.case === id);
          tx.delete('test_cases', id);
          deleted += 1;
        }
        audit(c.project, 'case.delete', 'case', id, { ref: c.ref, title: c.title }, undefined);
      }
      return { deleted, deprecated };
    });
  }, { write: true }),
  versions: (id) => sim(() => {
    const c = db().get<TestCase>('test_cases', id);
    if (!c) throw new ServiceError('not_found', 'Case not found.');
    needMember(c.project);
    const users = userMap();
    return db().list<TestCaseVersion>('test_case_versions', (v) => v.case === id).sort((a, b) => b.version - a.version).map((version) => ({ version, saved_by: version.saved_by ? users.get(version.saved_by) : undefined }));
  }),
  restore: (id, version, note) => sim(() => {
    const c = db().get<TestCase>('test_cases', id);
    if (!c) throw new ServiceError('not_found', 'Case not found.');
    need(c.project, 'cases.write');
    const v = db().find<TestCaseVersion>('test_case_versions', (x) => x.case === id && x.version === version);
    if (!v) throw new ServiceError('not_found', 'Version not found.');
    const sc = v.snapshot.case as Partial<TestCase>;
    return db().transaction((tx) => {
      const nextVersion = c.version + 1;
      const next = tx.update<TestCase>('test_cases', id, { title: sc.title ?? c.title, content: sc.content, priority: sc.priority, type: sc.type, automation_status: sc.automation_status ?? c.automation_status, estimate: sc.estimate, refs: sc.refs, version: nextVersion, updated_by: me().id });
      tx.deleteWhere<TestStep>('test_steps', (s) => s.case === id);
      const steps = v.snapshot.steps.map((s, i) => tx.create<TestStep>('test_steps', { case: id, position: i + 1, description: String(s.description ?? ''), expected_result: s.expected_result ? String(s.expected_result) : undefined }));
      const snap = snapshotOf(next, steps);
      tx.create<TestCaseVersion>('test_case_versions', { case: id, project: c.project, version: nextVersion, snapshot: snap, note: note ?? `Restored from v${version}`, saved_by: me().id });
      refreshOpenSnapshots(tx, id, snap, nextVersion);
      audit(c.project, 'case.update', 'case', id, { version: c.version }, { version: nextVersion, restored_from: version });
      return detail(next);
    });
  }, { write: true }),
  usedIn: (id) => sim(() => {
    const c = db().get<TestCase>('test_cases', id);
    if (!c) throw new ServiceError('not_found', 'Case not found.');
    needMember(c.project);
    return db().list<TestRunCase>('test_run_cases', (t) => t.case === id).map((test) => ({
      test, run: db().get<TestRun>('test_runs', test.run) as TestRun, status_key: statusKeyById(test.status),
    }));
  }),
};

// re-exported for services-b
export { detail as caseDetail, snapshotOf, stepsFor };
export type { ProjectRole };
