import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProjectRoleProvider } from '@/components/tb/project-context';
import { TooltipProvider } from '@/components/ui';
import { setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { ProjectRole } from '@/services/types';
import { nav } from './nav-mock';

if (typeof window !== 'undefined') {
  if (!('ResizeObserver' in window)) (window as unknown as Record<string, unknown>).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView ??= () => {};
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) });
}

export const USERS: Record<ProjectRole, string> = { admin: IDS.users.avery, manager: IDS.users.raj, tester: IDS.users.dana, viewer: IDS.users.mia };

export function freshDb(): void {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
}

export function renderAs(role: ProjectRole, ui: ReactNode, opts: { search?: string; path?: string } = {}) {
  freshDb();
  writeSessionUserId(USERS[role]);
  nav.push = []; nav.replace = []; nav.search = opts.search ?? ''; nav.path = opts.path ?? '/p/prj_core/runs';
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider><ProjectRoleProvider value={{ projectId: IDS.projectCore, role, archived: false }}>{ui}</ProjectRoleProvider></TooltipProvider>
    </QueryClientProvider>,
  );
}

export { IDS };
