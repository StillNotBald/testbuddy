'use client';

import { AlertTriangle, GitCompare, Minus, Plus, RotateCcw, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import { Badge, Button, buttonStyles, Checkbox, ConfirmDialog, Skeleton, toast } from '@/components/ui';
import { announce } from '@/lib/announcer';
import { useUrlState } from '@/lib/use-url-state';
import { cn } from '@/lib/utils';
import { useCase, useCaseMutations, useCaseTypes, useCaseVersions, usePriorities } from '@/services/hooks';
import { ServiceError, type VersionView } from '@/services/interfaces';
import { absWhen, diffLines, snapshotLines, viewOf, when } from './repo-utils';

export function CaseHistoryScreen() {
  const { projectId } = useProjectContext();
  const { caseId } = useParams<{ caseId: string }>();
  const url = useUrlState();
  const c = useCase(caseId);
  const versions = useCaseVersions(caseId);
  const priorities = usePriorities();
  const types = useCaseTypes();
  const muts = useCaseMutations(projectId);
  const [restoring, setRestoring] = useState<VersionView | null>(null);
  const back = `/p/${projectId}/cases`;

  const a = url.getNumber('a', 0);
  const b = url.getNumber('b', 0);
  const picked = [a, b].filter(Boolean);

  const names = useMemo(() => ({
    priority: (id: string) => priorities.data?.find((p) => p.id === id)?.short_name ?? '',
    type: (id: string) => types.data?.find((t) => t.id === id)?.name ?? '',
  }), [priorities.data, types.data]);

  const error = c.error ?? versions.error;
  if (error) {
    const missing = error instanceof ServiceError && error.code === 'not_found';
    return missing
      ? <EmptyState icon={SearchX} title="Not found" description="This case does not exist or was deleted." action={<Link href={back} className={buttonStyles({ variant: 'outline' })}>Back to cases</Link>} />
      : <EmptyState icon={AlertTriangle} tone="error" title="History could not be loaded." description={error.message} action={<Button variant="outline" onClick={() => { void c.refetch(); void versions.refetch(); }}>Retry</Button>} />;
  }
  if (!c.data || !versions.data) return <div role="status" aria-label="Loading history" className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;

  const list = versions.data;
  const current = c.data.case.version;
  const byNo = (n: number) => list.find((v) => v.version.version === n);
  const older = Math.min(...picked);
  const newer = Math.max(...picked);
  const from = picked.length === 2 ? byNo(older) : undefined;
  const to = picked.length === 2 ? byNo(newer) : undefined;

  const togglePick = (n: number, on: boolean) => {
    const set = new Set(picked);
    if (on) { if (set.size >= 2) set.delete([...set][0] as number); set.add(n); } else set.delete(n);
    const [x, y] = [...set];
    url.set({ a: x ?? null, b: y ?? null });
  };

  const diff = from && to
    ? diffLines(snapshotLines(viewOf(from.version), names), snapshotLines(viewOf(to.version), names))
    : null;
  const changed = diff ? diff.filter((l) => l.kind !== 'same').length : 0;

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2">{c.data.case.ref}<Badge size="md">v{current}</Badge></span>}
        meta={`Version history. ${c.data.case.title}`}
        breadcrumbs={[{ label: 'Cases', href: back }, { label: c.data.case.ref, href: `/p/${projectId}/cases/${caseId}` }, { label: 'History' }]}
        actions={<Link href={`/p/${projectId}/cases/${caseId}`} className={buttonStyles({ variant: 'outline' })}>Back to case</Link>}
      />
      {list.length === 0 ? (
        <EmptyState title="No versions yet." description="A version is saved each time the case is edited." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <section aria-labelledby="versions-h">
            <h2 id="versions-h" className="mb-2 text-base font-semibold text-ink">{list.length} {list.length === 1 ? 'version' : 'versions'}</h2>
            <p className="mb-2 text-sm text-ink-muted">Select two versions to compare them.</p>
            <ul className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
              {list.map((v) => {
                const n = v.version.version;
                return (
                  <li key={v.version.id} className="space-y-1 p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox aria-label={`Select v${n} to compare`} checked={picked.includes(n)} onCheckedChange={(x) => togglePick(n, x === true)} />
                      <span className="font-semibold text-ink">v{n}</span>
                      {n === current ? <Badge tone="accent">Current</Badge> : null}
                      <span className="ml-auto text-sm text-ink-muted"><time dateTime={v.version.created} title={absWhen(v.version.created)}>{when(v.version.created)}</time></span>
                    </div>
                    <p className="pl-6 text-sm text-ink-secondary">{v.saved_by?.name ?? 'Unknown'}</p>
                    {v.version.note ? <p className="pl-6 text-sm text-ink-muted">{v.version.note}</p> : null}
                    <div className="flex flex-wrap gap-1 pl-5">
                      {n !== current ? <Button size="sm" variant="ghost" iconLeft={<GitCompare className="size-4" aria-hidden />} aria-label={`Compare v${n} with current`} onClick={() => url.set({ a: n, b: current })}>Compare with current</Button> : null}
                      {n !== current ? (
                        <RoleGate action="cases.write">
                          <Button size="sm" variant="ghost" iconLeft={<RotateCcw className="size-4" aria-hidden />} aria-label={`Restore v${n} as new version`} onClick={() => setRestoring(v)}>Restore as new version</Button>
                        </RoleGate>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-labelledby="diff-h" aria-live="polite">
            <h2 id="diff-h" className="mb-2 text-base font-semibold text-ink">{from && to ? `Changes from v${older} to v${newer}` : 'Compare'}</h2>
            {!diff ? (
              <EmptyState icon={GitCompare} title="Pick two versions to see what changed." description="Use the checkboxes, or choose Compare with current on any version." className="py-8" />
            ) : changed === 0 ? (
              <p className="rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary">No differences between v{older} and v{newer}.</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-ink-muted">{changed} {changed === 1 ? 'line' : 'lines'} changed.</p>
                <ul aria-label={`Differences between v${older} and v${newer}`} className="overflow-hidden rounded-md border border-subtle bg-surface font-mono text-sm">
                  {diff.map((l, i) => (
                    <li key={i} className={cn('flex gap-2 px-3 py-1', l.kind === 'add' && 'bg-status-passed-bg text-status-passed-text', l.kind === 'del' && 'bg-status-failed-bg text-status-failed-text', l.kind === 'same' && 'text-ink-secondary')}>
                      <span aria-hidden className="w-4 shrink-0">{l.kind === 'add' ? <Plus className="size-4" /> : l.kind === 'del' ? <Minus className="size-4" /> : null}</span>
                      <span className="sr-only">{l.kind === 'add' ? 'Added: ' : l.kind === 'del' ? 'Removed: ' : 'Unchanged: '}</span>
                      <span className={cn('min-w-0 break-words whitespace-pre-wrap', l.kind === 'del' && 'line-through')}>{l.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={restoring !== null}
        onOpenChange={(o) => { if (!o) setRestoring(null); }}
        title={`Restore v${restoring?.version.version ?? ''} as a new version?`}
        description={`This saves the contents of v${restoring?.version.version ?? ''} as v${current + 1}. Existing versions and results are not changed.`}
        confirmLabel={`Restore as v${current + 1}`}
        onConfirm={async () => {
          const n = restoring?.version.version as number;
          try { await muts.restore.mutateAsync({ id: caseId, version: n }); toast.success(`Restored v${n} as v${current + 1}.`); announce(`Restored v${n} as a new version`); url.set({ a: null, b: null }); } catch (e) { toast.error((e as Error).message); }
        }}
      />
    </>
  );
}
