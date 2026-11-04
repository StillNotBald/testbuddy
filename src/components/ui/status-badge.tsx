import {
  Ban, Bot, ChevronDown, ChevronUp, ChevronsUp, CircleCheck, CircleDashed, CircleX, Diamond, Eye, Hand, Loader, Minus, RotateCw, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AutomationStatus, Priority, Status, TestStatusKey } from '@/services/types';
import { statusKeyOfRow } from '@/services/status';
import { cn } from '@/lib/utils';
import { Kbd } from './kbd';
import { Tooltip } from './tooltip';

/** Status = shape + label + colour. Never colour alone. Fixed words: Passed, Failed, Blocked, Retest, Untested. */
export const STATUS_META: Record<Exclude<TestStatusKey, 'custom'>, { label: string; icon: LucideIcon; hotkey: string; cls: string; solid: string }> = {
  passed: { label: 'Passed', icon: CircleCheck, hotkey: 'P', cls: 'bg-status-passed-bg text-status-passed-text', solid: 'bg-status-passed' },
  failed: { label: 'Failed', icon: CircleX, hotkey: 'F', cls: 'bg-status-failed-bg text-status-failed-text', solid: 'bg-status-failed' },
  blocked: { label: 'Blocked', icon: Ban, hotkey: 'B', cls: 'bg-status-blocked-bg text-status-blocked-text', solid: 'bg-status-blocked' },
  retest: { label: 'Retest', icon: RotateCw, hotkey: 'R', cls: 'bg-status-retest-bg text-status-retest-text', solid: 'bg-status-retest' },
  untested: { label: 'Untested', icon: CircleDashed, hotkey: 'U', cls: 'bg-status-untested-bg text-status-untested-text', solid: 'bg-status-untested' },
};
export const STATUS_ORDER = ['passed', 'failed', 'blocked', 'retest', 'untested'] as const;

export interface StatusBadgeProps {
  /** A derived key, or a full status row (custom statuses render a diamond plus a colour dot). */
  status: TestStatusKey | Pick<Status, 'name' | 'color'>;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  hotkey?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'sm', showLabel = true, hotkey, className }: StatusBadgeProps) {
  const key: TestStatusKey = typeof status === 'string' ? status : statusKeyOfRow(status);
  const row = typeof status === 'string' ? null : status;
  const base = cn('inline-flex items-center gap-1 rounded-xs font-medium whitespace-nowrap', size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm');
  if (key === 'custom') {
    return (
      <span className={cn(base, 'bg-sunken text-ink-secondary', className)} data-status="custom">
        <Diamond className="size-3.5" aria-hidden />
        {row ? <span aria-hidden className="size-2 rounded-full" style={{ background: row.color }} /> : null}
        {showLabel ? row?.name ?? 'Custom' : <span className="sr-only">{row?.name}</span>}
      </span>
    );
  }
  const m = STATUS_META[key];
  const Icon = m.icon;
  return (
    <span className={cn(base, m.cls, className)} data-status={key}>
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      {showLabel ? m.label : <span className="sr-only">{m.label}</span>}
      {hotkey ? <Kbd className="ml-0.5">{m.hotkey}</Kbd> : null}
    </span>
  );
}

const PRIORITY_META: Record<string, { icon: LucideIcon; cls: string }> = {
  P1: { icon: ChevronsUp, cls: 'text-status-failed-text' },
  P2: { icon: ChevronUp, cls: 'text-status-blocked-text' },
  P3: { icon: Minus, cls: 'text-priority-p3' },
  P4: { icon: ChevronDown, cls: 'text-priority-p4' },
};

export function PriorityChip({ priority, className }: { priority?: Pick<Priority, 'short_name' | 'name'> | null; className?: string }) {
  if (!priority) return <span className="text-ink-muted">-</span>;
  const m = PRIORITY_META[priority.short_name] ?? PRIORITY_META.P3;
  const Icon = (m ?? { icon: Minus }).icon;
  return (
    <Tooltip content={priority.name}>
      <span className={cn('inline-flex items-center gap-0.5 text-sm font-medium', m?.cls, className)}>
        <Icon className="size-4" aria-hidden />
        {priority.short_name}
        <span className="sr-only"> {priority.name}</span>
      </span>
    </Tooltip>
  );
}

export const AUTOMATION_META: Record<AutomationStatus, { label: string; icon: LucideIcon; color: string }> = {
  not_specified: { label: 'Not specified', icon: CircleDashed, color: 'var(--tb-auto-not-specified)' },
  needs_review: { label: 'Needs review', icon: Eye, color: 'var(--tb-status-blocked-text)' },
  needs_automation: { label: 'Needs automation', icon: Bot, color: 'var(--tb-status-retest-text)' },
  in_progress: { label: 'In progress', icon: Loader, color: 'var(--tb-auto-in-progress)' },
  automated: { label: 'Automated', icon: Zap, color: 'var(--tb-status-passed-text)' },
  not_automatable: { label: 'Not automatable', icon: Hand, color: 'var(--tb-auto-not-automatable)' },
};

export function AutomationChip({ value, className }: { value: AutomationStatus; className?: string }) {
  const m = AUTOMATION_META[value];
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)} style={{ color: m.color }}>
      <Icon className="size-4" aria-hidden />
      {m.label}
    </span>
  );
}

export function TagChip({ name, color, className }: { name: string; color?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-xs bg-sunken px-1.5 py-0.5 text-xs text-ink-secondary', className)}>
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: color ?? 'var(--tb-ink-muted)' }} />
      {name}
    </span>
  );
}
