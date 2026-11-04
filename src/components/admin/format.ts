const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const DAY = 24 * 60 * 60 * 1000;

/** "Nov 3, 2026 10:42" (DESIGN.md section 11). */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Nov 20" */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Relative within 7 days ("2h ago"), absolute otherwise. */
export function formatRelative(iso: string | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const diff = now - Date.parse(iso);
  if (diff < 0 || diff >= 7 * DAY) return formatAbsolute(iso);
  if (diff < 60_000) return 'just now';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / (60 * 60_000))}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Due-date line for a milestone summary. */
export function dueText(s: { milestone: { is_completed: boolean; expires_on?: string }; days_left: number | null; past_due: boolean }): string {
  if (s.milestone.is_completed) return 'Completed';
  if (s.days_left === null || !s.milestone.expires_on) return 'No due date';
  if (s.past_due) return `Past due ${plural(Math.abs(s.days_left), 'day')}`;
  if (s.days_left === 0) return 'Due today';
  return `Due ${formatDay(s.milestone.expires_on)} (${plural(s.days_left, 'day')})`;
}

/** Keys whose values differ between two audit snapshots (changed fields only). */
export function changedKeys(before: unknown, after: unknown): string[] {
  const b = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  return keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
}
