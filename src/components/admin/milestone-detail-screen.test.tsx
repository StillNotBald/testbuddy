import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildFixtures } from '@/services/mock/fixtures';
import { renderWithProject, withoutRows } from './test-harness';
import { MilestoneDetailScreen } from './milestone-detail-screen';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/p/prj_core/milestones/ms_24',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('MilestoneDetailScreen', () => {
  it('shows progress, runs and manager actions', async () => {
    renderWithProject(<MilestoneDetailScreen projectId="prj_core" milestoneId="ms_24" />, { user: 'u_raj', role: 'manager' });
    expect(await screen.findByRole('heading', { name: 'Release 2.4' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Runs in this milestone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete milestone' })).toBeEnabled();
  });

  it('hides edit and complete from testers', async () => {
    renderWithProject(<MilestoneDetailScreen projectId="prj_core" milestoneId="ms_24" />, { user: 'u_dana', role: 'tester' });
    await screen.findByRole('heading', { name: 'Release 2.4' });
    expect(screen.queryByRole('button', { name: 'Edit milestone' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Complete milestone' })).toBeNull();
  });

  it('shows the empty state when no runs are attached', async () => {
    const base = buildFixtures();
    const data = withoutRows(base, 'test_runs', (r) => r.milestone !== 'ms_24');
    renderWithProject(<MilestoneDetailScreen projectId="prj_core" milestoneId="ms_24" />, { user: 'u_raj', role: 'manager', data });
    expect(await screen.findByText('No runs yet.')).toBeInTheDocument();
  });
});
