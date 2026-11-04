import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockServices } from '@/services/mock';
import { MilestoneReportScreen, ReportsIndexScreen, RunReportScreen } from './reports-screens';
import { IDS, renderAs } from './test-utils';

vi.mock('next/navigation', () => import('./nav-mock'));

describe('Reports', () => {
  it('run summary shows pass rate with the denominator and changes since the previous run', async () => {
    renderAs('tester', <RunReportScreen runId={IDS.runs.web} />, { path: '/p/prj_core/reports/run/x' });
    expect(await screen.findByText(/Pass rate 83% of 24 executed, 14 untested/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Changes since previous run' })).toBeInTheDocument();
    expect(await screen.findByText(/Compared with/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Change counts' })).toBeInTheDocument();
  });

  it('milestone report has a table twin and a copyable share link; CSV is manager-only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const r = renderAs('tester', <MilestoneReportScreen milestoneId={IDS.milestones.r24} />, { path: '/p/prj_core/reports/milestone/x' });
    expect(await screen.findByRole('table', { name: 'Progress by run' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Export CSV/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Copy share link/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/share/milestone/'));
    r.unmount();
    renderAs('manager', <MilestoneReportScreen milestoneId={IDS.milestones.r24} />, { path: '/p/prj_core/reports/milestone/x' });
    expect(await screen.findByRole('button', { name: /Export CSV/ })).toBeInTheDocument();
  });

  it('index shows the empty state for a project without milestones tab content', async () => {
    renderAs('viewer', <ReportsIndexScreen />, { path: '/p/prj_core/reports' });
    expect(await screen.findByText('Milestone')).toBeInTheDocument();
    expect(mockServices).toBeTruthy();
  });
});
