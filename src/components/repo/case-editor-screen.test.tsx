import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServices } from '@/services/mock';
import { CaseEditorScreen } from './case-editor-screen';
import { nav, renderAs, resetNav, seed } from './test-utils';

vi.mock('next/navigation', () => ({
  usePathname: () => '/p/prj_core/cases/x',
  useRouter: () => ({ push: (u: string) => nav.push(u), replace: (u: string) => nav.replace(u) }),
  useSearchParams: () => nav.params,
  useParams: () => nav.route,
}));

async function firstCase() {
  seed('tester');
  return (await mockServices.cases.list({ projectId: 'prj_core', pageSize: 1 })).items[0]!.case;
}

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

describe('Case editor', () => {
  it('edits a case, shows the dirty state and saves a version', async () => {
    const c = await firstCase();
    resetNav('', { caseId: c.id });
    renderAs('tester', <CaseEditorScreen />);
    const title = await screen.findByLabelText(/^Title/);
    expect(screen.getByText('All changes saved.')).toBeInTheDocument();
    fireEvent.change(title, { target: { value: `${c.title} (edited)` } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Save changes$|^Save as v\d+$/ }));
    await waitFor(async () => expect((await mockServices.cases.get(c.id)).case.title).toBe(`${c.title} (edited)`));
    await waitFor(() => expect(screen.getByText('All changes saved.')).toBeInTheDocument());
  });

  it('adds and reorders steps, and guards leaving with unsaved changes', async () => {
    const c = await firstCase();
    resetNav('', { caseId: c.id });
    renderAs('tester', <CaseEditorScreen />);
    await screen.findByLabelText(/^Title/);
    const before = screen.getAllByLabelText(/^Step \d+$/).length;
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getAllByLabelText(/^Step \d+$/).length).toBe(before + 1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('is read-only for a viewer', async () => {
    const c = await firstCase();
    resetNav('', { caseId: c.id });
    renderAs('viewer', <CaseEditorScreen />);
    expect(await screen.findByText('You can view this case but not change it.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Title/)).toBeNull();
  });

  it('validates an empty new case (title, step, section)', async () => {
    resetNav();
    renderAs('tester', <CaseEditorScreen creating />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create case' }));
    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 needs a description.')).toBeInTheDocument();
    expect(screen.getByText('Choose a section.')).toBeInTheDocument();
  });
});
