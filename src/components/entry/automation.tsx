'use client';

import { Copy, KeyRound, Lock, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useUrlParam } from '@/lib/use-url-state';
import { useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useProjectRole } from '@/components/tb/project-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, Dialog } from '@/components/ui/dialog';
import { FormField, Input } from '@/components/ui/form';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { can, ROLE_LABEL } from '@/lib/permissions';
import { useAutomationMutations, useCiTokens, useExecutions, useMappings } from '@/services/hooks';
import { ServiceError, type ExecutionView } from '@/services/interfaces';
import type { AutomationFramework, AutomationMapping, CiToken, ExecutionStatus } from '@/services/types';
import { absoluteTime, relativeTime } from './format';

const FRAMEWORK_LABEL: Record<AutomationFramework, string> = { junit: 'JUnit XML', robot: 'Robot Framework', pytest: 'pytest', custom: 'Custom' };
const EXECUTION_META: Record<ExecutionStatus, { label: string; tone: 'success' | 'danger' | 'info' }> = {
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'info' },
};

/**
 * Automation (DESIGN.md 6.13). Tabs follow ?tab= so the guide can open each one. CI tokens are admin-only;
 * everyone else sees a no-permission state in that tab. The how-to is always on the page.
 */
export function AutomationScreen({ projectId }: { projectId: string }) {
  const role = useProjectRole();
  const isAdmin = can(role, 'automation.tokens');
  const canMappings = can(role, 'automation.mappings');
  const defaultTab = isAdmin ? 'tokens' : canMappings ? 'mappings' : 'executions';
  const [tabParam, setTab] = useUrlParam('tab', defaultTab);
  const visible = canMappings ? ['tokens', 'mappings', 'executions'] : ['tokens', 'executions'];
  const active = visible.includes(tabParam) ? tabParam : defaultTab;

  const tabs = [
    { value: 'tokens', label: 'CI tokens', content: <div data-tour="automation-tokens"><TokensPanel projectId={projectId} isAdmin={isAdmin} /></div> },
    { value: 'mappings', label: 'Mappings', hidden: !canMappings, content: <div data-tour="automation-mappings"><MappingsPanel projectId={projectId} allowed={canMappings} /></div> },
    { value: 'executions', label: 'Executions', content: <div data-tour="automation-executions"><ExecutionsPanel projectId={projectId} /></div> },
  ];

  return (
    <>
      <PageHeader title="Automation" meta="Post results from CI. Each batch lands in one open run, under a token's permissions." />
      <Tabs items={tabs} value={active} onValueChange={(v) => setTab(v)} />
      <HowTo projectId={projectId} />
    </>
  );
}

function LockedState({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={Lock} tone="locked" title={title} description={description} />;
}

function TokensPanel({ projectId, isAdmin }: { projectId: string; isAdmin: boolean }) {
  const tokens = useCiTokens(projectId, isAdmin);
  const mappings = useMappings(projectId, isAdmin);
  const mutations = useAutomationMutations(projectId);
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [revoking, setRevoking] = useState<CiToken | null>(null);

  if (!isAdmin) return <LockedState title="You do not have permission to view CI tokens" description="Ask a project admin for a token, or to connect your CI." />;
  if (tokens.isError) return <EmptyState tone="error" title="Could not load CI tokens" description={tokens.error.message} action={<Button onClick={() => void tokens.refetch()}>Retry</Button>} />;

  const mappingList = mappings.data ?? [];
  const live = (tokens.data ?? []).filter((t) => !t.revoked);
  const mappingName = (id: string) => {
    const m = mappingList.find((x) => x.id === id);
    return m ? FRAMEWORK_LABEL[m.framework] : 'Unknown mapping';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-ink-muted">Tokens authenticate CI jobs. The secret is shown once, when you create it.</p>
        {mappingList.length === 0 && !mappings.isLoading ? (
          <span className="text-sm text-ink-muted">Create a mapping before you create a token.</span>
        ) : null}
        <Button variant="primary" iconLeft={<Plus className="size-4" aria-hidden />} disabled={mappingList.length === 0} onClick={() => setCreateOpen(true)}>Create token</Button>
      </div>

      {tokens.isLoading ? <Skeleton className="h-24" /> : live.length === 0 ? (
        <EmptyState icon={KeyRound} title="No CI tokens yet" description="Create a token so your CI can post results." action={mappingList.length ? <Button variant="primary" onClick={() => setCreateOpen(true)}>Create token</Button> : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-subtle bg-surface">
          <table className="w-full min-w-[40rem] text-left text-base">
            <caption className="sr-only">CI tokens for this project</caption>
            <thead className="bg-sunken text-sm text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Name</th>
                <th scope="col" className="px-3 py-2 font-medium">Mapping</th>
                <th scope="col" className="px-3 py-2 font-medium">Token</th>
                <th scope="col" className="px-3 py-2 font-medium">Created</th>
                <th scope="col" className="px-3 py-2 font-medium">Last used</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {live.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className="px-3 py-2 font-medium text-ink">{t.name}</th>
                  <td className="px-3 py-2 text-ink-secondary">{mappingName(t.mapping)}</td>
                  <td className="px-3 py-2 font-mono text-sm text-ink-secondary">{t.prefix}…{t.last4}</td>
                  <td className="px-3 py-2 text-ink-secondary"><time dateTime={t.created}>{absoluteTime(t.created)}</time></td>
                  <td className="px-3 py-2 text-ink-secondary">{relativeTime(t.last_used)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setRevoking(t)} aria-label={`Revoke ${t.name}`} iconLeft={<Trash2 className="size-4" aria-hidden />}>Revoke</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateTokenDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mappings={mappingList}
        busy={mutations.createToken.isPending}
        onSubmit={(name, mappingId) => mutations.createToken.mutate({ name, mappingId }, {
          onSuccess: ({ secret: value, token }) => { setCreateOpen(false); setSecret({ name: token.name, value }); },
          onError: (err) => toast.error(err instanceof ServiceError ? err.message : 'Could not create the token. Try again.'),
        })}
      />

      <SecretDialog secret={secret} onClose={() => setSecret(null)} />

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => { if (!o) setRevoking(null); }}
        title={revoking ? `Revoke ${revoking.name}?` : 'Revoke token?'}
        description="CI jobs that use this token stop posting results right away. Type the token name to confirm."
        confirmLabel={revoking ? `Revoke ${revoking.name}` : 'Revoke'}
        tone="danger"
        requireText={revoking?.name}
        onConfirm={async () => {
          if (!revoking) return;
          await mutations.revokeToken.mutateAsync(revoking.id);
          toast.success(`Revoked ${revoking.name}`);
          setRevoking(null);
        }}
      />
    </div>
  );
}

function CreateTokenDialog({ open, onOpenChange, mappings, busy, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; mappings: AutomationMapping[]; busy: boolean; onSubmit: (name: string, mappingId: string) => void }) {
  const [name, setName] = useState('');
  const [mappingId, setMappingId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const chosen = mappingId ?? mappings[0]?.id;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter a token name, for example gh-actions.'); return; }
    if (!chosen) return;
    setError(undefined);
    onSubmit(name.trim(), chosen);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create CI token" description="Name it after the job that uses it.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Token name" required error={error}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </FormField>
        <FormField label="Mapping" hint="Decides how test names in the CI output match cases.">
          <Select
            options={mappings.map((m) => ({ value: m.id, label: FRAMEWORK_LABEL[m.framework] }))}
            value={chosen}
            onChange={(v) => setMappingId(v)}
            aria-label="Mapping"
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Create token</Button>
        </div>
      </form>
    </Dialog>
  );
}

function SecretDialog({ secret, onClose }: { secret: { name: string; value: string } | null; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.value);
      toast.success('Token copied');
    } catch {
      toast.error('Copy failed. Select the token and copy it by hand.');
    }
  };
  return (
    <Dialog
      open={!!secret}
      onOpenChange={(o) => { if (!o) { setSaved(false); onClose(); } }}
      title={`Copy the ${secret?.name ?? ''} token now`}
      description="You will not see it again. Store it as a secret in your CI."
      footer={<Button variant="primary" disabled={!saved} onClick={() => { setSaved(false); onClose(); }}>Done</Button>}
    >
      <div className="space-y-3">
        <div className="flex items-stretch gap-2">
          <code className="min-w-0 flex-1 break-all rounded-md border border-subtle bg-sunken px-3 py-2 font-mono text-sm text-ink">{secret?.value}</code>
          <Button variant="secondary" iconLeft={<Copy className="size-4" aria-hidden />} onClick={() => void copy()}>Copy</Button>
        </div>
        <label className="inline-flex min-h-8 items-center gap-2 text-base text-ink pointer-coarse:min-h-11">
          <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
          I have saved it
        </label>
      </div>
    </Dialog>
  );
}

function MappingsPanel({ projectId, allowed }: { projectId: string; allowed: boolean }) {
  const mappings = useMappings(projectId, allowed);
  if (!allowed) return <LockedState title="You do not have permission to view mappings" description="Ask a project manager or admin." />;
  if (mappings.isError) return <EmptyState tone="error" title="Could not load mappings" description={mappings.error.message} action={<Button onClick={() => void mappings.refetch()}>Retry</Button>} />;
  if (mappings.isLoading) return <Skeleton className="h-24" />;
  const list = mappings.data ?? [];
  if (list.length === 0) {
    return <EmptyState title="No mappings" description={<>Connect your CI to post results automatically. <a href="#how-to" className="text-accent-text underline">See how</a>.</>} />;
  }
  return (
    <ul className="divide-y divide-subtle overflow-hidden rounded-md border border-subtle bg-surface">
      {list.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <div className="font-medium text-ink">{FRAMEWORK_LABEL[m.framework]}</div>
            <div className="text-sm text-ink-muted">Matches tests by <code className="font-mono">{String(m.field_map?.match ?? 'name')}</code></div>
          </div>
          <Badge tone={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Active' : 'Paused'}</Badge>
        </li>
      ))}
    </ul>
  );
}

function ExecutionsPanel({ projectId }: { projectId: string }) {
  const q = useExecutions(projectId);
  if (q.isError) return <EmptyState tone="error" title="Could not load executions" description={q.error.message} action={<Button onClick={() => void q.refetch()}>Retry</Button>} />;
  if (q.isLoading) return <Skeleton className="h-24" />;
  const list: ExecutionView[] = q.data ?? [];
  if (list.length === 0) {
    return <EmptyState title="No executions yet" description="Each batch your CI posts is listed here, with its counts and status." />;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-subtle bg-surface">
      <table className="w-full min-w-[46rem] text-left text-base">
        <caption className="sr-only">Automation executions</caption>
        <thead className="bg-sunken text-sm text-ink-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">External id</th>
            <th scope="col" className="px-3 py-2 font-medium">Build</th>
            <th scope="col" className="px-3 py-2 font-medium">Branch</th>
            <th scope="col" className="px-3 py-2 font-medium">Commit</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Passed / failed</th>
            <th scope="col" className="px-3 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-subtle">
          {list.map(({ execution: e, run }) => {
            const meta = EXECUTION_META[e.status];
            const passed = typeof e.summary?.passed === 'number' ? e.summary.passed : '-';
            const failed = typeof e.summary?.failed === 'number' ? e.summary.failed : '-';
            return (
              <tr key={e.id}>
                <th scope="row" className="px-3 py-2 font-mono text-sm font-medium text-ink">{e.external_execution_id}</th>
                <td className="px-3 py-2 text-ink-secondary">{e.build ?? '-'}</td>
                <td className="px-3 py-2 text-ink-secondary">{e.branch ?? '-'}</td>
                <td className="px-3 py-2 font-mono text-sm text-ink-secondary">{e.commit ? e.commit.slice(0, 7) : '-'}</td>
                <td className="px-3 py-2"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                <td className="px-3 py-2 tabular-nums text-ink-secondary">{passed} / {failed}</td>
                <td className="px-3 py-2 text-ink-secondary">
                  {run ? <Link href={`/p/${projectId}/runs/${run.id}`} className="text-accent-text underline">{relativeTime(e.created)}</Link> : relativeTime(e.created)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HowTo({ projectId }: { projectId: string }) {
  const sample = `curl -X POST "$TB_URL/api/v1/post_results_automation/${projectId}" \\
  -H "X-API-Token: $TB_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"execution":{"external_execution_id":"ci-1234","run_id":"<open run id>","build":"2.4-rc1","branch":"main","commit":"a1b2c3d"},
       "results":[{"case_ref":"CORE-C41","status":"failed","comment":"Locked after 4 attempts"}]}'`;
  return (
    <Card id="how-to" className="mt-4 space-y-3">
      <CardHeader className="mb-0"><CardTitle>How to post results from CI</CardTitle></CardHeader>
      <ol className="list-decimal space-y-2 pl-5 text-base text-ink">
        <li>An admin creates a token in the CI tokens tab and copies it once.</li>
        <li>Store the token in your CI as a secret named <code className="font-mono">TB_TOKEN</code>. Never commit it.</li>
        <li>Set <code className="font-mono">TB_URL</code> to your TestBuddy address. Post one batch per run. Use an open run id from <Link href={`/p/${projectId}/runs`} className="text-accent-text underline">Runs</Link>. Re-sending the same <code className="font-mono">external_execution_id</code> with the same results is safe.</li>
      </ol>
      <pre tabIndex={0} role="region" aria-label="Sample request" className="overflow-x-auto rounded-md border border-subtle bg-sunken p-3 font-mono text-sm text-ink"><code>{sample}</code></pre>
      <p className="text-sm text-ink-muted">Results use the statuses Passed, Failed, Blocked and Retest. The response lists any case refs that did not match a case.</p>
      <p className="text-sm text-ink-muted">Roles: {ROLE_LABEL.admin} creates tokens. {ROLE_LABEL.manager} edits mappings. Everyone can read executions.</p>
    </Card>
  );
}
