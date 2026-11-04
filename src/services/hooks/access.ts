'use client';

import { keepPreviousData } from '@tanstack/react-query';
import type { CaseFilters, RunListFilters, TestFilters } from '../interfaces';
import type { Id, ProjectRole } from '../types';
import { qk } from './keys';
import { useInvalidatingMutation, useQuery, useQueryClient, useServices } from './core';
import { useMutation } from '@tanstack/react-query';

// ---- session ----------------------------------------------------------------------------------
export function useSession() {
  const s = useServices();
  return useQuery({ queryKey: qk.session, queryFn: () => s.auth.getSession(), staleTime: Infinity });
}
export function useDemoUsers() {
  const s = useServices();
  return useQuery({ queryKey: qk.demoUsers, queryFn: () => s.auth.listDemoUsers() });
}
export function useSignInAs() {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (userId: Id) => s.auth.signInAs(userId), onSuccess: () => { qc.clear(); } });
}
export function useSignInWithPassword() {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: { email: string; password: string }) => s.auth.signInWithPassword(v.email, v.password), onSuccess: () => { qc.clear(); } });
}
export function useSignOut() {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => s.auth.signOut(), onSuccess: () => { qc.clear(); } });
}

// ---- workspaces and projects --------------------------------------------------------------------
export function useWorkspaces() {
  const s = useServices();
  return useQuery({ queryKey: qk.workspaces, queryFn: () => s.workspaces.list() });
}
export function useProjects(workspaceId: Id | undefined, opts: { includeArchived?: boolean; q?: string } = {}) {
  const s = useServices();
  return useQuery({ queryKey: qk.projects.list(workspaceId ?? '', opts), queryFn: () => s.projects.list({ workspaceId: workspaceId as Id, ...opts }), enabled: !!workspaceId, placeholderData: keepPreviousData });
}
export function useProject(projectId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.projects.one(projectId ?? ''), queryFn: () => s.projects.get(projectId as Id), enabled: !!projectId });
}
/** Caller's role in the project (null = not a member). Prefer `useProjectRole()` from the RoleGate module inside project pages. */
export function useMyProjectRole(projectId: Id | undefined) {
  const s = useServices();
  return useQuery<ProjectRole | null>({ queryKey: qk.projects.role(projectId ?? ''), queryFn: () => s.projects.myRole(projectId as Id), enabled: !!projectId });
}
export function useProjectOverview(projectId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.projects.overview(projectId ?? ''), queryFn: () => s.projects.overview(projectId as Id), enabled: !!projectId });
}
export function useCreateProject() {
  const s = useServices();
  return useInvalidatingMutation(s.projects.create, () => [qk.projects.all]);
}
export function useUpdateProject(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((patch: Parameters<typeof s.projects.update>[1]) => s.projects.update(projectId, patch), () => [qk.projects.all]);
}
export function useSetArchived(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((archived: boolean) => s.projects.setArchived(projectId, archived), () => [qk.projects.all]);
}
export function useRemoveProject() {
  const s = useServices();
  return useInvalidatingMutation((v: { id: Id; confirmName: string }) => s.projects.remove(v.id, v.confirmName), () => [qk.projects.all]);
}
export function useCreateSampleProject() {
  const s = useServices();
  return useInvalidatingMutation((workspaceId: Id) => s.projects.createSample(workspaceId), () => [qk.projects.all]);
}

// ---- members ----------------------------------------------------------------------------------
export function useMembers(projectId: Id | undefined, enabled = true) {
  const s = useServices();
  return useQuery({ queryKey: qk.members(projectId ?? ''), queryFn: () => s.members.list(projectId as Id), enabled: !!projectId && enabled });
}
export function useMemberCandidates(projectId: Id, q: string) {
  const s = useServices();
  return useQuery({ queryKey: ['members', projectId, 'candidates', q], queryFn: () => s.members.searchCandidates(projectId, q) });
}
export function useAddMember(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((v: { userId: Id; role: ProjectRole }) => s.members.add(projectId, v.userId, v.role), () => [qk.members(projectId)]);
}
export function useSetMemberRole(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((v: { memberId: Id; role: ProjectRole }) => s.members.setRole(projectId, v.memberId, v.role), () => [qk.members(projectId), qk.projects.role(projectId)]);
}
export function useRemoveMember(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((memberId: Id) => s.members.remove(projectId, memberId), () => [qk.members(projectId)]);
}

// ---- lookups ----------------------------------------------------------------------------------
export function useCaseTypes() { const s = useServices(); return useQuery({ queryKey: qk.lookups.types, queryFn: () => s.lookups.caseTypes(), staleTime: Infinity }); }
export function usePriorities() { const s = useServices(); return useQuery({ queryKey: qk.lookups.priorities, queryFn: () => s.lookups.priorities(), staleTime: Infinity }); }
export function useStatuses() { const s = useServices(); return useQuery({ queryKey: qk.lookups.statuses, queryFn: () => s.lookups.statuses(), staleTime: Infinity }); }
export function useTags(projectId: Id | undefined) { const s = useServices(); return useQuery({ queryKey: qk.lookups.tags(projectId ?? ''), queryFn: () => s.lookups.tags(projectId as Id), enabled: !!projectId }); }
export function useCreateTag(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((v: { name: string; color?: string }) => s.lookups.createTag(projectId, v.name, v.color), () => [qk.lookups.tags(projectId)]);
}
export function useRemoveTag(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation((id: Id) => s.lookups.removeTag(id), () => [qk.lookups.tags(projectId), qk.cases.all(projectId)]);
}

// ---- suites and cases ---------------------------------------------------------------------------
export function useSuiteTree(projectId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.suites(projectId ?? ''), queryFn: () => s.suites.tree(projectId as Id), enabled: !!projectId });
}
export function useSuiteMutations(projectId: Id) {
  const s = useServices();
  const inv = () => [qk.suites(projectId), qk.cases.all(projectId)];
  return {
    createSuite: useInvalidatingMutation((v: { name: string; description?: string }) => s.suites.createSuite(projectId, v.name, v.description), inv),
    createSection: useInvalidatingMutation((v: { suiteId: Id; name: string; parent?: Id }) => s.suites.createSection(v.suiteId, v.name, v.parent), inv),
    renameSection: useInvalidatingMutation((v: { id: Id; name: string }) => s.suites.renameSection(v.id, v.name), inv),
    removeSection: useInvalidatingMutation((id: Id) => s.suites.removeSection(id), inv),
    removeSuite: useInvalidatingMutation((id: Id) => s.suites.removeSuite(id), inv),
  };
}
export function useCases(filters: CaseFilters | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.cases.list(filters?.projectId ?? '', filters), queryFn: () => s.cases.list(filters as CaseFilters), enabled: !!filters, placeholderData: keepPreviousData });
}
export function useCase(id: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.cases.one(id ?? ''), queryFn: () => s.cases.get(id as Id), enabled: !!id });
}
export function useCaseVersions(id: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.cases.versions(id ?? ''), queryFn: () => s.cases.versions(id as Id), enabled: !!id });
}
export function useCaseUsage(id: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.cases.usage(id ?? ''), queryFn: () => s.cases.usedIn(id as Id), enabled: !!id });
}
export function useCaseMutations(projectId: Id) {
  const s = useServices();
  const inv = (id?: Id) => [qk.cases.all(projectId), qk.suites(projectId), ...(id ? [qk.cases.one(id), qk.cases.versions(id)] : [])];
  return {
    create: useInvalidatingMutation(s.cases.create, () => inv()),
    update: useInvalidatingMutation((v: { id: Id; input: Parameters<typeof s.cases.update>[1]; note?: string; expectedVersion: number }) => s.cases.update(v.id, v.input, { note: v.note, expectedVersion: v.expectedVersion }), (v) => inv(v.id)),
    bulkUpdate: useInvalidatingMutation((v: { ids: Id[]; patch: Parameters<typeof s.cases.bulkUpdate>[1] }) => s.cases.bulkUpdate(v.ids, v.patch), () => inv()),
    remove: useInvalidatingMutation((ids: Id[]) => s.cases.remove(ids), () => inv()),
    restore: useInvalidatingMutation((v: { id: Id; version: number; note?: string }) => s.cases.restore(v.id, v.version, v.note), (v) => inv(v.id)),
  };
}

// ---- milestones and plans ---------------------------------------------------------------------
export function useMilestones(projectId: Id | undefined, state?: 'open' | 'completed') {
  const s = useServices();
  return useQuery({ queryKey: qk.milestones.list(projectId ?? '', state), queryFn: () => s.milestones.list(projectId as Id, state), enabled: !!projectId });
}
export function useMilestone(id: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.milestones.one(id ?? ''), queryFn: () => s.milestones.get(id as Id), enabled: !!id });
}
export function useMilestoneMutations(projectId: Id) {
  const s = useServices();
  const inv = () => [qk.milestones.all(projectId), ['milestone']];
  return {
    create: useInvalidatingMutation(s.milestones.create, inv),
    update: useInvalidatingMutation((v: { id: Id; patch: Parameters<typeof s.milestones.update>[1] }) => s.milestones.update(v.id, v.patch), inv),
    complete: useInvalidatingMutation((id: Id) => s.milestones.complete(id), inv),
  };
}
export function usePlans(projectId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.plans.all(projectId ?? ''), queryFn: () => s.plans.list(projectId as Id), enabled: !!projectId });
}
export function usePlan(id: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.plans.one(id ?? ''), queryFn: () => s.plans.get(id as Id), enabled: !!id });
}
export function usePlanMutations(projectId: Id) {
  const s = useServices();
  const inv = () => [qk.plans.all(projectId), ['plan']];
  return {
    create: useInvalidatingMutation(s.plans.create, inv),
    update: useInvalidatingMutation((v: { id: Id; patch: Parameters<typeof s.plans.update>[1] }) => s.plans.update(v.id, v.patch), inv),
    complete: useInvalidatingMutation((id: Id) => s.plans.complete(id), inv),
  };
}

// ---- runs and tests ---------------------------------------------------------------------------
export function useRuns(filters: RunListFilters | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.runs.list(filters?.projectId ?? '', filters), queryFn: () => s.runs.list(filters as RunListFilters), enabled: !!filters, placeholderData: keepPreviousData });
}
export function useRun(runId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.runs.one(runId ?? ''), queryFn: () => s.runs.get(runId as Id), enabled: !!runId });
}
export function useRunTests(filters: TestFilters | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.tests.list(filters?.runId ?? '', filters), queryFn: () => s.tests.list(filters as TestFilters), enabled: !!filters, placeholderData: keepPreviousData });
}
export function useRunTestOrder(runId: Id | undefined, filters?: Pick<TestFilters, 'status' | 'assignee' | 'section' | 'q'>) {
  const s = useServices();
  return useQuery({ queryKey: qk.tests.order(runId ?? '', filters), queryFn: () => s.tests.order(runId as Id, filters), enabled: !!runId });
}
export function useTest(testId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.tests.one(testId ?? ''), queryFn: () => s.tests.get(testId as Id), enabled: !!testId });
}
export function useRunMutations(projectId: Id) {
  const s = useServices();
  const inv = (runId?: Id) => [qk.runs.all(projectId), qk.projects.overview(projectId), qk.milestones.all(projectId), ['milestone'], qk.plans.all(projectId), ['plan'], ...(runId ? [qk.runs.one(runId), qk.tests.all(runId)] : [])];
  return {
    create: useInvalidatingMutation(s.runs.create, () => inv()),
    update: useInvalidatingMutation((v: { id: Id; patch: Parameters<typeof s.runs.update>[1] }) => s.runs.update(v.id, v.patch), (v) => inv(v.id)),
    close: useInvalidatingMutation((id: Id) => s.runs.close(id), (id) => inv(id)),
    addCases: useInvalidatingMutation((v: { id: Id; caseIds: Id[] }) => s.runs.addCases(v.id, v.caseIds), (v) => inv(v.id)),
    removeTests: useInvalidatingMutation((v: { id: Id; testIds: Id[] }) => s.runs.removeTests(v.id, v.testIds), (v) => inv(v.id)),
    assign: useInvalidatingMutation((v: { runId: Id; testIds: Id[]; userId: Id | null }) => s.tests.assign(v.testIds, v.userId), (v) => inv(v.runId)),
  };
}

// ---- reports, automation, audit, settings -----------------------------------------------------
export function useMilestoneReport(id: Id | undefined) { const s = useServices(); return useQuery({ queryKey: qk.reports.milestone(id ?? ''), queryFn: () => s.reports.milestone(id as Id), enabled: !!id }); }
export function useRunReport(id: Id | undefined) { const s = useServices(); return useQuery({ queryKey: qk.reports.run(id ?? ''), queryFn: () => s.reports.run(id as Id), enabled: !!id }); }
export function useExportCsv() { const s = useServices(); return useMutation({ mutationFn: (v: { kind: 'milestone' | 'run'; id: Id }) => s.reports.exportCsv(v.kind, v.id) }); }

export function useMappings(projectId: Id | undefined, enabled = true) { const s = useServices(); return useQuery({ queryKey: qk.automation.mappings(projectId ?? ''), queryFn: () => s.automation.mappings(projectId as Id), enabled: !!projectId && enabled }); }
export function useCiTokens(projectId: Id | undefined, enabled = true) { const s = useServices(); return useQuery({ queryKey: qk.automation.tokens(projectId ?? ''), queryFn: () => s.automation.tokens(projectId as Id), enabled: !!projectId && enabled }); }
export function useExecutions(projectId: Id | undefined) { const s = useServices(); return useQuery({ queryKey: qk.automation.executions(projectId ?? ''), queryFn: () => s.automation.executions(projectId as Id), enabled: !!projectId }); }
export function useExecution(id: Id | undefined) { const s = useServices(); return useQuery({ queryKey: qk.automation.execution(id ?? ''), queryFn: () => s.automation.execution(id as Id), enabled: !!id }); }
export function useAutomationMutations(projectId: Id) {
  const s = useServices();
  return {
    saveMapping: useInvalidatingMutation((v: { id: Id | null; input: Parameters<typeof s.automation.saveMapping>[2] }) => s.automation.saveMapping(projectId, v.id, v.input), () => [qk.automation.mappings(projectId)]),
    createToken: useInvalidatingMutation((v: { name: string; mappingId: Id }) => s.automation.createToken(projectId, v.name, v.mappingId), () => [qk.automation.tokens(projectId)]),
    revokeToken: useInvalidatingMutation((id: Id) => s.automation.revokeToken(id), () => [qk.automation.tokens(projectId)]),
  };
}
export function useAudit(filters: import('../interfaces').AuditFilters | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.audit(filters?.projectId ?? '', filters), queryFn: () => s.audit.list(filters as import('../interfaces').AuditFilters), enabled: !!filters, placeholderData: keepPreviousData });
}
export function useImport(projectId: Id) {
  const s = useServices();
  return {
    preview: useMutation({ mutationFn: (file: { name: string; text: string }) => s.settings.previewImport(projectId, file) }),
    run: useInvalidatingMutation((v: { file: { name: string; text: string }; options: import('../interfaces').ImportOptions }) => s.settings.runImport(projectId, v.file, v.options), () => [qk.cases.all(projectId), qk.suites(projectId)]),
  };
}
