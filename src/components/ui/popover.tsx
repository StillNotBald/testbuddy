'use client';

import * as RP from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Popover = RP.Root;
export const PopoverTrigger = RP.Trigger;
export const PopoverAnchor = RP.Anchor;

export function PopoverContent({ className, align = 'start', sideOffset = 6, ...rest }: ComponentProps<typeof RP.Content>) {
  return (
    <RP.Portal>
      <RP.Content align={align} sideOffset={sideOffset} className={cn('z-[60] rounded-lg border border-subtle bg-surface p-2 text-ink shadow-md', className)} {...rest} />
    </RP.Portal>
  );
}
