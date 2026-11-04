'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Lock, Play, Plus, RotateCcw, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import { Button, buttonStyles, Card, DataTable, Input, Select, Tabs, TableSkeleton, toast } from '@/components/ui';
import { useUrlState } from '@/lib/use-url-state';
import { useMediaQuery } from '@/lib/use-media-query';
import { announce } from '@/lib/announcer';
import { useMilestones, usePlans, useRerunFailed, useRuns } from '@/services/hooks';
import type { RunSummary } from '@/services/interfaces';
import { dayLabel } from './format';
import { MiniProgress, RunStateBadge } from './run-bits';

type RunState = 'open' | 'closed' | 'all';

export function RunListScreen() {
  const { projectId } = useProjectContext();
  const url = useUrlState();
  const router = useRouter();
  const phone = useMediaQuery('(max-width: 767px)');
  const canWrite = useCan('runs.write');
  const state = (['open', 'closed', 'all'].includes(url.get('state') ?? '') ? url.get('state') : 'open') as RunState;
  const filters = { projectId, state, milestone: url.get('milestone'), plan: url.get('plan'), assignee: url.get('assignee'), q: url.get('q') ?? '' };
  const runs = useRuns({ projectId, state, milestone: filters.milestone ?? undefined, plan: filters.plan ?? undefined, assignee: filters.assignee ?? undefined, q: filters.q || undefined });
  const milestones = useMilestones(projectId);
  const plans = usePlans(projectId);
  const rerun = useRerunFailed(projectId);
  const [pending, setPending] = useState<string | null>(null);

  const rows = useMemo(() => runs.data ?? [], [runs.data]);
  const assignees = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => { if (r.assignee) m.set(r.assignee.id, r.assignee.name); });
    return [...m].map(([value, label]) => ({ value, label }));
  }, [rows]);
  const filtered = Boolean(filters.milestone || filters.plan || filters.assignee || filters.q);

  const doRerun = (r: RunSummary) => {
    setPending(r.run.id);
    rerun.mutate(r, {
      onSuccess: (out) => { toast.success(`Created a re-run with ${out.count} ${out.count === 1 ? 'test' : 'tests'}.`); announce('Re-run created'); router.push(`/p/${projectId}/runs/${out.run}`); },
      onError: (e) => toast.error(e.message),
      onSettled: () => setPending(null),
    });
  };

  const rerunButton = (r: RunSummary) => {
    const n = r.progress.counts.failed + r.progress.counts.blocked;
    if (n === 0) return null;
    return (
      <RoleGate action="runs.write">
        <Button size="sm" variant="outline" iconLeft={<RotateCcw className="size-4" aria-hidden />} loading={pending === r.run.id} onClick={() => doRerun(r)} aria-label={`Re-run failed for ${r.run.name}`}>Re-run failed</Button>
      </RoleGate>
    );
  };

  const columns = useMemo<ColumnDef<RunSummary, unknown>[]>(() => [
    { id: 'name', header: 'Name', accessorFn: (r) => r.run.name, cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <Link href={`/p/${projectId}/runs/${row.original.run.id}`} className="font-medium text-accent-text hover:underline" onClick={(e) => e.stopPropagation()}>{row.original.run.name}</Link>
        {row.original.run.is_closed ? <span className="inline-flex items-center gap-1 text-sm text-ink-muted"><Lock className="size-3.5" aria-hidden />Closed</span> : null}
      </span>
    ) },
    { id: 'plan', header: 'Plan / milestone', enableSorting: false, cell: ({ row }) => <span className="text-sm text-ink-secondary">{[row.original.plan_name, row.original.milestone_title].filter(Boolean).join(' / ') || '-'}</span> },
    { id: 'build', header: 'Build', accessorFn: (r) => r.run.build ?? '', cell: ({ row }) => <span className="text-sm">{row.original.run.build || '-'}</span> },
    { id: 'assignee', header: 'Assignee', accessorFn: (r) => r.assignee?.name ?? '', cell: ({ row }) => <span className="text-sm">{row.original.assignee?.name ?? 'Unassigned'}</span> },
    { id: 'progress', header: 'Progress', enableSorting: false, cell: ({ row }) => <MiniProgress summary={row.original} /> },
    { id: 'started', header: 'Started', accessorFn: (r) => r.run.started_on ?? '', cell: ({ row }) => <span className="text-sm tabular-nums">{dayLabel(row.original.run.started_on)}</span> },
    { id: 'actions', header: () => <span className="sr-only">Actions</span>, enableSorting: false, cell: ({ row }) => rerunButton(row.original) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projectId, pending]);

  const empty = filtered || state !== 'open'
    ? <EmptyState icon={SearchX} title={filtered ? 'No runs match these filters.' : state === 'closed' ? 'No closed runs yet.' : 'No runs yet.'} description={filtered ? 'Clear a filter to see more runs.' : undefined}
        action={filtered ? <Button variant="outline" onClick={() => url.set({ milestone: null, plan: null, assignee: null, q: null })}>Clear filters</Button> : undefined} />
    : <EmptyState icon={Play} title="No runs yet. Build one from a set of cases." action={canWrite && !phone ? <Link href={`/p/${projectId}/runs/new`} className={buttonStyles({ variant: 'primary' })}>New run</Link> : undefined} />;

  return (
    <>
      <PageHeader
        title="Runs"
        actions={!phone ? (
          <>
          <Link href={`/p/${projectId}/plans`} className={buttonStyles({ variant: 'ghost' })}>Plans</Link>
          <RoleGate action="runs.write">
            <Link href={`/p/${projectId}/runs/new`} className={buttonStyles({ variant: 'primary' })} data-tour="new-run"><Plus className="size-4" aria-hidden />New run</Link>
          </RoleGate>
          </>
        ) : undefined}
        tabs={<Tabs urlParam="state" defaultValue="open" items={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="search">
        <Input aria-label="Search runs" type="search" placeholder="Search runs" className="max-w-xs min-w-48 flex-1" value={filters.q} onChange={(e) => url.set({ q: e.target.value })} />
        <Select aria-label="Milestone" placeholder="Milestone" clearable className="w-44" value={filters.milestone ?? undefined} onChange={(v) => url.set({ milestone: v })} options={(milestones.data ?? []).map((m) => ({ value: m.milestone.id, label: m.milestone.title }))} />
        <Select aria-label="Plan" placeholder="Plan" clearable className="w-44" value={filters.plan ?? undefined} onChange={(v) => url.set({ plan: v })} options={(plans.data ?? []).map((p) => ({ value: p.plan.id, label: p.plan.name }))} />
        <Select aria-label="Assignee" placeholder="Assignee" clearable className="w-40" value={filters.assignee ?? undefined} onChange={(v) => url.set({ assignee: v })} options={assignees} />
      </div>
      {runs.isError ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Runs could not be loaded." description={runs.error.message} action={<Button variant="outline" onClick={() => runs.refetch()}>Retry</Button>} />
      ) : runs.isPending ? (
        <TableSkeleton rows={6} cols={6} />
      ) : phone ? (
        rows.length === 0 ? empty : (
          <ul className="space-y-2" aria-label="Runs">
            {rows.map((r) => (
              <li key={r.run.id}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/p/${projectId}/runs/${r.run.id}`} className="font-medium text-accent-text hover:underline">{r.run.name}</Link>
                    <RunStateBadge closed={r.run.is_closed} />
                  </div>
                  <MiniProgress summary={r} />
                  <p className="text-sm text-ink-muted">{[r.run.build, r.assignee?.name, dayLabel(r.run.started_on)].filter(Boolean).join(' / ')}</p>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : (
        <DataTable caption="Runs" columns={columns} data={rows} rowId={(r) => r.run.id} emptyState={empty} onRowOpen={(r) => router.push(`/p/${projectId}/runs/${r.run.id}`)} />
      )}
    </>
  );
}
