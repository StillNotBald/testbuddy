import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepositoryScreen } from './repository-screen';
import { mockServices } from '@/services/mock';
import { nav, renderAs, resetNav, seed } from './test-utils';

vi.mock('next/navigation', () => ({
  usePathname: () => '/p/prj_core/cases',
  useRouter: () => ({ push: (u: string) => nav.push(u), replace: (u: string) => nav.replace(u) }),
  useSearchParams: () => nav.params,
  useParams: () => nav.route,
}));

beforeEach(() => {
  resetNav();
  window.matchMedia = ((q: string) => ({ matches: q.includes('min-width'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

describe('Repository screen', () => {
  it('lists cases in a virtualised table with a count, and opens one in the inspector', async () => {
    renderAs('tester', <RepositoryScreen />);
    const table = await screen.findByRole('table', { name: 'Cases' });
    expect(Number(table.getAttribute('aria-rowcount'))).toBeGreaterThan(50);
    const rows = within(table).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(Number(table.getAttribute('aria-rowcount')));
    expect(screen.getByText(/in the project\./)).toBeInTheDocument();
    expect(screen.getByRole('tree', { name: 'Suites and sections' })).toBeInTheDocument();
    fireEvent.click(within(table).getAllByRole('button', { name: /./ }).find((b) => b.hasAttribute('data-open')) as HTMLElement);
    expect(nav.push).toHaveBeenCalledWith(expect.stringContaining('case='));
  });

  it('selects cases for bulk actions as a tester', async () => {
    renderAs('tester', <RepositoryScreen />);
    const box = await screen.findByRole('checkbox', { name: /^Select CORE-C1$/ });
    fireEvent.click(box);
    const bar = await screen.findByRole('region', { name: 'Bulk actions' });
    expect(within(bar).getByText('1 selected')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('is read-only for a viewer: no New case, no checkboxes, no Edit in the inspector', async () => {
    seed('viewer');
    const first = (await mockServices.cases.list({ projectId: 'prj_core', pageSize: 1 })).items[0]!.case;
    resetNav(`case=${first.id}`);
    renderAs('viewer', <RepositoryScreen />);
    await screen.findByRole('table', { name: 'Cases' });
    expect(await screen.findByRole('heading', { name: first.title })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /New case/ })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /^Select CORE/ })).toBeNull();
    expect(screen.queryByTestId('inspector-edit')).toBeNull();
  });

  it('shows the filtered empty state with Clear filters', async () => {
    resetNav('q=zzzz-nothing');
    renderAs('tester', <RepositoryScreen />);
    expect(await screen.findByText('No cases match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(nav.replace).toHaveBeenCalled();
  });

  it('moves through the tree with the arrow keys', async () => {
    renderAs('tester', <RepositoryScreen />);
    const all = await screen.findByRole('treeitem', { name: /All cases/ });
    all.focus();
    fireEvent.keyDown(all, { key: 'ArrowDown' });
    expect(screen.getAllByRole('treeitem')[1]).toHaveFocus();
  });
});
