import { Lock, Play } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { RunSummary } from '@/services/interfaces';
import { passRate } from './format';
import { RunProgressBar } from './run-progress-bar';

export function RunStateBadge({ closed }: { closed: boolean }) {
  return closed
    ? <Badge tone="neutral" icon={<Lock className="size-3.5" aria-hidden />}>Closed</Badge>
    : <Badge tone="info" icon={<Play className="size-3.5" aria-hidden />}>Open</Badge>;
}

/** Mini stacked bar + done percentage + failed count, used in lists and plan/milestone rows. */
export function MiniProgress({ summary }: { summary: Pick<RunSummary, 'progress'> }) {
  const p = summary.progress;
  const failed = p.counts.failed;
  const rate = passRate(p.counts);
  return (
    <div className="flex min-w-40 items-center gap-2">
      <RunProgressBar counts={p.counts} size="sm" className="w-24 shrink-0" />
      <span className="text-sm tabular-nums text-ink" title={rate.pct === null ? undefined : `${rate.pct}% passed of ${rate.executed} executed`}>{Math.round(p.done_pct)}%</span>
      {failed > 0 ? <span className="text-sm tabular-nums text-status-failed-text">{failed} failed</span> : null}
    </div>
  );
}
