'use client';

import { AlertTriangle, Megaphone, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectContext, useProjectRole } from '@/components/tb/project-context';
import { EmptyState } from '@/components/tb/empty-state';
import { useProjectOverview } from '@/services/hooks';
import { plural, percent, relativeTime } from './format';
import { GatedLink } from './gated-link';
import { ProgressBar } from './progress-bar';

const DISMISS_KEY = (id: string) => `testbuddy.announcement.dismissed.${id}`;
function readDismissed(id: string, text: string): boolean {
  try { return window.localStorage.getItem(DISMISS_KEY(id)) === text; } catch { return false; }
}
function writeDismissed(id: string, text: string): void {
  try { window.localStorage.setItem(DISMISS_KEY(id), text); } catch { /* per-viewer convenience only */ }
}

/** Project overview (DESIGN.md 6.3). Every state: loading, error, empty runs, no milestone, viewer. */
export function ProjectOverviewScreen({ projectId }: { projectId: string }) {
  const { archived } = useProjectContext();
  const role = useProjectRole();
  const q = useProjectOverview(projectId);
  const d = q.data;
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const announcementText = d?.project.announcement;
  const showAnnouncement = !!announcementText && !readDismissed(projectId, announcementText) && dismissedFor !== announcementText;

  if (q.isError) {
    return <EmptyState tone="error" title="Could not load the overview" description={q.error.message} action={<Button onClick={() => void q.refetch()}>Retry</Button>} />;
  }

  const title = d ? (
    <span className="inline-flex items-center gap-2">{d.project.name}</span>
  ) : <Skeleton className="h-7 w-56" />;
  return (
    <>
      <PageHeader
        title={title}
        badge={d ? <Badge tone="neutral" className="font-mono">{d.project.ref_prefix}</Badge> : undefined}
        meta={d ? `${plural(d.case_count, 'active case')}${archived ? ' · archived' : ''}` : undefined}
        actions={
          <>
            <GatedLink action="runs.write" href={`/p/${projectId}/runs/new`}>New run</GatedLink>
            <GatedLink action="cases.write" href={`/p/${projectId}/cases/new`} variant="outline">New case</GatedLink>
          </>
        }
      />

      {showAnnouncement && announcementText ? (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-md border border-subtle bg-selected px-3 py-2 text-base text-ink">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
          <p className="flex-1">{announcementText}</p>
          <Button variant="ghost" size="sm" aria-label="Dismiss announcement" onClick={() => { writeDismissed(projectId, announcementText); setDismissedFor(announcementText); }}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      <div data-tour="overview-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {d ? (
          <>
            <StatCard label="Cases" value={d.case_count} delta={`+${d.cases_added_7d} this week`} href={`/p/${projectId}/cases`} />
            <StatCard label="Open runs" value={d.open_runs} delta={d.open_runs ? 'Still in progress' : 'None open'} href={`/p/${projectId}/runs`} />
            <StatCard label="Pass rate, 7 days" value={percent(d.pass_rate_7d)} delta={d.pass_rate_7d === null ? 'No results in the last 7 days' : 'Passed ÷ executed'} />
            <StatCard label="Failing tests" value={d.failing_tests} delta="In open runs" href={`/p/${projectId}/runs`} />
          </>
        ) : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>

      {d?.active_milestone ? (
        <Card data-tour="overview-milestone" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wide text-ink-muted">Active milestone</div>
            <div className="font-semibold text-ink">{d.active_milestone.milestone.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-ink-secondary">
              {d.active_milestone.days_left === null ? 'No due date' : d.active_milestone.days_left < 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-status-failed-text"><AlertTriangle className="size-3.5" aria-hidden />Past due by {plural(-d.active_milestone.days_left, 'day')}</span>
              ) : d.active_milestone.days_left === 0 ? 'Due today' : `Due in ${plural(d.active_milestone.days_left, 'day')}`}
              <span className="text-ink-muted">· {percent(d.active_milestone.progress.done_pct)} done</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:w-72">
            <ProgressBar progress={d.active_milestone.progress} className="flex-1" />
            <Link href={`/p/${projectId}/milestones/${d.active_milestone.milestone.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>Open milestone</Link>
          </div>
        </Card>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Open runs</CardTitle></CardHeader>
          {!d ? <Skeleton className="h-24" /> : d.open_run_list.length === 0 ? (
            <p className="text-base text-ink-muted">No open runs. <Link href={`/p/${projectId}/cases`} className="text-accent-text underline">Create one from the repository.</Link></p>
          ) : (
            <ul className="divide-y divide-subtle">
              {d.open_run_list.map((r) => (
                <li key={r.run.id} className="space-y-1 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/p/${projectId}/runs/${r.run.id}`} className="truncate font-medium text-ink hover:underline">{r.run.name}</Link>
                    <span className="shrink-0 text-sm tabular-nums text-ink-secondary">{percent(r.progress.done_pct)} · {r.progress.counts.failed} failed</span>
                  </div>
                  <ProgressBar progress={r.progress} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          {!d ? <Skeleton className="h-24" /> : d.activity.length === 0 ? (
            <p className="text-base text-ink-muted">No activity yet. Changes to cases, runs and results show up here.</p>
          ) : (
            <ul className="space-y-2">
              {d.activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 text-base">
                  <span className="text-ink"><span className="font-medium">{a.actor?.name ?? 'System'}</span> {a.text}</span>
                  <time dateTime={a.at} className="shrink-0 text-sm text-ink-muted">{relativeTime(a.at)}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {role && role !== 'viewer' ? (
          <Card className="flex flex-col gap-3">
            <CardHeader className="mb-0"><CardTitle>My assigned tests</CardTitle></CardHeader>
            {!d ? <Skeleton className="h-10" /> : d.my_assigned.count > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base text-ink">{plural(d.my_assigned.count, 'untested test')} assigned to you in open runs.</p>
                {d.my_assigned.next_run_id && d.my_assigned.next_test_id ? (
                  <Link href={`/p/${projectId}/runs/${d.my_assigned.next_run_id}/tests/${d.my_assigned.next_test_id}`} className={buttonStyles({ variant: 'primary', size: 'md' })}>Start next untested</Link>
                ) : null}
              </div>
            ) : <p className="text-base text-ink-muted">Nothing assigned to you in open runs.</p>}
          </Card>
        ) : null}

        <Card className="flex flex-col gap-3">
          <CardHeader className="mb-0"><CardTitle>Go to</CardTitle></CardHeader>
          <nav aria-label="Project sections" className="flex flex-wrap gap-2">
            {[
              ['Repository', 'cases'], ['Milestones', 'milestones'], ['Runs', 'runs'], ['Reports', 'reports'], ['Automation', 'automation'],
            ].map(([label, path]) => (
              <Link key={path} href={`/p/${projectId}/${path}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>{label}</Link>
            ))}
          </nav>
        </Card>
      </div>
    </>
  );
}
