import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const badgeStyles = cva('inline-flex items-center gap-1 rounded-xs font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-sunken text-ink-secondary',
      info: 'bg-status-retest-bg text-status-retest-text',
      success: 'bg-status-passed-bg text-status-passed-text',
      warning: 'bg-status-blocked-bg text-status-blocked-text',
      danger: 'bg-status-failed-bg text-status-failed-text',
      accent: 'bg-selected text-accent-text',
    },
    size: { sm: 'px-1.5 py-0.5 text-xs', md: 'px-2 py-0.5 text-sm' },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> { icon?: ReactNode }

export function Badge({ tone, size, icon, className, children, ...rest }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone, size }), className)} {...rest}>{icon}{children}</span>;
}
