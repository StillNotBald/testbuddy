import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Hotkey hint chip, e.g. <Kbd>P</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex min-w-[1.25rem] items-center justify-center rounded-xs border border-subtle bg-sunken px-1 font-mono text-xs leading-5 text-ink-secondary', className)}>
      {children}
    </kbd>
  );
}
