import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ProjectRoleProvider } from '@/components/tb/project-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { ProjectRole } from '@/services/types';

/** Shared setup for the repository screen tests (not a test file itself). */
export const nav = { params: new URLSearchParams(), route: {} as Record<string, string>, push: vi.fn(), replace: vi.fn() };

export function resetNav(params = '', route: Record<string, string> = {}) {
  nav.params = new URLSearchParams(params);
  nav.route = route;
  nav.push.mockClear();
  nav.replace.mockClear();
}

const USER_FOR: Record<ProjectRole, string> = { admin: IDS.users.avery, manager: IDS.users.raj, tester: IDS.users.dana, viewer: IDS.users.mia };

export function seed(role: ProjectRole) {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(USER_FOR[role]);
}

export function renderAs(role: ProjectRole, ui: React.ReactNode, opts: { archived?: boolean } = {}) {
  seed(role);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <ProjectRoleProvider value={{ projectId: IDS.projectCore, role, archived: opts.archived ?? false }}>{ui}</ProjectRoleProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}
