import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServices } from '@/services/mock';
import { CaseHistoryScreen } from './case-history-screen';
import { nav, renderAs, resetNav, seed } from './test-utils';

vi.mock('next/navigation', () => ({
  usePathname: () => '/p/prj_core/cases/x/history',
  useRouter: () => ({ push: (u: string) => nav.push(u), replace: (u: string) => nav.replace(u) }),
  useSearchParams: () => nav.params,
  useParams: () => nav.route,
}));

async function multiVersionCase() {
  seed('tester');
  const items = (await mockServices.cases.list({ projectId: 'prj_core', pageSize: 200 })).items;
  return items.find((i) => i.case.version >= 3)!.case;
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

describe('Case history', () => {
  it('lists versions, starts empty on the compare pane, and compares with current', async () => {
    const c = await multiVersionCase();
    resetNav('', { caseId: c.id });
    renderAs('tester', <CaseHistoryScreen />);
    expect(await screen.findByText('Pick two versions to see what changed.')).toBeInTheDocument();
    expect(screen.getByText(`${c.version} versions`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compare v1 with current' }));
    expect(nav.replace).toHaveBeenCalledWith(expect.stringContaining(`a=1&b=${c.version}`));
  });

  it('shows a diff when two versions are in the URL', async () => {
    const c = await multiVersionCase();
    resetNav(`a=1&b=${c.version}`, { caseId: c.id });
    renderAs('tester', <CaseHistoryScreen />);
    expect(await screen.findByRole('heading', { name: `Changes from v1 to v${c.version}` })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: new RegExp('Differences between') })).toBeInTheDocument();
  });

  it('hides Restore for a viewer', async () => {
    const c = await multiVersionCase();
    resetNav('', { caseId: c.id });
    renderAs('viewer', <CaseHistoryScreen />);
    await screen.findByText(`${c.version} versions`);
    expect(screen.queryByRole('button', { name: /Restore v/ })).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Compare v1 with current' })).toBeInTheDocument());
  });
});
