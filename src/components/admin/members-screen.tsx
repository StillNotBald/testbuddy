'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Lock, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { RoleGate } from '@/components/tb/role-gate';
import { useCan } from '@/components/tb/project-context';
import { PageHeader } from '@/components/shell/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FormField, Input } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, type Option } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/permissions';
import { SidePanel } from '@/components/shell/side-panel';
import {
  useAddMember, useMemberCandidates, useMembers, useRemoveMember, useSession, useSetMemberRole,
} from '@/services/hooks';
import type { MemberView } from '@/services/interfaces';
import type { ProjectRole } from '@/services/types';
import { formatRelative, plural } from './format';

const ROLES: ProjectRole[] = ['admin', 'manager', 'tester', 'viewer'];
const ROLE_OPTIONS: Option[] = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));
const col = createColumnHelper<MemberView>();

export function MembersScreen({ projectId }: { projectId: string }) {
  const canView = useCan('members.view', { writes: false });
  const canChange = useCan('members.write');
  const session = useSession();
  const query = useMembers(projectId, canView);
  const setRole = useSetMemberRole(projectId);
  const remove = useRemoveMember(projectId);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<MemberView | null>(null);

  if (!canView) {
    return (
      <>
        <PageHeader title="Members" />
        <EmptyState icon={Lock} tone="locked" title="You do not have permission to view members" description="Ask an admin if you need access." />
      </>
    );
  }

  const members = query.data ?? [];
  const adminCount = members.filter((m) => m.member.role === 'admin').length;
  const isLastAdmin = (v: MemberView) => v.member.role === 'admin' && adminCount <= 1;
  const me = session.data?.user.id;

  const changeRole = (v: MemberView, next: ProjectRole) => {
    const prev = v.member.role;
    if (prev === next) return;
    setRole.mutate({ memberId: v.member.id, role: next }, {
      onSuccess: () => toast.undo({
        message: `${v.user.name} is now ${ROLE_LABEL[next]}.`,
        onUndo: () => setRole.mutate({ memberId: v.member.id, role: prev }, {
          onSuccess: () => toast.success(`${v.user.name} is back to ${ROLE_LABEL[prev]}.`),
          onError: (e) => toast.error(e.message),
        }),
      }),
      onError: (e) => toast.error(e.message),
    });
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.member.id);
      toast.success(`${removing.user.name} removed from this project`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this member.');
    }
  };

  const columns = [
    col.accessor((v) => v.user.name, {
      id: 'name', header: 'Name',
      cell: (c) => (
        <span className="font-medium text-ink">
          {c.getValue()}
          {c.row.original.user.id === me ? <span className="ml-1.5 font-normal text-ink-muted">(you)</span> : null}
        </span>
      ),
    }),
    col.accessor((v) => v.user.email, { id: 'email', header: 'Email', cell: (c) => <span className="text-ink-secondary">{c.getValue()}</span> }),
    col.accessor((v) => v.member.role, {
      id: 'role', header: 'Role',
      cell: (c) => {
        const v = c.row.original;
        if (!canChange) return <span data-tour="members-roles"><Badge tone="neutral">{ROLE_LABEL[v.member.role]}</Badge></span>;
        const locked = isLastAdmin(v);
        const select = (
          <Select
            options={ROLE_OPTIONS}
            value={v.member.role}
            onChange={(next) => { if (next) changeRole(v, next as ProjectRole); }}
            disabled={locked}
            aria-label={`Role for ${v.user.name}`}
            className="min-w-36"
          />
        );
        return (
          <span data-tour="members-roles" className="inline-flex">
            {locked ? <Tooltip content="A project needs at least one admin."><span tabIndex={0} className="inline-flex">{select}</span></Tooltip> : select}
          </span>
        );
      },
    }),
    col.accessor((v) => v.user.last_access ?? '', {
      id: 'access', header: 'Last access',
      cell: (c) => <span className="tabular-nums text-ink-secondary">{formatRelative(c.row.original.user.last_access)}</span>,
    }),
    col.display({
      id: 'actions', header: '',
      cell: (c) => {
        const v = c.row.original;
        if (!canChange) return null;
        const btn = (
          <Button variant="ghost" size="sm" disabled={isLastAdmin(v)} onClick={() => setRemoving(v)} aria-label={`Remove ${v.user.name}`}>Remove</Button>
        );
        return isLastAdmin(v)
          ? <Tooltip content="A project needs at least one admin."><span tabIndex={0} className="inline-flex">{btn}</span></Tooltip>
          : btn;
      },
    }),
  ] as ColumnDef<MemberView, unknown>[];

  return (
    <>
      <PageHeader
        title="Members"
        meta={query.data ? plural(members.length, 'member') : undefined}
        actions={(
          <>
            <RoleExplainer />
            <RoleGate action="members.write">
              <Button variant="primary" onClick={() => setAdding(true)} data-tour="members-invite">Add member</Button>
            </RoleGate>
          </>
        )}
      />

      {query.isLoading ? (
        <div role="status" aria-label="Loading members" className="space-y-2"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>
      ) : query.isError ? (
        <EmptyState tone="error" title="Could not load members" description={query.error.message} action={<Button onClick={() => void query.refetch()}>Retry</Button>} />
      ) : (
        <DataTable
          caption="Project members"
          columns={columns}
          data={members}
          rowId={(v) => v.member.id}
          emptyState={(
            <EmptyState icon={Users} title="No members yet." description="Add someone from the workspace to start."
              action={<RoleGate action="members.write"><Button variant="primary" onClick={() => setAdding(true)}>Add member</Button></RoleGate>} />
          )}
        />
      )}

      <AddMemberPanel projectId={projectId} open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => { if (!o) setRemoving(null); }}
        title={`Remove ${removing?.user.name ?? 'member'}?`}
        description="They lose access to this project. Results they recorded stay in place."
        confirmLabel={`Remove ${removing?.user.name ?? 'member'}`}
        tone="danger"
        onConfirm={confirmRemove}
      />
    </>
  );
}

function RoleExplainer() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">What can each role do?</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-3 p-4">
        <dl className="space-y-3">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="text-base font-semibold text-ink">{ROLE_LABEL[r]}</dt>
              <dd className="text-sm text-ink-secondary">{ROLE_DESCRIPTION[r]}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function AddMemberPanel({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="Add member" description="Only people in this workspace who are not yet in the project.">
      {open ? <AddMemberForm projectId={projectId} onDone={() => onOpenChange(false)} /> : null}
    </SidePanel>
  );
}

function AddMemberForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState<string>();
  const [role, setRole] = useState<ProjectRole>('tester');
  const [error, setError] = useState<string>();
  const candidates = useMemberCandidates(projectId, q.trim());
  const add = useAddMember(projectId);
  const options: Option[] = (candidates.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Choose a person to add.');
      return;
    }
    add.mutate({ userId, role }, {
      onSuccess: () => { toast.success('Member added'); onDone(); },
      onError: (err) => setError(err.message),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col gap-4">
      <div className="space-y-4">
        <FormField label="Search workspace users">
          <Input type="search" value={q} onChange={(e) => { setQ(e.target.value); setUserId(undefined); }} placeholder="Name or email" />
        </FormField>
        <FormField label="Person" required error={error}>
          <Select options={options} value={userId} onChange={(v) => { setUserId(v); setError(undefined); }} placeholder={candidates.isLoading ? 'Loading people' : 'Choose a person'} />
        </FormField>
        {!candidates.isLoading && options.length === 0 ? (
          <p className="text-sm text-ink-muted">No one matches. Try another name or email.</p>
        ) : null}
        <FormField label="Role" hint={ROLE_DESCRIPTION[role]}>
          <Select options={ROLE_OPTIONS} value={role} onChange={(v) => setRole((v as ProjectRole) ?? 'tester')} />
        </FormField>
      </div>
      <div className="mt-auto flex justify-end gap-2 border-t border-subtle pt-4">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" loading={add.isPending}>Add member</Button>
      </div>
    </form>
  );
}
