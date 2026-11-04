import type { Id } from '../types';

/** Query keys. Invalidate by prefix, e.g. qk.runs.all(projectId). */
export const qk = {
  session: ['session'] as const,
  demoUsers: ['demo-users'] as const,
  workspaces: ['workspaces'] as const,
  projects: { all: ['projects'] as const, list: (ws: Id, o: unknown) => ['projects', 'list', ws, o] as const, one: (id: Id) => ['projects', 'one', id] as const, role: (id: Id) => ['projects', 'role', id] as const, overview: (id: Id) => ['projects', 'overview', id] as const },
  members: (p: Id) => ['members', p] as const,
  lookups: { types: ['lookups', 'types'] as const, priorities: ['lookups', 'priorities'] as const, statuses: ['lookups', 'statuses'] as const, tags: (p: Id) => ['lookups', 'tags', p] as const },
  suites: (p: Id) => ['suites', p] as const,
  cases: { all: (p: Id) => ['cases', p] as const, list: (p: Id, f: unknown) => ['cases', p, 'list', f] as const, one: (id: Id) => ['case', id] as const, versions: (id: Id) => ['case', id, 'versions'] as const, usage: (id: Id) => ['case', id, 'usage'] as const },
  milestones: { all: (p: Id) => ['milestones', p] as const, list: (p: Id, s: unknown) => ['milestones', p, 'list', s] as const, one: (id: Id) => ['milestone', id] as const },
  plans: { all: (p: Id) => ['plans', p] as const, one: (id: Id) => ['plan', id] as const },
  runs: { all: (p: Id) => ['runs', p] as const, list: (p: Id, f: unknown) => ['runs', p, 'list', f] as const, one: (id: Id) => ['run', id] as const },
  tests: { all: (run: Id) => ['tests', run] as const, list: (run: Id, f: unknown) => ['tests', run, 'list', f] as const, order: (run: Id, f: unknown) => ['tests', run, 'order', f] as const, one: (id: Id) => ['test', id] as const },
  reports: { milestone: (id: Id) => ['report', 'milestone', id] as const, run: (id: Id) => ['report', 'run', id] as const },
  automation: { mappings: (p: Id) => ['automation', p, 'mappings'] as const, tokens: (p: Id) => ['automation', p, 'tokens'] as const, executions: (p: Id) => ['automation', p, 'executions'] as const, execution: (id: Id) => ['automation', 'execution', id] as const },
  audit: (p: Id, f: unknown) => ['audit', p, f] as const,
};
