'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResultPatch, RunSummary, TestFilters } from '../interfaces';
import type { Id } from '../types';
import { qk } from './keys';
import { useServices } from './core';

/** Poll interval for "live" run data (mock stands in for PocketBase realtime in M1). Off under test. */
export const LIVE_INTERVAL_MS = process.env.NODE_ENV === 'test' ? false : 5000;

/** Run summary that refreshes on an interval so other testers' results show up. */
export function useLiveRun(runId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.runs.one(runId ?? ''), queryFn: () => s.runs.get(runId as Id), enabled: !!runId, refetchInterval: LIVE_INTERVAL_MS });
}

/** Test list for a run that refreshes on an interval. */
export function useLiveRunTests(filters: TestFilters | undefined) {
  const s = useServices();
  return useQuery({ queryKey: qk.tests.list(filters?.runId ?? '', filters), queryFn: () => s.tests.list(filters as TestFilters), enabled: !!filters, placeholderData: keepPreviousData, refetchInterval: LIVE_INTERVAL_MS });
}

/** Edit comment / elapsed / defects of your own result while the run is open (status never changes). */
export function useUpdateResult(runId: Id, projectId: Id) {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { resultId: Id; patch: ResultPatch }) => s.results.update(v.resultId, v.patch),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.tests.all(runId) }),
        qc.invalidateQueries({ queryKey: ['test'] }),
        qc.invalidateQueries({ queryKey: qk.reports.run(runId) }),
        qc.invalidateQueries({ queryKey: qk.runs.all(projectId) }),
      ]);
    },
  });
}

/** "Changes since previous run" (Fixed / Regressed / New failing / Still failing). */
export function useRunChanges(runId: Id | undefined) {
  const s = useServices();
  return useQuery({ queryKey: ['report', 'changes', runId ?? ''], queryFn: () => s.reports.changes(runId as Id), enabled: !!runId });
}

/** Re-run failed (D-4): a new run in the same suite with the failed and blocked tests of `source`. */
export function useRerunFailed(projectId: Id) {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation<{ run: Id; count: number }, Error, RunSummary>({
    mutationFn: async (source) => {
      const failed = await s.tests.list({ runId: source.run.id, status: ['failed', 'blocked'] });
      // deprecated cases cannot join a new run: leave them out of the re-run and of the count
      const active = new Set((await s.cases.list({ projectId, page: 1, pageSize: 5000 })).items.map((i) => i.case.id));
      const caseIds = failed.items.map((i) => i.test.case).filter((x): x is Id => !!x && active.has(x));
      const run = await s.runs.create({
        project: projectId, suite: source.run.suite, name: `${source.run.name} (re-run)`, build: source.run.build, plan: source.run.plan, milestone: source.run.milestone,
        assigned_to: source.run.assigned_to, include_all: false, case_ids: caseIds,
      });
      return { run: run.id, count: caseIds.length };
    },
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: qk.runs.all(projectId) }), qc.invalidateQueries({ queryKey: qk.projects.overview(projectId) }), qc.invalidateQueries({ queryKey: ['plan'] })]);
    },
  });
}

/** Fetch every case matching the filters (not just one page) for "Select all N matching filter". */
export function useMatchingCases() {
  const s = useServices();
  return useMutation({ mutationFn: (filters: import('../interfaces').CaseFilters) => s.cases.list({ ...filters, page: 1, pageSize: 5000 }).then((r) => r.items) });
}
