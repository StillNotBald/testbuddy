'use client';

import { Copy, Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { RoleGate } from '@/components/tb/role-gate';
import { Button, toast } from '@/components/ui';
import { useExportCsv } from '@/services/hooks';
import type { Progress } from '@/services/interfaces';
import { passRate } from './format';
import { RunProgressBar } from './run-progress-bar';

export interface Row { id: string; name: string; progress: Progress }

/** Stacked bar + table twin: the table is always rendered, so nothing depends on colour or the chart. */
export function ProgressTable({ caption, label, rows }: { caption: string; label: string; rows: Row[] }) {
  if (rows.length === 0) return <p className="text-base text-ink-muted">Nothing to show yet.</p>;
  return (
    <div className="overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
    <table className="w-full text-left text-base">
      <caption className="sr-only">{caption}</caption>
      <thead className="text-sm text-ink-muted">
        <tr><th scope="col" className="py-1 pr-3 font-medium">{label}</th><th scope="col" className="w-48 py-1 pr-3 font-medium">Progress</th>
          {['Passed', 'Failed', 'Blocked', 'Retest', 'Untested', 'Pass rate'].map((h) => <th key={h} scope="col" className="px-2 py-1 text-right font-medium">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const c = r.progress.counts;
          const rate = passRate(c);
          return (
            <tr key={r.id} className="border-t border-subtle">
              <th scope="row" className="py-1.5 pr-3 font-medium">{r.name}</th>
              <td className="py-1.5 pr-3"><RunProgressBar counts={c} size="sm" /></td>
              {[c.passed, c.failed, c.blocked, c.retest, c.untested].map((n, i) => <td key={i} className="px-2 py-1.5 text-right tabular-nums">{n}</td>)}
              <td className="px-2 py-1.5 text-right tabular-nums">{rate.pct === null ? '-' : `${rate.pct}%`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export function TrendBlock({ trend }: { trend: Array<{ date: string; pass_rate: number; total: number }> }) {
  const [asTable, setAsTable] = useState(false);
  if (trend.length === 0) return <p className="text-base text-ink-muted">No results yet.</p>;
  const w = 320; const h = 80;
  const pts = trend.map((t, i) => `${trend.length === 1 ? w / 2 : (i / (trend.length - 1)) * w},${h - (t.pass_rate / 100) * h}`).join(' ');
  return (
    <div>
      <Button size="sm" variant="ghost" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>{asTable ? 'Show as chart' : 'Show as table'}</Button>
      {asTable ? (
        <table className="mt-1 w-full max-w-md text-left text-base">
          <caption className="sr-only">Pass rate per day</caption>
          <thead className="text-sm text-ink-muted"><tr><th scope="col" className="py-1 font-medium">Day</th><th scope="col" className="py-1 text-right font-medium">Pass rate</th><th scope="col" className="py-1 text-right font-medium">Results</th></tr></thead>
          <tbody>{trend.map((t) => <tr key={t.date} className="border-t border-subtle"><th scope="row" className="py-1 font-normal">{t.date}</th><td className="py-1 text-right tabular-nums">{t.pass_rate}%</td><td className="py-1 text-right tabular-nums">{t.total}</td></tr>)}</tbody>
        </table>
      ) : (
        <svg role="img" aria-label={`Pass rate per day, from ${trend[0]?.pass_rate}% to ${trend[trend.length - 1]?.pass_rate}%`} viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="mt-1 h-24 w-full max-w-md text-accent">
          <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          {trend.map((t, i) => <circle key={t.date} cx={trend.length === 1 ? w / 2 : (i / (trend.length - 1)) * w} cy={h - (t.pass_rate / 100) * h} r="3" fill="currentColor" />)}
        </svg>
      )}
    </div>
  );
}

/** Copy share link (mock: the link format is final, the read-only page arrives with M1), CSV (manager+), print. */
export function ReportActions({ kind, id }: { kind: 'milestone' | 'run'; id: string }) {
  const exportCsv = useExportCsv();
  const copy = async () => {
    const link = `${window.location.origin}/share/${kind}/${id}?t=${Math.random().toString(36).slice(2, 12)}`;
    try { await navigator.clipboard.writeText(link); toast.success('Share link copied. It is read-only and expires in 14 days.'); } catch { toast.info(link); }
  };
  const download = () => exportCsv.mutate({ kind, id }, {
    onSuccess: (csv) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${kind}-report.csv`; a.click(); URL.revokeObjectURL(a.href); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <Button variant="outline" iconLeft={<Copy className="size-4" aria-hidden />} onClick={() => void copy()}>Copy share link</Button>
      <RoleGate action="reports.export"><Button variant="outline" iconLeft={<Download className="size-4" aria-hidden />} loading={exportCsv.isPending} onClick={download}>Export CSV</Button></RoleGate>
      <Button variant="outline" iconLeft={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>Print</Button>
    </>
  );
}
