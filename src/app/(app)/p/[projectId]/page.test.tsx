import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectRoleProvider } from '@/components/tb/project-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getMockDb, setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { ProjectRole, TestRun } from '@/services/types';
import OverviewPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => `/p/${IDS.projectCore}`,
  useParams: () => ({ projectId: IDS.projectCore }),
}));

function seed(userId: string) {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(userId);
}

function renderAs(role: ProjectRole) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <ProjectRoleProvider value={{ projectId: IDS.projectCore, role, archived: false }}>
          <OverviewPage />
        </ProjectRoleProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('Project overview', () => {
  beforeEach(() => { seed(IDS.users.dana); });

  it('shows headline numbers, open runs and recent activity for a tester', async () => {
    renderAs('tester');
    expect(await screen.findByText('Pass rate, 7 days')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My assigned tests' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New run' })).toHaveAttribute('href', `/p/${IDS.projectCore}/runs/new`);
  });

  it('hides create actions from a viewer, who is read-only', async () => {
    renderAs('viewer');
    expect(await screen.findByText('Pass rate, 7 days')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New run' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'New case' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'My assigned tests' })).toBeNull();
  });

  it('explains the empty open-run list and offers the repository', async () => {
    getMockDb().transaction((tx) => tx.deleteWhere<TestRun>('test_runs', (r) => r.project === IDS.projectCore));
    renderAs('tester');
    expect(await screen.findByText(/No open runs\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create one from the repository.' })).toBeInTheDocument();
  });
});
