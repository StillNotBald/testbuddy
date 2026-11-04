'use client';

import type { Id } from '../types';
import type { CaseDetail } from '../interfaces';
import { qk } from './keys';
import { useInvalidatingMutation, useServices } from './core';

/** Repository additions (builder A). Additive: nothing here changes an existing hook. */
export function useSuiteEdits(projectId: Id) {
  const s = useServices();
  const inv = () => [qk.suites(projectId), qk.cases.all(projectId)];
  return {
    renameSuite: useInvalidatingMutation((v: { id: Id; name: string }) => s.suites.updateSuite(v.id, { name: v.name }), inv),
    moveSection: useInvalidatingMutation((v: { id: Id; suite: Id; parent?: Id }) => s.suites.moveSection(v.id, { suite: v.suite, parent: v.parent }), inv),
  };
}

/** Save a case edit. `coalesce` merges quick edits into one version (D-5); pass false for "Save as new version". */
export function useSaveCase(projectId: Id) {
  const s = useServices();
  return useInvalidatingMutation<{ id: Id; input: Parameters<typeof s.cases.update>[1]; note?: string; expectedVersion: number; coalesce: boolean }, CaseDetail>(
    (v) => s.cases.update(v.id, v.input, { note: v.note, expectedVersion: v.expectedVersion, coalesce: v.coalesce }),
    (v) => [qk.cases.all(projectId), qk.suites(projectId), qk.cases.one(v.id), qk.cases.versions(v.id)],
  );
}
