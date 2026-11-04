'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { RoleGate } from '@/components/tb/role-gate';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { DISABLED_REASON } from '@/lib/permissions';
import { useMilestone, useMilestoneMutations } from '@/services/hooks';
import { ServiceError, type RunSummary } from '@/services/interfaces';
import { dueText, plural } from './format';
import { MilestoneFormPanel } from './milestone-form';
import { MilestoneProgress, progressSummary } from './milestone-progress';

const col = createColumnHelper<RunSummary>();

export function MilestoneDetailScreen({ projectId, milestoneId }: { projectId: string; milestoneId: string }) {
  const q = useMilestone(milestoneId);
  const mut = useMilestoneMutations(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const listHref = `/p/${projectId}/milestones`;

  if (q.isLoading) {
    return (
      <div role="status" aria-label="Loading milestone" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (q.error instanceof ServiceError && q.error.code === 'not_found') {
    return (
      <EmptyState icon={SearchX} title="Milestone not found" description="It may have been deleted."
        action={<Link href={listHref} className={buttonStyles({ variant: 'outline' })}>Back to milestones</Link>} />
    );
  }
  if (q.isError) {
    return <EmptyState tone="error" title="Could not load this milestone" description={q.error.message} action={<Button onClick={() => void q.refetch()}>Retry</Button>} />;
  }
  const d = q.data;
  if (!d) return null;
  const m = d.milestone;
  const openRuns = d.runs.filter((r) => !r.run.is_closed);

  const columns = [
    col.accessor((r) => r.run.name, {
      id: 'run', header: 'Run',
      cell: (c) => <Link href={`/p/${projectId}/runs/${c.row.original.run.id}`} className="rounded-xs font-medium text-accent-text hover:underline">{c.getValue()}</Link>,
    }),
    col.accessor((r) => r.plan_name ?? '', { id: 'plan', header: 'Plan', cell: (c) => c.getValue() || '—' }),
    col.accessor((r) => (r.run.is_closed ? 'Closed' : 'Open'), { id: 'state', header: 'State' }),
    col.accessor((r) => r.progress.counts.passed, {
      id: 'results', header: 'Results',
      cell: (c) => {
        const p = c.row.original.progress.counts;
        return <span className="tabular-nums">{`${p.passed} passed, ${p.failed} failed, ${p.untested} untested`}</span>;
      },
    }),
  ] as ColumnDef<RunSummary, unknown>[];

  const complete = async () => {
    try {
      await mut.complete.mutateAsync(m.id);
      toast.success('Milestone completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete the milestone.');
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Milestones', href: listHref }, { label: m.title }]}
        title={m.title}
        badge={m.is_completed
          ? <Badge tone="neutral">Completed</Badge>
          : d.past_due ? <Badge tone="warning" icon={<AlertTriangle className="size-3.5" aria-hidden />}>Past due</Badge> : null}
        meta={dueText(d)}
        actions={(
          <>
            <Link href={`/p/${projectId}/reports/milestone/${m.id}`} className={buttonStyles({ variant: 'outline' })}>Open report</Link>
            <RoleGate action="milestones.write" blockedReason={m.is_completed ? DISABLED_REASON.completedMilestone : undefined}>
              <Button variant="outline" onClick={() => setEditOpen(true)}>Edit milestone</Button>
            </RoleGate>
            <RoleGate action="milestones.write" blockedReason={m.is_completed ? DISABLED_REASON.completedMilestone : undefined}>
              <Button variant="primary" onClick={() => setCompleteOpen(true)}>Complete milestone</Button>
            </RoleGate>
          </>
        )}
      />

      <div className="space-y-8">
        {m.description ? <p className="max-w-prose text-base text-ink-secondary">{m.description}</p> : null}

        <section aria-labelledby="ms-progress" className="space-y-2">
          <h2 id="ms-progress" className="text-xl font-semibold text-ink">Progress</h2>
          <p className="text-sm text-ink-muted">{progressSummary(d.progress)}</p>
          <MilestoneProgress progress={d.progress} size="sm" />
        </section>

        <section aria-labelledby="ms-runs" className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="ms-runs" className="text-xl font-semibold text-ink">Runs</h2>
            <span className="text-sm text-ink-muted">{`${plural(d.runs.length, 'run')}, ${openRuns.length} open`}</span>
          </div>
          <DataTable
            caption="Runs in this milestone"
            columns={columns}
            data={d.runs}
            rowId={(r) => r.run.id}
            emptyState={(
              <EmptyState title="No runs yet." description="Create a run and attach it to this milestone."
                action={<RoleGate action="runs.write"><Link href={`/p/${projectId}/runs/new`} className={buttonStyles({ variant: 'outline' })}>Create run</Link></RoleGate>} />
            )}
          />
        </section>

        <section aria-labelledby="ms-plans" className="space-y-2">
          <h2 id="ms-plans" className="text-xl font-semibold text-ink">Plans</h2>
          {d.plans.length === 0 ? (
            <p className="text-base text-ink-muted">No plans yet. Plans group runs for one release effort.</p>
          ) : (
            <ul className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
              {d.plans.map((p) => (
                <li key={p.plan.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <Link href={`/p/${projectId}/plans/${p.plan.id}`} className="rounded-xs font-medium text-accent-text hover:underline">{p.plan.name}</Link>
                  <span className="text-sm text-ink-muted">{plural(p.run_count, 'run')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MilestoneFormPanel projectId={projectId} milestone={m} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title={`Complete ${m.title}?`}
        description={openRuns.length
          ? `${plural(openRuns.length, 'run')} still open will stay attached: ${openRuns.map((r) => r.run.name).join(', ')}. The milestone becomes read-only.`
          : 'No runs are open. The milestone becomes read-only.'}
        confirmLabel="Complete milestone"
        onConfirm={complete}
      />
    </>
  );
}
