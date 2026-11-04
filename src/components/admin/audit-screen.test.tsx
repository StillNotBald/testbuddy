import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProject } from './test-harness';
import { AuditScreen } from './audit-screen';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/p/prj_core/audit',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('AuditScreen', () => {
  it('lists entries for an admin and offers the actor, action and date filters', async () => {
    search = '';
    renderWithProject(<AuditScreen projectId="prj_core" />, { user: 'u_avery', role: 'admin' });
    expect((await screen.findAllByRole('row')).length).toBeGreaterThan(1);
    expect(screen.getByRole('columnheader', { name: 'Actor' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });

  it('shows the empty state when filters match nothing', async () => {
    search = 'from=2100-01-01';
    renderWithProject(<AuditScreen projectId="prj_core" />, { user: 'u_avery', role: 'admin' });
    await waitFor(() => expect(screen.getByText('No audit entries for these filters.')).toBeInTheDocument());
  });

  it('shows the no-permission state to managers', async () => {
    search = '';
    renderWithProject(<AuditScreen projectId="prj_core" />, { user: 'u_raj', role: 'manager' });
    expect(await screen.findByText('You do not have access to the audit log')).toBeInTheDocument();
  });
});
