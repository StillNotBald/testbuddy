import { cn } from '@/lib/utils';
import { STATUS_META } from '@/components/ui';
import type { StatusCounts } from '@/services/interfaces';
import { FIXED_ORDER, countsSummary, totalOf, type CountKey } from './format';

const PATTERN: Record<CountKey, string> = { passed: '', failed: 'tb-pattern-failed', blocked: 'tb-pattern-blocked', retest: 'tb-pattern-retest', untested: 'tb-pattern-untested' };
const HEIGHT = { sm: 'h-2', md: 'h-3', lg: 'h-4' } as const;

export interface RunProgressBarProps {
  counts: StatusCounts;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  /** Makes each segment a button (filters the table). */
  onSegmentClick?: (status: CountKey) => void;
  className?: string;
}

/** Stacked segments in the fixed order Passed, Failed, Blocked, Retest, Untested with patterns, so colour is never the only cue. */
export function RunProgressBar({ counts, size = 'md', showLegend, onSegmentClick, className }: RunProgressBarProps) {
  const total = totalOf(counts);
  const summary = countsSummary(counts);
  const segs = FIXED_ORDER.filter((k) => counts[k] > 0);
  const interactive = !!onSegmentClick;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        {...(interactive ? { role: 'group', 'aria-label': summary } : { role: 'img', 'aria-label': summary })}
        className={cn('flex w-full overflow-hidden rounded-full bg-sunken', HEIGHT[size])}
      >
        {total === 0 ? null : segs.map((k) => {
          const pct = (counts[k] / total) * 100;
          const cls = cn('h-full min-w-0.5', STATUS_META[k].solid, PATTERN[k]);
          const title = `${STATUS_META[k].label}: ${counts[k]} (${Math.round(pct)}%)`;
          return interactive ? (
            <button key={k} type="button" style={{ width: `${pct}%` }} title={title} aria-label={title} onClick={() => onSegmentClick(k)} className={cn(cls, 'hover:brightness-110')} />
          ) : (
            <span key={k} style={{ width: `${pct}%` }} title={title} className={cls} />
          );
        })}
      </div>
      {showLegend ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-secondary" aria-hidden={!interactive ? true : undefined}>
          {FIXED_ORDER.map((k) => {
            const Icon = STATUS_META[k].icon;
            return (
              <li key={k} className="inline-flex items-center gap-1 tabular-nums">
                <Icon className="size-3.5" aria-hidden />
                {STATUS_META[k].label} <span className="font-medium text-ink">{counts[k]}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
