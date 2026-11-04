'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Lock, ScrollText, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan } from '@/components/tb/project-context';
import { PageHeader } from '@/components/shell/page-header';
import { SplitView } from '@/components/shell/split-view';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormField, Input } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Select, type Option } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/lib/use-media-query';
import { useUrlState } from '@/lib/use-url-state';
import { useAudit, useMembers } from '@/services/hooks';
import type { AuditView } from '@/services/interfaces';
import type { AuditLog } from '@/services/types';
import { changedKeys, formatAbsolute, formatRelative } from './format';

/** Action codes the app writes today. Filter options show the code, as the log does. */
const ACTIONS = [
  'project.create', 'project.update', 'member.add', 'member.role_change', 'member.remove',
  'suite.create', 'suite.delete', 'case.create', 'case.update', 'case.delete',
  'run.create', 'run.close', 'result.create', 'result.delete', 'token.create', 'token.revoke',
];
const ACTION_OPTIONS: Option[] = ACTIONS.map((a) => ({ value: a, label: a }));
const PAGE_SIZE = 25;
const col = createColumnHelper<AuditView>();

function summarize(log: AuditLog): string {
  if (!log.before && log.after) return 'Created';
  if (log.before && !log.after) return 'Deleted';
  const keys = changedKeys(log.before, log.after);
  return keys.length ? `Changed ${keys.join(', ')}` : 'No field changes';
}

export function AuditScreen({ projectId }: { projectId: string }) {
  const canView = useCan('audit.view', { writes: false });
  const url = useUrlState();
  const narrow = useMediaQuery('(max-width: 767px)');
  const actor = url.get('actor');
  const action = url.get('action');
  const from = url.get('from') ?? '';
  const to = url.get('to') ?? '';
  const entry = url.get('entry');
  const page = url.getNumber('page', 1);
  const members = useMembers(projectId, canView);
  const filters = canView ? { projectId, actor, action, from: from || undefined, to: to || undefined, page, pageSize: PAGE_SIZE } : undefined;
  const query = useAudit(filters);

  if (!canView) {
    return (
      <>
        <PageHeader title="Audit log" />
        <EmptyState icon={Lock} tone="locked" title="You do not have access to the audit log" description="Only project admins can view it. Ask an admin if you need access." />
      </>
    );
  }

  const rows = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const selected = rows.find((r) => r.log.id === entry) ?? null;
  const filtersSet = !!(actor || action || from || to);
  const actorOptions: Option[] = (members.data ?? []).map((m) => ({ value: m.user.id, label: m.user.name }));

  const columns = [
    col.accessor((v) => v.log.created, {
      id: 'time', header: 'Time',
      cell: (c) => <span title={formatAbsolute(c.getValue())} className="whitespace-nowrap tabular-nums">{formatAbsolute(c.getValue())}</span>,
    }),
    col.accessor((v) => v.actor?.name ?? '', {
      id: 'actor', header: 'Actor',
      cell: (c) => c.getValue() || 'System',
    }),
    col.accessor((v) => v.log.action, { id: 'action', header: 'Action', cell: (c) => <code className="font-mono text-sm">{c.getValue()}</code> }),
    col.accessor((v) => v.log.entity_type, {
      id: 'entity', header: 'Item',
      cell: (c) => <span className="text-ink-secondary">{c.row.original.entity_exists ? `${c.getValue()} ${c.row.original.log.entity_id}` : 'Deleted'}</span>,
    }),
    col.display({ id: 'summary', header: 'Summary', cell: (c) => <span>{summarize(c.row.original.log)}</span> }),
  ] as ColumnDef<AuditView, unknown>[];

  const list = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2" role="search" aria-label="Filter audit log">
        <div className="w-44">
          <FormField label="Actor">
            <Select options={actorOptions} value={actor} onChange={(v) => url.set({ actor: v ?? null, page: null })} placeholder="Anyone" clearable />
          </FormField>
        </div>
        <div className="w-44">
          <FormField label="Action">
            <Select options={ACTION_OPTIONS} value={action} onChange={(v) => url.set({ action: v ?? null, page: null })} placeholder="Any action" clearable />
          </FormField>
        </div>
        <div className="w-40">
          <FormField label="From">
            <Input type="date" value={from} onChange={(e) => url.set({ from: e.target.value || null, page: null })} />
          </FormField>
        </div>
        <div className="w-40">
          <FormField label="To">
            <Input type="date" value={to} onChange={(e) => url.set({ to: e.target.value || null, page: null })} />
          </FormField>
        </div>
        {filtersSet ? <Button variant="ghost" onClick={() => url.set({ actor: null, action: null, from: null, to: null, page: null })}>Clear filters</Button> : null}
      </div>

      {query.isLoading ? (
        <div role="status" aria-label="Loading audit log" className="space-y-2"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>
      ) : query.isError ? (
        <EmptyState tone="error" title="Could not load the audit log" description={query.error.message} action={<Button onClick={() => void query.refetch()}>Retry</Button>} />
      ) : narrow ? (
        <ul className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
          {rows.length === 0 ? null : rows.map((v) => (
            <li key={v.log.id}>
              <button type="button" onClick={() => url.set({ entry: v.log.id })} aria-current={entry === v.log.id ? 'true' : undefined} className="block w-full space-y-1 p-3 text-left hover:bg-sunken">
                <span className="block font-mono text-sm text-ink">{v.log.action}</span>
                <span className="block text-sm text-ink-secondary">{`${v.actor?.name ?? 'System'} · ${formatRelative(v.log.created)}`}</span>
                <span className="block text-sm text-ink-muted">{summarize(v.log)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <DataTable
          caption="Audit log"
          columns={columns}
          data={rows}
          rowId={(v) => v.log.id}
          activeRowId={entry ?? undefined}
          onRowOpen={(v) => url.set({ entry: v.log.id })}
          emptyState={<EmptyState icon={ScrollText} title="No audit entries for these filters." description="Clear a filter to see more entries." />}
        />
      )}

      {total > 0 ? (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} sizes={[PAGE_SIZE]} onChange={(p) => url.set({ page: p === 1 ? null : p })} />
      ) : null}
    </div>
  );

  const detail = selected ? <AuditInspector view={selected} projectId={projectId} onClose={() => url.set({ entry: null })} /> : null;

  return (
    <>
      <PageHeader title="Audit log" meta={query.data ? `${total} ${total === 1 ? 'entry' : 'entries'}. Read-only.` : 'Read-only.'} />
      <SplitView list={list} detail={detail} detailOpen={!!selected} onClose={() => url.set({ entry: null })} storageKey={`tb.audit.split.${projectId}`} />
    </>
  );
}

function AuditInspector({ view, projectId, onClose }: { view: AuditView; projectId: string; onClose: () => void }) {
  const [raw, setRaw] = useState(false);
  const { log } = view;
  const keys = changedKeys(log.before, log.after);
  const b = (log.before ?? {}) as Record<string, unknown>;
  const a = (log.after ?? {}) as Record<string, unknown>;
  const itemLabel = view.entity_exists ? `${log.entity_type} ${log.entity_id}` : 'Deleted';
  return (
    <section aria-labelledby="audit-inspector-title" className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 id="audit-inspector-title" className="font-mono text-lg font-semibold text-ink">{log.action}</h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close details" iconLeft={<X className="size-4" aria-hidden />} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-muted">Time</dt><dd className="tabular-nums">{formatAbsolute(log.created)}</dd>
        <dt className="text-ink-muted">Actor</dt><dd>{view.actor?.name ?? 'System'}</dd>
        <dt className="text-ink-muted">Item</dt>
        <dd>
          {view.entity_exists && log.entity_type === 'case'
            ? <Link href={`/p/${projectId}/cases/${log.entity_id}`} className="rounded-xs text-accent-text hover:underline">{itemLabel}</Link>
            : itemLabel}
        </dd>
        {log.ip ? <><dt className="text-ink-muted">IP</dt><dd className="font-mono">{log.ip}</dd></> : null}
      </dl>

      <section aria-labelledby="audit-changes" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 id="audit-changes" className="text-base font-semibold text-ink">Changes</h3>
          <Button variant="ghost" size="sm" aria-pressed={raw} onClick={() => setRaw((v) => !v)}>{raw ? 'Show fields' : 'Show raw JSON'}</Button>
        </div>
        {raw ? (
          <div className="grid gap-2">
            <pre tabIndex={0} role="region" aria-label="Before" className="overflow-auto rounded-md bg-sunken p-3 font-mono text-xs text-ink-secondary"><span className="text-ink-muted">Before</span>{'\n'}{JSON.stringify(log.before ?? null, null, 2)}</pre>
            <pre tabIndex={0} role="region" aria-label="After" className="overflow-auto rounded-md bg-sunken p-3 font-mono text-xs text-ink-secondary"><span className="text-ink-muted">After</span>{'\n'}{JSON.stringify(log.after ?? null, null, 2)}</pre>
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-ink-muted">No field changes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-muted"><th scope="col" className="py-1 font-medium">Field</th><th scope="col" className="py-1 font-medium">Before</th><th scope="col" className="py-1 font-medium">After</th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k} className="border-t border-subtle align-top">
                  <th scope="row" className="py-1.5 pr-3 text-left font-mono text-xs font-medium text-ink">{k}</th>
                  <td className="py-1.5 pr-3 font-mono text-xs text-status-failed-text">{b[k] === undefined ? '—' : JSON.stringify(b[k])}</td>
                  <td className="py-1.5 font-mono text-xs text-status-passed-text">{a[k] === undefined ? '—' : JSON.stringify(a[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
