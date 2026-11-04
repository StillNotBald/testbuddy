import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Omit for roles that cannot act (viewers). */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  tone?: 'neutral' | 'error' | 'locked';
  className?: string;
}

/** One sentence of why it is empty plus one action. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, secondaryAction, tone = 'neutral', className }: EmptyStateProps) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cn('mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-10 text-center', className)}>
      <span className={cn('inline-flex size-10 items-center justify-center rounded-full', tone === 'error' ? 'bg-status-failed-bg text-status-failed-text' : 'bg-sunken text-ink-muted')}>
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description ? <p className="text-base text-ink-muted">{description}</p> : null}
      {action || secondaryAction ? <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}{secondaryAction}</div> : null}
    </div>
  );
}
