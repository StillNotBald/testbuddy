'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { can, type Action } from '@/lib/permissions';
import type { Project, ProjectRole } from '@/services/types';

export interface ProjectContextValue {
  projectId: string;
  project?: Project;
  /** Caller's role in this project. */
  role: ProjectRole | null;
  archived: boolean;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

/** Presentational provider (tests and loaders use it). The data-loading wrapper is `ProjectBoundary`. */
export function ProjectRoleProvider({ value, children }: { value: ProjectContextValue; children: ReactNode }) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext must be used inside a project route');
  return ctx;
}

/** Caller's role in the current project (null when not a member). */
export function useProjectRole(): ProjectRole | null {
  return useContext(ProjectContext)?.role ?? null;
}

/** Role check against the permission matrix, e.g. `const canWrite = useCan('cases.write')`. Archived projects return false for writes. */
export function useCan(action: Action, opts: { writes?: boolean } = {}): boolean {
  const ctx = useContext(ProjectContext);
  if (!ctx) return false;
  if ((opts.writes ?? true) && ctx.archived && action !== 'project.archive') return false;
  return can(ctx.role, action);
}
