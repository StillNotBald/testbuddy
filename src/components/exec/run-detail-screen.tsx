'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Lock, Play, RotateCcw, SearchX, UserMinus, UserPlus, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import {
  Button, Card, ConfirmDialog, DataTable, Dialog, FormField, Input, PriorityChip, Skeleton, STATUS_META, StatusBadge, TableSkeleton, Textarea, toast,
} from '@/components/ui';
import { announce } from '@/lib/announcer';
import { useHotkeys } from '@/lib/hotkeys';
import { DISABLED_REASON } from '@/lib/permissions';
import { useUrlState } from '@/lib/use-url-state';
import { useMediaQuery } from '@/lib/use-media-query';
import { useLiveRun, useLiveRunTests, useRerunFailed, useResultMutations, useRunMutations, useSession, useStatuses } from '@/services/hooks';
import type { TestListItem } from '@/services/interfaces';
import type { TestStatusKey } from '@/services/types';
import { absTime, isFlagged, passRateText, REQUIRE_COMMENT_MESSAGE, relTime } from './format';
import { RunStateBadge } from './run-bits';
import { RunProgressBar } from './run-progress-bar';

const CHIPS: Array<{ key: Exclude<TestStatusKey, 'custom'>; n: string }> = [
  { key: 'untested', n: '1' }, { key: 'failed', n: '2' }, { key: 'blocked', n: '3' }, { key: 'retest', n: '4' }, { key: 'passed', n: '5' },
];

export function RunDetailScreen({ runId }: { runId: string }) {
  const { projectId } = useProjectContext();
  const router = useRouter();
  const url = useUrlState();
  const phone = useMediaQuery('(max-width: 767px)');
  const run = useLiveRun(runId);
  const all = useLiveRunTests({ runId });
  const statuses = useStatuses();
  const session = useSession();
  const { close, assign, removeTests } = useRunMutations(projectId);
  const results = useResultMutations(runId, projectId);
  const rerun = useRerunFailed(projectId);
  const canWrite = useCan('runs.write');
  const canExecute = useCan('results.write');

  const statusFilter = url.get('status') as TestStatusKey | undefined;
  const assigneeFilter = url.get('assignee');
  const q = url.get('q') ?? '';
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [closeOpen, setCloseOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'passed' | 'failed' | 'blocked' | 'retest' | null>(null);
  const [bulkComment, setBulkComment] = useState('');
  const [bulkError, setBulkError] = useState<string>();
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const prev = useRef<Map<string, TestStatusKey> | null>(null);

  const items = useMemo(() => all.data?.items ?? [], [all.data]);
  const closed = run.data?.run.is_closed ?? false;

  // live updates: announce and briefly highlight results that arrived from someone else
  useEffect(() => {
    if (!items.length) return;
    const next = new Map(items.map((i) => [i.test.id, i.status_key]));
    if (prev.current) {
      const changed = items.filter((i) => prev.current?.get(i.test.id) !== undefined && prev.current.get(i.test.id) !== i.status_key);
      if (changed.length) {
        announce(changed.slice(0, 3).map((i) => `${i.ref} marked ${STATUS_META[i.status_key === 'custom' ? 'untested' : i.status_key].label}`).join('. '));
        setFresh(new Set(changed.map((i) => i.test.id)));
        const t = setTimeout(() => setFresh(new Set()), 3000);
        prev.current = next;
        return () => clearTimeout(t);
      }
    }
    prev.current = next;
    return undefined;
  }, [items]);

  const visible = useMemo(() => items.filter((i) =>
    (!statusFilter || i.status_key === statusFilter)
    && (!assigneeFilter || (assigneeFilter === 'none' ? !i.test.assigned_to : i.test.assigned_to === assigneeFilter))
    && (!q || i.title.toLowerCase().includes(q.toLowerCase()) || i.ref.toLowerCase().includes(q.toLowerCase()))), [items, statusFilter, assigneeFilter, q]);

  const byAssignee = useMemo(() => {
    const m = new Map<string, { id: string; name: string; left: number; done: number }>();
    items.forEach((i) => {
      const id = i.test.assigned_to ?? 'none';
      const e = m.get(id) ?? { id, name: i.assignee?.name ?? 'Unassigned', left: 0, done: 0 };
      if (i.status_key === 'untested') e.left += 1; else e.done += 1;
      m.set(id, e);
    });
    return [...m.values()].sort((a, b) => b.left - a.left);
  }, [items]);

  const href = (t: TestListItem) => `/p/${projectId}/runs/${runId}/tests/${t.test.id}${statusFilter ? `?status=${statusFilter}` : ''}`;
  const first = (key: TestStatusKey) => visible.find((i) => i.status_key === key) ?? items.find((i) => i.status_key === key);
  const openNext = (key: 'untested' | 'failed') => {
    const t = first(key);
    if (!t) { toast.info(key === 'untested' ? 'No untested tests left in this run.' : 'No failed tests in this run.'); return; }
    router.push(href(t));
  };
  const setStatusFilter = (k: TestStatusKey | null) => url.set({ status: k });

  useHotkeys('Run detail', {
    n: { label: 'Open next untested test', run: () => openNext('untested') },
    'shift+n': { label: 'Open next failed test', run: () => openNext('failed') },
    '1': { label: 'Filter: Untested', run: () => setStatusFilter('untested') },
    '2': { label: 'Filter: Failed', run: () => setStatusFilter('failed') },
    '3': { label: 'Filter: Blocked', run: () => setStatusFilter('blocked') },
    '4': { label: 'Filter: Retest', run: () => setStatusFilter('retest') },
    '5': { label: 'Filter: Passed', run: () => setStatusFilter('passed') },
    '0': { label: 'Show all tests', run: () => setStatusFilter(null) },
  });

  const columns = useMemo<ColumnDef<TestListItem, unknown>[]>(() => [
    { id: 'ref', header: 'Test', cell: ({ row }) => <Link href={href(row.original)} className="font-medium text-accent-text hover:underline" onClick={(e) => e.stopPropagation()}>{row.original.ref}</Link> },
    { id: 'title', header: 'Title', cell: ({ row }) => <span>{row.original.title}</span> },
    { id: 'priority', header: 'Pri', cell: ({ row }) => <PriorityChip priority={row.original.priority} /> },
    { id: 'section', header: 'Section', cell: ({ row }) => <span className="text-sm text-ink-secondary">{row.original.section_name}</span> },
    { id: 'assignee', header: 'Assigned', cell: ({ row }) => <span className="text-sm">{row.original.assignee?.name ?? '-'}</span> },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projectId, runId, statusFilter]);

  if (run.isError) return <EmptyState icon={AlertTriangle} tone="error" title="This run could not be loaded." description={run.error.message} action={<Button variant="outline" onClick={() => run.refetch()}>Retry</Button>} />;
  if (run.isPending) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-full" /><TableSkeleton rows={8} cols={5} /></div>;

  const r = run.data;
  const p = r.progress;
  const untested = p.counts.untested;
  const failedCount = p.counts.failed + p.counts.blocked;
  const selected = [...selection];
  const selectedAnyResult = items.some((i) => selection.has(i.test.id) && i.result_count > 0);
  const closedReason = DISABLED_REASON.closedRun;
  const myId = session.data?.user.id;

  const runBulk = () => {
    const st = statuses.data?.find((s) => s.name.toLowerCase() === bulkStatus);
    if (!st) return;
    if (isFlagged(st) && !bulkComment.trim()) { setBulkError(REQUIRE_COMMENT_MESSAGE); return; }
    results.addMany.mutate({ testIds: selected, statusId: st.id, comment: bulkComment.trim() || undefined }, {
      onSuccess: (n) => { toast.success(`Set ${n} tests to ${st.name}.`); setBulkStatus(null); setBulkComment(''); setBulkError(undefined); setSelection(new Set()); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <>
      <PageHeader
        title={r.run.name}
        badge={<RunStateBadge closed={r.run.is_closed} />}
        breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: r.run.name }]}
        meta={[r.run.build && `Build ${r.run.build}`, r.milestone_title && `Milestone ${r.milestone_title}`, r.plan_name && `Plan ${r.plan_name}`, r.assignee && `Assignee ${r.assignee.name}`, r.suite_name].filter(Boolean).join(' / ')}
        actions={!phone ? (
          <>
            <Button variant="primary" kbd="N" iconLeft={<Play className="size-4" aria-hidden />} disabled={untested === 0 || closed || !canExecute} onClick={() => openNext('untested')} data-tour="start-next">Start next untested</Button>
            {failedCount > 0 ? (
              <RoleGate action="runs.write">
                <Button variant="outline" iconLeft={<RotateCcw className="size-4" aria-hidden />} loading={rerun.isPending} onClick={() => rerun.mutate(r, { onSuccess: (o) => { toast.success(`Created a re-run with ${o.count} tests.`); router.push(`/p/${projectId}/runs/${o.run}`); }, onError: (e) => toast.error(e.message) })}>Re-run failed</Button>
              </RoleGate>
            ) : null}
            <Link href={`/p/${projectId}/reports/run/${runId}`} className="text-base text-accent-text hover:underline">Run summary</Link>
            <RoleGate action="runs.close" blockedReason={closed ? closedReason : undefined}>
              <Button variant="outline" iconLeft={<XCircle className="size-4" aria-hidden />} onClick={() => setCloseOpen(true)}>Close run</Button>
            </RoleGate>
          </>
        ) : undefined}
      />

      {closed ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary">
          <Lock className="size-4 shrink-0" aria-hidden />
          <span>Closed on {absTime(r.run.finished_on)}{r.closed_by_name ? ` by ${r.closed_by_name}` : ''}. Results can no longer be changed.</span>
        </div>
      ) : null}

      <Card className="mb-4 space-y-3">
        <RunProgressBar counts={p.counts} size="lg" showLegend onSegmentClick={(k) => setStatusFilter(statusFilter === k ? null : k)} />
        <p className="text-sm text-ink-secondary tabular-nums">{p.total} tests, {Math.round(p.done_pct)}% done. Pass rate {passRateText(p.counts)}.</p>
        {byAssignee.length > 0 ? (
          <div>
            <h2 className="mb-1 text-sm font-semibold text-ink">Left per assignee</h2>
            <ul className="flex flex-wrap gap-2" aria-label="Tests left per assignee">
              {byAssignee.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => url.set({ assignee: assigneeFilter === a.id ? null : a.id })} aria-pressed={assigneeFilter === a.id} className="rounded-md border border-subtle px-2 py-1 text-sm tabular-nums hover:bg-sunken aria-pressed:border-accent aria-pressed:bg-selected">
                    {a.name}: <strong>{a.left}</strong> left, {a.done} done
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2" role="search">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          <Button size="sm" variant={!statusFilter ? 'primary' : 'outline'} aria-pressed={!statusFilter} onClick={() => setStatusFilter(null)}>All <span className="tabular-nums">{p.total}</span></Button>
          {CHIPS.map((c) => (
            <Button key={c.key} size="sm" variant={statusFilter === c.key ? 'primary' : 'outline'} aria-pressed={statusFilter === c.key} kbd={c.n} onClick={() => setStatusFilter(statusFilter === c.key ? null : c.key)}>
              {STATUS_META[c.key as keyof typeof STATUS_META].label} <span className="tabular-nums">{p.counts[c.key as keyof typeof p.counts]}</span>
            </Button>
          ))}
        </div>
        <Input aria-label="Search tests" type="search" placeholder="Search tests" className="max-w-xs min-w-40 flex-1" value={q} onChange={(e) => url.set({ q: e.target.value })} />
        {assigneeFilter ? <Button size="sm" variant="ghost" onClick={() => url.set({ assignee: null })}>Clear assignee filter</Button> : null}
      </div>

      {selection.size > 0 && !phone ? (
        <div role="region" aria-label="Selection actions" className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-selected px-3 py-2">
          <span className="text-sm font-medium">{selection.size} selected</span>
          <RoleGate action="runs.write" blockedReason={closed ? closedReason : undefined}>
            <Button size="sm" iconLeft={<UserPlus className="size-4" aria-hidden />} onClick={() => assign.mutate({ runId, testIds: selected, userId: myId ?? null }, { onSuccess: () => { toast.success(`Assigned ${selected.length} tests to you.`); setSelection(new Set()); }, onError: (e) => toast.error(e.message) })}>Assign to me</Button>
          </RoleGate>
          <RoleGate action="runs.write" blockedReason={closed ? closedReason : undefined}>
            <Button size="sm" iconLeft={<UserMinus className="size-4" aria-hidden />} onClick={() => assign.mutate({ runId, testIds: selected, userId: null }, { onSuccess: () => setSelection(new Set()), onError: (e) => toast.error(e.message) })}>Unassign</Button>
          </RoleGate>
          <RoleGate action="results.write" blockedReason={closed ? closedReason : undefined}>
            <span role="group" aria-label="Set status" className="inline-flex gap-1">
              {(['passed', 'failed', 'blocked', 'retest'] as const).map((k) => <Button key={k} size="sm" onClick={() => setBulkStatus(k)}>{STATUS_META[k].label}</Button>)}
            </span>
          </RoleGate>
          <RoleGate action="runs.write" blockedReason={closed ? closedReason : selectedAnyResult ? 'Tests with results cannot be removed from an open run.' : undefined}>
            <Button size="sm" variant="danger" onClick={() => removeTests.mutate({ id: runId, testIds: selected }, { onSuccess: (n) => { toast.success(`Removed ${n} tests from the run.`); setSelection(new Set()); }, onError: (e) => toast.error(e.message) })}>Remove from run</Button>
          </RoleGate>
          <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())}>Clear selection</Button>
        </div>
      ) : null}

      {all.isError ? (
        <EmptyState icon={AlertTriangle} tone="error" title="Tests could not be loaded." description={all.error.message} action={<Button variant="outline" onClick={() => all.refetch()}>Retry</Button>} />
      ) : all.isPending ? <TableSkeleton rows={8} cols={6} /> : phone ? (
        visible.length === 0 ? <EmptyState icon={SearchX} title="No tests match this filter." /> : (
          <ul className="space-y-2" aria-label="Tests">
            {visible.map((i) => (
              <li key={i.test.id}>
                <Link href={href(i)} className="block rounded-md border border-subtle bg-surface p-3">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium text-accent-text">{i.ref}</span><StatusBadge status={i.status} /></div>
                  <p className="mt-1 text-base text-ink">{i.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <DataTable
          caption="Tests in this run" columns={columns} data={visible} rowId={(t) => t.test.id} selectable={canWrite || canExecute} selection={selection} onSelectionChange={setSelection}
          onRowOpen={(t) => router.push(href(t))} density="compact"
          rowClassName={(t) => (fresh.has(t.test.id) ? 'bg-selected' : undefined)}
          emptyState={items.length === 0
            ? <EmptyState title="This run has no tests." description="Include-all runs need at least one active case in the suite." />
            : <EmptyState icon={SearchX} title="No tests match this filter." action={<Button variant="outline" onClick={() => url.set({ status: null, assignee: null, q: null })}>Clear filters</Button>} />}
        />
      )}
      {all.data ? <p className="mt-2 text-sm text-ink-muted" aria-live="off">Updated {relTime(new Date(all.dataUpdatedAt).toISOString())}. Updates every few seconds while this page is open.</p> : null}

      <ConfirmDialog
        open={closeOpen} onOpenChange={setCloseOpen} title={`Close run "${r.run.name}"?`} tone="danger" confirmLabel="Close run"
        description={`Closing is permanent. ${untested} ${untested === 1 ? 'test is' : 'tests are'} untested and will stay untested.`}
        onConfirm={async () => { await close.mutateAsync(runId); toast.success('Run closed.'); }}
      />
      <Dialog open={bulkStatus !== null} onOpenChange={(o) => { if (!o) { setBulkStatus(null); setBulkError(undefined); } }} title={`Set ${selection.size} tests to ${bulkStatus ? STATUS_META[bulkStatus].label : ''}`}
        footer={<><Button onClick={() => setBulkStatus(null)}>Cancel</Button><Button variant="primary" loading={results.addMany.isPending} onClick={runBulk}>Set status</Button></>}>
        <FormField label="Comment" hint="Required for Failed and Blocked." error={bulkError}><Textarea value={bulkComment} onChange={(e) => setBulkComment(e.target.value)} rows={3} /></FormField>
      </Dialog>
    </>
  );
}
