'use client';

import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual';
import { useRef, type KeyboardEvent } from 'react';
import { AutomationChip, Badge, Checkbox, PriorityChip, TagChip } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { CaseListItem } from '@/services/interfaces';
import type { CaseType, Id, Priority, Tag } from '@/services/types';

const ROW_H = 44;
/** jsdom and first paint report a 0px viewport; render this many pixels of rows until the real size arrives. */
const FALLBACK_H = 600;

export interface CaseListProps {
  items: CaseListItem[];
  total: number;
  priorities: Map<Id, Priority>;
  types: Map<Id, CaseType>;
  tags: Map<Id, Tag>;
  activeId?: Id;
  selected: Set<Id>;
  selectable: boolean;
  onOpen: (id: Id) => void;
  onToggle: (id: Id, on: boolean) => void;
  onToggleAll: (on: boolean) => void;
  /** Height of the scrolling area. */
  className?: string;
}

/**
 * Virtualised case list (D-3): one scrolling table, no pagination. Only the rows in view are in the DOM,
 * so `aria-rowcount` and `aria-rowindex` carry the real positions (DESIGN.md section 9).
 */
export function CaseList({ items, total, priorities, types, tags, activeId, selected, selectable, onOpen, onToggle, onToggleAll, className }: CaseListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_H,
    overscan: 8,
    initialRect: { width: 0, height: FALLBACK_H },
    observeElementRect: (inst, cb) => observeElementRect(inst, (r) => cb(r.height > 0 ? r : { width: r.width, height: FALLBACK_H })),
  });
  const allOn = items.length > 0 && items.every((i) => selected.has(i.case.id));
  const someOn = !allOn && items.some((i) => selected.has(i.case.id));
  const cols = selectable
    ? 'grid-cols-[2rem_5rem_minmax(0,1fr)_3.25rem_2.5rem] md:grid-cols-[2rem_5.5rem_minmax(0,1fr)_3.5rem_8rem_2.5rem] 2xl:grid-cols-[2rem_5.5rem_minmax(0,1fr)_3.5rem_7rem_8rem_12rem_2.5rem]'
    : 'grid-cols-[5rem_minmax(0,1fr)_3.25rem_2.5rem] md:grid-cols-[5.5rem_minmax(0,1fr)_3.5rem_8rem_2.5rem] 2xl:grid-cols-[5.5rem_minmax(0,1fr)_3.5rem_7rem_8rem_12rem_2.5rem]';

  const moveFocus = (e: KeyboardEvent<HTMLElement>, dir: 1 | -1) => {
    const rowEl = (e.target as HTMLElement).closest('[role="row"]');
    const idx = Number(rowEl?.getAttribute('aria-rowindex') ?? 0) - 2 + dir;
    if (idx < 0 || idx >= items.length) return;
    e.preventDefault();
    v.scrollToIndex(idx);
    requestAnimationFrame(() => scroller.current?.querySelector<HTMLElement>(`[data-row="${idx}"] [data-open]`)?.focus());
  };

  return (
    <div role="table" aria-label="Cases" aria-rowcount={total + 1} className="flex min-h-0 flex-col rounded-md border border-subtle bg-surface">
      <div role="row" aria-rowindex={1} className={cn('grid items-center gap-2 border-b border-subtle bg-sunken px-3 py-1.5 text-sm font-medium text-ink-secondary', cols)}>
        {selectable ? (
          <span role="columnheader" className="flex"><Checkbox aria-label="Select all cases in this list" checked={allOn ? true : someOn ? 'indeterminate' : false} onCheckedChange={(c) => onToggleAll(c === true)} /></span>
        ) : null}
        <span role="columnheader">Ref</span>
        <span role="columnheader">Title</span>
        <span role="columnheader">Priority</span>
        <span role="columnheader" className="hidden md:block">Automation</span>
        <span role="columnheader" className="hidden 2xl:block">Type</span>
        <span role="columnheader" className="hidden 2xl:block">Tags</span>
        <span role="columnheader">Ver</span>
      </div>
      <div ref={scroller} className={cn('relative min-h-0 flex-1 overflow-auto', className)}>
        <div role="rowgroup" style={{ height: v.getTotalSize() }} className="relative w-full">
          {v.getVirtualItems().map((vi) => {
            const it = items[vi.index];
            if (!it) return null;
            const c = it.case;
            const on = selected.has(c.id);
            const pri = c.priority ? priorities.get(c.priority) : undefined;
            const type = c.type ? types.get(c.type) : undefined;
            return (
              <div
                key={c.id}
                role="row"
                aria-rowindex={vi.index + 2}
                aria-selected={selectable ? on : undefined}
                data-row={vi.index}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: ROW_H, transform: `translateY(${vi.start}px)` }}
                className={cn('grid items-center gap-2 border-b border-subtle px-3 text-base', cols, activeId === c.id ? 'bg-selected' : on ? 'bg-sunken' : 'hover:bg-sunken', c.deprecated && 'text-ink-muted')}
              >
                {selectable ? (
                  <span role="cell" className="flex"><Checkbox aria-label={`Select ${c.ref}`} checked={on} onCheckedChange={(x) => onToggle(c.id, x === true)} /></span>
                ) : null}
                <span role="cell" className="font-mono text-sm text-ink-secondary">{c.ref}</span>
                <span role="cell" className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    data-open
                    aria-current={activeId === c.id ? 'true' : undefined}
                    onClick={() => onOpen(c.id)}
                    onKeyDown={(e) => { if (e.key === 'ArrowDown') moveFocus(e, 1); else if (e.key === 'ArrowUp') moveFocus(e, -1); }}
                    className={cn('min-w-0 truncate text-left font-medium hover:underline', c.deprecated ? 'text-ink-muted line-through' : 'text-ink')}
                  >
                    {c.title}
                  </button>
                  {c.deprecated ? <Badge>Deprecated</Badge> : null}
                </span>
                <span role="cell"><PriorityChip priority={pri} /></span>
                <span role="cell" className="hidden md:block"><AutomationChip value={c.automation_status} /></span>
                <span role="cell" className="hidden truncate text-sm text-ink-secondary 2xl:block">{type?.name ?? '-'}</span>
                <span role="cell" className="hidden min-w-0 gap-1 overflow-hidden 2xl:flex">
                  {it.tag_ids.slice(0, 2).map((t) => { const tag = tags.get(t); return tag ? <TagChip key={t} name={tag.name} color={tag.color} /> : null; })}
                  {it.tag_ids.length > 2 ? <span className="text-xs text-ink-muted">+{it.tag_ids.length - 2}</span> : null}
                </span>
                <span role="cell" className="text-sm text-ink-secondary tabular-nums">v{c.version}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
