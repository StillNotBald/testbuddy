'use client';

import { FileText, Image as ImageIcon, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Button, FormField, Input, StatusBadge, Textarea } from '@/components/ui';
import type { ResultPatch, ResultView } from '@/services/interfaces';
import { absTime, fmtDuration, isFlagged, REQUIRE_COMMENT_MESSAGE, relTime } from './format';
import { parseDuration } from './use-time-on-test';

function Editor({ r, onSave, onCancel, busy }: { r: ResultView; onSave: (p: ResultPatch) => void; onCancel: () => void; busy?: boolean }) {
  const [comment, setComment] = useState(r.result.comment ?? '');
  const [defects, setDefects] = useState((r.result.defects ?? []).join(', '));
  const [elapsed, setElapsed] = useState(r.result.elapsed !== undefined ? fmtDuration(r.result.elapsed) : '');
  const [error, setError] = useState<string>();
  const submit = () => {
    if (isFlagged(r.status) && !comment.trim()) { setError(REQUIRE_COMMENT_MESSAGE); return; }
    const secs = elapsed.trim() ? parseDuration(elapsed) : undefined;
    onSave({ comment, defects: defects.split(',').map((d) => d.trim()).filter(Boolean), ...(secs !== undefined && secs !== null ? { elapsed: secs } : {}) });
  };
  return (
    <div className="mt-2 space-y-2">
      <FormField label="Comment" error={error}><Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></FormField>
      <FormField label="Defects" hint="Comma separated issue keys."><Input value={defects} onChange={(e) => setDefects(e.target.value)} /></FormField>
      <FormField label="Time on test (mm:ss)"><Input value={elapsed} onChange={(e) => setElapsed(e.target.value)} className="w-28" /></FormField>
      <div className="flex gap-2"><Button size="sm" variant="primary" loading={busy} onClick={submit}>Save changes</Button><Button size="sm" onClick={onCancel}>Cancel</Button></div>
      <p className="text-sm text-ink-muted">Status and history do not change when you edit a result.</p>
    </div>
  );
}

export interface ResultHistoryProps {
  results: ResultView[];
  currentVersion: number;
  myId?: string;
  /** Run open and role allows results. */
  canEdit: boolean;
  onEdit: (resultId: string, patch: ResultPatch) => void;
  editing?: boolean;
}

/** Earlier results, newest first. Results from older case versions carry a vN label. Edit changes comment, time and defects only. */
export function ResultHistory({ results, currentVersion, myId, canEdit, onEdit, editing }: ResultHistoryProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (results.length === 0) return <p className="text-base text-ink-muted">No results yet for this test.</p>;
  return (
    <ol className="space-y-3" aria-label="Result history">
      {results.map((r) => (
        <li key={r.result.id} className="rounded-md border border-subtle p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span className="text-sm text-ink-secondary">{r.user?.name ?? 'Unknown'}</span>
            <time dateTime={r.result.created} title={absTime(r.result.created)} className="text-sm text-ink-muted">{relTime(r.result.created)}</time>
            {r.result.version !== currentVersion ? <span className="rounded-xs bg-sunken px-1 text-xs text-ink-secondary">v{r.result.version}</span> : null}
            {r.result.build ? <span className="text-xs text-ink-muted">build {r.result.build}</span> : null}
            {r.result.elapsed ? <span className="text-xs text-ink-muted tabular-nums">{fmtDuration(r.result.elapsed)}</span> : null}
            {canEdit && r.result.created_by === myId && openId !== r.result.id ? (
              <Button size="sm" variant="ghost" className="ml-auto" iconLeft={<Pencil className="size-3.5" aria-hidden />} onClick={() => setOpenId(r.result.id)} aria-label={`Edit ${r.status.name} result`}>Edit</Button>
            ) : null}
          </div>
          {openId === r.result.id ? (
            <Editor r={r} busy={editing} onCancel={() => setOpenId(null)} onSave={(patch) => { onEdit(r.result.id, patch); setOpenId(null); }} />
          ) : (
            <>
              {r.result.comment ? <p className="mt-1 text-base whitespace-pre-wrap text-ink">{r.result.comment}</p> : null}
              {r.result.defects?.length ? <ul className="mt-1 flex flex-wrap gap-1" aria-label="Defects">{r.result.defects.map((d) => <li key={d} className="rounded-xs bg-sunken px-1.5 text-sm">{d}</li>)}</ul> : null}
            </>
          )}
          {r.attachments.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Attachments">
              {r.attachments.map((a) => {
                const name = a.original_name ?? a.file;
                const Icon = /\.(png|jpe?g|gif|webp)$/i.test(name) ? ImageIcon : FileText;
                return <li key={a.id} className="inline-flex items-center gap-1 rounded-md border border-subtle px-2 py-1 text-sm"><Icon className="size-4 text-ink-muted" aria-hidden />{name}</li>;
              })}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
