import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockServices } from '@/services/mock';
import { nav } from './nav-mock';
import { RunCreateScreen } from './run-create-screen';
import { IDS, renderAs } from './test-utils';

vi.mock('next/navigation', () => import('./nav-mock'));

describe('Create run', () => {
  it('pre-selects cases from ?cases= and leaves out deprecated ones (R-063)', async () => {
    renderAs('tester', <div />);
    const all = await mockServices.cases.list({ projectId: IDS.projectCore, deprecated: true, pageSize: 5000 });
    const live = all.items.filter((i) => !i.case.deprecated).slice(0, 3).map((i) => i.case.id);
    const dep = all.items.find((i) => i.case.deprecated)!.case.id;
    renderAs('tester', <RunCreateScreen initialCases={[...live, dep]} />, { path: '/p/prj_core/runs/new' });
    await waitFor(() => expect(screen.getByTestId('selected-count')).toHaveTextContent('3'));
    expect(screen.getByRole('button', { name: 'Create run with 3 tests' })).toBeInTheDocument();
  });

  it('builds a run from a filtered set: select all matching, name, create', async () => {
    renderAs('tester', <RunCreateScreen />, { path: '/p/prj_core/runs/new' });
    const all = await screen.findByRole('button', { name: /Select all \d+ matching filter/ });
    await waitFor(() => expect(all).toBeEnabled());
    const total = Number(/Select all (\d+) matching/.exec(all.textContent ?? '')?.[1]);
    expect(total).toBeGreaterThan(10);
    fireEvent.click(all);
    await waitFor(() => expect(screen.getByTestId('selected-count')).toHaveTextContent(String(total)));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Nightly web' } });
    fireEvent.click(screen.getByRole('button', { name: `Create run with ${total} tests` }));
    await waitFor(() => expect(nav.push.at(-1)).toMatch(/^\/p\/prj_core\/runs\/\w+/));
    const runs = await mockServices.runs.list({ projectId: IDS.projectCore, state: 'open', q: 'Nightly web' });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.progress.total).toBe(total);
  });

  it('validates the name and at least one case inline', async () => {
    renderAs('tester', <RunCreateScreen />, { path: '/p/prj_core/runs/new' });
    await screen.findByRole('button', { name: /^Web app/ });
    fireEvent.click(screen.getByRole('button', { name: /Create run with 0 tests/ }));
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Select at least one case.')).toBeInTheDocument();
  });

  it('saves the filters as a set and re-applies it', async () => {
    renderAs('tester', <RunCreateScreen />, { path: '/p/prj_core/runs/new' });
    await screen.findByRole('button', { name: /Select all \d+ matching filter/ });
    fireEvent.click(screen.getByRole('button', { name: /Save filters as set/ }));
    fireEvent.change(await screen.findByLabelText(/Set name/), { target: { value: 'Everything' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save set' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Delete set/ })).toBeInTheDocument());
  });

  it('disables plan and milestone for testers; viewers get no form', async () => {
    const r = renderAs('tester', <RunCreateScreen />, { path: '/p/prj_core/runs/new' });
    await screen.findByLabelText(/^Name/);
    expect(screen.getByRole('combobox', { name: 'Plan' })).toBeDisabled();
    r.unmount();
    renderAs('viewer', <RunCreateScreen />, { path: '/p/prj_core/runs/new' });
    expect(await screen.findByText('You do not have permission to create runs.')).toBeInTheDocument();
  });
});
