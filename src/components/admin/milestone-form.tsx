'use client';

import { useState, type FormEvent } from 'react';
import { SidePanel } from '@/components/shell/side-panel';
import { Button } from '@/components/ui/button';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { useMilestoneMutations } from '@/services/hooks';
import type { Milestone } from '@/services/types';

export interface MilestoneFormPanelProps {
  projectId: string;
  /** Present when editing. */
  milestone?: Milestone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Create or edit a milestone in a right-hand panel. Manager+ only (the caller gates the entry point). */
export function MilestoneFormPanel({ projectId, milestone, open, onOpenChange }: MilestoneFormPanelProps) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title={milestone ? 'Edit milestone' : 'New milestone'} description="A release or date goal that plans and runs roll up into.">
      {/* Mounted only while open, so every open starts from a clean form. */}
      {open ? <MilestoneForm projectId={projectId} milestone={milestone} onDone={() => onOpenChange(false)} /> : null}
    </SidePanel>
  );
}

function MilestoneForm({ projectId, milestone, onDone }: { projectId: string; milestone?: Milestone; onDone: () => void }) {
  const mut = useMilestoneMutations(projectId);
  const [title, setTitle] = useState(milestone?.title ?? '');
  const [due, setDue] = useState(milestone?.expires_on?.slice(0, 10) ?? '');
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [refs, setRefs] = useState(milestone?.refs ?? '');
  const [titleError, setTitleError] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const busy = milestone ? mut.update.isPending : mut.create.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setTitleError('Enter a title.');
      return;
    }
    setServerError(undefined);
    const patch = {
      title: clean,
      description: description.trim() || undefined,
      expires_on: due ? `${due}T00:00:00.000Z` : undefined,
      refs: refs.trim() || undefined,
    };
    const onError = (err: Error) => setServerError(err.message);
    if (milestone) {
      mut.update.mutate({ id: milestone.id, patch }, {
        onSuccess: () => { toast.success('Milestone saved'); onDone(); },
        onError,
      });
    } else {
      mut.create.mutate({ project: projectId, ...patch }, {
        onSuccess: () => { toast.success('Milestone created'); onDone(); },
        onError,
      });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col gap-4">
      <div className="space-y-4">
        <FormField label="Title" required error={titleError}>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(undefined); }} />
        </FormField>
        <FormField label="Due date" hint="Optional. Overdue milestones are flagged in the list.">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </FormField>
        <FormField label="Description" hint="Optional. Shown on the milestone page.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Refs" hint="Optional. Ticket or release ids, comma separated.">
          <Input value={refs} onChange={(e) => setRefs(e.target.value)} />
        </FormField>
        {serverError ? <p role="alert" className="text-sm text-status-failed-text">{serverError}</p> : null}
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-subtle pt-4">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={busy}>{milestone ? 'Save milestone' : 'Create milestone'}</Button>
      </div>
    </form>
  );
}
