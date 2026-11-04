import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TourProvider, useTour } from './tour';
import { llmsFiles } from './llms';

// Real navigation is replaced by a history update, so the tour sees the new URL like the browser would.
vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: (href: string) => { window.history.pushState({}, '', href); } }),
}));

function Opener() {
  const tour = useTour();
  return <button onClick={() => tour.open()}>Open guide</button>;
}

function Targets({ names }: { names: string[] }) {
  return <>{names.map((n) => <div key={n} data-tour={n} />)}</>;
}

function Harness({ role, userId = 'u_test', targets = [] }: { role: 'admin' | 'viewer' | 'tester' | null; userId?: string; targets?: string[] }) {
  return (
    <TourProvider projectId="prj_core" role={role} userId={userId} waitMs={200}>
      <Opener />
      <Targets names={targets} />
    </TourProvider>
  );
}

const FIRST_CASE_TARGETS = ['nav-cases', 'repo-tree', 'topbar-create', 'case-title', 'case-steps', 'case-save'];

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  // jsdom has no layout: every element counts as drawn, and scrolling is a no-op.
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => [{}] as unknown as DOMRectList);
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = ((query: string) => ({
    matches: query === '(min-width: 640px)',
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('guided tour', () => {
  it('opens the picker, runs a goal step by step, and finishes with Done', async () => {
    render(<Harness role="admin" targets={FIRST_CASE_TARGETS} />);
    const opener = screen.getByText('Open guide');
    act(() => opener.focus());
    fireEvent.click(opener);

    fireEvent.click(await screen.findByText('Write my first test case'));
    expect(await screen.findByText('Open the Repository')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();

    for (let i = 2; i <= 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(await screen.findByText(`Step ${i} of 6`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('shows tester goals only to roles that can use them', async () => {
    const { unmount } = render(<Harness role="viewer" />);
    fireEvent.click(screen.getByText('Open guide'));
    await screen.findByText('What do you want to do?');
    expect(screen.queryByText('Write my first test case')).toBeNull();
    expect(screen.queryByText('Record results fast (keyboard)')).toBeNull();
    expect(screen.queryByText('Invite my team')).toBeNull();
    expect(screen.getByText('See how a release is going')).toBeInTheDocument();
    unmount();

    render(<Harness role="tester" />);
    fireEvent.click(screen.getByText('Open guide'));
    expect(await screen.findByText('Write my first test case')).toBeInTheDocument();
    expect(screen.getByText('Record results fast (keyboard)')).toBeInTheDocument();
    expect(screen.queryByText('Invite my team')).toBeNull();
  });

  it('shows a missing target centred, with the plain-words message', async () => {
    // Overview stats are not rendered here, so the first step of "See how a release is going" cannot anchor.
    render(<Harness role="admin" />);
    fireEvent.click(screen.getByText('Open guide'));
    fireEvent.click(await screen.findByText('See how a release is going'));
    expect(await screen.findByText("This part of the screen isn't here for your role or data.", {}, { timeout: 1500 })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'The headline numbers' })).toBeInTheDocument();
  });

  it('keeps a dismissed resume prompt dismissed after a reload', async () => {
    window.localStorage.setItem('tb-tour:v1:u_1', JSON.stringify({ goalId: 'first-case', index: 2 }));
    const first = render(<Harness role="admin" userId="u_1" />);
    fireEvent.click(screen.getByText('Open guide'));
    expect(await screen.findByText('Resume')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Resume')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('tb-tour:v1:u_1') ?? '{}')).toMatchObject({ dismissed: true });
    first.unmount();

    render(<Harness role="admin" userId="u_1" />);
    fireEvent.click(screen.getByText('Open guide'));
    await screen.findByText('What do you want to do?');
    expect(screen.queryByText('Resume')).toBeNull();
  });

  it('builds llms files from the same content', () => {
    const files = llmsFiles();
    expect(files['llms.txt']).toContain('# TestBuddy');
    expect(files['llms.txt']).toContain('Write my first test case');
    expect(files['llms.txt']).toContain('/how-it-works');
    expect(files['llms-full.txt']).toContain('Result statuses');
    expect(files['llms-full.txt']).toContain('Write my first test case');
  });
});
