'use client';

import { STATUS_META, STATUS_ORDER } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { Progress } from '@/services/interfaces';

/** Bar pattern per status so segments differ without colour (DESIGN.md 3.2). */
const PATTERN: Record<(typeof STATUS_ORDER)[number], string> = {
  passed: '',
  failed: 'tb-pattern-failed',
  blocked: 'tb-pattern-blocked',
  retest: 'tb-pattern-retest',
  untested: 'tb-pattern-untested',
};

export function progressSummary(p: Progress): string {
  if (p.total === 0) return 'No tests yet';
  const parts = STATUS_ORDER.map((k) => `${p.counts[k]} ${STATUS_META[k].label.toLowerCase()}`);
  return `${p.total} tests: ${parts.join(', ')}`;
}

/** Stacked status bar in fixed order (passed, failed, blocked, retest, untested) with a text summary. */
export function MilestoneProgress({ progress, size = 'md' }: { progress: Progress; size?: 'sm' | 'md' }) {
  const total = progress.total;
  return (
    <div className="w-full max-w-xl space-y-1">
      <div role="img" aria-label={progressSummary(progress)} className={cn('flex w-full overflow-hidden rounded-xs bg-sunken', size === 'md' ? 'h-2' : 'h-3')}>
        {total > 0
          ? STATUS_ORDER.map((k) => (progress.counts[k] > 0
            ? <span key={k} className={cn('h-full', STATUS_META[k].solid, PATTERN[k])} style={{ width: `${(progress.counts[k] / total) * 100}%` }} />
            : null))
          : null}
      </div>
      <p className="text-sm tabular-nums text-ink-muted">{total > 0 ? `${progress.done_pct}% tested` : 'No tests yet'}</p>
    </div>
  );
}
