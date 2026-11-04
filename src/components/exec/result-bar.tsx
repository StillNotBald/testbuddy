'use client';

import { Paperclip, X } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { Button, Input, STATUS_META, StatusBadge, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmtDuration } from './format';
import { parseDuration } from './use-time-on-test';
import type { SettableKey } from './format';

export const ALLOWED_ATTACHMENT = /^(image\/.+|application\/pdf|text\/plain|text\/xml|application\/json|video\/mp4|application\/zip)$/;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export interface PendingFile { name: string; size: number; type: string }

export interface ResultBarProps {
  selected: SettableKey | null;
  onSelect: (k: SettableKey) => void;
  /** Statuses that need a comment. */
  requireComment: ReadonlySet<SettableKey>;
  comment: string;
  onComment: (v: string) => void;
  commentError?: string;
  /** Callback ref for the comment textarea (the screen focuses it on C, F and B). */
  registerComment: (el: HTMLTextAreaElement | null) => void;
  defects: string[];
  onDefects: (v: string[]) => void;
  files: PendingFile[];
  onFiles: (f: PendingFile[]) => void;
  fileError?: string;
  onPickFiles: () => void;
  readElapsed: () => number;
  setElapsed: (s: number) => void;
  onSave: () => void;
  saving?: boolean;
  untestedLeft: number;
  isLast: boolean;
  /** Phone: only the four buttons and a comment. */
  compact?: boolean;
  /** Last failed save: the draft stays here. */
  saveFailed?: string;
}

const KEYS: SettableKey[] = ['passed', 'failed', 'blocked', 'retest'];

function ElapsedField({ read, set }: { read: () => number; set: (s: number) => void }) {
  const [value, setValue] = useState(fmtDuration(read()));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (editing) return undefined;
    const id = setInterval(() => setValue(fmtDuration(read())), 5000);
    return () => clearInterval(id);
  }, [editing, read]);
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-secondary">
      Time on test
      <Input
        aria-label="Time on test (mm:ss)" value={value} className="w-20 tabular-nums" inputMode="numeric"
        onFocus={() => setEditing(true)} onChange={(e) => setValue(e.target.value)}
        onBlur={() => { const s = parseDuration(value); if (s !== null) set(s); setValue(fmtDuration(s ?? read())); setEditing(false); }}
      />
    </label>
  );
}

/** Sticky result bar: P/F/B/R record (and advance for statuses without a comment rule), C comment, A attach, S save. */
export function ResultBar(p: ResultBarProps) {
  const [defectDraft, setDefectDraft] = useState('');
  const addDefect = () => {
    const v = defectDraft.trim().replace(/,$/, '');
    if (v && !p.defects.includes(v)) p.onDefects([...p.defects, v]);
    setDefectDraft('');
  };
  const onDefectKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDefect(); }
  };
  const needs = p.selected ? p.requireComment.has(p.selected) : false;
  return (
    <section aria-label="Record result" data-tour="result-bar" className={cn('sticky bottom-0 z-10 -mx-3 border-t border-subtle bg-surface px-3 py-3 md:-mx-4 md:px-4 shadow-sm', p.compact && 'pb-4')}>
      <div role="group" aria-label="Result status" className="flex flex-wrap items-center gap-2">
        {KEYS.map((k) => (
          <Button
            key={k} variant={p.selected === k ? 'primary' : 'outline'} size="lg" aria-pressed={p.selected === k} disabled={p.saving}
            onClick={() => p.onSelect(k)} className="min-h-11 flex-1 sm:flex-none"
          >
            <StatusBadge status={k} showLabel={false} />
            {STATUS_META[k].label}
            {p.compact ? null : <kbd className="ml-1 rounded-xs bg-sunken px-1 text-xs text-ink-secondary">{STATUS_META[k].hotkey}</kbd>}
          </Button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <label htmlFor="result-comment" className="mb-1 block text-sm font-medium text-ink">
            Comment{needs ? <span className="font-normal text-ink-muted"> (required for {STATUS_META[p.selected as SettableKey].label})</span> : null}
            {p.compact ? null : <kbd className="ml-1 rounded-xs bg-sunken px-1 text-xs text-ink-secondary">C</kbd>}
          </label>
          <Textarea
            id="result-comment" ref={(el) => p.registerComment(el)} rows={2} value={p.comment} onChange={(e) => p.onComment(e.target.value)}
            aria-invalid={p.commentError ? true : undefined} aria-describedby={p.commentError ? 'result-comment-error' : undefined}
          />
          {p.commentError ? <p id="result-comment-error" role="alert" className="mt-1 text-sm text-status-failed-text">{p.commentError}</p> : null}
          {p.saveFailed ? <p role="alert" className="mt-1 text-sm text-status-failed-text">Not saved. {p.saveFailed} Your draft is kept. Press Save and next to retry.</p> : null}
        </div>
        {p.compact ? null : (
          <div className="flex flex-col gap-2 md:items-end">
            <ElapsedField read={p.readElapsed} set={p.setElapsed} />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-ink-secondary">Defects</span>
              {p.defects.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-xs bg-sunken py-0.5 pr-0.5 pl-2 text-sm">{d}
                  <button type="button" aria-label={`Remove defect ${d}`} onClick={() => p.onDefects(p.defects.filter((x) => x !== d))} className="rounded-xs p-0.5 hover:bg-subtle"><X className="size-3.5" aria-hidden /></button>
                </span>
              ))}
              <Input aria-label="Add defect key" placeholder="JIRA-123" className="w-28" value={defectDraft} onChange={(e) => setDefectDraft(e.target.value)} onKeyDown={onDefectKey} onBlur={addDefect} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" iconLeft={<Paperclip className="size-4" aria-hidden />} kbd="A" onClick={p.onPickFiles}>Attach</Button>
              {p.files.map((f) => (
                <span key={f.name} className="inline-flex items-center gap-1 rounded-xs bg-sunken py-0.5 pr-0.5 pl-2 text-sm">{f.name}
                  <button type="button" aria-label={`Remove attachment ${f.name}`} onClick={() => p.onFiles(p.files.filter((x) => x !== f))} className="rounded-xs p-0.5 hover:bg-subtle"><X className="size-3.5" aria-hidden /></button>
                </span>
              ))}
            </div>
            {p.fileError ? <p role="alert" className="text-sm text-status-failed-text">{p.fileError}</p> : null}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-ink-muted tabular-nums">{p.untestedLeft} untested left</span>
        <Button variant="primary" size="lg" loading={p.saving} disabled={!p.selected} kbd={p.compact ? undefined : 'S'} onClick={p.onSave}>{p.isLast ? 'Save' : 'Save and next'}</Button>
      </div>
    </section>
  );
}
