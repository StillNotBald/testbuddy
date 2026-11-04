import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectRoleProvider } from '@/components/tb/project-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getMockDb, setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { CiToken, ProjectRole } from '@/services/types';
import AutomationPage from './page';

let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => `/p/${IDS.projectCore}/automation`,
  useParams: () => ({ projectId: IDS.projectCore }),
}));

function seed(userId: string) {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(userId);
}

function renderAs(role: ProjectRole, tab = '') {
  search = tab ? `tab=${tab}` : '';
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <ProjectRoleProvider value={{ projectId: IDS.projectCore, role, archived: false }}>
          <AutomationPage />
        </ProjectRoleProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('Automation', () => {
  beforeEach(() => { seed(IDS.users.avery); search = ''; });

  it('lists CI tokens with their prefix and shows the how-to for admins', async () => {
    renderAs('admin');
    expect(await screen.findByRole('rowheader', { name: 'gh-actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create token' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'How to post results from CI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mappings/ })).toBeInTheDocument();
  });

  it('shows a no-permission state to a tester, without the token list or mappings tab', async () => {
    seed(IDS.users.dana);
    renderAs('tester', 'tokens');
    expect(await screen.findByRole('heading', { name: 'You do not have permission to view CI tokens' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create token' })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Mappings/ })).toBeNull();
    expect(screen.getByRole('tab', { name: /Executions/ })).toBeInTheDocument();
  });

  it('explains the empty token list and offers to create one', async () => {
    getMockDb().transaction((tx) => tx.deleteWhere<CiToken>('ci_tokens', () => true));
    renderAs('admin');
    expect(await screen.findByRole('heading', { name: 'No CI tokens yet' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create token' }).length).toBeGreaterThan(0);
  });
});
