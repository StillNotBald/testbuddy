'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddResultInput, TestDetail, TestListItem } from '../interfaces';
import type { Id, ListResult, Status, TestResult } from '../types';
import { statusKeyOfRow } from '../status';
import { qk } from './keys';
import { useServices } from './core';

interface Ctx { lists: Array<[readonly unknown[], ListResult<TestListItem> | undefined]>; detail?: TestDetail }

/**
 * Save a result with an optimistic update: the test row (and open detail) show the new status
 * immediately; rolled back on error; all affected queries are refetched on settle.
 * Pair with `useUndoResult` for the 10 s Undo toast.
 */
export function useAddResult(runId: Id, projectId: Id) {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation<TestResult, Error, AddResultInput, Ctx>({
    mutationFn: (input) => s.results.add(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: qk.tests.all(runId) });
      const statuses = qc.getQueryData<Status[]>(qk.lookups.statuses);
      const status = statuses?.find((x) => x.id === input.statusId);
      const lists = qc.getQueriesData<ListResult<TestListItem>>({ queryKey: [...qk.tests.all(runId), 'list'] });
      const detail = qc.getQueryData<TestDetail>(qk.tests.one(input.testId));
      if (status) {
        const patch = (i: TestListItem): TestListItem => (i.test.id === input.testId ? { ...i, status, status_key: statusKeyOfRow(status), result_count: i.result_count + 1 } : i);
        lists.forEach(([key, data]) => { if (data) qc.setQueryData<ListResult<TestListItem>>(key, { ...data, items: data.items.map(patch) }); });
        if (detail) qc.setQueryData<TestDetail>(qk.tests.one(input.testId), { ...detail, item: patch(detail.item) });
      }
      return { lists, detail };
    },
    onError: (_e, input, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.detail) qc.setQueryData(qk.tests.one(input.testId), ctx.detail);
    },
    onSettled: async (_r, _e, input) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.tests.all(runId) }),
        qc.invalidateQueries({ queryKey: qk.tests.one(input.testId) }),
        qc.invalidateQueries({ queryKey: qk.runs.one(runId) }),
        qc.invalidateQueries({ queryKey: qk.runs.all(projectId) }),
        qc.invalidateQueries({ queryKey: qk.projects.overview(projectId) }),
      ]);
    },
  });
}

export function useUndoResult(runId: Id, projectId: Id) {
  const s = useServices();
  const qc = useQueryClient();
  return useMutation<void, Error, Id>({
    mutationFn: (resultId) => s.results.undo(resultId),
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.tests.all(runId) }),
        qc.invalidateQueries({ queryKey: ['test'] }),
        qc.invalidateQueries({ queryKey: qk.runs.all(projectId) }),
        qc.invalidateQueries({ queryKey: qk.projects.overview(projectId) }),
      ]);
    },
  });
}

export function useResultMutations(runId: Id, projectId: Id) {
  const s = useServices();
  const qc = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.tests.all(runId) }),
      qc.invalidateQueries({ queryKey: ['test'] }),
      qc.invalidateQueries({ queryKey: qk.runs.all(projectId) }),
      qc.invalidateQueries({ queryKey: qk.projects.overview(projectId) }),
    ]);
  };
  return {
    addMany: useMutation({ mutationFn: (v: { testIds: Id[]; statusId: Id; comment?: string }) => s.results.addMany(v.testIds, v.statusId, v.comment), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (resultId: Id) => s.results.remove(resultId), onSuccess: refresh }),
    addAttachment: useMutation({ mutationFn: (v: { resultId: Id; file: { name: string; size: number; type: string } }) => s.results.addAttachment(v.resultId, v.file), onSuccess: refresh }),
    removeAttachment: useMutation({ mutationFn: (id: Id) => s.results.removeAttachment(id), onSuccess: refresh }),
  };
}
