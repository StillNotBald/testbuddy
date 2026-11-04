import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IDS, renderAs } from './test-utils';
import { RunListScreen } from './run-list-screen';

vi.mock('next/navigation', () => import('./nav-mock'));

describe('Run list', () => {
  it('lists open runs with progress and Re-run failed, hides closed runs', async () => {
    renderAs('tester', <RunListScreen />);
    expect(await screen.findByRole('link', { name: 'Web smoke 2.4-rc1' })).toBeInTheDocument();
    expect(screen.queryByText('Release 2.3 full regression')).toBeNull();
    const row = screen.getByRole('link', { name: 'Web smoke 2.4-rc1' }).closest('tr') as HTMLElement;
    expect(within(row).getByRole('button', { name: /Re-run failed/ })).toBeEnabled();
    expect(within(row).getByRole('img', { name: /tests:/ })).toBeInTheDocument();
  });

  it('shows the closed state on the Closed tab', async () => {
    renderAs('tester', <RunListScreen />, { search: 'state=closed' });
    const link = await screen.findByRole('link', { name: 'Release 2.3 full regression' });
    expect(within(link.closest('tr') as HTMLElement).getAllByText('Closed').length).toBeGreaterThan(0);
  });

  it('hides New run and Re-run failed for a viewer', async () => {
    renderAs('viewer', <RunListScreen />);
    await screen.findByRole('link', { name: 'Web smoke 2.4-rc1' });
    expect(screen.queryByRole('link', { name: /New run/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Re-run failed/ })).toBeNull();
  });

  it('shows the empty state when no run matches', async () => {
    renderAs('tester', <RunListScreen />, { search: 'q=zzz-nothing' });
    await waitFor(() => expect(screen.getByText('No runs match these filters.')).toBeInTheDocument());
    expect(IDS.runs.web).toBeTruthy();
  });
});
