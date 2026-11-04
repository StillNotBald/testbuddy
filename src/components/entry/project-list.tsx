'use client';

import { Archive, Plus, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonStyles, Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useActiveWorkspace } from '@/lib/active-workspace';
import { can, ROLE_LABEL } from '@/lib/permissions';
import { useCreateSampleProject, useProjects, useSession } from '@/services/hooks';
import { ServiceError, type ProjectSummary } from '@/services/interfaces';
import { useUrlParam } from '@/lib/use-url-state';
import { EmptyState } from '@/components/tb/empty-state';
import { absoluteTime, percent, plural, relativeTime } from './format';
import { FirstRunChoices } from './first-run';
import { NewProjectDialog } from './new-project-dialog';
import { ProgressBar } from './progress-bar';

/** Projects in the active workspace (DESIGN.md 6.2). Rows, search, archived toggle, and the D-7 first run. */
export function ProjectList({ openNew = false }: { openNew?: boolean }) {
  const router = useRouter();
  const { workspace, isLoading: wsLoading } = useActiveWorkspace();
  const session = useSession();
  const [q, setQ] = useUrlParam('q', '');
  const [archivedParam, setArchivedParam] = useUrlParam('archived', '0');
  const showArchived = archivedParam === '1';
  const [newOpen, setNewOpen] = useState(openNew);
  const [importing, setImporting] = useState(false);
  const createSample = useCreateSampleProject();

  const everything = useProjects(workspace?.id, { includeArchived: true });
  const rows = useProjects(workspace?.id, { includeArchived: showArchived, q: q.trim() || undefined });

  const all: ProjectSummary[] = everything.data ?? [];
  const wsAdmin = session.data?.workspace_role === 'admin';
  // Same rule as the service: workspace admins, or anyone who is admin or manager in some project.
  const canCreate = wsAdmin || all.some((p) => can(p.my_role, 'project.create'));

  const goToProject = (id: string, afterCreate: 'overview' | 'settings') => router.push(afterCreate === 'settings' ? `/p/${id}/settings` : `/p/${id}`);

  const newButton = canCreate ? (
    <Button variant="primary" iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => { setImporting(false); setNewOpen(true); }}>New project</Button>
  ) : null;

  return (
    <>
      <PageHeader title="Projects" meta={workspace ? `Workspace: ${workspace.name}` : undefined} actions={newButton} />

      {everything.isError ? (
        <EmptyState tone="error" title="Could not load projects" description={everything.error.message} action={<Button onClick={() => void everything.refetch()}>Retry</Button>} />
      ) : everything.isLoading || wsLoading ? (
        <div role="status" aria-label="Loading projects" className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="flex h-14 items-center gap-4 px-4"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-3 flex-1" /></div>)}
        </div>
      ) : all.length === 0 ? (
        canCreate ? (
          <FirstRunChoices
            onImport={() => { setImporting(true); setNewOpen(true); }}
            onEmpty={() => { setImporting(false); setNewOpen(true); }}
            sampleBusy={createSample.isPending}
            onSample={() => {
              if (!workspace) return;
              createSample.mutate(workspace.id, {
                onSuccess: (p) => { toast.success('Sample project created. Labelled "Sample" in its name.'); router.push(`/p/${p.id}`); },
                onError: (err) => toast.error(err instanceof ServiceError ? err.message : 'Could not create the sample project. Try again.'),
              });
            }}
          />
        ) : (
          <EmptyState title="You are not in any project yet" description="Ask an admin to add you to a project." />
        )
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <Input type="search" aria-label="Search projects" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value || null)} className="pl-8" />
            </div>
            <label className="inline-flex min-h-8 items-center gap-2 text-base text-ink pointer-coarse:min-h-11">
              <Checkbox checked={showArchived} onCheckedChange={(v) => setArchivedParam(v === true ? '1' : null)} aria-label="Show archived" />
              Show archived
            </label>
          </div>

          {rows.isError ? (
            <EmptyState tone="error" title="Could not load projects" description={rows.error.message} action={<Button onClick={() => void rows.refetch()}>Retry</Button>} />
          ) : rows.data && rows.data.length === 0 ? (
            q.trim() ? (
              <EmptyState icon={SearchX} title="No projects match this search" description={`Nothing matches "${q.trim()}".`} action={<Button onClick={() => setQ(null)}>Clear search</Button>} />
            ) : (
              <EmptyState icon={Archive} title="All your projects are archived" description="Turn on Show archived to see them." action={<Button onClick={() => setArchivedParam('1')}>Show archived</Button>} />
            )
          ) : (
            <ul aria-label="Projects" className="divide-y divide-subtle overflow-hidden rounded-md border border-subtle bg-surface">
              {(rows.data ?? []).map((row) => <ProjectRow key={row.project.id} row={row} />)}
            </ul>
          )}
        </>
      )}

      {workspace ? (
        <NewProjectDialog
          open={newOpen}
          onOpenChange={(o) => { setNewOpen(o); if (!o) setImporting(false); }}
          workspaceId={workspace.id}
          onCreated={(p) => { setNewOpen(false); goToProject(p.id, importing ? 'settings' : 'overview'); }}
        />
      ) : null}
    </>
  );
}

function ProjectRow({ row }: { row: ProjectSummary }) {
  const { project, my_role, case_count, open_runs, latest_run, last_activity } = row;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_auto] md:items-center md:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{project.name}</span>
          <Badge tone="neutral" className="font-mono">{project.ref_prefix}</Badge>
          {project.is_archived ? <Badge tone="warning" icon={<Archive className="size-3.5" aria-hidden />}>Archived</Badge> : null}
        </div>
        <div className="mt-0.5 text-sm text-ink-muted md:hidden">Last activity {relativeTime(last_activity)}</div>
      </div>
      <div className="text-sm"><span className="text-ink-muted md:hidden">My role: </span>{my_role ? <Badge tone="accent">{ROLE_LABEL[my_role]}</Badge> : <span className="text-ink-muted">No role</span>}</div>
      <div className="text-sm text-ink tabular-nums"><span className="text-ink-muted md:hidden">Cases: </span>{plural(case_count, 'case')}</div>
      <div className="text-sm text-ink tabular-nums"><span className="text-ink-muted md:hidden">Open runs: </span>{open_runs}</div>
      <div className="min-w-0 text-sm">
        {latest_run ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2"><span className="truncate text-ink-secondary">{latest_run.name}</span><span className="tabular-nums text-ink-muted">{percent(latest_run.progress.done_pct)}</span></div>
            <ProgressBar progress={latest_run.progress} />
          </div>
        ) : <span className="text-ink-muted">No runs yet</span>}
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <span title={last_activity ? absoluteTime(last_activity) : undefined} className="hidden text-sm text-ink-muted md:inline">{relativeTime(last_activity)}</span>
        <Link href={`/p/${project.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>Open {project.name}</Link>
      </div>
    </li>
  );
}
