'use client';

import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/tb/empty-state';
import { useCan, useProjectContext } from '@/components/tb/project-context';
import { Badge, Button, Card, PriorityChip, Skeleton, STATUS_META, StatusBadge, StepList, toast, type StepItem } from '@/components/ui';
import { announce } from '@/lib/announcer';
import { useHotkeys, isEditableTarget } from '@/lib/hotkeys';
import { DISABLED_REASON } from '@/lib/permissions';
import { useMediaQuery } from '@/lib/use-media-query';
import { useUrlState } from '@/lib/use-url-state';
import { useAddResult, useLiveRunTests, useResultMutations, useSession, useStatuses, useTest, useUndoResult, useUpdateResult } from '@/services/hooks';
import type { TestDetail } from '@/services/interfaces';
import type { Status } from '@/services/types';
import { statusKeyOfRow } from '@/services/status';
import { isFlagged, REQUIRE_COMMENT_MESSAGE, type SettableKey } from './format';
import { ALLOWED_ATTACHMENT, MAX_ATTACHMENT_BYTES, ResultBar, type PendingFile } from './result-bar';
import { ResultHistory } from './result-history';
import { useTimeOnTest } from './use-time-on-test';

interface Draft { selected: SettableKey | null; comment: string; defects: string[]; files: PendingFile[]; stepStatus?: Record<number, SettableKey>; error?: string }
/** Drafts survive a failed optimistic save (the tester lands back on the test with the text intact). */
const drafts = new Map<string, Draft>();

const STEP_KEYS: Record<string, SettableKey> = { p: 'passed', f: 'failed', b: 'blocked', r: 'retest' };

export function TestExecutionScreen({ runId, testId }: { runId: string; testId: string }) {
  const { projectId } = useProjectContext();
  const test = useTest(testId);
  const list = useLiveRunTests({ runId });
  const statuses = useStatuses();
  const session = useSession();
  const canWrite = useCan('results.write');

  if (test.isError) return <EmptyState icon={AlertTriangle} tone="error" title="This test could not be loaded." description={test.error.message} action={<Link href={`/p/${projectId}/runs/${runId}`} className="text-accent-text underline">Back to the run</Link>} />;
  if (test.isPending || list.isPending || statuses.isPending) return <div className="space-y-3"><Skeleton className="h-6 w-64" /><Skeleton className="h-8 w-96" /><Skeleton className="h-48 w-full" /></div>;
  return <ExecBody key={testId} runId={runId} testId={testId} detail={test.data} items={list.data?.items ?? []} statuses={statuses.data ?? []} myId={session.data?.user.id} canWrite={canWrite} />;
}

function ExecBody({ runId, testId, detail, items, statuses, myId, canWrite }: { runId: string; testId: string; detail: TestDetail; items: NonNullable<ReturnType<typeof useLiveRunTests>['data']>['items']; statuses: Status[]; myId?: string; canWrite: boolean }) {
  const { projectId } = useProjectContext();
  const router = useRouter();
  const url = useUrlState();
  const phone = useMediaQuery('(max-width: 767px)');
  const addResult = useAddResult(runId, projectId);
  const undo = useUndoResult(runId, projectId);
  const update = useUpdateResult(runId, projectId);
  const { addAttachment } = useResultMutations(runId, projectId);

  const closed = detail.run.is_closed;
  const readOnly = !canWrite || closed;
  const compact = phone;
  const statusFilter = url.get('status');
  const draft = drafts.get(testId);
  const [selected, setSelected] = useState<SettableKey | null>(draft?.selected ?? null);
  const [comment, setComment] = useState(draft?.comment ?? '');
  const [commentError, setCommentError] = useState<string>();
  const [defects, setDefects] = useState<string[]>(draft?.defects ?? []);
  const [files, setFiles] = useState<PendingFile[]>(draft?.files ?? []);
  const [fileError, setFileError] = useState<string>();
  const [stepStatus, setStepStatus] = useState<Record<number, SettableKey>>(draft?.stepStatus ?? {});
  const [activeStep, setActiveStep] = useState(0);
  const [saveFailed, setSaveFailed] = useState<string | undefined>(draft?.error);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);
  const setCommentEl = (el: HTMLTextAreaElement | null) => { commentRef.current = el; };
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useTimeOnTest(!readOnly);

  const snap = detail.item.test.case_snapshot;
  const sc = snap.case as { title?: string; ref?: string; content?: string };
  const steps: StepItem[] = useMemo(() => (snap.steps as Array<{ id?: string; description?: string; expected_result?: string }>).map((s) => ({ id: s.id, description: s.description ?? '', expected_result: s.expected_result })), [snap.steps]);
  const requireComment = useMemo(() => new Set<SettableKey>(statuses.filter(isFlagged).map((s) => statusKeyOfRow(s)).filter((k): k is SettableKey => k !== 'untested' && k !== 'custom')), [statuses]);
  const statusFor = (k: SettableKey) => statuses.find((s) => statusKeyOfRow(s) === k);

  const visible = useMemo(() => (statusFilter ? items.filter((i) => i.status_key === statusFilter) : items), [items, statusFilter]);
  const index = visible.findIndex((i) => i.test.id === testId);
  const q = statusFilter ? `?status=${statusFilter}` : '';
  const testUrl = (id: string) => `/p/${projectId}/runs/${runId}/tests/${id}${q}`;
  const runUrl = `/p/${projectId}/runs/${runId}`;
  const untestedLeft = items.filter((i) => i.status_key === 'untested' && i.test.id !== testId).length;
  const nextUntested = () => {
    const after = visible.slice(index + 1).find((i) => i.status_key === 'untested' && i.test.id !== testId);
    return after ?? visible.find((i) => i.status_key === 'untested' && i.test.id !== testId);
  };
  const isLast = !nextUntested();

  useEffect(() => { if (!readOnly && !compact) document.querySelector<HTMLElement>(selected ? '#result-comment' : '[aria-label="Result status"] button')?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (incoming: Array<{ name: string; size: number; type: string }>) => {
    const ok: PendingFile[] = [];
    let err: string | undefined;
    incoming.forEach((f) => {
      if (!ALLOWED_ATTACHMENT.test(f.type)) err = `${f.name} is not an allowed type.`;
      else if (f.size > MAX_ATTACHMENT_BYTES) err = `${f.name} is larger than 25 MB.`;
      else ok.push({ name: f.name, size: f.size, type: f.type });
    });
    setFileError(err);
    if (ok.length) setFiles((cur) => [...cur, ...ok]);
  };
  useEffect(() => {
    if (readOnly || compact) return undefined;
    const onPaste = (e: ClipboardEvent) => {
      const imgs = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
      if (imgs.length) addFiles(imgs.map((f, n) => ({ name: f.name && f.name !== 'image.png' ? f.name : `pasted-image-${Date.now()}-${n + 1}.png`, size: f.size, type: f.type })));
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [readOnly, compact]);

  const commit = (key: SettableKey) => {
    const st = statusFor(key);
    if (!st || addResult.isPending) return;
    if (requireComment.has(key) && !comment.trim()) {
      setSelected(key); setCommentError(REQUIRE_COMMENT_MESSAGE);
      announce(REQUIRE_COMMENT_MESSAGE, 'assertive');
      commentRef.current?.focus();
      return;
    }
    setCommentError(undefined); setSaveFailed(undefined);
    const stepResults = Object.entries(stepStatus).map(([pos, k]) => ({ step_position: Number(pos), statusId: (statusFor(k) as Status).id }));
    const ref = detail.item.ref;
    const pending = files;
    const next = nextUntested();
    const label = STATUS_META[key].label;
    const here = testUrl(testId);
    addResult.mutateAsync({ testId, statusId: st.id, comment: comment.trim() || undefined, elapsed: timer.read() || undefined, defects: defects.length ? defects : undefined, step_results: stepResults.length ? stepResults : undefined })
      .then(async (res) => {
        drafts.delete(testId);
        for (const f of pending) await addAttachment.mutateAsync({ resultId: res.id, file: f }).catch(() => toast.error(`${f.name} could not be attached.`));
        toast.undo({ message: `Saved ${label} for ${ref}.`, onUndo: () => undo.mutate(res.id, { onSuccess: () => { router.push(here); }, onError: (e) => toast.error(e.message) }) });
        announce(`Saved ${label} for ${ref}`);
      })
      .catch((e: Error) => {
        drafts.set(testId, { selected: key, comment, defects, files: pending, stepStatus, error: e.message });
        setSaveFailed(e.message);
        toast.error(`${ref} was not saved: ${e.message}`);
        announce(`Not saved. ${e.message}`, 'assertive');
        router.push(here);
      });
    if (next) router.push(testUrl(next.test.id));
    else { toast.info('No untested tests left in this view.'); router.push(runUrl); }
  };

  const saveSelected = () => {
    if (selected) commit(selected);
    else announce('Choose a status first', 'polite');
  };
  const select = (k: SettableKey) => {
    if (requireComment.has(k)) { setSelected(k); setCommentError(undefined); commentRef.current?.focus(); return; }
    commit(k);
  };
  const setStep = (pos: number, k: SettableKey) => {
    const next = { ...stepStatus, [pos]: k };
    setStepStatus(next);
    setActiveStep(pos - 1);
    if (k === 'failed') { setSelected('failed'); commentRef.current?.focus(); }
    else if (!selected && steps.length > 0 && steps.every((_, i) => next[i + 1] === 'passed')) setSelected('passed');
  };
  const go = (to: number) => { const t = visible[to]; if (t) router.push(testUrl(t.test.id)); };

  useHotkeys('Test execution', {
    p: { label: 'Passed: record and go to the next test', run: () => select('passed') },
    f: { label: 'Failed: then write the comment', run: () => select('failed') },
    b: { label: 'Blocked: then write the comment', run: () => select('blocked') },
    r: { label: 'Retest: record and go to the next test', run: () => select('retest') },
    u: { label: 'Clear the unsaved selection', run: () => { setSelected(null); setCommentError(undefined); } },
    c: { label: 'Focus the comment', run: () => commentRef.current?.focus() },
    a: { label: 'Attach a file', run: () => fileInput.current?.click() },
    s: { label: 'Save and next', run: saveSelected },
    'mod+enter': { label: 'Save and next', run: saveSelected },
    '[': { label: 'Previous step', run: () => setActiveStep((i) => Math.max(0, i - 1)) },
    ']': { label: 'Next step', run: () => setActiveStep((i) => Math.min(steps.length - 1, i + 1)) },
    'shift+p': { label: 'Passed on the active step', run: () => setStep(activeStep + 1, STEP_KEYS.p as SettableKey) },
    'shift+f': { label: 'Failed on the active step', run: () => setStep(activeStep + 1, STEP_KEYS.f as SettableKey) },
    'shift+b': { label: 'Blocked on the active step', run: () => setStep(activeStep + 1, STEP_KEYS.b as SettableKey) },
    'shift+r': { label: 'Retest on the active step', run: () => setStep(activeStep + 1, STEP_KEYS.r as SettableKey) },
    j: { label: 'Next test without recording', run: () => go(index + 1) },
    k: { label: 'Previous test', run: () => go(index - 1) },
    escape: { label: 'Back to the run', run: () => { if (isEditableTarget(document.activeElement)) (document.activeElement as HTMLElement).blur(); else router.push(runUrl); } },
  }, { enabled: !readOnly && !compact });

  const latest = detail.results[0];
  const readOnlyReason = closed ? DISABLED_REASON.closedRun : 'Your role cannot record results.';

  return (
    <div className="pb-2">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Link href={runUrl} className="inline-flex items-center gap-1 text-accent-text hover:underline"><ArrowLeft className="size-4" aria-hidden />{detail.run.name}</Link>
        <span className="text-ink-muted tabular-nums" aria-live="off">{index >= 0 ? `Test ${index + 1} of ${visible.length}` : `${visible.length} tests`}</span>
        <Button size="sm" variant="ghost" aria-label="Previous test" disabled={index <= 0} onClick={() => go(index - 1)}><ChevronLeft className="size-4" aria-hidden /></Button>
        <Button size="sm" variant="ghost" aria-label="Next test" disabled={index < 0 || index >= visible.length - 1} onClick={() => go(index + 1)}><ChevronRight className="size-4" aria-hidden /></Button>
        {statusFilter ? <Badge tone="info">Filter: {STATUS_META[statusFilter as keyof typeof STATUS_META]?.label ?? statusFilter}</Badge> : null}
      </div>

      {closed ? (
        <div role="status" className="mb-3 flex items-center gap-2 rounded-md border border-subtle bg-sunken px-3 py-2 text-base text-ink-secondary"><Lock className="size-4 shrink-0" aria-hidden />This run is closed. Results can no longer be changed.</div>
      ) : null}

      <header className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-ink"><span className="mr-2 tabular-nums text-ink-secondary">{detail.item.ref}</span>{detail.item.title}</h1>
          <StatusBadge status={detail.item.status} size="md" />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <PriorityChip priority={detail.item.priority} />
          <span>{detail.item.section_name}</span>
          <Badge tone="neutral">Snapshot v{detail.item.test.version}</Badge>
        </p>
      </header>

      {detail.has_newer_version ? (
        <div role="note" className="mb-3 rounded-md border border-subtle bg-status-retest-bg px-3 py-2 text-base text-status-retest-text">
          A newer version (v{detail.live_case_version}) of this case exists. This test uses v{detail.item.test.version}.{' '}
          {detail.item.test.case ? <Link href={`/p/${projectId}/cases/${detail.item.test.case}`} className="font-medium underline">View latest</Link> : null}
        </div>
      ) : null}
      {sc.content ? <p className="mb-3 text-base whitespace-pre-wrap text-ink-secondary"><span className="font-medium text-ink">Preconditions: </span>{sc.content}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="Steps">
          <h2 className="mb-2 text-lg font-semibold text-ink">Steps</h2>
          <StepList
            steps={steps} activeIndex={readOnly || compact ? undefined : activeStep}
            results={Object.fromEntries(Object.entries(stepStatus).map(([p, k]) => [Number(p), { status: k }]))}
            onStepStatus={readOnly || compact ? undefined : (pos, k) => setStep(pos, k as SettableKey)}
          />
        </section>
        <section aria-label="Result history">
          <h2 className="mb-2 text-lg font-semibold text-ink">Result history ({detail.results.length})</h2>
          <ResultHistory
            results={detail.results} currentVersion={detail.item.test.version} myId={myId} canEdit={!readOnly && !compact} editing={update.isPending}
            onEdit={(resultId, patch) => update.mutate({ resultId, patch }, { onSuccess: () => toast.success('Result updated.'), onError: (e) => toast.error(e.message) })}
          />
        </section>
      </div>

      {readOnly ? (
        <Card className="mt-4 space-y-1" role="region" aria-label="Latest result">
          <h2 className="text-lg font-semibold text-ink">Latest result</h2>
          {latest ? <p className="flex flex-wrap items-center gap-2"><StatusBadge status={latest.status} /><span className="text-sm text-ink-secondary">{latest.user?.name ?? 'Unknown'}</span>{latest.result.comment ? <span>{latest.result.comment}</span> : null}</p> : <p className="text-base text-ink-muted">No result recorded.</p>}
          <p role="status" className="text-sm text-ink-muted">Shortcuts are off. {readOnlyReason}</p>
        </Card>
      ) : (
        <>
          <input ref={fileInput} type="file" multiple hidden aria-hidden tabIndex={-1} data-testid="file-input" onChange={(e) => { addFiles(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size, type: f.type }))); e.target.value = ''; }} />
          <div className="mt-4">
            <ResultBar
              selected={selected} onSelect={select} requireComment={requireComment} comment={comment} onComment={(v) => { setComment(v); if (v.trim()) setCommentError(undefined); }}
              commentError={commentError} registerComment={setCommentEl} defects={defects} onDefects={setDefects} files={files} onFiles={setFiles} fileError={fileError}
              onPickFiles={() => fileInput.current?.click()} readElapsed={() => timer.read()} setElapsed={(v) => timer.set(v)} onSave={saveSelected} saving={addResult.isPending}
              untestedLeft={untestedLeft} isLast={isLast} compact={compact} saveFailed={saveFailed}
            />
          </div>
        </>
      )}
    </div>
  );
}
