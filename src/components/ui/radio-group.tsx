'use client';

import * as RR from '@radix-ui/react-radio-group';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function RadioGroup({ className, ...rest }: ComponentProps<typeof RR.Root>) {
  return <RR.Root className={cn('grid gap-2', className)} {...rest} />;
}

export function RadioItem({ className, label, id, ...rest }: ComponentProps<typeof RR.Item> & { label: string }) {
  const rid = id ?? `radio-${rest.value}`;
  return (
    <div className="flex items-center gap-2">
      <RR.Item id={rid} className={cn('inline-flex size-4.5 items-center justify-center rounded-full border-[1.5px] border-strong bg-surface data-[state=checked]:border-accent', className)} {...rest}>
        <RR.Indicator className="size-2.5 rounded-full bg-accent" />
      </RR.Item>
      <label htmlFor={rid} className="text-base text-ink">{label}</label>
    </div>
  );
}
