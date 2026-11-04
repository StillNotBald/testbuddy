'use client';

import { AlertTriangle, ArrowDown, ArrowUp, History, Plus, SearchX, Smartphone, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/shell/page-header';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { Badge, Button, buttonStyles, ConfirmDialog, FormField, Input, Select, Skeleton, Textarea, toast } from '@/components/ui';
import { announce } from '@/lib/announcer';
import { safeGet, safeSet, useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { useCase, useCaseMutations, useCaseTypes, useCaseUsage, useCreateTag, usePriorities, useSaveCase, useSuiteTree, useTags } from '@/services/hooks';
import { ServiceError, type CaseDetail } from '@/services/interfaces';
import type { AutomationStatus, Id } from '@/services/types';
import { CaseInspector } from './case-inspector';
import { AUTOMATION_OPTIONS, estimateInput, parseEstimate, sectionChoices } from './repo-utils';

interface FormState {
  title: string;
  content: string;
  priority?: Id;
  type?: Id;
  automation: AutomationStatus;
  estimate: string;
  refs: string;
  section?: Id;
  tagIds: Id[];
  steps: Array<{ key: string; description: string; expected: string }>;
  note: string;
}

let keySeq = 0;
const newKey = () => `s${++keySeq}`;

function fromDetail(d: CaseDetail): FormState {
  return {
    title: d.case.title, content: d.case.content ?? '', priority: d.case.priority, type: d.case.type, automation: d.case.automation_status,
    estimate: estimateInput(d.case.estimate), refs: d.case.refs ?? '', section: d.case.section, tagIds: [...d.tag_ids].sort(),
    steps: d.steps.map((s) => ({ key: newKey(), description: s.description, expected: s.expected_result ?? '' })), note: '',
  };
}

const blank = (section?: Id): FormState => ({ title: '', content: '', automation: 'not_specified', estimate: '', refs: '', section, tagIds: [], steps: [{ key: newKey(), description: '', expected: '' }], note: '' });
const sig = (f: FormState) => JSON.stringify({ ...f, steps: f.steps.map((s) => [s.description, s.expected]), tagIds: [...f.tagIds].sort(), note: '' });

export function CaseEditorScreen({ creating = false }: { creating?: boolean }) {
  const { projectId } = useProjectContext();
  const params = useParams<{ caseId?: string }>();
  const caseId = creating ? undefined : params.caseId;
  const phone = useMediaQuery('(max-width: 767px)');
  const canWrite = useCan('cases.write');
  const q = useCase(caseId);
  const back = `/p/${projectId}/cases`;

  if (!creating && q.isPending) return <div role="status" aria-label="Loading case" className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!creating && q.isError) {
    const missing = q.error instanceof ServiceError && q.error.code === 'not_found';
    return missing
      ? <EmptyState icon={SearchX} title="Not found" description="This case does not exist or was deleted." action={<Link href={back} className={buttonStyles({ variant: 'outline' })}>Back to cases</Link>} />
      : <EmptyState icon={AlertTriangle} tone="error" title="This case could not be loaded." description={q.error.message} action={<Button variant="outline" onClick={() => q.refetch()}>Retry</Button>} />;
  }

  if (!canWrite || phone) {
    const why = phone ? 'Open on a larger screen to edit.' : 'You can view this case but not change it.';
    return (
      <>
        <PageHeader title={creating ? 'New case' : q.data?.case.ref ?? 'Case'} breadcrumbs={[{ label: 'Cases', href: back }, { label: creating ? 'New case' : 'Case' }]} />
        <p className="mb-4 flex items-center gap-2 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary" role="status"><Smartphone className="size-4 shrink-0" aria-hidden />{why}</p>
        {creating ? <EmptyState title="Nothing to edit here" description="Cases are created by testers, managers and admins on a larger screen." action={<Link href={back} className={buttonStyles({ variant: 'outline' })}>Back to cases</Link>} /> : caseId ? <CaseInspector projectId={projectId} caseId={caseId} /> : null}
      </>
    );
  }
  return <EditorForm key={caseId ?? 'new'} projectId={projectId} detail={q.data} />;
}

function EditorForm({ projectId, detail }: { projectId: Id; detail?: CaseDetail }) {
  const router = useRouter();
  const search = useSearchParams();
  const tree = useSuiteTree(projectId);
  const priorities = usePriorities();
  const types = useCaseTypes();
  const tags = useTags(projectId);
  const usage = useCaseUsage(detail?.case.id);
  const muts = useCaseMutations(projectId);
  const save = useSaveCase(projectId);
  const createTag = useCreateTag(projectId);
  const sections = useMemo(() => sectionChoices(tree.data ?? []), [tree.data]);

  const initial = useMemo(() => (detail ? fromDetail(detail) : blank(search.get('section') ?? undefined)), [detail, search]);
  const [form, setForm] = useState<FormState>(initial);
  const [baseline, setBaseline] = useState(() => sig(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [leave, setLeave] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [version, setVersion] = useState(detail?.case.version ?? 0);
  const draftKey = `testbuddy.case-draft.${detail?.case.id ?? 'new'}`;
  const [draft, setDraft] = useState<FormState | null>(() => {
    const raw = typeof window === 'undefined' ? null : safeGet(draftKey);
    if (!raw) return null;
    try { const d = JSON.parse(raw) as FormState; return sig(d) !== sig(initial) ? d : null; } catch { return null; }
  });
  const firstInvalid = useRef<string | null>(null);

  const dirty = sig(form) !== baseline;
  const hasResults = (usage.data ?? []).some((u) => u.status_key !== 'untested');

  // Draft kept locally; offered back on the next visit.
  useEffect(() => {
    if (dirty) safeSet(draftKey, JSON.stringify(form));
  }, [form, dirty, draftKey]);

  // Dirty-state guard: browser unload plus in-app links.
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href]');
      const href = a?.getAttribute('href');
      if (!a || !href || !href.startsWith('/') || a.getAttribute('target') === '_blank') return;
      e.preventDefault();
      e.stopPropagation();
      setLeave(href);
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true); };
  }, [dirty]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setStep = (i: number, patch: Partial<FormState['steps'][number]>) => setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const moveStep = (i: number, d: -1 | 1) => setForm((f) => {
    const steps = [...f.steps];
    const [s] = steps.splice(i, 1);
    steps.splice(i + d, 0, s as FormState['steps'][number]);
    return { ...f, steps };
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.section) e.section = 'Choose a section.';
    if (Number.isNaN(parseEstimate(form.estimate))) e.estimate = 'Use minutes or a form like 1h 30m.';
    form.steps.forEach((s, i) => { if (!s.description.trim()) e[`step-${i}`] = `Step ${i + 1} needs a description.`; });
    setErrors(e);
    const first = Object.keys(e)[0];
    firstInvalid.current = first ?? null;
    if (first) {
      announce(`${Object.keys(e).length} ${Object.keys(e).length === 1 ? 'problem' : 'problems'} to fix`, 'assertive');
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus());
    }
    return !first;
  };

  const submit = (coalesce: boolean) => {
    setFormError(null);
    if (!validate()) return;
    const sec = sections.find((s) => s.value === form.section);
    const input = {
      project: projectId, suite: sec?.suiteId as Id, section: form.section as Id, title: form.title.trim(), content: form.content.trim() || undefined,
      priority: form.priority, type: form.type, automation_status: form.automation, estimate: parseEstimate(form.estimate), refs: form.refs.trim() || undefined,
      steps: form.steps.map((s) => ({ description: s.description.trim(), expected_result: s.expected.trim() || undefined })), tag_ids: form.tagIds,
    };
    const fail = (err: Error) => {
      if (err instanceof ServiceError && err.code === 'conflict') { setConflict(err.message); announce(err.message, 'assertive'); return; }
      setFormError(err.message);
      announce(err.message, 'assertive');
    };
    if (!detail) {
      muts.create.mutate(input, {
        onSuccess: (d) => { safeSet(draftKey, ''); setBaseline(sig(form)); toast.success(`Created ${d.case.ref}.`); announce(`Created ${d.case.ref}`); router.push(`/p/${projectId}/cases?case=${d.case.id}`); },
        onError: fail,
      });
      return;
    }
    save.mutate({ id: detail.case.id, input, note: form.note, expectedVersion: version, coalesce }, {
      onSuccess: (d) => {
        safeSet(draftKey, '');
        const next = fromDetail(d);
        setBaseline(sig(next));
        setForm(next);
        setVersion(d.case.version);
        setConflict(null);
        const msg = d.case.version === version ? `Saved changes to v${d.case.version}.` : `Saved as v${d.case.version}.`;
        toast.success(msg);
        announce(msg);
      },
      onError: fail,
    });
  };

  const busy = save.isPending || muts.create.isPending;
  const nextV = version + 1;
  const sectionOptions = sections.map((s) => ({ value: s.value, label: s.label }));

  return (
    <>
      <PageHeader
        title={detail ? <span className="flex items-center gap-2">{detail.case.ref}<Badge size="md">v{version}</Badge></span> : 'New case'}
        meta={detail ? detail.case.title : 'Fill in the title and steps, then create the case.'}
        breadcrumbs={[{ label: 'Cases', href: `/p/${projectId}/cases` }, { label: detail ? detail.case.ref : 'New case' }]}
        actions={(
          <>
            {detail ? <Link href={`/p/${projectId}/cases/${detail.case.id}/history`} className={buttonStyles({ variant: 'outline' })}><History className="size-4" aria-hidden />History</Link> : null}
            <Button variant="outline" onClick={() => (dirty ? setLeave(`/p/${projectId}/cases`) : router.push(`/p/${projectId}/cases`))}>Cancel</Button>
            {detail && !hasResults ? <Button variant="outline" loading={busy} onClick={() => submit(false)}>Save as v{nextV}</Button> : null}
            <Button variant="primary" loading={busy} onClick={() => submit(true)} data-tour="case-save">{!detail ? 'Create case' : hasResults ? `Save as v${nextV}` : 'Save changes'}</Button>
          </>
        )}
      />
      <div className="mb-3 flex min-h-6 flex-wrap items-center gap-3 text-sm" aria-live="polite">
        {dirty ? <Badge tone="warning" size="md">Unsaved changes</Badge> : <span className="text-ink-muted">{detail ? 'All changes saved.' : ''}</span>}
      </div>
      {draft ? (
        <p role="status" className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary">
          You have an unsaved draft from earlier.
          <Button size="sm" variant="outline" onClick={() => { setForm(draft); setDraft(null); }}>Restore draft</Button>
          <Button size="sm" variant="ghost" onClick={() => { safeSet(draftKey, ''); setDraft(null); }}>Discard draft</Button>
        </p>
      ) : null}
      {conflict ? (
        <div role="alert" className="mb-3 rounded-md border border-subtle bg-status-failed-bg px-3 py-2 text-base text-status-failed-text">
          {conflict} Review the changes before saving again.
          <span className="ml-2 inline-flex gap-2">
            <Link href={`/p/${projectId}/cases/${detail?.case.id}/history`} className="underline">Review versions</Link>
            <button type="button" className="underline" onClick={() => { void save.reset(); window.location.reload(); }}>Reload latest</button>
          </span>
        </div>
      ) : null}
      {formError ? <p role="alert" className="mb-3 rounded-md bg-status-failed-bg px-3 py-2 text-base text-status-failed-text">{formError}</p> : null}
      {hasResults ? <p className="mb-3 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary">Results exist for earlier versions. Editing creates v{nextV} and does not change existing results.</p> : null}

      <form onSubmit={(e) => { e.preventDefault(); submit(true); }} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" noValidate>
        <div className="space-y-5">
          <FormField label="Title" required error={errors.title}>
            <Input data-field="title" data-tour="case-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={250} />
          </FormField>
          <FormField label="Preconditions" hint="What must be true before the first step.">
            <Textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={3} />
          </FormField>
          <section aria-labelledby="steps-h" data-tour="case-steps">
            <h2 id="steps-h" className="mb-2 text-base font-semibold text-ink">Steps</h2>
            <ol className="space-y-3">
              {form.steps.map((s, i) => (
                <li key={s.key} className="rounded-md border border-subtle bg-surface p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label={`Step ${i + 1}`} error={errors[`step-${i}`]}>
                      <Textarea data-field={`step-${i}`} rows={2} value={s.description} onChange={(e) => setStep(i, { description: e.target.value })} />
                    </FormField>
                    <FormField label={`Expected result for step ${i + 1}`}>
                      <Textarea rows={2} value={s.expected} onChange={(e) => setStep(i, { expected: e.target.value })} />
                    </FormField>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => moveStep(i, -1)} iconLeft={<ArrowUp className="size-4" aria-hidden />} />
                    <Button size="sm" variant="ghost" aria-label={`Move step ${i + 1} down`} disabled={i === form.steps.length - 1} onClick={() => moveStep(i, 1)} iconLeft={<ArrowDown className="size-4" aria-hidden />} />
                    <Button size="sm" variant="ghost" aria-label={`Delete step ${i + 1}`} disabled={form.steps.length === 1} onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))} iconLeft={<Trash2 className="size-4" aria-hidden />} />
                  </div>
                </li>
              ))}
            </ol>
            <Button className="mt-3" variant="outline" iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, { key: newKey(), description: '', expected: '' }] }))}>Add step</Button>
          </section>
          {detail ? (
            <FormField label="Change note" hint="Optional. Shown in the version history.">
              <Input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={200} />
            </FormField>
          ) : null}
        </div>

        <aside aria-label="Properties" className="space-y-4 lg:border-l lg:border-subtle lg:pl-6">
          <FormField label="Section" required error={errors.section}>
            <Select options={sectionOptions} value={form.section} onChange={(v) => set('section', v)} placeholder="Choose a section" />
          </FormField>
          <FormField label="Priority">
            <Select options={(priorities.data ?? []).map((p) => ({ value: p.id, label: `${p.short_name} ${p.name}` }))} value={form.priority} onChange={(v) => set('priority', v)} placeholder="None" clearable />
          </FormField>
          <FormField label="Type">
            <Select options={(types.data ?? []).map((t) => ({ value: t.id, label: t.name }))} value={form.type} onChange={(v) => set('type', v)} placeholder="None" clearable />
          </FormField>
          <FormField label="Automation">
            <Select options={AUTOMATION_OPTIONS} value={form.automation} onChange={(v) => set('automation', (v ?? 'not_specified') as AutomationStatus)} />
          </FormField>
          <FormField label="Estimate" hint="For example 5, 5m or 1h 30m." error={errors.estimate}>
            <Input data-field="estimate" value={form.estimate} onChange={(e) => set('estimate', e.target.value)} />
          </FormField>
          <FormField label="Refs" hint="Issue keys, comma separated.">
            <Input value={form.refs} onChange={(e) => set('refs', e.target.value)} />
          </FormField>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">Tags</legend>
            <div className="flex flex-wrap gap-1.5">
              {(tags.data ?? []).map((t) => {
                const on = form.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button" aria-pressed={on} onClick={() => set('tagIds', on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id])}
                    className={cn('min-h-6 rounded-xs border px-2 text-sm pointer-coarse:min-h-11', on ? 'border-accent bg-selected text-accent-text' : 'border-strong text-ink-secondary hover:bg-sunken')}>{t.name}</button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <Input aria-label="New tag name" placeholder="New tag" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLButtonElement | null)?.click(); } }} />
              <Button variant="outline" disabled={!newTag.trim()} loading={createTag.isPending} onClick={() => createTag.mutate({ name: newTag.trim() }, { onSuccess: (t) => { set('tagIds', [...form.tagIds, t.id]); setNewTag(''); }, onError: (err) => toast.error(err.message) })}>Add tag</Button>
            </div>
          </fieldset>
        </aside>
      </form>

      <ConfirmDialog
        open={leave !== null}
        onOpenChange={(o) => { if (!o) setLeave(null); }}
        title="Leave without saving?"
        description="Your changes to this case have not been saved. A draft stays on this device."
        confirmLabel="Discard and leave"
        tone="danger"
        onConfirm={() => { const to = leave as string; setBaseline(sig(form)); setLeave(null); router.push(to); }}
      />
    </>
  );
}
