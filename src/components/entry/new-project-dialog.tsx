'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormField, Input, Textarea } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { useCreateProject, useServices } from '@/services/hooks';
import { ServiceError } from '@/services/interfaces';
import type { Id, Project } from '@/services/types';

const PREFIX = /^[A-Z0-9]{2,10}$/;

export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: Id;
  /** Called with the new project. The caller decides where to go next. */
  onCreated: (project: Project) => void;
}

/** Create project (DESIGN.md 6.2): name, ref prefix (2-10 chars, unique, cannot change later), optional announcement. */
export function NewProjectDialog({ open, onOpenChange, workspaceId, onCreated }: NewProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New project" description="The prefix labels every case in this project, for example CORE-C41. It cannot change later.">
      {open ? <NewProjectForm workspaceId={workspaceId} onCancel={() => onOpenChange(false)} onCreated={onCreated} /> : null}
    </Dialog>
  );
}

function NewProjectForm({ workspaceId, onCancel, onCreated }: Omit<NewProjectDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const create = useCreateProject();
  const s = useServices();
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [errors, setErrors] = useState<{ name?: string; prefix?: string; form?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const prefixRef = useRef<HTMLInputElement>(null);

  const checkPrefix = async () => {
    const p = prefix.trim().toUpperCase();
    if (!PREFIX.test(p)) return;
    try {
      const free = await s.projects.prefixAvailable(workspaceId, p);
      setErrors((e) => ({ ...e, prefix: free ? undefined : 'This prefix is already used in this workspace.' }));
    } catch {
      // The server check on submit is authoritative.
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Enter a project name.';
    if (!PREFIX.test(prefix.trim().toUpperCase())) next.prefix = 'Use 2-10 characters: A-Z and 0-9.';
    setErrors(next);
    if (next.name || next.prefix) {
      (next.name ? nameRef : prefixRef).current?.focus();
      return;
    }
    create.mutate(
      { workspace: workspaceId, name: name.trim(), ref_prefix: prefix.trim().toUpperCase(), announcement: announcement.trim() || undefined },
      {
        onSuccess: (project) => { toast.success(`Created ${project.name}`); onCreated(project); },
        onError: (err) => {
          const details = err instanceof ServiceError ? err.details ?? {} : {};
          setErrors({
            name: details.name ? err.message : undefined,
            prefix: details.ref_prefix ? err.message : undefined,
            form: details.name || details.ref_prefix ? undefined : err.message,
          });
        },
      },
    );
  };

  return (
    <form id="new-project-form" onSubmit={submit} className="space-y-4" noValidate>
      {errors.form ? <p role="alert" className="text-sm text-status-failed-text">{errors.form}</p> : null}
      <FormField label="Project name" required error={errors.name}>
        <Input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </FormField>
      <FormField label="Ref prefix" required error={errors.prefix} hint="2-10 characters: A-Z and 0-9. Unique in the workspace. Cannot change later.">
        <Input ref={prefixRef} value={prefix} maxLength={10} className="uppercase" autoComplete="off"
          onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onBlur={() => void checkPrefix()} />
      </FormField>
      <FormField label="Announcement" hint="Optional. Shown on the project overview.">
        <Textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} rows={2} />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={create.isPending}>Create project</Button>
      </div>
    </form>
  );
}
