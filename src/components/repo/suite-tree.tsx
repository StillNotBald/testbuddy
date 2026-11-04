'use client';

import { ChevronDown, ChevronRight, FolderPlus, Layers, List, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCan } from '@/components/tb/project-context';
import { RoleGate } from '@/components/tb/role-gate';
import { Button, Dialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, FormField, Input, Select, toast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { announce } from '@/lib/announcer';
import { useSuiteEdits, useSuiteMutations } from '@/services/hooks';
import type { SuiteNode } from '@/services/interfaces';
import type { Id } from '@/services/types';
import { allKeys, flattenTree, moveTargets, type TreeRow } from './repo-utils';

export interface TreeSelection { suiteId?: Id; sectionId?: Id }

export interface SuiteTreeProps {
  projectId: Id;
  tree: SuiteNode[];
  total: number;
  selected: TreeSelection;
  onSelect: (sel: TreeSelection) => void;
}

type Dlg =
  | { kind: 'add-suite' }
  | { kind: 'add-section'; suiteId: Id; parent?: Id; where: string }
  | { kind: 'rename'; row: TreeRow }
  | { kind: 'move'; row: TreeRow };

const selectedKey = (s: TreeSelection) => (s.sectionId ? `sec:${s.sectionId}` : s.suiteId ? `suite:${s.suiteId}` : 'all');

export function SuiteTree({ projectId, tree, total, selected, onSelect }: SuiteTreeProps) {
  const roleCan = useCan('suites.write', { writes: false });
  const live = useCan('suites.write');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allKeys(tree)));
  const seen = useRef(new Set(allKeys(tree)));
  const [focusKey, setFocusKey] = useState<string>(selectedKey(selected));
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const refs = useRef(new Map<string, HTMLLIElement>());

  // New nodes (created while the tree is open) start expanded; known nodes keep the user's choice.
  useEffect(() => {
    const fresh = allKeys(tree).filter((k) => !seen.current.has(k));
    if (fresh.length === 0) return;
    fresh.forEach((k) => seen.current.add(k));
    setExpanded((cur) => new Set([...cur, ...fresh]));
  }, [tree]);

  const rows = useMemo(() => flattenTree(tree, total, expanded), [tree, total, expanded]);
  const sel = selectedKey(selected);

  const toggle = (key: string, open?: boolean) => setExpanded((cur) => {
    const next = new Set(cur);
    const want = open ?? !next.has(key);
    if (want) next.add(key); else next.delete(key);
    return next;
  });

  const choose = (row: TreeRow) => {
    onSelect(row.kind === 'all' ? {} : row.kind === 'suite' ? { suiteId: row.suiteId } : { suiteId: row.suiteId, sectionId: row.sectionId });
  };

  const focusRow = (key: string) => {
    setFocusKey(key);
    refs.current.get(key)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    // Keys pressed inside a row's own buttons (chevron, actions menu) belong to those buttons.
    if ((e.target as HTMLElement).getAttribute('role') !== 'treeitem') return;
    const idx = rows.findIndex((r) => r.key === focusKey);
    const row = rows[idx];
    if (!row) return;
    const go = (i: number) => { const r = rows[Math.max(0, Math.min(rows.length - 1, i))]; if (r) focusRow(r.key); };
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); go(idx + 1); break;
      case 'ArrowUp': e.preventDefault(); go(idx - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(rows.length - 1); break;
      case 'ArrowRight':
        e.preventDefault();
        if (row.expandable && !row.expanded) toggle(row.key, true);
        else if (row.expandable) go(idx + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (row.expandable && row.expanded) toggle(row.key, false);
        else if (row.parentKey) focusRow(row.parentKey);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(row);
        break;
      default:
    }
  };

  return (
    <div className="flex min-h-0 flex-col" data-tour="repo-tree">
      <ul role="tree" aria-label="Suites and sections" onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <li
            key={row.key}
            ref={(el) => { if (el) refs.current.set(row.key, el); else refs.current.delete(row.key); }}
            role="treeitem"
            aria-label={`${row.label}, ${row.count} cases`}
            aria-level={row.level}
            aria-setsize={row.setSize}
            aria-posinset={row.posInSet}
            aria-selected={sel === row.key}
            aria-expanded={row.expandable ? row.expanded : undefined}
            tabIndex={focusKey === row.key || (!rows.some((r) => r.key === focusKey) && row.key === 'all') ? 0 : -1}
            onFocus={() => setFocusKey(row.key)}
            onClick={(e) => { if (e.currentTarget.contains(e.target as Node) && !(e.target as Element).closest('[data-tree-action]')) choose(row); }}
            className={cn('group flex items-center rounded-md', sel === row.key ? 'bg-selected' : 'hover:bg-sunken')}
            style={{ paddingLeft: `${(row.level - 1) * 1}rem` }}
          >
            {row.expandable ? (
              <button type="button" tabIndex={-1} aria-hidden data-tree-action aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.label}`} onClick={() => toggle(row.key)} className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:text-ink pointer-coarse:size-9">
                {row.expanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
              </button>
            ) : <span className="inline-block size-6 shrink-0 pointer-coarse:size-9" aria-hidden />}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className={cn('flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-sm py-1 pr-1 text-left text-base pointer-coarse:min-h-11', sel === row.key ? 'font-semibold text-ink' : 'text-ink-secondary')}
            >
              {row.kind === 'all' ? <List className="size-4 shrink-0 text-ink-muted" aria-hidden /> : row.kind === 'suite' ? <Layers className="size-4 shrink-0 text-ink-muted" aria-hidden /> : null}
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              <span className="text-sm text-ink-muted tabular-nums" aria-hidden>{row.count}</span>
            </button>
            {row.kind !== 'all' && live ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" data-tree-action aria-label={`Actions for ${row.label}`} className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-subtle hover:text-ink focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:size-9 pointer-coarse:opacity-100">
                      <MoreHorizontal className="size-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {row.kind === 'suite' || !row.parentSectionId ? (
                      <DropdownMenuItem onSelect={() => setDlg({ kind: 'add-section', suiteId: row.suiteId as Id, parent: row.kind === 'section' ? row.sectionId : undefined, where: row.label })}>Add section</DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onSelect={() => setDlg({ kind: 'rename', row })}>Rename</DropdownMenuItem>
                    {row.kind === 'section' ? <DropdownMenuItem onSelect={() => setDlg({ kind: 'move', row })}>Move to...</DropdownMenuItem> : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {roleCan ? (
        <div className="border-t border-subtle pt-2">
          <RoleGate action="suites.write">
            <Button size="sm" variant="ghost" iconLeft={<FolderPlus className="size-4" aria-hidden />} onClick={() => setDlg({ kind: 'add-suite' })}>Add suite</Button>
          </RoleGate>
        </div>
      ) : null}
      <TreeDialogs projectId={projectId} tree={tree} dlg={dlg} close={() => setDlg(null)} />
    </div>
  );
}

function TreeDialogs({ projectId, tree, dlg, close }: { projectId: Id; tree: SuiteNode[]; dlg: Dlg | null; close: () => void }) {
  if (!dlg) return null;
  const key = dlg.kind === 'add-suite' ? 'add-suite' : dlg.kind === 'add-section' ? `add-${dlg.suiteId}-${dlg.parent ?? ''}` : `${dlg.kind}-${dlg.row.key}`;
  return <DialogBody key={key} projectId={projectId} tree={tree} dlg={dlg} close={close} />;
}

function DialogBody({ projectId, tree, dlg, close }: { projectId: Id; tree: SuiteNode[]; dlg: Dlg; close: () => void }) {
  const muts = useSuiteMutations(projectId);
  const edits = useSuiteEdits(projectId);
  const [name, setName] = useState(dlg.kind === 'rename' ? dlg.row.label : '');
  const [dest, setDest] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const hasChildren = dlg.kind === 'move' ? (tree.flatMap((s) => s.sections).find((n) => n.section.id === dlg.row.sectionId)?.children.length ?? 0) > 0 : false;
  const targets = dlg.kind === 'move' ? moveTargets(tree, dlg.row.sectionId as Id, hasChildren) : [];

  const finish = (msg: string) => { toast.success(msg); announce(msg); close(); };
  const fail = (e: Error) => setError(e.message);
  const settle = { onSettled: () => setBusy(false) };

  const submit = () => {
    setError(undefined);
    if (dlg.kind === 'move') {
      if (!dest) { setError('Choose where to move it.'); return; }
      const [suite, parent] = dest.split('|');
      setBusy(true);
      edits.moveSection.mutate({ id: dlg.row.sectionId as Id, suite: suite as Id, parent: parent || undefined }, { onSuccess: () => finish(`Moved ${dlg.row.label}.`), onError: fail, ...settle });
      return;
    }
    if (!name.trim()) { setError('Name is required.'); return; }
    setBusy(true);
    if (dlg.kind === 'add-suite') muts.createSuite.mutate({ name }, { onSuccess: () => finish(`Added suite ${name.trim()}.`), onError: fail, ...settle });
    else if (dlg.kind === 'add-section') muts.createSection.mutate({ suiteId: dlg.suiteId, name, parent: dlg.parent }, { onSuccess: () => finish(`Added section ${name.trim()}.`), onError: fail, ...settle });
    else if (dlg.row.kind === 'suite') edits.renameSuite.mutate({ id: dlg.row.suiteId as Id, name }, { onSuccess: () => finish(`Renamed to ${name.trim()}.`), onError: fail, ...settle });
    else muts.renameSection.mutate({ id: dlg.row.sectionId as Id, name }, { onSuccess: () => finish(`Renamed to ${name.trim()}.`), onError: fail, ...settle });
  };

  const title = dlg.kind === 'add-suite' ? 'Add suite' : dlg.kind === 'add-section' ? `Add section in ${dlg.where}` : dlg.kind === 'rename' ? `Rename ${dlg.row.label}` : `Move ${dlg.row.label}`;
  const action = dlg.kind === 'move' ? 'Move section' : dlg.kind === 'rename' ? 'Save name' : dlg.kind === 'add-suite' ? 'Add suite' : 'Add section';

  return (
    <Dialog
      open
      onOpenChange={(o) => { if (!o) close(); }}
      title={title}
      description={dlg.kind === 'move' ? (hasChildren ? 'This section has sub-sections, so it can only move to the top level of a suite. Its cases move with it.' : 'Its cases move with it.') : undefined}
      footer={(<><Button variant="outline" onClick={close}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>{action}</Button></>)}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {dlg.kind === 'move' ? (
          <FormField label="Move to" error={error} required>
            <Select options={targets} value={dest} onChange={setDest} placeholder="Choose a suite or section" />
          </FormField>
        ) : (
          <FormField label="Name" error={error} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          </FormField>
        )}
      </form>
    </Dialog>
  );
}
