'use client';

import * as RS from '@radix-ui/react-switch';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Switch({ className, ...rest }: ComponentProps<typeof RS.Root>) {
  return (
    <RS.Root className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-strong bg-sunken transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:opacity-50', className)} {...rest}>
      <RS.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-ink-muted transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-ink" />
    </RS.Root>
  );
}
