'use client';

import { STATUS_META, STATUS_ORDER } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { Progress } from '@/services/interfaces';

/**
 * Stacked status bar. Status is shape + label + colour: the text summary is the accessible name,
 * so the bar never relies on colour alone (DESIGN.md section 9).
 */
export function ProgressBar({ progress, className }: { progress: Progress; className?: string }) {
  const c = progress.counts;
  const total = progress.total || 1;
  const summary = progress.total === 0
    ? 'No tests yet'
    : `${progress.total} tests: ${c.passed} passed, ${c.failed} failed, ${c.blocked} blocked, ${c.retest} retest, ${c.untested} untested`;
  return (
    <div role="img" aria-label={summary} className={cn('flex h-2 w-full overflow-hidden rounded-xs bg-sunken', className)}>
      {STATUS_ORDER.map((k) => {
        const n = c[k];
        if (!n) return null;
        return <span key={k} className={cn('h-full', STATUS_META[k].solid)} style={{ width: `${(n / total) * 100}%` }} />;
      })}
    </div>
  );
}
