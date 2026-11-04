import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getMockDb, setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { ProjectMember } from '@/services/types';
import ProjectsPage from './page';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/projects',
  useParams: () => ({}),
}));

/** Fresh demo data for one signed-in user. Call once per test, before render. */
function seed(userId: string) {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(userId);
}

function renderList() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider><ProjectsPage /></TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('Projects list', () => {
  beforeEach(() => { push.mockClear(); });

  it('lists the projects with my role and an Open link for each', async () => {
    seed(IDS.users.dana);
    renderList();
    expect(await screen.findByText('Core platform')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Core platform' })).toHaveAttribute('href', `/p/${IDS.projectCore}`);
    expect(screen.getByRole('link', { name: 'Open Mobile app' })).toHaveAttribute('href', `/p/${IDS.projectMob}`);
    expect(within(screen.getByRole('list', { name: 'Projects' })).getAllByText('Tester').length).toBeGreaterThan(0);
  });

  it('hides New project from a tester, who cannot create projects', async () => {
    seed(IDS.users.dana);
    renderList();
    await screen.findByText('Core platform');
    expect(screen.queryByRole('button', { name: 'New project' })).toBeNull();
  });

  it('creates a project from the dialog and opens its overview', async () => {
    seed(IDS.users.avery);
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: 'New project' }));
    fireEvent.change(await screen.findByLabelText(/Project name/), { target: { value: 'Pilot checkout' } });
    fireEvent.change(screen.getByLabelText(/Ref prefix/), { target: { value: 'pilot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/p\/[^/]+$/)));
  });

  it('shows the three first-run choices when a workspace admin has no projects yet', async () => {
    seed(IDS.users.avery);
    getMockDb().transaction((tx) => tx.deleteWhere<ProjectMember>('project_members', (m) => m.user === IDS.users.avery));
    renderList();
    expect(await screen.findByRole('heading', { name: 'Set up your first project' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items.some((t) => t.includes('Import cases'))).toBe(true);
    expect(items.some((t) => t.includes('Create sample project'))).toBe(true);
    expect(items.some((t) => t.includes('Start empty'))).toBe(true);
  });
});
