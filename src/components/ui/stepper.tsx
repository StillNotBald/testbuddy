import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TestStatusKey } from '@/services/types';
import { cn } from '@/lib/utils';
import { STATUS_ORDER, StatusBadge } from './status-badge';

export interface StepItem { id?: string; description: string; expected_result?: string }
export interface StepResultView { status: TestStatusKey; comment?: string }

export interface StepListProps {
  steps: StepItem[];
  /** Results by 1-based step position. */
  results?: Record<number, StepResultView | undefined>;
  /** When set, each step shows P/F/B/R buttons. */
  onStepStatus?: (position: number, status: Exclude<TestStatusKey, 'custom' | 'untested'>) => void;
  activeIndex?: number;
  className?: string;
}

/** Read view of a case's steps (optionally with per-step result buttons). */
export function StepList({ steps, results, onStepStatus, activeIndex, className }: StepListProps) {
  if (steps.length === 0) return <p className="text-base text-ink-muted">This case has no steps.</p>;
  return (
    <ol className={cn('space-y-3', className)}>
      {steps.map((s, i) => {
        const r = results?.[i + 1];
        return (
          <li key={s.id ?? i} aria-current={activeIndex === i ? 'step' : undefined} className={cn('flex gap-3 rounded-md p-2', activeIndex === i && 'bg-selected')}>
            <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-medium tabular-nums text-ink-secondary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-base whitespace-pre-wrap text-ink">{s.description}</p>
              {s.expected_result ? <p className="mt-0.5 text-sm text-ink-muted"><span className="font-medium">Expected:</span> {s.expected_result}</p> : null}
              {r?.comment ? <p className="mt-1 text-sm text-ink-secondary">{r.comment}</p> : null}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              {r ? <StatusBadge status={r.status} /> : null}
              {onStepStatus ? (
                <div role="group" aria-label={`Set status for step ${i + 1}`} className="flex gap-1">
                  {STATUS_ORDER.filter((k) => k !== 'untested').map((k) => (
                    <button key={k} type="button" onClick={() => onStepStatus(i + 1, k as 'passed')} aria-pressed={r?.status === k} className="min-h-8 rounded-sm px-1.5 hover:bg-sunken pointer-coarse:min-h-11">
                      <StatusBadge status={k} showLabel={false} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export interface WizardStep { id: string; label: ReactNode }

/** Multi-step flow header (import wizard, run creation sections). */
export function Stepper({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        return (
          <li key={s.id} aria-current={i === current ? 'step' : undefined} className="flex items-center gap-2 text-base">
            <span className={cn('inline-flex size-6 items-center justify-center rounded-full text-sm font-medium tabular-nums', done ? 'bg-accent text-accent-ink' : i === current ? 'border-2 border-accent text-accent-text' : 'border border-strong text-ink-muted')}>
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn(i === current ? 'font-semibold text-ink' : 'text-ink-muted')}>{s.label}</span>
            {i < steps.length - 1 ? <span aria-hidden className="h-px w-6 bg-subtle" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
