import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockServices } from '@/services/mock';
import { nav } from './nav-mock';
import { RunDetailScreen } from './run-detail-screen';
import { IDS, renderAs } from './test-utils';

vi.mock('next/navigation', () => import('./nav-mock'));

describe('Run detail', () => {
  it('shows progress, the pass-rate denominator and the assignee breakdown', async () => {
    renderAs('tester', <RunDetailScreen runId={IDS.runs.web} />);
    expect(await screen.findByRole('heading', { name: 'Web smoke 2.4-rc1' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /38 tests: 20 passed, 3 failed, 1 blocked, 14 untested/ })).toBeInTheDocument();
    expect(screen.getByText(/Pass rate 83% of 24 executed, 14 untested/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Tests left per assignee' })).toBeInTheDocument();
  });

  it('N opens the next untested test and Shift+N the next failed one', async () => {
    renderAs('tester', <RunDetailScreen runId={IDS.runs.web} />);
    await screen.findByRole('table', { name: 'Tests in this run' });
    const untested = (await mockServices.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items[0]!;
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(nav.push.at(-1)).toBe(`/p/prj_core/runs/${IDS.runs.web}/tests/${untested.test.id}`);
    const failed = (await mockServices.tests.list({ runId: IDS.runs.web, status: ['failed'] })).items[0]!;
    fireEvent.keyDown(document.body, { key: 'N', shiftKey: true });
    expect(nav.push.at(-1)).toContain(failed.test.id);
  });

  it('filters with a status chip and the number key (URL state)', async () => {
    renderAs('tester', <RunDetailScreen runId={IDS.runs.web} />);
    await screen.findByRole('table', { name: 'Tests in this run' });
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter by status' })).getByRole('button', { name: /^Failed/ }));
    expect(nav.replace.at(-1)).toContain('status=failed');
    fireEvent.keyDown(document.body, { key: '3' });
    expect(nav.replace.at(-1)).toContain('status=blocked');
  });

  it('closed run: banner, no close button state change, write controls disabled', async () => {
    renderAs('tester', <RunDetailScreen runId={IDS.runs.r23} />);
    expect(await screen.findByText(/Results can no longer be changed\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start next untested/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Close run/ })).toBeDisabled();
  });

  it('viewer cannot close the run or start executing', async () => {
    renderAs('viewer', <RunDetailScreen runId={IDS.runs.web} />);
    await screen.findByRole('heading', { name: 'Web smoke 2.4-rc1' });
    expect(screen.queryByRole('button', { name: /Close run/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Start next untested/ })).toBeDisabled();
  });

  it('shows the empty filter state', async () => {
    renderAs('tester', <RunDetailScreen runId={IDS.runs.web} />, { search: 'q=zzz-no-such-test' });
    await waitFor(() => expect(screen.getByText('No tests match this filter.')).toBeInTheDocument());
    expect(within(screen.getByRole('search')).getByLabelText('Search tests')).toHaveValue('zzz-no-such-test');
  });
});
