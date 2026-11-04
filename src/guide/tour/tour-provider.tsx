'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createGuide, DEMO_PROJECT_ID } from '@/guide/guide.content';
import { safeGet, useMediaQuery } from '@/lib/use-media-query';
import type { ProjectRole } from '@/services/types';
import { readMemory, writeMemory, type TourMemory } from './memory';
import { ALL_PATH, onStepScreen, resolvePath, visibleGoals, type Box, type ResolvedStep } from './model';
import { formatStepOf, TourPicker, TourPopover } from './tour-view';
import type { TourContent } from './types';

export interface TourApi {
  /** Opens the goal picker, or starts a goal straight away when `goalId` is given. */
  open: (goalId?: string) => void;
  close: () => void;
  isOpen: boolean;
}

const NOOP_API: TourApi = { open: () => {}, close: () => {}, isOpen: false };
const TourContext = createContext<TourApi>(NOOP_API);

/** Entry point for the Help menu and user menu. Outside a provider it does nothing. */
export function useTour(): TourApi {
  return useContext(TourContext);
}

type Phase = 'closed' | 'picker' | 'tour';
type Anchor = { status: 'seeking' } | { status: 'found'; el: HTMLElement; box: Box } | { status: 'missing' };

/** How long a step waits for its target, and for navigation to land, before it is shown centred. */
const DEFAULT_WAIT_MS = 3000;
const POLL_MS = 100;
/** A menu closes and hands focus back to its trigger after this; the opener is read after that. */
const OPEN_DELAY_MS = 50;

/** The first visible match, so a desktop and a phone version of one element can share a name. */
function findVisible(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    if (el.getClientRects().length > 0) return el;
  }
  return null;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function recentProject(): string | undefined {
  try {
    return (JSON.parse(safeGet('testbuddy.recentProjects') ?? '[]') as string[])[0];
  } catch {
    return undefined;
  }
}

export interface TourProviderProps {
  projectId?: string;
  role: ProjectRole | null;
  userId?: string;
  /** How long a step waits for its target before it is shown centred. */
  waitMs?: number;
  children: ReactNode;
}

/**
 * Owns the tour: the goal picker, the step popover, navigation to each step's screen, anchoring to `data-tour`
 * targets, focus, Esc, and per-viewer memory. Mounted once in the app shell.
 */
export function TourProvider({ projectId, role, userId, waitMs = DEFAULT_WAIT_MS, children }: TourProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);

  const project = projectId ?? recentProject() ?? DEMO_PROJECT_ID;
  const content: TourContent = useMemo(() => createGuide({ projectId: project }), [project]);
  const goals = useMemo(() => visibleGoals(content, role), [content, role]);

  const desktop = useMediaQuery('(min-width: 640px)', true);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const reducedRef = useRef(reduced);

  const [phase, setPhase] = useState<Phase>('closed');
  const phaseRef = useRef<Phase>('closed');

  // Handlers and effects read the latest values through these refs; they are synced after each commit.
  useLayoutEffect(() => {
    routerRef.current = router;
    reducedRef.current = reduced;
    phaseRef.current = phase;
  });
  const [pathId, setPathId] = useState<string>(ALL_PATH);
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Anchor>({ status: 'seeking' });
  // Memory is read when the provider mounts and refreshed in the handlers that write it.
  const [memory, setMemory] = useState<TourMemory>(() => readMemory(userId));

  const returnFocus = useRef<HTMLElement | null>(null);
  const movingToTour = useRef(false);
  const focusTitle = useRef(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const steps: ResolvedStep[] = useMemo(() => resolvePath(content, pathId, role), [content, pathId, role]);
  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const step = phase === 'tour' ? steps[safeIndex] : undefined;
  const stepId = step?.id;
  const stepHref = step?.href;
  const stepTarget = step?.target;

  const resume = useMemo(() => {
    if (memory.goalId === undefined || memory.dismissed) return null;
    const total = resolvePath(content, memory.goalId, role).length;
    if (total === 0) return null;
    const goal = memory.goalId === ALL_PATH ? undefined : goals.find((g) => g.id === memory.goalId);
    if (memory.goalId !== ALL_PATH && !goal) return null;
    const at = Math.min(memory.index ?? 0, total - 1);
    return {
      goalId: memory.goalId,
      index: at,
      goalLabel: goal?.label ?? content.labels.picker.everything,
      stepText: formatStepOf(content.labels.stepOf, at + 1, total),
    };
  }, [memory, content, role, goals]);

  const restoreFocus = useCallback(() => {
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el && el.isConnected) window.setTimeout(() => el.focus(), 0);
  }, []);

  const startPath = useCallback((id: string, from: number) => {
    const list = resolvePath(content, id, role);
    if (list.length === 0) return false;
    const at = Math.min(Math.max(0, from), list.length - 1);
    writeMemory(userId, { goalId: id, index: at, dismissed: false });
    setMemory(readMemory(userId));
    setPathId(id);
    setIndex(at);
    setAnchor({ status: 'seeking' });
    focusTitle.current = true;
    setPhase('tour');
    return true;
  }, [content, role, userId]);

  const open = useCallback((goalId?: string) => {
    const begin = () => {
      if (goalId && startPath(goalId, 0)) return;
      setPhase('picker');
      setMemory(readMemory(userId));
    };
    if (phaseRef.current !== 'closed') { begin(); return; }
    // Remember the opener only once the menu has handed focus back to its trigger.
    window.setTimeout(() => {
      const el = document.activeElement;
      returnFocus.current = el instanceof HTMLElement && el !== document.body ? el : null;
      begin();
    }, OPEN_DELAY_MS);
  }, [startPath, userId]);

  const close = useCallback(() => {
    if (phaseRef.current === 'closed') return;
    setPhase('closed');
    restoreFocus();
  }, [restoreFocus]);

  const finish = useCallback(() => {
    writeMemory(userId, {});
    setMemory({});
    close();
  }, [userId, close]);

  const goTo = (next: number) => {
    if (next >= steps.length) { finish(); return; }
    setIndex(Math.max(0, next));
    setAnchor({ status: 'seeking' });
  };

  // Remember where the tour is, so the picker can offer to resume it.
  useEffect(() => {
    if (phase !== 'tour') return;
    writeMemory(userId, { goalId: pathId, index: safeIndex, dismissed: false });
  }, [phase, pathId, safeIndex, userId]);

  // Navigate to the step's screen, then wait for its target. The target is looked up only once the browser is on
  // the right screen, so an element from the previous screen is never ringed by mistake. `pathname` restarts the
  // wait when a navigation lands.
  useEffect(() => {
    if (phase !== 'tour' || !stepHref || !stepTarget) return;
    if (!onStepScreen(stepHref, window.location.pathname, window.location.search)) {
      routerRef.current.push(stepHref, { scroll: false });
    }
    let stopped = false;
    let timer = 0;
    const started = Date.now();
    const look = () => {
      if (stopped) return;
      const ready = onStepScreen(stepHref, window.location.pathname, window.location.search);
      const el = ready ? findVisible(stepTarget) : null;
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: reducedRef.current ? 'auto' : 'smooth' });
        setAnchor({ status: 'found', el, box: boxOf(el) });
        return;
      }
      if (Date.now() - started >= waitMs) {
        setAnchor({ status: 'missing' });
        return;
      }
      timer = window.setTimeout(look, POLL_MS);
    };
    look();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [phase, stepId, stepHref, stepTarget, pathname, waitMs]);

  // Keep the ring on the target while the page scrolls or resizes.
  const foundEl = anchor.status === 'found' ? anchor.el : null;
  useEffect(() => {
    if (!foundEl) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setAnchor((a) => (a.status === 'found' && a.el === foundEl ? { ...a, box: boxOf(foundEl) } : a));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [foundEl]);

  // Focus moves into the popover when a tour starts (later steps keep focus on their buttons).
  useEffect(() => {
    if (phase === 'tour' && focusTitle.current && titleRef.current) {
      focusTitle.current = false;
      titleRef.current.focus();
    }
  }, [phase]);

  // Esc closes the tour. Progress is kept, so the picker can resume it.
  useEffect(() => {
    if (phase !== 'tour') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); close(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, close]);

  const dismissResume = () => {
    const next: TourMemory = { ...readMemory(userId), dismissed: true };
    writeMemory(userId, next);
    setMemory(next);
  };

  const api = useMemo<TourApi>(() => ({ open, close, isOpen: phase !== 'closed' }), [open, close, phase]);
  const labels = content.labels;
  const total = steps.length;

  return (
    <TourContext.Provider value={api}>
      {children}
      <TourPicker
        open={phase === 'picker'}
        labels={labels}
        goals={goals}
        resume={resume ? { goalLabel: resume.goalLabel, stepText: resume.stepText } : null}
        onPick={(id) => { movingToTour.current = true; if (!startPath(id, 0)) movingToTour.current = false; }}
        onEverything={() => { movingToTour.current = true; if (!startPath(ALL_PATH, 0)) movingToTour.current = false; }}
        onResume={() => {
          if (!resume) return;
          movingToTour.current = true;
          if (!startPath(resume.goalId, resume.index)) movingToTour.current = false;
        }}
        onDismissResume={dismissResume}
        onClose={close}
        onCloseAutoFocus={(e) => {
          // Moving into the tour keeps focus where the tour puts it; closing returns it to the opener.
          e.preventDefault();
          if (movingToTour.current) { movingToTour.current = false; return; }
          restoreFocus();
        }}
      />
      {phase === 'tour' && step ? (
        <TourPopover
          stepNumber={safeIndex + 1}
          total={total}
          title={step.title}
          text={step.text}
          labels={labels}
          isFirst={safeIndex === 0}
          isLast={safeIndex >= total - 1}
          box={anchor.status === 'found' ? anchor.box : null}
          missing={anchor.status === 'missing'}
          desktop={desktop}
          titleRef={titleRef}
          onBack={() => goTo(safeIndex - 1)}
          onNext={() => goTo(safeIndex + 1)}
          onClose={close}
          onChangeGoal={() => { setPhase('picker'); setMemory(readMemory(userId)); }}
        />
      ) : null}
    </TourContext.Provider>
  );
}
