'use client';

import * as RM from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = RM.Root;
export const DropdownMenuTrigger = RM.Trigger;
export const DropdownMenuGroup = RM.Group;

export function DropdownMenuContent({ className, align = 'end', sideOffset = 6, ...rest }: ComponentProps<typeof RM.Content>) {
  return (
    <RM.Portal>
      <RM.Content align={align} sideOffset={sideOffset} className={cn('z-[60] min-w-48 rounded-lg border border-subtle bg-surface p-1 text-ink shadow-md', className)} {...rest} />
    </RM.Portal>
  );
}
export function DropdownMenuItem({ className, ...rest }: ComponentProps<typeof RM.Item>) {
  return <RM.Item className={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 text-base outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken', className)} {...rest} />;
}
export function DropdownMenuLabel({ className, ...rest }: ComponentProps<typeof RM.Label>) {
  return <RM.Label className={cn('px-2 py-1 text-xs font-medium text-ink-muted', className)} {...rest} />;
}
export function DropdownMenuSeparator({ className, ...rest }: ComponentProps<typeof RM.Separator>) {
  return <RM.Separator className={cn('my-1 h-px bg-subtle', className)} {...rest} />;
}
export function DropdownMenuCheckboxItem({ className, children, ...rest }: ComponentProps<typeof RM.CheckboxItem>) {
  return (
    <RM.CheckboxItem className={cn('flex min-h-8 cursor-default items-center gap-2 rounded-sm px-2 text-base outline-none select-none data-[highlighted]:bg-sunken', className)} {...rest}>
      <span className="inline-flex size-4 items-center justify-center"><RM.ItemIndicator>✓</RM.ItemIndicator></span>
      {children}
    </RM.CheckboxItem>
  );
}
