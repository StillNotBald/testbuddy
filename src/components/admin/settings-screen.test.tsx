import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProject } from './test-harness';
import { SettingsScreen } from './settings-screen';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/p/prj_core/settings',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('SettingsScreen', () => {
  it('shows announcement, import and archive to an admin', async () => {
    search = '';
    renderWithProject(<SettingsScreen projectId="prj_core" />, { user: 'u_avery', role: 'admin' });
    expect(await screen.findByDisplayValue('Release freeze Friday 18:00')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Danger zone' })).toBeInTheDocument();
  });

  it('lets a manager edit the announcement and import, with no archive control', async () => {
    search = '';
    renderWithProject(<SettingsScreen projectId="prj_core" />, { user: 'u_raj', role: 'manager' });
    expect(await screen.findByDisplayValue('Release freeze Friday 18:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save announcement' })).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Import' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Danger zone' })).toBeNull();
  });

  it('shows no settings to a tester', async () => {
    search = '';
    renderWithProject(<SettingsScreen projectId="prj_core" />, { user: 'u_dana', role: 'tester' });
    expect(await screen.findByText('You do not have permission to view settings')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('requires the typed project name before archiving', async () => {
    search = '?tab=danger';
    renderWithProject(<SettingsScreen projectId="prj_core" />, { user: 'u_avery', role: 'admin' });
    screen.getByRole('button', { name: 'Archive project' }).click();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive Core platform' })).toBeDisabled();
  });
});
