'use client';

import { AlertTriangle, CheckCircle2, Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { SidePanel } from '@/components/shell/side-panel';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import { Badge, Button, buttonStyles, Card, Combobox, ConfirmDialog, FormField, Input, Skeleton, TableSkeleton, Textarea, toast } from '@/components/ui';
import { DISABLED_REASON } from '@/lib/permissions';
import { useMilestones, usePlan, usePlanMutations, usePlans } from '@/services/hooks';
import { passRateText } from './format';
import { MiniProgress, RunStateBadge } from './run-bits';
import { RunProgressBar } from './run-progress-bar';

export function PlansScreen() {
  const { projectId } = useProjectContext();
  const plans = usePlans(projectId);
  const milestones = useMilestones(projectId);
  const { create } = usePlanMutations(projectId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [builds, setBuilds] = useState('');
  const [description, setDescription] = useState('');
  const [ms, setMs] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    create.mutate({ project: projectId, name: name.trim(), type: type || undefined, builds: builds || undefined, description: description || undefined, milestones: ms }, {
      onSuccess: () => { toast.success(`Created plan "${name.trim()}".`); setOpen(false); setName(''); setType(''); setBuilds(''); setDescription(''); setMs([]); setError(undefined); },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <>
      <PageHeader
        title="Plans" breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: 'Plans' }]}
        actions={<RoleGate action="plans.write"><Button variant="primary" iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>New plan</Button></RoleGate>}
      />
      {plans.isError ? <EmptyState icon={AlertTriangle} tone="error" title="Plans could not be loaded." description={plans.error.message} action={<Button variant="outline" onClick={() => plans.refetch()}>Retry</Button>} />
        : plans.isPending ? <TableSkeleton rows={4} cols={4} />
          : plans.data.length === 0 ? <EmptyState icon={Layers} title="No plans yet. Group runs for one release effort." action={<RoleGate action="plans.write"><Button variant="primary" onClick={() => setOpen(true)}>New plan</Button></RoleGate>} />
            : (
              <ul className="space-y-2" aria-label="Plans">
                {plans.data.map((p) => (
                  <li key={p.plan.id}>
                    <Card className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/p/${projectId}/plans/${p.plan.id}`} className="text-lg font-semibold text-accent-text hover:underline">{p.plan.name}</Link>
                        {p.plan.is_completed ? <Badge tone="success" icon={<CheckCircle2 className="size-3.5" aria-hidden />}>Completed</Badge> : <Badge tone="info">Open</Badge>}
                      </div>
                      <p className="text-sm text-ink-muted">{[p.milestone_titles.length ? `Milestone: ${p.milestone_titles.join(', ')}` : null, p.owner ? `Owner: ${p.owner.name}` : null, `${p.run_count} ${p.run_count === 1 ? 'run' : 'runs'}`].filter(Boolean).join(' / ')}</p>
                      <MiniProgress summary={p} />
                    </Card>
                  </li>
                ))}
              </ul>
            )}
      <SidePanel open={open} onOpenChange={setOpen} title="New plan" footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={create.isPending} onClick={() => submit({ preventDefault() {} } as FormEvent)}>Create plan</Button></>}>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <FormField label="Name" required error={error}><Input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
          <FormField label="Type" hint="For example Regression or Smoke."><Input value={type} onChange={(e) => setType(e.target.value)} /></FormField>
          <FormField label="Milestones"><Combobox aria-label="Milestones" placeholder="Choose milestones" value={ms} onChange={setMs} options={(milestones.data ?? []).map((m) => ({ value: m.milestone.id, label: m.milestone.title }))} /></FormField>
          <FormField label="Builds"><Input value={builds} onChange={(e) => setBuilds(e.target.value)} /></FormField>
          <FormField label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
        </form>
      </SidePanel>
    </>
  );
}

export function PlanDetailScreen({ planId }: { planId: string }) {
  const { projectId } = useProjectContext();
  const plan = usePlan(planId);
  const { complete } = usePlanMutations(projectId);
  const canWrite = useCan('plans.write');
  const canRun = useCan('runs.write');
  const [confirm, setConfirm] = useState(false);

  if (plan.isError) return <EmptyState icon={AlertTriangle} tone="error" title="This plan could not be loaded." description={plan.error.message} action={<Button variant="outline" onClick={() => plan.refetch()}>Retry</Button>} />;
  if (plan.isPending) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /></div>;
  const p = plan.data;
  const done = p.plan.is_completed;
  const allClosed = p.runs.length > 0 && p.runs.every((r) => r.run.is_closed);
  const bySuite = new Map<string, typeof p.runs>();
  p.runs.forEach((r) => bySuite.set(r.suite_name, [...(bySuite.get(r.suite_name) ?? []), r]));

  return (
    <>
      <PageHeader
        title={p.plan.name} badge={done ? <Badge tone="success">Completed</Badge> : <Badge tone="info">Open</Badge>}
        breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: 'Plans', href: `/p/${projectId}/plans` }, { label: p.plan.name }]}
        meta={[p.milestone_titles.length ? `Milestone ${p.milestone_titles.join(', ')}` : null, p.plan.builds && `Builds ${p.plan.builds}`, p.owner && `Owner ${p.owner.name}`, p.plan.refs && `Refs ${p.plan.refs}`].filter(Boolean).join(' / ')}
        actions={
          <>
            {canRun && !done ? <Link href={`/p/${projectId}/runs/new?plan=${planId}`} className={buttonStyles({ variant: 'outline' })}><Plus className="size-4" aria-hidden />Add run to plan</Link> : null}
            <RoleGate action="plans.write" blockedReason={done ? DISABLED_REASON.completedPlan : undefined}><Button onClick={() => setConfirm(true)}>Complete plan</Button></RoleGate>
          </>
        }
      />
      {p.plan.description ? <p className="mb-3 text-base text-ink-secondary">{p.plan.description}</p> : null}
      <Card className="mb-4 space-y-2">
        <RunProgressBar counts={p.progress.counts} size="lg" showLegend />
        <p className="text-sm text-ink-secondary">Pass rate {passRateText(p.progress.counts)}.</p>
        {allClosed && !done && canWrite ? <p role="note" className="text-sm text-ink">All runs are closed. Complete the plan when you are done.</p> : null}
      </Card>
      {p.runs.length === 0 ? (
        <EmptyState icon={Layers} title="This plan has no runs yet." action={canRun && !done ? <Link href={`/p/${projectId}/runs/new?plan=${planId}`} className={buttonStyles({ variant: 'primary' })}>Add the first run</Link> : undefined} />
      ) : [...bySuite].map(([suite, runs]) => (
        <section key={suite} className="mb-4" aria-label={suite}>
          <h2 className="mb-1 text-lg font-semibold text-ink">{suite}</h2>
          <ul className="divide-y divide-subtle rounded-md border border-subtle bg-surface">
            {runs.map((r) => (
              <li key={r.run.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Link href={`/p/${projectId}/runs/${r.run.id}`} className="min-w-40 font-medium text-accent-text hover:underline">{r.run.name}</Link>
                <MiniProgress summary={r} />
                <span className="text-sm text-ink-muted">{[r.assignee?.name, r.run.build && `build ${r.run.build}`].filter(Boolean).join(' / ')}</span>
                <span className="ml-auto"><RunStateBadge closed={r.run.is_closed} /></span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Complete plan "${p.plan.name}"?`} description="A completed plan is read-only. Runs inside it keep their own state." confirmLabel="Complete plan"
        onConfirm={async () => { await complete.mutateAsync(planId); toast.success('Plan completed.'); }} />
    </>
  );
}
