'use client';

import { AlertTriangle, History, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { RoleGate } from '@/components/tb/role-gate';
import { AutomationChip, Badge, buttonStyles, Button, PriorityChip, Skeleton, StatusBadge, TagChip, Tabs } from '@/components/ui';
import { useCase, useCaseUsage, useCaseVersions, useCaseTypes, usePriorities, useTags } from '@/services/hooks';
import type { Id } from '@/services/types';
import { absWhen, estimateText, when } from './repo-utils';

export interface CaseInspectorProps {
  projectId: Id;
  caseId: Id;
}

/** Read view of one case: details, steps with expected results, recent results, history and usage. */
export function CaseInspector({ projectId, caseId }: CaseInspectorProps) {
  const q = useCase(caseId);
  const priorities = usePriorities();
  const types = useCaseTypes();
  const tags = useTags(projectId);
  const [tab, setTab] = useState('details');

  if (q.isPending) {
    return (
      <div role="status" aria-label="Loading case" className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (q.isError) {
    return <EmptyState icon={AlertTriangle} tone="error" title="This case could not be loaded." description={q.error.message} action={<Button variant="outline" onClick={() => q.refetch()}>Retry</Button>} className="py-6" />;
  }
  const { case: c, steps, tag_ids, section_name, suite_name } = q.data;
  const pri = priorities.data?.find((p) => p.id === c.priority);
  const type = types.data?.find((t) => t.id === c.type);

  return (
    <div className="space-y-3" data-testid="case-inspector">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-ink-secondary">{c.ref}</span>
          <Badge>v{c.version}</Badge>
          {c.deprecated ? <Badge tone="warning">Deprecated</Badge> : null}
        </div>
        <RoleGate action="cases.write" mode="hide">
          <Link href={`/p/${projectId}/cases/${c.id}`} className={buttonStyles({ size: 'sm', variant: 'outline' })} data-testid="inspector-edit"><Pencil className="size-4" aria-hidden />Edit</Link>
        </RoleGate>
      </div>
      <h2 className="text-xl font-semibold text-ink">{c.title}</h2>
      {c.deprecated && c.deprecated_reason ? <p className="text-sm text-ink-muted">{c.deprecated_reason}</p> : null}
      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'details', label: 'Details', content: <Details projectId={projectId} caseId={c.id} body={(
            <>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-base">
                <dt className="text-ink-muted">Priority</dt><dd><PriorityChip priority={pri} /> {pri ? <span className="text-ink-secondary">{pri.name}</span> : null}</dd>
                <dt className="text-ink-muted">Type</dt><dd>{type?.name ?? '-'}</dd>
                <dt className="text-ink-muted">Automation</dt><dd><AutomationChip value={c.automation_status} /></dd>
                <dt className="text-ink-muted">Estimate</dt><dd>{estimateText(c.estimate)}</dd>
                <dt className="text-ink-muted">Location</dt><dd>{suite_name} / {section_name}</dd>
                {c.refs ? (<><dt className="text-ink-muted">Refs</dt><dd className="font-mono text-sm">{c.refs}</dd></>) : null}
                <dt className="text-ink-muted">Tags</dt>
                <dd className="flex flex-wrap gap-1">
                  {tag_ids.length === 0 ? <span className="text-ink-muted">None</span> : tag_ids.map((id) => { const t = tags.data?.find((x) => x.id === id); return t ? <TagChip key={id} name={t.name} color={t.color} /> : null; })}
                </dd>
              </dl>
              {c.content ? (<section className="mt-4"><h3 className="mb-1 text-sm font-semibold text-ink">Preconditions</h3><p className="text-base whitespace-pre-wrap text-ink-secondary">{c.content}</p></section>) : null}
              <section className="mt-4">
                <h3 className="mb-1 text-sm font-semibold text-ink">Steps</h3>
                {steps.length === 0 ? <p className="text-base text-ink-muted">This case has no steps yet.</p> : (
                  <ol className="space-y-2 pl-5 text-base marker:text-ink-muted">
                    {steps.map((s) => (
                      <li key={s.id}>
                        <p className="text-ink">{s.description}</p>
                        {s.expected_result ? <p className="text-sm text-ink-muted">Expected: {s.expected_result}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )} /> },
          { value: 'history', label: 'History', content: <HistoryTab projectId={projectId} caseId={c.id} /> },
          { value: 'usage', label: 'Used in runs', content: <UsageTab projectId={projectId} caseId={c.id} /> },
        ]}
      />
    </div>
  );
}

function Details({ projectId, caseId, body }: { projectId: Id; caseId: Id; body: React.ReactNode }) {
  const usage = useCaseUsage(caseId);
  const recent = (usage.data ?? []).slice(0, 3);
  return (
    <div>
      {body}
      <section className="mt-4">
        <h3 className="mb-1 text-sm font-semibold text-ink">Recent results</h3>
        {usage.isPending ? <Skeleton className="h-8 w-full" /> : recent.length === 0 ? <p className="text-base text-ink-muted">Not run yet.</p> : (
          <ul className="space-y-1">
            {recent.map((u) => (
              <li key={u.test.id} className="flex items-center justify-between gap-2 text-base">
                <Link href={`/p/${projectId}/runs/${u.run.id}`} className="min-w-0 truncate text-accent-text hover:underline">{u.run.name}</Link>
                <StatusBadge status={u.status_key} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryTab({ projectId, caseId }: { projectId: Id; caseId: Id }) {
  const q = useCaseVersions(caseId);
  if (q.isPending) return <Skeleton className="h-20 w-full" />;
  if (q.isError) return <p role="alert" className="text-base text-status-failed-text">History could not be loaded. {q.error.message}</p>;
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {q.data.slice(0, 5).map((v) => (
          <li key={v.version.id} className="text-base">
            <span className="font-semibold text-ink">v{v.version.version}</span>{' '}
            <span className="text-ink-secondary">{v.saved_by?.name ?? 'Unknown'}, <time dateTime={v.version.created} title={absWhen(v.version.created)}>{when(v.version.created)}</time></span>
            {v.version.note ? <p className="text-sm text-ink-muted">{v.version.note}</p> : null}
          </li>
        ))}
      </ul>
      <Link href={`/p/${projectId}/cases/${caseId}/history`} className={buttonStyles({ size: 'sm', variant: 'outline' })}><History className="size-4" aria-hidden />Compare versions</Link>
    </div>
  );
}

function UsageTab({ projectId, caseId }: { projectId: Id; caseId: Id }) {
  const q = useCaseUsage(caseId);
  if (q.isPending) return <Skeleton className="h-20 w-full" />;
  if (q.isError) return <p role="alert" className="text-base text-status-failed-text">Usage could not be loaded. {q.error.message}</p>;
  if (q.data.length === 0) return <p className="text-base text-ink-muted">This case is not in any run yet.</p>;
  return (
    <ul className="space-y-1">
      {q.data.map((u) => (
        <li key={u.test.id} className="flex items-center justify-between gap-2 text-base">
          <Link href={`/p/${projectId}/runs/${u.run.id}`} className="min-w-0 truncate text-accent-text hover:underline">{u.run.name}</Link>
          <span className="flex items-center gap-2"><span className="text-sm text-ink-muted">v{u.test.version}</span><StatusBadge status={u.status_key} /></span>
        </li>
      ))}
    </ul>
  );
}
