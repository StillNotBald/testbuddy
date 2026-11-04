'use client';

import { AlertTriangle, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useProjectContext } from '@/components/tb/project-context';
import { Button, Card, Select, Skeleton, Tabs } from '@/components/ui';
import { useMilestoneReport, useMilestones, useRunChanges, useRunReport, useRuns } from '@/services/hooks';
import type { ChangeKind } from '@/services/interfaces';
import { fmtDuration, passRate, passRateText } from './format';
import { ProgressTable, ReportActions, TrendBlock } from './report-bits';
import { RunProgressBar } from './run-progress-bar';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-6" aria-label={title}><h2 className="mb-2 text-lg font-semibold text-ink">{title}</h2>{children}</section>;
}

export function ReportsIndexScreen() {
  const { projectId } = useProjectContext();
  const router = useRouter();
  const milestones = useMilestones(projectId);
  const runs = useRuns({ projectId, state: 'all' });
  const [tab, setTab] = useState('milestone');
  return (
    <>
      <PageHeader title="Reports" />
      <Tabs value={tab} onValueChange={setTab} items={[
        { value: 'milestone', label: 'Milestone report', content: (
          <div className="mt-3 max-w-md space-y-2">
            {milestones.isPending ? <Skeleton className="h-9 w-full" /> : (milestones.data ?? []).length === 0
              ? <EmptyState icon={BarChart3} title="No milestones yet. Create one to see a milestone report." />
              : <><label htmlFor="rep-ms" className="text-sm font-medium">Milestone</label><Select id="rep-ms" placeholder="Choose a milestone" value={undefined} onChange={(v) => v && router.push(`/p/${projectId}/reports/milestone/${v}`)} options={(milestones.data ?? []).map((m) => ({ value: m.milestone.id, label: m.milestone.title }))} /></>}
          </div>
        ) },
        { value: 'run', label: 'Run summary', content: (
          <ul className="mt-3 divide-y divide-subtle rounded-md border border-subtle bg-surface" aria-label="Runs">
            {(runs.data ?? []).map((r) => <li key={r.run.id}><Link href={`/p/${projectId}/reports/run/${r.run.id}`} className="flex items-center justify-between px-3 py-2 hover:bg-sunken"><span className="font-medium text-accent-text">{r.run.name}</span><span className="text-sm text-ink-muted tabular-nums">{passRateText(r.progress.counts)}</span></Link></li>)}
            {runs.data?.length === 0 ? <li><EmptyState title="No runs yet. Create a run to see its summary." /></li> : null}
          </ul>
        ) },
      ]} />
    </>
  );
}

export function MilestoneReportScreen({ milestoneId }: { milestoneId: string }) {
  const { projectId } = useProjectContext();
  const rep = useMilestoneReport(milestoneId);
  const [by, setBy] = useState<'suite' | 'assignee'>('suite');
  if (rep.isError) return <EmptyState icon={AlertTriangle} tone="error" title="The report could not be loaded." description={rep.error.message} action={<Button variant="outline" onClick={() => rep.refetch()}>Retry</Button>} />;
  if (rep.isPending) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-6 w-full" /><Skeleton className="h-40 w-full" /></div>;
  const r = rep.data;
  const none = r.progress.total === 0 || r.progress.counts.untested === r.progress.total;
  return (
    <>
      <PageHeader title={r.milestone.title} breadcrumbs={[{ label: 'Reports', href: `/p/${projectId}/reports` }, { label: 'Milestone report' }]} meta="Includes runs attached to this milestone in this project." actions={<ReportActions kind="milestone" id={milestoneId} />} />
      <Card className="mb-6 space-y-2">
        <RunProgressBar counts={r.progress.counts} size="lg" showLegend />
        <p className="text-base text-ink">{r.progress.total} tests. Pass rate {passRateText(r.progress.counts)}.</p>
      </Card>
      {none ? <EmptyState icon={BarChart3} title="No results yet for this milestone." /> : null}
      <Section title="By run"><ProgressTable caption="Progress by run" label="Run" rows={r.by_run.map(({ run }) => ({ id: run.run.id, name: run.run.name, progress: run.progress }))} /></Section>
      <Section title={by === 'suite' ? 'By suite' : 'By assignee'}>
        <div role="group" aria-label="Group by" className="mb-2 flex gap-1">
          <Button size="sm" variant={by === 'suite' ? 'primary' : 'outline'} aria-pressed={by === 'suite'} onClick={() => setBy('suite')}>Suite</Button>
          <Button size="sm" variant={by === 'assignee' ? 'primary' : 'outline'} aria-pressed={by === 'assignee'} onClick={() => setBy('assignee')}>Assignee</Button>
        </div>
        <ProgressTable caption={`Progress by ${by}`} label={by === 'suite' ? 'Suite' : 'Assignee'} rows={by === 'suite' ? r.by_suite : r.by_assignee} />
      </Section>
      <Section title="Top failing cases">
        {r.top_failing.length === 0 ? <p className="text-base text-ink-muted">No failures recorded.</p> : (
          <ul className="space-y-1">{r.top_failing.map((f) => <li key={f.case_id} className="text-base"><span className="font-medium tabular-nums">{f.ref}</span> {f.title} <span className="text-ink-muted">({f.failures} {f.failures === 1 ? 'failure' : 'failures'} in {f.runs} {f.runs === 1 ? 'run' : 'runs'})</span></li>)}</ul>
        )}
      </Section>
      <Section title="Pass rate per day"><TrendBlock trend={r.trend} /></Section>
    </>
  );
}

const CHANGE_LABEL: Record<ChangeKind, string> = { fixed: 'Fixed', regressed: 'Regressed', new_failing: 'New failing', still_failing: 'Still failing' };

export function RunReportScreen({ runId }: { runId: string }) {
  const { projectId } = useProjectContext();
  const rep = useRunReport(runId);
  const changes = useRunChanges(runId);
  if (rep.isError) return <EmptyState icon={AlertTriangle} tone="error" title="The report could not be loaded." description={rep.error.message} action={<Button variant="outline" onClick={() => rep.refetch()}>Retry</Button>} />;
  if (rep.isPending) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-6 w-full" /><Skeleton className="h-40 w-full" /></div>;
  const r = rep.data;
  const c = r.progress.counts;
  const rate = passRate(c);
  return (
    <>
      <PageHeader title={r.run.run.name} breadcrumbs={[{ label: 'Reports', href: `/p/${projectId}/reports` }, { label: 'Run summary' }]} meta={[r.run.run.build && `Build ${r.run.run.build}`, r.run.suite_name, r.run.run.is_closed ? 'Closed' : 'Open'].filter(Boolean).join(' / ')} actions={<ReportActions kind="run" id={runId} />} />
      <Card className="mb-6 space-y-2">
        <RunProgressBar counts={c} size="lg" showLegend />
        <p className="text-base text-ink">{r.progress.total} tests. Pass rate {rate.pct === null ? 'is not available until a test has a result' : passRateText(c)}.</p>
        <p className="text-sm text-ink-muted">Pass rate is passed divided by executed tests. Untested tests are left out and blocked tests count as not passed.</p>
      </Card>
      <Section title="Changes since previous run">
        {changes.isPending ? <Skeleton className="h-16 w-full" /> : !changes.data?.previous_run ? <p className="text-base text-ink-muted">No earlier run in this suite to compare with.</p> : (
          <>
            <p className="mb-2 text-sm text-ink-muted">Compared with <Link className="text-accent-text underline" href={`/p/${projectId}/runs/${changes.data.previous_run.id}`}>{changes.data.previous_run.name}</Link>.</p>
            <ul className="mb-2 flex flex-wrap gap-3 text-base tabular-nums" aria-label="Change counts">{(Object.keys(CHANGE_LABEL) as ChangeKind[]).map((k) => <li key={k}>{CHANGE_LABEL[k]} <strong>{changes.data.counts[k]}</strong></li>)}</ul>
            {changes.data.items.length === 0 ? <p className="text-base text-ink-muted">No fixes or regressions.</p> : (
              <table className="w-full text-left text-base"><caption className="sr-only">Changed tests</caption>
                <thead className="text-sm text-ink-muted"><tr><th scope="col" className="py-1 font-medium">Test</th><th scope="col" className="py-1 font-medium">Change</th><th scope="col" className="py-1 font-medium">From</th></tr></thead>
                <tbody>{changes.data.items.map((i) => <tr key={i.test_id} className="border-t border-subtle"><td className="py-1.5"><span className="font-medium tabular-nums">{i.ref}</span> {i.title}</td><td className="py-1.5">{CHANGE_LABEL[i.kind]}</td><td className="py-1.5 capitalize">{i.from}</td></tr>)}</tbody>
              </table>
            )}
          </>
        )}
      </Section>
      <Section title="By section"><ProgressTable caption="Progress by section" label="Section" rows={r.by_section} /></Section>
      <Section title="By assignee"><ProgressTable caption="Progress by assignee" label="Assignee" rows={r.by_assignee} /></Section>
      <Section title="Slowest tests">{r.slowest.length === 0 ? <p className="text-base text-ink-muted">No timings recorded.</p> : <ol className="space-y-1">{r.slowest.map((s, i) => <li key={`${s.test_id}-${i}`} className="text-base"><span className="font-medium tabular-nums">{s.ref}</span> {s.title} <span className="text-ink-muted tabular-nums">{fmtDuration(s.elapsed)}</span></li>)}</ol>}</Section>
      <Section title="Tests with defects">{r.with_defects.length === 0 ? <p className="text-base text-ink-muted">No defects linked.</p> : <ul className="space-y-1">{r.with_defects.map((d, i) => <li key={`${d.test_id}-${i}`} className="text-base"><span className="font-medium tabular-nums">{d.ref}</span> {d.title} <span className="text-ink-muted">{d.defects.join(', ')}</span></li>)}</ul>}</Section>
      <Section title="Pass rate per day"><TrendBlock trend={r.trend} /></Section>
    </>
  );
}
