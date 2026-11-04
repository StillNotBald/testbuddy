'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Kbd } from './kbd';

export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-accent-hover',
        secondary: 'bg-sunken text-ink hover:bg-subtle',
        outline: 'border border-strong bg-surface text-ink hover:bg-sunken',
        ghost: 'text-ink-secondary hover:bg-sunken hover:text-ink',
        danger: 'bg-danger text-danger-fg hover:opacity-90',
      },
      size: {
        sm: 'min-h-8 px-2.5 text-sm pointer-coarse:min-h-11',
        md: 'min-h-8 px-3.5 text-base pointer-coarse:min-h-11',
        lg: 'min-h-11 px-5 text-base',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  loading?: boolean;
  iconLeft?: ReactNode;
  /** Hotkey hint shown inside the button. */
  kbd?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, size, loading, iconLeft, kbd, className, children, disabled, type = 'button', ref, ...rest }: ButtonProps) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonStyles({ variant, size }), className)} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : iconLeft}
      {children}
      {kbd ? <Kbd className="ml-1">{kbd}</Kbd> : null}
    </button>
  );
}
