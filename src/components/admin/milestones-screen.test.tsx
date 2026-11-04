import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildFixtures } from '@/services/mock/fixtures';
import { renderWithProject, withoutRows } from './test-harness';
import { MilestonesScreen } from './milestones-screen';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/p/prj_core/milestones',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('MilestonesScreen', () => {
  it('lists open milestones with progress and creates one for a manager', async () => {
    search = '';
    renderWithProject(<MilestonesScreen projectId="prj_core" />, { user: 'u_raj', role: 'manager' });
    expect(await screen.findByRole('link', { name: 'Release 2.4' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /tests: / })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New milestone' })).toBeEnabled();
  });

  it('hides creation from testers', async () => {
    search = '';
    renderWithProject(<MilestonesScreen projectId="prj_core" />, { user: 'u_dana', role: 'tester' });
    await screen.findByRole('link', { name: 'Release 2.4' });
    expect(screen.queryByRole('button', { name: 'New milestone' })).toBeNull();
  });

  it('shows the empty state when there are no milestones', async () => {
    search = '';
    const data = withoutRows(buildFixtures(), 'milestones', () => false);
    renderWithProject(<MilestonesScreen projectId="prj_core" />, { user: 'u_raj', role: 'manager', data });
    await waitFor(() => expect(screen.getByText('No milestones. Group runs under a release goal.')).toBeInTheDocument());
  });
});
