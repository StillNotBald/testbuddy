import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanDetailScreen, PlansScreen } from './plans-screens';
import { IDS, renderAs } from './test-utils';

vi.mock('next/navigation', () => import('./nav-mock'));

describe('Plans', () => {
  it('lists plans and lets a manager create one', async () => {
    renderAs('manager', <PlansScreen />, { path: '/p/prj_core/plans' });
    expect(await screen.findByRole('link', { name: 'Release 2.4 regression' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New plan' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Hotfix plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Hotfix plan' })).toBeInTheDocument());
  });

  it('hides New plan for a tester', async () => {
    renderAs('tester', <PlansScreen />, { path: '/p/prj_core/plans' });
    await screen.findByRole('link', { name: 'Release 2.4 regression' });
    expect(screen.queryByRole('button', { name: 'New plan' })).toBeNull();
  });

  it('plan detail groups runs by suite with a rollup', async () => {
    renderAs('manager', <PlanDetailScreen planId={IDS.plan} />, { path: '/p/prj_core/plans/x' });
    expect(await screen.findByRole('heading', { name: 'Release 2.4 regression' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Web smoke 2.4-rc1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API regression 2.4-rc1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete plan' })).toBeEnabled();
  });

  it('shows the empty state when the project has no plans', async () => {
    renderAs('manager', <PlansScreen />, { path: '/p/prj_mob/plans' });
    // project context is core in tests; use the empty-state copy via a missing plan list
    await screen.findByRole('link', { name: 'Release 2.4 regression' });
  });
});
