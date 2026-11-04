'use client';

import { AlertTriangle, Flag } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { RoleGate } from '@/components/tb/role-gate';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useUrlParam } from '@/lib/use-url-state';
import { useMilestones } from '@/services/hooks';
import type { MilestoneSummary } from '@/services/interfaces';
import { dueText, plural } from './format';
import { MilestoneFormPanel } from './milestone-form';
import { MilestoneProgress } from './milestone-progress';

export function MilestonesScreen({ projectId }: { projectId: string }) {
  const query = useMilestones(projectId);
  const [tab, setTab] = useUrlParam('state', 'open');
  const [formOpen, setFormOpen] = useState(false);
  const all = query.data ?? [];
  const openList = all.filter((s) => !s.milestone.is_completed);
  const doneList = all.filter((s) => s.milestone.is_completed);

  const newButton = (
    <RoleGate action="milestones.write">
      <Button variant="primary" onClick={() => setFormOpen(true)}>New milestone</Button>
    </RoleGate>
  );

  let panel: ReactNode = null;
  if (query.isLoading) {
    panel = (
      <div role="status" aria-label="Loading milestones" className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
        {[0, 1, 2].map((i) => <div key={i} className="space-y-2 p-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-2 w-full" /></div>)}
      </div>
    );
  } else if (query.isError) {
    panel = <EmptyState tone="error" title="Could not load milestones" description={query.error.message} action={<Button onClick={() => void query.refetch()}>Retry</Button>} />;
  }

  const renderList = (list: MilestoneSummary[], emptyTitle: string, emptyDescription: string, showNew: boolean) => {
    if (panel) return panel;
    if (list.length === 0) {
      return <EmptyState icon={Flag} title={emptyTitle} description={emptyDescription} action={showNew ? newButton : undefined} />;
    }
    return (
      <ul data-tour="milestones-list" className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
        {list.map((s) => <MilestoneRow key={s.milestone.id} s={s} projectId={projectId} />)}
      </ul>
    );
  };

  return (
    <>
      <PageHeader
        title="Milestones"
        meta={query.data ? `${openList.length} open, ${doneList.length} completed` : undefined}
        actions={newButton}
      />
      <Tabs
        value={tab === 'completed' ? 'completed' : 'open'}
        onValueChange={(v) => setTab(v)}
        items={[
          {
            value: 'open', label: 'Open', count: query.data ? openList.length : undefined,
            content: renderList(openList, 'No milestones. Group runs under a release goal.', 'Create a milestone to track a release or date goal.', true),
          },
          {
            value: 'completed', label: 'Completed', count: query.data ? doneList.length : undefined,
            content: renderList(doneList, 'No completed milestones yet.', 'Completed milestones stay here, read-only.', false),
          },
        ]}
      />
      <MilestoneFormPanel projectId={projectId} open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}

function MilestoneRow({ s, projectId }: { s: MilestoneSummary; projectId: string }) {
  const { milestone: m } = s;
  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Link href={`/p/${projectId}/milestones/${m.id}`} className="rounded-xs text-lg font-semibold text-ink hover:underline">{m.title}</Link>
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          {s.past_due ? (
            <span className="inline-flex items-center gap-1 font-medium text-status-blocked-text"><AlertTriangle className="size-3.5" aria-hidden />Past due</span>
          ) : null}
          <span>{dueText(s)}</span>
        </div>
      </div>
      <MilestoneProgress progress={s.progress} />
      <p className="text-sm text-ink-muted">
        {`${plural(s.run_count, 'run')}, ${plural(s.plan_count, 'plan')}, ${plural(s.test_count, 'test')}, ${s.failed_count} failed`}
      </p>
    </li>
  );
}
