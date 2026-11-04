'use client';

import * as RT from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useUrlParam } from '@/lib/use-url-state';

export interface TabItem { value: string; label: ReactNode; count?: number; hidden?: boolean; content?: ReactNode }

interface BaseProps { items: TabItem[]; className?: string }
type ControlledProps = BaseProps & { value: string; onValueChange: (v: string) => void; urlParam?: undefined };
type UrlProps = BaseProps & { urlParam: string; defaultValue: string; value?: undefined; onValueChange?: undefined };

function List({ items }: { items: TabItem[] }) {
  return (
    <RT.List className="flex gap-4 overflow-x-auto border-b border-subtle">
      {items.filter((i) => !i.hidden).map((i) => (
        <RT.Trigger
          key={i.value}
          value={i.value}
          className="-mb-px inline-flex min-h-9 items-center gap-1.5 border-b-2 border-transparent px-1 text-base font-medium text-ink-muted hover:text-ink data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-ink"
        >
          {i.label}
          {i.count !== undefined ? <span className="rounded-xs bg-sunken px-1.5 text-xs tabular-nums text-ink-secondary">{i.count}</span> : null}
        </RT.Trigger>
      ))}
    </RT.List>
  );
}

function Panels({ items }: { items: TabItem[] }) {
  return <>{items.filter((i) => !i.hidden).map((i) => <RT.Content key={i.value} value={i.value} className={i.content !== undefined ? 'pt-4' : undefined}>{i.content}</RT.Content>)}</>;
}

function UrlTabs({ items, urlParam, defaultValue, className }: UrlProps) {
  const [value, setValue] = useUrlParam(urlParam, defaultValue);
  return (
    <RT.Root value={value} onValueChange={(v) => setValue(v)} className={className}>
      <List items={items} />
      <Panels items={items} />
    </RT.Root>
  );
}

/** Underline tabs. Controlled, or `urlParam="tab" defaultValue="x"` to sync with the query string. */
export function Tabs(props: ControlledProps | UrlProps) {
  if (props.urlParam !== undefined) return <UrlTabs {...props} />;
  return (
    <RT.Root value={props.value} onValueChange={props.onValueChange} className={cn(props.className)}>
      <List items={props.items} />
      <Panels items={props.items} />
    </RT.Root>
  );
}
