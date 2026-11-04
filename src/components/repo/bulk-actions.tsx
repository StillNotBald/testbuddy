'use client';

import { FolderInput, Play, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RoleGate } from '@/components/tb/role-gate';
import { Button, buttonStyles, ConfirmDialog, Dialog, FormField, Select, toast } from '@/components/ui';
import { announce } from '@/lib/announcer';
import { useCaseMutations, useCaseTypes, usePriorities, useSuiteTree } from '@/services/hooks';
import type { Id } from '@/services/types';
import { sectionChoices } from './repo-utils';

type Mode = 'priority' | 'type' | 'move' | 'deprecate' | 'delete';

export interface BulkBarProps {
  projectId: Id;
  ids: Id[];
  onClear: () => void;
}

/** Bulk actions for the selected cases. Only rendered for roles that can write cases. */
export function BulkBar({ projectId, ids, onClear }: BulkBarProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const n = ids.length;
  const noun = `${n} ${n === 1 ? 'case' : 'cases'}`;
  return (
    <div role="region" aria-label="Bulk actions" className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-subtle bg-selected px-3 py-2">
      <b className="text-base text-ink" aria-live="polite">{n} selected</b>
      <Button size="sm" variant="outline" onClick={() => setMode('priority')}>Set priority</Button>
      <Button size="sm" variant="outline" onClick={() => setMode('type')}>Set type</Button>
      <Button size="sm" variant="outline" iconLeft={<FolderInput className="size-4" aria-hidden />} onClick={() => setMode('move')}>Move to</Button>
      <RoleGate action="runs.write">
        <Link href={`/p/${projectId}/runs/new?cases=${ids.join(',')}`} className={buttonStyles({ size: 'sm', variant: 'outline' })}><Play className="size-4" aria-hidden />Add to run</Link>
      </RoleGate>
      <Button size="sm" variant="outline" onClick={() => setMode('deprecate')}>Deprecate</Button>
      <Button size="sm" variant="outline" iconLeft={<Trash2 className="size-4" aria-hidden />} onClick={() => setMode('delete')}>Delete</Button>
      <Button size="sm" variant="ghost" className="ml-auto" iconLeft={<X className="size-4" aria-hidden />} onClick={onClear}>Clear selection</Button>
      <BulkDialogs projectId={projectId} ids={ids} noun={noun} mode={mode} close={() => setMode(null)} done={onClear} />
    </div>
  );
}

function BulkDialogs({ projectId, ids, noun, mode, close, done }: { projectId: Id; ids: Id[]; noun: string; mode: Mode | null; close: () => void; done: () => void }) {
  const muts = useCaseMutations(projectId);
  const priorities = usePriorities();
  const types = useCaseTypes();
  const tree = useSuiteTree(projectId);
  const [value, setValue] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const finish = (msg: string) => { toast.success(msg); announce(msg); setValue(undefined); done(); };
  const shut = () => { setValue(undefined); setError(undefined); close(); };

  const apply = (patch: Parameters<typeof muts.bulkUpdate.mutate>[0]['patch'], msg: string) =>
    muts.bulkUpdate.mutate({ ids, patch }, { onSuccess: () => { finish(msg); close(); }, onError: (e) => setError(e.message) });

  if (mode === 'priority' || mode === 'type' || mode === 'move') {
    const cfg = {
      priority: { title: 'Set priority', label: 'Priority', options: (priorities.data ?? []).map((p) => ({ value: p.id, label: `${p.short_name} ${p.name}` })), run: () => apply({ priority: value }, `Set priority on ${noun}.`) },
      type: { title: 'Set type', label: 'Type', options: (types.data ?? []).map((t) => ({ value: t.id, label: t.name })), run: () => apply({ type: value }, `Set type on ${noun}.`) },
      move: { title: 'Move to section', label: 'Section', options: sectionChoices(tree.data ?? []).map((s) => ({ value: s.value, label: s.label })), run: () => apply({ section: value }, `Moved ${noun}.`) },
    }[mode];
    return (
      <Dialog open onOpenChange={(o) => { if (!o) shut(); }} title={`${cfg.title} for ${noun}`}
        footer={(<><Button variant="outline" onClick={shut}>Cancel</Button><Button variant="primary" loading={muts.bulkUpdate.isPending} onClick={() => (value ? cfg.run() : setError(`Choose a ${cfg.label.toLowerCase()}.`))}>{mode === 'move' ? 'Move cases' : 'Apply'}</Button></>)}>
        <FormField label={cfg.label} error={error} required>
          <Select options={cfg.options} value={value} onChange={setValue} placeholder={`Choose a ${cfg.label.toLowerCase()}`} />
        </FormField>
      </Dialog>
    );
  }
  return (
    <>
      <ConfirmDialog open={mode === 'deprecate'} onOpenChange={(o) => { if (!o) shut(); }} title={`Deprecate ${noun}?`}
        description="Deprecated cases are hidden from the list and cannot be added to new runs. Results are kept."
        confirmLabel={`Deprecate ${noun}`}
        onConfirm={async () => { await muts.bulkUpdate.mutateAsync({ ids, patch: { deprecated: true, deprecated_reason: 'Deprecated from the repository.' } }); finish(`Deprecated ${noun}.`); }} />
      <ConfirmDialog open={mode === 'delete'} onOpenChange={(o) => { if (!o) shut(); }} title={`Delete ${noun}?`} tone="danger"
        description="Cases that have results are deprecated instead of deleted, so results in closed runs are kept."
        confirmLabel={`Delete ${noun}`}
        onConfirm={async () => { const r = await muts.remove.mutateAsync(ids); finish(`Deleted ${r.deleted}${r.deprecated ? `, deprecated ${r.deprecated} that have results` : ''}.`); }} />
    </>
  );
}
