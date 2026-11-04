import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setSingleKeyShortcuts } from '@/lib/hotkeys';
import { ServiceError } from '@/services/interfaces';
import { mockServices } from '@/services/mock';
import { nav } from './nav-mock';
import { TestExecutionScreen } from './test-execution-screen';
import { IDS, renderAs } from './test-utils';

vi.mock('next/navigation', () => import('./nav-mock'));

async function untestedIds(n = 2) {
  return (await mockServices.tests.list({ runId: IDS.runs.web, status: ['untested'] })).items.slice(0, n).map((i) => i.test.id);
}
const bar = () => within(screen.getByRole('group', { name: 'Result status' }));
const path = '/p/prj_core/runs/run_web/tests/x';

describe('Test execution', () => {
  it('P records Passed and advances to the next untested test in one key', async () => {
    const renderTest = (id: string) => renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={id} />, { path });
    const probe = await (async () => { renderAs('tester', <div />); return untestedIds(); })();
    const [a, b] = probe as [string, string];
    renderTest(a);
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.keyDown(document.body, { key: 'p' });
    await waitFor(() => expect(nav.push.length).toBeGreaterThan(0));
    expect(nav.push[0]).toContain(`/tests/${b}`);
    await waitFor(async () => expect((await mockServices.tests.get(a)).item.status_key).toBe('passed'));
  });

  it('Failed needs a comment: blocks with the service message, then saves with one', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.keyDown(document.body, { key: 'f' });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Enter', ctrlKey: true });
    expect(await screen.findByText('A comment is required for this status.')).toBeInTheDocument();
    expect(nav.push.length).toBe(0);
    fireEvent.change(screen.getByLabelText(/^Comment/), { target: { value: 'Locked after 4 tries' } });
    fireEvent.click(screen.getByRole('button', { name: /Save and next/ }));
    await waitFor(async () => expect((await mockServices.tests.get(a!)).item.status_key).toBe('failed'));
  });

  it('U clears only the unsaved selection and records nothing', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.click(bar().getByRole('button', { name: /^Failed/ }));
    expect(bar().getByRole('button', { name: /^Failed/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(document.body, { key: 'u' });
    expect(bar().getByRole('button', { name: /^Failed/ })).toHaveAttribute('aria-pressed', 'false');
    expect((await mockServices.tests.get(a!)).item.status_key).toBe('untested');
  });

  it('a failed step pre-selects Failed', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.click(within(screen.getByRole('group', { name: 'Set status for step 1' })).getByRole('button', { name: 'Failed' }));
    expect(bar().getByRole('button', { name: /^Failed/, pressed: true })).toBeInTheDocument();
  });

  it('single-key shortcuts off: P does nothing, the button still works', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    setSingleKeyShortcuts(false);
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.keyDown(document.body, { key: 'p' });
    expect(nav.push.length).toBe(0);
    fireEvent.click(bar().getByRole('button', { name: /^Passed/ }));
    await waitFor(() => expect(nav.push.length).toBeGreaterThan(0));
    setSingleKeyShortcuts(true);
  });

  it('closed run is read-only with a banner and no result bar', async () => {
    renderAs('tester', <div />);
    const t = (await mockServices.tests.list({ runId: IDS.runs.r23 })).items[0]!;
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.r23} testId={t.test.id} />, { path });
    expect(await screen.findByText('This run is closed. Results can no longer be changed.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Record result' })).toBeNull();
    expect(screen.getByText(/Shortcuts are off/)).toBeInTheDocument();
  });

  it('viewer sees the latest result instead of the result bar', async () => {
    renderAs('viewer', <div />);
    const [a] = await untestedIds(1);
    renderAs('viewer', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    expect(await screen.findByRole('region', { name: 'Latest result' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Record result' })).toBeNull();
  });

  it('a failed save shows "Not saved" and keeps the step statuses in the draft', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    const spy = vi.spyOn(mockServices.results, 'add').mockRejectedValueOnce(new ServiceError('network', 'Could not reach the server.'));
    const view = renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    const step1 = () => within(screen.getByRole('group', { name: 'Set status for step 1' }));
    fireEvent.click(step1().getByRole('button', { name: 'Passed' }));
    fireEvent.click(bar().getByRole('button', { name: /^Passed/ }));
    expect(await screen.findByText(/Not saved\./)).toBeInTheDocument();
    expect((await mockServices.tests.get(a!)).item.status_key).toBe('untested');
    view.unmount(); // the route change remounts the screen: the draft must bring both back
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    expect(within(screen.getByRole('group', { name: 'Set status for step 1' })).getByRole('button', { name: 'Passed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Not saved\./)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('holding P records once: key repeats are ignored', async () => {
    renderAs('tester', <div />);
    const [a] = await untestedIds(1);
    renderAs('tester', <TestExecutionScreen runId={IDS.runs.web} testId={a!} />, { path });
    await screen.findByRole('region', { name: 'Record result' });
    fireEvent.keyDown(document.body, { key: 'p', repeat: true });
    expect(nav.push.length).toBe(0);
    fireEvent.keyDown(document.body, { key: 'p' });
    await waitFor(async () => expect((await mockServices.tests.get(a!)).item.status_key).toBe('passed'));
    for (let i = 0; i < 3; i += 1) fireEvent.keyDown(document.body, { key: 'p', repeat: true });
    await new Promise((r) => setTimeout(r, 30));
    expect((await mockServices.tests.get(a!)).results).toHaveLength(1);
  });
});
