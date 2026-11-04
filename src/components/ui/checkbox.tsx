'use client';

import * as RC from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...rest }: ComponentProps<typeof RC.Root>) {
  return (
    <RC.Root className={cn('inline-flex size-4.5 shrink-0 items-center justify-center rounded-xs border-[1.5px] border-strong bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent disabled:opacity-50', className)} {...rest}>
      <RC.Indicator className="text-accent-ink">
        {rest.checked === 'indeterminate' ? <Minus className="size-3.5" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
      </RC.Indicator>
    </RC.Root>
  );
}
