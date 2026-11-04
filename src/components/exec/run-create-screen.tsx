'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { BookmarkPlus, Lock, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import {
  AUTOMATION_META, Button, Card, CardHeader, CardTitle, DataTable, Dialog, FilterBar, FormField, Input, Pagination, PriorityChip, RadioGroup, RadioItem, Select, Skeleton, toast,
  type FacetValue,
} from '@/components/ui';
import { announce } from '@/lib/announcer';
import { useMediaQuery } from '@/lib/use-media-query';
import { useCaseTypes, useMatchingCases, useMilestones, usePlans, usePriorities, useRunMutations, useSession, useSuiteTree, useTags, useCases } from '@/services/hooks';
import type { CaseFilters, CaseListItem, SectionNode } from '@/services/interfaces';
import type { Id } from '@/services/types';
import { fmtDuration } from './format';
import { readSets, writeSets, type SavedSet } from './saved-sets';

interface Meta { priority?: Id; estimate?: number }
const EMPTY_FACETS: FacetValue = { priority: [], type: [], automation: [], tag: [] };

function flatten(nodes: SectionNode[], depth = 0): Array<{ id: Id; name: string; depth: number; count: number }> {
  return nodes.flatMap((n) => [{ id: n.section.id, name: n.section.name, depth, count: n.count }, ...flatten(n.children, depth + 1)]);
}

export function RunCreateScreen({ initialPlan, initialMilestone, initialCases }: { initialPlan?: string; initialMilestone?: string; initialCases?: string[] }) {
  const { projectId } = useProjectContext();
  const router = useRouter();
  const canCreate = useCan('runs.write');
  const phone = useMediaQuery('(max-width: 767px)');
  const session = useSession();
  const tree = useSuiteTree(projectId);
  const plans = usePlans(projectId);
  const milestones = useMilestones(projectId, 'open');
  const priorities = usePriorities();
  const types = useCaseTypes();
  const tags = useTags(projectId);
  const { create } = useRunMutations(projectId);
  const matching = useMatchingCases();

  const [name, setName] = useState('');
  const [build, setBuild] = useState('');
  const [plan, setPlan] = useState<string | undefined>(initialPlan);
  const [milestone, setMilestone] = useState<string | undefined>(initialMilestone);
  const [assignMe, setAssignMe] = useState(false);
  const [mode, setMode] = useState<'select' | 'all'>('select');
  const [suiteId, setSuiteId] = useState<string | undefined>();
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [facets, setFacets] = useState<FacetValue>(EMPTY_FACETS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<Map<string, Meta>>(new Map());
  const [nameError, setNameError] = useState<string>();
  const [casesError, setCasesError] = useState<string>();
  const [sets, setSets] = useState<SavedSet[]>(() => readSets(projectId));
  const [activeSet, setActiveSet] = useState<string | undefined>();
  const [saveOpen, setSaveOpen] = useState(false);
  const [setName_, setSetName] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // Arriving from the repository "Add to run" action: pre-select those cases, never deprecated ones (R-063).
  const seeded = useRef(false);
  const initialKey = (initialCases ?? []).join(',');
  useEffect(() => {
    if (seeded.current || !initialKey) return;
    seeded.current = true;
    const wanted = new Set(initialKey.split(','));
    matching.mutateAsync({ projectId, deprecated: true }).then((all) => {
      const usable = all.filter((i) => wanted.has(i.case.id) && !i.case.deprecated);
      setMeta((m) => { const n = new Map(m); usable.forEach((i) => n.set(i.case.id, { priority: i.case.priority, estimate: i.case.estimate })); return n; });
      setSelection(new Set(usable.map((i) => i.case.id)));
      const skipped = wanted.size - usable.length;
      if (skipped > 0) toast.info(`${skipped} ${skipped === 1 ? 'case was' : 'cases were'} left out because ${skipped === 1 ? 'it is' : 'they are'} deprecated or missing.`);
      announce(`${usable.length} cases selected`);
    }).catch(() => { seeded.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey, projectId]);

  const effectiveSuite = suiteId ?? tree.data?.[0]?.suite.id;
  const filters: CaseFilters = {
    projectId, suiteId: effectiveSuite, sectionId, q: q || undefined, priority: facets.priority, type: facets.type,
    automation: facets.automation as CaseFilters['automation'], tag: facets.tag,
  };
  const cases = useCases({ ...filters, page, pageSize });
  const items = cases.data?.items ?? [];
  const total = cases.data?.total ?? 0;
  const suite = tree.data?.find((s) => s.suite.id === effectiveSuite);

  const remember = (list: CaseListItem[]) => setMeta((m) => {
    const next = new Map(m);
    list.forEach((i) => next.set(i.case.id, { priority: i.case.priority, estimate: i.case.estimate }));
    return next;
  });

  const setFilter = (patch: () => void) => { patch(); setPage(1); setActiveSet(undefined); };

  const selectAllMatching = async (f: CaseFilters = filters) => {
    const all = await matching.mutateAsync(f);
    remember(all);
    setSelection((s) => new Set([...s, ...all.map((i) => i.case.id)]));
    announce(`${all.length} cases selected`);
  };

  const applySet = (id: string | undefined) => {
    setActiveSet(id);
    const set = sets.find((s) => s.id === id);
    if (!set) return;
    setSuiteId(set.suiteId); setSectionId(set.sectionId); setQ(set.q ?? ''); setPage(1);
    const f: FacetValue = { priority: set.priority, type: set.type, automation: set.automation, tag: set.tag };
    setFacets(f); setMode('select');
    void selectAllMatching({ projectId, suiteId: set.suiteId, sectionId: set.sectionId, q: set.q || undefined, priority: set.priority, type: set.type, automation: set.automation as CaseFilters['automation'], tag: set.tag });
  };

  const saveSet = () => {
    const n = setName_.trim();
    if (!n) return;
    const set: SavedSet = { id: `set_${Date.now()}`, name: n, suiteId: effectiveSuite, sectionId, q, priority: facets.priority ?? [], type: facets.type ?? [], automation: facets.automation ?? [], tag: facets.tag ?? [] };
    const next = [...sets, set];
    setSets(next); writeSets(projectId, next); setActiveSet(set.id); setSaveOpen(false); setSetName('');
    toast.success(`Saved set "${n}". Applying it selects every case matching the filters.`);
  };
  const deleteSet = () => {
    const next = sets.filter((s) => s.id !== activeSet);
    setSets(next); writeSets(projectId, next); setActiveSet(undefined);
  };

  const columns = useMemo<ColumnDef<CaseListItem, unknown>[]>(() => [
    { id: 'ref', header: 'Ref', enableSorting: false, cell: ({ row }) => <span className="text-sm tabular-nums text-ink-secondary">{row.original.case.ref}</span> },
    { id: 'title', header: 'Title', enableSorting: false, cell: ({ row }) => <span className="font-medium">{row.original.case.title}</span> },
    { id: 'priority', header: 'Priority', enableSorting: false, cell: ({ row }) => <PriorityChip priority={priorities.data?.find((p) => p.id === row.original.case.priority)} /> },
    { id: 'section', header: 'Section', enableSorting: false, cell: ({ row }) => <span className="text-sm text-ink-secondary">{row.original.section_name}</span> },
  ], [priorities.data]);

  const byPriority = useMemo(() => {
    const m = new Map<string, number>();
    selection.forEach((id) => { const p = priorities.data?.find((x) => x.id === meta.get(id)?.priority)?.short_name ?? 'None'; m.set(p, (m.get(p) ?? 0) + 1); });
    return [...m].sort(([a], [b]) => a.localeCompare(b));
  }, [selection, meta, priorities.data]);
  const estimate = useMemo(() => [...selection].reduce((n, id) => n + (meta.get(id)?.estimate ?? 0), 0), [selection, meta]);

  const count = mode === 'all' ? (suite?.count ?? 0) : selection.size;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nm = name.trim();
    setNameError(nm ? undefined : 'Name is required.');
    const cErr = !effectiveSuite ? 'Choose a suite.' : mode === 'select' && selection.size === 0 ? 'Select at least one case.' : mode === 'all' && count === 0 ? 'This suite has no active cases.' : undefined;
    setCasesError(cErr);
    if (!nm) { nameRef.current?.focus(); return; }
    if (cErr || !effectiveSuite) return;
    create.mutate(
      { project: projectId, suite: effectiveSuite, name: nm, build: build.trim() || undefined, plan, milestone, assigned_to: assignMe ? session.data?.user.id : undefined, include_all: mode === 'all', case_ids: mode === 'all' ? undefined : [...selection] },
      {
        onSuccess: (run) => { toast.success(`Created run "${run.name}" with ${count} tests.`); router.push(`/p/${projectId}/runs/${run.id}`); },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (phone) {
    return (
      <>
        <PageHeader title="New run" breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: 'New run' }]} />
        <EmptyState icon={Lock} tone="locked" title="Open on a larger screen to create a run." description="Phones are read-only. You can still browse runs and record single results." />
      </>
    );
  }
  if (!canCreate) {
    return (
      <>
        <PageHeader title="New run" breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: 'New run' }]} />
        <EmptyState icon={Lock} tone="locked" title="You do not have permission to create runs." description="Ask a tester, manager or admin." />
      </>
    );
  }

  const facetDefs = [
    { key: 'priority', label: 'Priority', options: (priorities.data ?? []).map((p) => ({ value: p.id, label: p.name })) },
    { key: 'type', label: 'Type', options: (types.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
    { key: 'automation', label: 'Automation', options: Object.entries(AUTOMATION_META).map(([value, m]) => ({ value, label: m.label })) },
    { key: 'tag', label: 'Tags', options: (tags.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
  ];

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title="New run" breadcrumbs={[{ label: 'Runs', href: `/p/${projectId}/runs` }, { label: 'New run' }]} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Name" required error={nameError}><Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Web smoke 2.4-rc1" /></FormField>
        <FormField label="Build"><Input value={build} onChange={(e) => setBuild(e.target.value)} placeholder="2.4-rc1" /></FormField>
        <FormField label="Plan">
          <RoleGate action="runs.attach" mode="disable" reason="Managers attach runs to plans."><Select aria-label="Plan" placeholder="None" clearable value={plan} onChange={setPlan} options={(plans.data ?? []).filter((p) => !p.plan.is_completed).map((p) => ({ value: p.plan.id, label: p.plan.name }))} /></RoleGate>
        </FormField>
        <FormField label="Milestone">
          <RoleGate action="runs.attach" mode="disable" reason="Managers attach runs to milestones."><Select aria-label="Milestone" placeholder="None" clearable value={milestone} onChange={setMilestone} options={(milestones.data ?? []).map((m) => ({ value: m.milestone.id, label: m.milestone.title }))} /></RoleGate>
        </FormField>
      </div>
      <label className="mb-4 flex items-center gap-2 text-base"><input type="checkbox" checked={assignMe} onChange={(e) => setAssignMe(e.target.checked)} className="size-4 accent-[var(--tb-accent)]" />Assign this run to me</label>

      <fieldset className="mb-3">
        <legend className="mb-1 text-base font-semibold text-ink">Cases</legend>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'select' | 'all')} className="flex flex-wrap gap-4">
          <RadioItem value="select" id="mode-select" label="Select specific cases" />
          <RadioItem value="all" id="mode-all" label="Include all active cases in the suite" />
        </RadioGroup>
      </fieldset>
      {casesError ? <p role="alert" className="mb-2 text-sm text-status-failed-text">{casesError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_16rem]" data-tour="case-picker">
        <nav aria-label="Suites and sections" className="space-y-1">
          {tree.isPending ? <Skeleton className="h-24 w-full" /> : (tree.data ?? []).map((s) => (
            <div key={s.suite.id}>
              <button type="button" aria-current={effectiveSuite === s.suite.id && !sectionId ? 'true' : undefined} onClick={() => setFilter(() => { setSuiteId(s.suite.id); setSectionId(undefined); })} className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-base font-medium hover:bg-sunken aria-[current=true]:bg-selected">
                <span>{s.suite.name}</span><span className="text-sm tabular-nums text-ink-muted">{s.count}</span>
              </button>
              {effectiveSuite === s.suite.id ? flatten(s.sections).map((sec) => (
                <button key={sec.id} type="button" aria-current={sectionId === sec.id ? 'true' : undefined} style={{ paddingLeft: `${0.5 + (sec.depth + 1) * 0.75}rem` }} onClick={() => setFilter(() => setSectionId(sec.id))} className="flex w-full items-center justify-between rounded-sm py-1 pr-2 text-left text-sm text-ink-secondary hover:bg-sunken aria-[current=true]:bg-selected aria-[current=true]:text-ink">
                  <span>{sec.name}</span><span className="tabular-nums text-ink-muted">{sec.count}</span>
                </button>
              )) : null}
            </div>
          ))}
        </nav>

        <div className="min-w-0 space-y-3">
          {mode === 'all' ? (
            <Card><p className="text-base">Every active case in <strong>{suite?.suite.name ?? 'the suite'}</strong> will be added ({suite?.count ?? 0} cases). Deprecated cases are left out.</p></Card>
          ) : (
            <>
              <FilterBar
                search={{ value: q, onChange: (v) => setFilter(() => setQ(v)), placeholder: 'Search cases' }}
                facets={facetDefs} value={facets} onChange={(v) => setFilter(() => setFacets(v))} resultCount={total}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={items.length === 0} onClick={() => { remember(items); setSelection((s) => new Set([...s, ...items.map((i) => i.case.id)])); }}>Select all {items.length} on page</Button>
                <Button size="sm" variant="outline" disabled={total === 0} loading={matching.isPending} onClick={() => void selectAllMatching()}>Select all {total} matching filter</Button>
                <Select aria-label="Saved sets" placeholder="Saved sets" clearable className="w-44" value={activeSet} onChange={applySet} options={sets.map((s) => ({ value: s.id, label: s.name }))} />
                <Button size="sm" variant="ghost" iconLeft={<BookmarkPlus className="size-4" aria-hidden />} onClick={() => setSaveOpen(true)}>Save filters as set</Button>
                {activeSet ? <Button size="sm" variant="ghost" iconLeft={<Trash2 className="size-4" aria-hidden />} onClick={deleteSet}>Delete set</Button> : null}
              </div>
              <DataTable
                caption="Cases to add" columns={columns} data={items} rowId={(r) => r.case.id} loading={cases.isPending} selectable density="compact"
                selection={selection} totalRows={total}
                onSelectionChange={(next) => { remember(items); setSelection(next); announce(`${next.size} cases selected`); }}
                emptyState={<EmptyState title="No cases match these filters." description="Clear a filter or choose another suite." />}
              />
              <Pagination page={page} pageSize={pageSize} total={total} onChange={(p, s) => { setPage(p); setPageSize(s); }} />
              <p className="text-sm text-ink-muted">Deprecated cases are excluded and cannot be selected.</p>
            </>
          )}
        </div>

        <aside aria-label="Selection summary" className="lg:sticky lg:top-4 lg:self-start">
          <Card className="space-y-2">
            <CardHeader><CardTitle>Selected: <span data-testid="selected-count">{count}</span></CardTitle></CardHeader>
            {mode === 'select' ? (
              <>
                {byPriority.length > 0 ? <ul className="space-y-0.5 text-sm text-ink-secondary">{byPriority.map(([p, n]) => <li key={p} className="flex justify-between tabular-nums"><span>{p}</span><span>{n}</span></li>)}</ul> : <p className="text-sm text-ink-muted">No cases selected yet.</p>}
                {estimate > 0 ? <p className="text-sm text-ink-secondary">Est. duration {fmtDuration(estimate)}</p> : null}
                <Button size="sm" variant="ghost" disabled={selection.size === 0} onClick={() => setSelection(new Set())}>Clear selection</Button>
              </>
            ) : <p className="text-sm text-ink-muted">All active cases in the suite.</p>}
          </Card>
        </aside>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-subtle pt-4">
        <Button onClick={() => router.push(`/p/${projectId}/runs`)}>Cancel</Button>
        <Button type="submit" variant="primary" loading={create.isPending}>{create.isPending ? `Snapshotting ${count} cases` : `Create run with ${count} tests`}</Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen} title="Save filters as a set" description="Applying a saved set selects every case that matches its filters at that moment."
        footer={<><Button onClick={() => setSaveOpen(false)}>Cancel</Button><Button variant="primary" onClick={saveSet} disabled={!setName_.trim()}>Save set</Button></>}>
        <FormField label="Set name" required><Input value={setName_} onChange={(e) => setSetName(e.target.value)} placeholder="P1 regression" /></FormField>
      </Dialog>
    </form>
  );
}
