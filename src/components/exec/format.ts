import type { Progress, StatusCounts } from '@/services/interfaces';
import type { TestStatusKey } from '@/services/types';

export const FIXED_ORDER = ['passed', 'failed', 'blocked', 'retest', 'untested'] as const;
export type CountKey = (typeof FIXED_ORDER)[number];

export function totalOf(c: StatusCounts): number {
  return FIXED_ORDER.reduce((n, k) => n + c[k], 0);
}

/** Pass rate = passed / executed. Untested is excluded; blocked and retest count as executed but not passed. */
export function passRate(c: StatusCounts): { pct: number | null; passed: number; executed: number; untested: number } {
  const total = totalOf(c);
  const executed = total - c.untested;
  return { pct: executed > 0 ? Math.round((c.passed / executed) * 100) : null, passed: c.passed, executed, untested: c.untested };
}

/** "87% of 412 executed, 14 untested": the denominator is always shown. */
export function passRateText(c: StatusCounts): string {
  const r = passRate(c);
  if (r.pct === null) return `No results yet, ${r.untested} untested`;
  return `${r.pct}% of ${r.executed} executed${r.untested ? `, ${r.untested} untested` : ''}`;
}

export function countsSummary(c: StatusCounts): string {
  const total = totalOf(c);
  const parts = FIXED_ORDER.filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`);
  return `${total} ${total === 1 ? 'test' : 'tests'}: ${parts.length ? parts.join(', ') : 'none'}`;
}

export function donePct(p: Progress): number {
  return Math.round(p.done_pct);
}

export function fmtDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '-';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function absTime(iso: string | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Relative within 7 days ("2h ago"), absolute otherwise. */
export function relTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return '-';
  const diff = now - Date.parse(iso);
  if (!Number.isFinite(diff)) return '-';
  const min = Math.floor(diff / 60_000);
  if (diff < 7 * 86_400_000) {
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    if (min < 1440) return `${Math.floor(min / 60)}h ago`;
    return `${Math.floor(min / 1440)}d ago`;
  }
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function dayLabel(iso: string | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const REQUIRE_COMMENT_MESSAGE = 'A comment is required for this status.';

export function isFlagged(status: { flags?: string } | undefined): boolean {
  return !!status?.flags?.includes('require_comment');
}

export type SettableKey = Exclude<TestStatusKey, 'custom' | 'untested'>;
