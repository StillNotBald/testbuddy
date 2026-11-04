import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProjectRoleProvider } from '@/components/tb/project-context';
import { setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures } from '@/services/mock/fixtures';
import { MockDb, type DbData } from '@/services/mock/mockdb';
import type { Project, ProjectRole } from '@/services/types';

/** Test-only: seeds the mock DB, signs in as a fixture user and renders inside the project role context. */
/** jsdom has no matchMedia; the split view and responsive lists read it. Desktop width by default. */
export function stubMatchMedia(matches = false) {
  window.matchMedia = ((query: string) => ({ matches, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
}

export function renderWithProject(ui: ReactNode, opts: { user: string; role: ProjectRole | null; data?: DbData; archived?: boolean }) {
  stubMatchMedia(false);
  const store = new Map<string, string>();
  const data = opts.data ?? buildFixtures();
  const seed = () => data;
  const project = (data.projects as unknown as Array<{ id: string }> | undefined)?.find((p) => p.id === 'prj_core') as unknown as Project | undefined;
  setMockDb(new MockDb({ storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: (k) => { store.delete(k); } }, seed }));
  writeSessionUserId(opts.user);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ProjectRoleProvider value={{ projectId: 'prj_core', project, role: opts.role, archived: opts.archived ?? false }}>{ui}</ProjectRoleProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

export function withoutRows(data: DbData, collection: string, keep: (row: Record<string, unknown>) => boolean): DbData {
  return { ...data, [collection]: (data[collection] ?? []).filter((r) => keep(r as unknown as Record<string, unknown>)) };
}
