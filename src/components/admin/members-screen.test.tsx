import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProject } from './test-harness';
import { MembersScreen } from './members-screen';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/p/prj_core/members',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('MembersScreen', () => {
  it('lets an admin change roles and add or remove members', async () => {
    renderWithProject(<MembersScreen projectId="prj_core" />, { user: 'u_avery', role: 'admin' });
    expect(await screen.findByText('Dana Lee')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role for Dana Lee' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remove Dana Lee' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeEnabled();
  });

  it('is read-only for managers', async () => {
    renderWithProject(<MembersScreen projectId="prj_core" />, { user: 'u_raj', role: 'manager' });
    await screen.findByText('Dana Lee');
    expect(screen.queryByRole('combobox', { name: 'Role for Dana Lee' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
  });

  it('shows the no-permission state to testers', async () => {
    renderWithProject(<MembersScreen projectId="prj_core" />, { user: 'u_dana', role: 'tester' });
    await waitFor(() => expect(screen.getByText('You do not have permission to view members')).toBeInTheDocument());
    expect(screen.queryByText('Dana Lee')).toBeNull();
  });
});
