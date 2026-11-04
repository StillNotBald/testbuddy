'use client';

import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { placePopover, type Box } from './model';
import type { TourGoal, TourLabels } from './types';

export function formatStepOf(template: string, n: number, total: number): string {
  return template.replace('{n}', String(n)).replace('{total}', String(total));
}

export interface PickerProps {
  open: boolean;
  labels: TourLabels;
  goals: TourGoal[];
  resume: { goalLabel: string; stepText: string } | null;
  onPick: (goalId: string) => void;
  onEverything: () => void;
  onResume: () => void;
  onDismissResume: () => void;
  onClose: () => void;
  /** Lets the provider decide where focus goes when the picker closes. */
  onCloseAutoFocus: (event: Event) => void;
}

/** Goal picker: the one modal moment in the tour. Radix gives it a focus trap and Esc. */
export function TourPicker({ open, labels, goals, resume, onPick, onEverything, onResume, onDismissResume, onClose, onCloseAutoFocus }: PickerProps) {
  return (
    <RD.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-[var(--tb-overlay)]" />
        <RD.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-subtle bg-surface p-5 shadow-lg"
        >
          <RD.Title className="pr-8 text-lg font-semibold text-ink">{labels.picker.title}</RD.Title>
          <RD.Description className="mt-1 text-base text-ink-secondary">{labels.picker.intro}</RD.Description>

          {resume ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-subtle bg-sunken px-3 py-2.5">
              <p className="text-base text-ink">
                <span className="text-ink-muted">{labels.invite.continueWord} </span>
                {resume.goalLabel}
                <span className="text-sm text-ink-muted"> ({resume.stepText})</span>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onDismissResume}>{labels.invite.dismiss}</Button>
                <Button size="sm" variant="primary" onClick={onResume}>{labels.invite.resume}</Button>
              </div>
            </div>
          ) : null}

          <ul className="mt-4 divide-y divide-subtle border-y border-subtle">
            {goals.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onPick(g.id)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-3 text-left hover:bg-sunken"
                >
                  <span className="text-base font-medium text-ink">{g.label}</span>
                  <span className="text-sm text-ink-muted">{g.hint}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onEverything}>{labels.picker.everything}</Button>
          </div>

          <RD.Close aria-label={labels.close} className="absolute top-4 right-4 rounded-sm p-1 text-ink-muted hover:bg-sunken hover:text-ink">
            <X className="size-4" aria-hidden />
          </RD.Close>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export interface PopoverProps {
  stepNumber: number;
  total: number;
  title: string;
  text: string;
  labels: TourLabels;
  isLast: boolean;
  isFirst: boolean;
  /** The target's box, or null while it is not found (the popover is then centred). */
  box: Box | null;
  missing: boolean;
  desktop: boolean;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
  onChangeGoal: () => void;
}

/** Non-modal step popover. It never traps focus; the provider moves focus to its title when the tour starts. */
export function TourPopover({
  stepNumber, total, title, text, labels, isLast, isFirst, box, missing, desktop, titleRef,
  onBack, onNext, onClose, onChangeGoal,
}: PopoverProps) {
  const titleId = useId();
  const bodyId = useId();
  const self = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const stepOf = formatStepOf(labels.stepOf, stepNumber, total);

  // Beside the target on desktop. On phones the popover is a bottom sheet; with no target it stays centred.
  useLayoutEffect(() => {
    const el = self.current;
    if (!desktop || !box || !el) { setPos(null); return; }
    const r = el.getBoundingClientRect();
    const p = placePopover(box, { width: r.width, height: r.height }, { width: window.innerWidth, height: window.innerHeight });
    setPos({ top: p.top, left: p.left });
  }, [box, desktop, stepNumber, title]);

  const anchored = desktop && !!box && !!pos;

  return (
    <>
      {box ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-40 rounded-md"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8, boxShadow: 'var(--tb-focus-ring)' }}
        />
      ) : null}
      <div
        ref={self}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={anchored ? { top: pos.top, left: pos.left } : undefined}
        className={cn(
          'fixed z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-lg border border-subtle bg-surface p-4 text-ink shadow-lg',
          !desktop && 'inset-x-4 bottom-4 w-auto',
          desktop && !anchored && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{stepOf}</p>
          <button type="button" aria-label={labels.close} onClick={onClose} className="-mr-1 rounded-sm p-1 text-ink-muted hover:bg-sunken hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="mt-1 text-lg font-semibold text-ink outline-none">{title}</h2>
        <p id={bodyId} className={cn('mt-1 text-base', missing ? 'text-ink-muted' : 'text-ink-secondary')}>{missing ? labels.missing : text}</p>
        <p role="status" aria-live="polite" className="sr-only">{`${stepOf}. ${title}`}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onChangeGoal}>{labels.picker.changeGoal}</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onBack} disabled={isFirst}>{labels.back}</Button>
            <Button variant="primary" size="sm" onClick={onNext}>{isLast ? labels.done : labels.next}</Button>
          </div>
        </div>
      </div>
    </>
  );
}
