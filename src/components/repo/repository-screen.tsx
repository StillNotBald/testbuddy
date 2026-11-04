'use client';

import { AlertTriangle, FolderTree, ListChecks, Plus, SearchX, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { SidePanel } from '@/components/shell/side-panel';
import { SplitView } from '@/components/shell/split-view';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import { Button, buttonStyles, Checkbox, FilterBar, Skeleton, TableSkeleton, type FacetValue } from '@/components/ui';
import { useHotkeys } from '@/lib/hotkeys';
import { useUrlState } from '@/lib/use-url-state';
import { useMediaQuery } from '@/lib/use-media-query';
import { useCases, useCaseTypes, usePriorities, useSuiteTree, useTags } from '@/services/hooks';
import type { AutomationStatus, Id } from '@/services/types';
import { BulkBar } from './bulk-actions';
import { CaseInspector } from './case-inspector';
import { CaseList } from './case-list';
import { AUTOMATION_OPTIONS, sectionTrail } from './repo-utils';
import { SuiteTree, type TreeSelection } from './suite-tree';

const PAGE_LIMIT = 5000;

export function RepositoryScreen() {
  const { projectId } = useProjectContext();
  const url = useUrlState();
  const router = useRouter();
  const desktop = useMediaQuery('(min-width: 1024px)', true);
  const phone = useMediaQuery('(max-width: 767px)');
  const canWrite = useCan('cases.write') && !phone;
  const [drawer, setDrawer] = useState(false);
  const [picked, setSelected] = useState<Set<Id>>(new Set());

  const sel: TreeSelection = { suiteId: url.get('suite'), sectionId: url.get('section') };
  const facetValue: FacetValue = { priority: url.getList('priority'), type: url.getList('type'), tag: url.getList('tag'), automation: url.getList('automation') };
  const q = url.get('q') ?? '';
  const showDeprecated = url.get('deprecated') === '1';
  const activeId = url.get('case');
  const filtersOn = Boolean(q || showDeprecated || Object.values(facetValue).some((v) => v.length));

  const tree = useSuiteTree(projectId);
  const priorities = usePriorities();
  const types = useCaseTypes();
  const tags = useTags(projectId);
  const list = useCases({
    projectId, suiteId: sel.suiteId, sectionId: sel.sectionId, q: q || undefined,
    priority: facetValue.priority?.length ? facetValue.priority : undefined, type: facetValue.type?.length ? facetValue.type : undefined,
    tag: facetValue.tag?.length ? facetValue.tag : undefined, automation: facetValue.automation?.length ? (facetValue.automation as AutomationStatus[]) : undefined,
    deprecated: showDeprecated || undefined, pageSize: PAGE_LIMIT,
  });

  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const pMap = useMemo(() => new Map((priorities.data ?? []).map((p) => [p.id, p])), [priorities.data]);
  const tMap = useMemo(() => new Map((types.data ?? []).map((t) => [t.id, t])), [types.data]);
  const tagMap = useMemo(() => new Map((tags.data ?? []).map((t) => [t.id, t])), [tags.data]);
  // Selection only keeps ids that are still in the list (filters change what is visible).
  const selected = useMemo(() => new Set(items.filter((i) => picked.has(i.case.id)).map((i) => i.case.id)), [items, picked]);
  const projectTotal = (tree.data ?? []).reduce((n, s) => n + s.count, 0);


  const move = (d: 1 | -1) => {
    if (items.length === 0) return;
    const i = items.findIndex((x) => x.case.id === activeId);
    const next = items[Math.max(0, Math.min(items.length - 1, i < 0 ? 0 : i + d))];
    if (next) url.set({ case: next.case.id });
  };
  useHotkeys('repository', {
    j: { run: () => move(1), label: 'Next case' },
    k: { run: () => move(-1), label: 'Previous case' },
    ...(canWrite ? {
      n: { run: () => router.push(`/p/${projectId}/cases/new${sel.sectionId ? `?section=${sel.sectionId}` : ''}`), label: 'New case' },
      e: { run: () => { if (activeId) router.push(`/p/${projectId}/cases/${activeId}`); }, label: 'Edit selected case' },
    } : {}),
  });

  const facets = [
    { key: 'priority', label: 'Priority', options: (priorities.data ?? []).map((p) => ({ value: p.id, label: `${p.short_name} ${p.name}` })) },
    { key: 'type', label: 'Type', options: (types.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
    { key: 'tag', label: 'Tag', options: (tags.data ?? []).map((t) => ({ value: t.id, label: t.name })) },
    { key: 'automation', label: 'Automation', options: AUTOMATION_OPTIONS },
  ];
  const clearFilters = () => url.set({ q: null, priority: null, type: null, tag: null, automation: null, deprecated: null });
  const choose = (s: TreeSelection) => { url.set({ suite: s.suiteId, section: s.sectionId, case: null }, { push: true }); setDrawer(false); };
  const newCaseHref = `/p/${projectId}/cases/new${sel.sectionId ? `?section=${sel.sectionId}` : ''}`;

  const where = sel.sectionId ? sectionTrail(tree.data ?? [], sel.sectionId) : sel.suiteId ? tree.data?.find((s) => s.suite.id === sel.suiteId)?.suite.name ?? '' : '';
  const suiteCount = tree.data?.length ?? 0;

  const treeEl = tree.isError ? (
    <p role="alert" className="text-base text-status-failed-text">Suites could not be loaded. <button type="button" className="underline" onClick={() => tree.refetch()}>Retry</button></p>
  ) : tree.isPending ? (
    <div role="status" aria-label="Loading suites" className="space-y-2"><Skeleton className="h-7 w-full" /><Skeleton className="h-7 w-5/6" /><Skeleton className="h-7 w-4/6" /></div>
  ) : (
    <SuiteTree projectId={projectId} tree={tree.data} total={projectTotal} selected={sel} onSelect={choose} />
  );

  const empty = filtersOn
    ? <EmptyState icon={SearchX} title="No cases match these filters." description="Clear a filter to see more cases." action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>} />
    : projectTotal === 0
      ? <EmptyState icon={ListChecks} title="No cases yet. Add the first case." description={canWrite ? undefined : 'Testers, managers and admins can add cases.'} action={canWrite ? <Link href={newCaseHref} className={buttonStyles({ variant: 'primary' })}>New case</Link> : undefined} />
      : <EmptyState icon={ListChecks} title={`No cases in ${where || 'this section'}.`} description={canWrite ? 'Add the first case.' : undefined} action={canWrite ? <Link href={newCaseHref} className={buttonStyles({ variant: 'primary' })}>New case</Link> : undefined} />;

  const listEl = list.isError ? (
    <EmptyState icon={AlertTriangle} tone="error" title="Cases could not be loaded." description={list.error.message} action={<Button variant="outline" onClick={() => list.refetch()}>Retry</Button>} />
  ) : list.isPending ? (
    <TableSkeleton rows={10} cols={5} />
  ) : items.length === 0 ? (
    <div className="rounded-md border border-subtle bg-surface">{empty}</div>
  ) : (
    <>
      <CaseList
        items={items} total={list.data?.total ?? items.length} priorities={pMap} types={tMap} tags={tagMap}
        activeId={activeId} selected={selected} selectable={canWrite} className="h-[calc(100dvh-24rem)] min-h-64"
        onOpen={(id) => url.set({ case: id }, { push: true })}
        onToggle={(id, on) => setSelected(() => { const n = new Set(selected); if (on) n.add(id); else n.delete(id); return n; })}
        onToggleAll={(on) => setSelected(on ? new Set(items.map((i) => i.case.id)) : new Set())}
      />
      <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
        {items.length} {items.length === 1 ? 'case' : 'cases'}{where ? ` in ${where}` : ''}{filtersOn ? ' match the filters' : ''}. {projectTotal} in the project.
      </p>
    </>
  );

  return (
    <>
      <PageHeader
        title="Repository"
        meta={tree.data ? `${projectTotal} ${projectTotal === 1 ? 'case' : 'cases'} in ${suiteCount} ${suiteCount === 1 ? 'suite' : 'suites'}` : undefined}
        actions={!phone ? (
          <RoleGate action="cases.write">
            <Link href={newCaseHref} className={buttonStyles({ variant: 'primary' })}><Plus className="size-4" aria-hidden />New case</Link>
          </RoleGate>
        ) : undefined}
      />
      {phone ? <p className="mb-3 flex items-center gap-2 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary"><Smartphone className="size-4 shrink-0" aria-hidden />Open on a larger screen to edit.</p> : null}
      <div className="mb-3 flex flex-wrap items-start gap-3">
        {!desktop ? <Button variant="outline" iconLeft={<FolderTree className="size-4" aria-hidden />} onClick={() => setDrawer(true)}>Suites{where ? `: ${where}` : ''}</Button> : null}
        <div className="min-w-0 flex-1">
          <FilterBar
            search={{ value: q, onChange: (v) => url.set({ q: v }), placeholder: 'Search cases by ref or title' }}
            facets={facets}
            value={facetValue}
            onChange={(next) => url.set(next)}
            resultCount={list.data?.total}
          />
        </div>
        <span className="flex min-h-8 items-center gap-2 text-base text-ink-secondary">
          <Checkbox id="show-deprecated" checked={showDeprecated} onCheckedChange={(c) => url.set({ deprecated: c === true })} />
          <label htmlFor="show-deprecated">Show deprecated</label>
        </span>
      </div>
      <div className={desktop ? 'grid grid-cols-[15rem_minmax(0,1fr)] gap-4' : ''}>
        {desktop ? <nav aria-label="Suites" className="max-h-[calc(100dvh-16rem)] overflow-y-auto rounded-md border border-subtle bg-surface p-2">{treeEl}</nav> : null}
        <div className="min-w-0">
          {canWrite && selected.size > 0 ? <BulkBar projectId={projectId} ids={[...selected]} onClear={() => setSelected(new Set())} /> : null}
          <SplitView
            storageKey="tb.repo.inspector"
            list={<div>{listEl}</div>}
            detail={activeId ? <CaseInspector key={activeId} projectId={projectId} caseId={activeId} /> : null}
            detailOpen={Boolean(activeId)}
            onClose={() => url.set({ case: null })}
            defaultSize={40}
          />
        </div>
      </div>
      {!desktop ? (
        <SidePanel open={drawer} onOpenChange={setDrawer} title="Suites and sections" width={360}>{treeEl}</SidePanel>
      ) : null}
    </>
  );
}
