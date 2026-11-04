'use client';

import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState, type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Rows3, Rows4 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { isEditableTarget, useSingleKeyShortcuts } from '@/lib/hotkeys';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from './dropdown-menu';
import { TableSkeleton } from './skeleton';

export type Density = 'comfortable' | 'compact';
export const ROW_HEIGHT: Record<Density, number> = { comfortable: 44, compact: 32 };

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  rowId: (row: T) => string;
  /** Accessible name for the table. */
  caption: string;
  loading?: boolean;
  emptyState?: ReactNode;
  /** Controlled sorting. Set `manualSorting` when the server sorts. */
  sort?: SortingState;
  onSortChange?: (sort: SortingState) => void;
  manualSorting?: boolean;
  /** Adds a checkbox column. Space toggles the focused row, Shift+click / Shift+Space / X select a range. */
  selectable?: boolean;
  selection?: ReadonlySet<string>;
  onSelectionChange?: (next: Set<string>) => void;
  density?: Density;
  /** Renders the comfortable/compact toggle when provided. */
  onDensityChange?: (d: Density) => void;
  /** Enter / click / double-click opens a row. */
  onRowOpen?: (row: T) => void;
  /** Row currently open in an inspector (aria-current). */
  activeRowId?: string;
  /** Extra per-row keys (e.g. E opens execution). Return true when handled. */
  onRowKeyDown?: (row: T, e: KeyboardEvent<HTMLTableRowElement>) => boolean | void;
  rowClassName?: (row: T) => string | undefined;
  /** Total rows on the server (for aria-rowcount when paged). */
  totalRows?: number;
  virtualizeAbove?: number;
  maxHeight?: string;
  columnMenu?: boolean;
}

/**
 * Accessible data table over @tanstack/react-table with virtualisation above `virtualizeAbove` rows (default 100).
 * Keyboard: arrows or J/K move the roving row focus, Enter opens, Space toggles selection, X extends a range,
 * Home/End jump. J/K and X honour the "Single-key shortcuts" setting.
 */
export function DataTable<T>({
  columns, data, rowId, caption, loading, emptyState, sort, onSortChange, manualSorting, selectable, selection, onSelectionChange,
  density = 'comfortable', onDensityChange, onRowOpen, activeRowId, onRowKeyDown, rowClassName, totalRows, virtualizeAbove = 100, maxHeight = '70vh', columnMenu,
}: DataTableProps<T>) {
  const singleKeys = useSingleKeyShortcuts();
  const [internalSort, setInternalSort] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [focusIndex, setFocusIndex] = useState(0);
  const anchor = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sorting = sort ?? internalSort;
  const sel = useMemo(() => selection ?? new Set<string>(), [selection]);

  const allCols = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    const check: ColumnDef<T, unknown> = {
      id: '_select', enableSorting: false, enableHiding: false, size: 40,
      header: () => {
        const some = data.length > 0 && data.some((r) => sel.has(rowId(r)));
        const all = data.length > 0 && data.every((r) => sel.has(rowId(r)));
        return (
          <Checkbox aria-label="Select all rows" checked={all ? true : some ? 'indeterminate' : false}
            onCheckedChange={(v) => onSelectionChange?.(v === true ? new Set([...sel, ...data.map(rowId)]) : new Set([...sel].filter((id) => !data.some((r) => rowId(r) === id))))} />
        );
      },
      cell: ({ row }) => (
        <Checkbox aria-label={`Select row ${row.index + 1}`} checked={sel.has(rowId(row.original))} onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => toggleAt(row.index, (e) => e)} data-select-box />
      ),
    };
    return [check, ...columns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, selectable, sel, data]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is used in a non-memoised component on purpose
  const table = useReactTable({
    data, columns: allCols, getRowId: (r) => rowId(r), getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    state: { sorting, columnVisibility: visibility }, manualSorting, enableSortingRemoval: true,
    onSortingChange: (u) => { const next = typeof u === 'function' ? u(sorting) : u; if (onSortChange) onSortChange(next); else setInternalSort(next); },
    onColumnVisibilityChange: setVisibility,
  });
  const rows = table.getRowModel().rows;
  const rowH = ROW_HEIGHT[density];
  const virtual = rows.length > virtualizeAbove;
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => rowH, overscan: 12, enabled: virtual });
  const items = virtual ? virtualizer.getVirtualItems() : rows.map((_, i) => ({ index: i, start: i * rowH, size: rowH, key: i }));
  const padTop = virtual && items.length ? (items[0]?.start ?? 0) : 0;
  const padBottom = virtual && items.length ? virtualizer.getTotalSize() - (items[items.length - 1]?.start ?? 0) - rowH : 0;

  const clampedFocus = Math.min(focusIndex, Math.max(0, rows.length - 1));

  const focusRow = useCallback((index: number) => {
    const i = Math.max(0, Math.min(rows.length - 1, index));
    setFocusIndex(i);
    if (virtual) virtualizer.scrollToIndex(i);
    requestAnimationFrame(() => scrollRef.current?.querySelector<HTMLElement>(`[data-row-index="${i}"]`)?.focus());
  }, [rows.length, virtual, virtualizer]);

  function toggleAt(index: number, _e: (x: unknown) => unknown, range = false) {
    const next = new Set(sel);
    const row = rows[index];
    if (!row) return;
    if (range && anchor.current !== null) {
      const [a, b] = [Math.min(anchor.current, index), Math.max(anchor.current, index)];
      for (let i = a; i <= b; i += 1) { const r = rows[i]; if (r) next.add(rowId(r.original)); }
    } else {
      const id = rowId(row.original);
      if (next.has(id)) next.delete(id); else next.add(id);
      anchor.current = index;
    }
    onSelectionChange?.(next);
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, index: number) => {
    if (e.target !== e.currentTarget && isEditableTarget(e.target)) return;
    const row = rows[index];
    if (!row) return;
    if (onRowKeyDown?.(row.original, e)) { e.preventDefault(); return; }
    if (e.target !== e.currentTarget) return; // keys inside cell controls belong to them
    const k = e.key;
    const letter = k.length === 1 && singleKeys && !e.ctrlKey && !e.metaKey && !e.altKey ? k.toLowerCase() : '';
    if (k === 'ArrowDown' || letter === 'j') { e.preventDefault(); focusRow(index + 1); }
    else if (k === 'ArrowUp' || letter === 'k') { e.preventDefault(); focusRow(index - 1); }
    else if (k === 'Home') { e.preventDefault(); focusRow(0); }
    else if (k === 'End') { e.preventDefault(); focusRow(rows.length - 1); }
    else if (k === 'Enter' && onRowOpen) { e.preventDefault(); onRowOpen(row.original); }
    else if (k === ' ' && selectable) { e.preventDefault(); toggleAt(index, (x) => x, e.shiftKey); }
    else if (letter === 'x' && selectable) { e.preventDefault(); toggleAt(index, (x) => x, true); }
  };

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>, index: number) => {
    const t = e.target as HTMLElement;
    if (t.closest('a,button,input,select,textarea,[role="checkbox"],[data-select-box]')) {
      if (t.closest('[role="checkbox"]') && selectable && e.shiftKey) { e.preventDefault(); toggleAt(index, (x) => x, true); }
      return;
    }
    setFocusIndex(index);
    const row = rows[index];
    if (row) onRowOpen?.(row.original);
  };

  useEffect(() => { if (focusIndex > rows.length - 1) setFocusIndex(Math.max(0, rows.length - 1)); }, [rows.length, focusIndex]);

  if (loading) return <TableSkeleton rows={8} cols={Math.max(3, columns.length)} />;

  return (
    <div className="space-y-2">
      {onDensityChange || columnMenu ? (
        <div className="flex items-center justify-end gap-2">
          {columnMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" iconLeft={<Columns3 className="size-4" aria-hidden />}>Columns</Button></DropdownMenuTrigger>
              <DropdownMenuContent>
                {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} onSelect={(e) => e.preventDefault()}>
                    {typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {onDensityChange ? (
            <Button size="sm" variant="ghost" aria-label={density === 'comfortable' ? 'Switch to compact rows' : 'Switch to comfortable rows'} iconLeft={density === 'comfortable' ? <Rows4 className="size-4" aria-hidden /> : <Rows3 className="size-4" aria-hidden />} onClick={() => onDensityChange(density === 'comfortable' ? 'compact' : 'comfortable')}>
              {density === 'comfortable' ? 'Comfortable' : 'Compact'}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div ref={scrollRef} className="overflow-auto rounded-md border border-subtle bg-surface" style={{ maxHeight }}>
        <table aria-label={caption} aria-rowcount={(totalRows ?? rows.length) + 1} className="w-full border-collapse text-sm tabular-nums">
          <thead className="sticky top-0 z-10 bg-sunken">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} aria-rowindex={1}>
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted();
                  const canSort = h.column.getCanSort();
                  return (
                    <th key={h.id} scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                      className="h-9 px-3 text-left text-xs font-medium tracking-wide whitespace-nowrap text-ink-secondary" style={{ width: h.column.id === '_select' ? 40 : undefined }}>
                      {h.isPlaceholder ? null : canSort ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 rounded-xs hover:text-ink">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : dir === 'desc' ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />}
                        </button>
                      ) : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {padTop > 0 ? <tr aria-hidden style={{ height: padTop }} /> : null}
            {items.map((it) => {
              const row = rows[it.index];
              if (!row) return null;
              const id = rowId(row.original);
              const selected = sel.has(id);
              return (
                <tr key={row.id} data-row-index={it.index} aria-rowindex={it.index + 2} aria-selected={selectable ? selected : undefined}
                  aria-current={activeRowId === id ? 'true' : undefined} tabIndex={it.index === clampedFocus ? 0 : -1}
                  onFocus={(e) => { if (e.target === e.currentTarget) setFocusIndex(it.index); }}
                  onKeyDown={(e) => onKeyDown(e, it.index)} onClick={(e) => onRowClick(e, it.index)} onDoubleClick={() => onRowOpen?.(row.original)}
                  className={cn('border-t border-subtle outline-none first:border-t-0 hover:bg-sunken/60 focus-visible:bg-sunken', (selected || activeRowId === id) && 'bg-selected hover:bg-selected', onRowOpen && 'cursor-pointer', rowClassName?.(row.original))}
                  style={{ height: rowH }}>
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id} className="max-w-[28rem] truncate px-3 align-middle text-ink">{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                  ))}
                </tr>
              );
            })}
            {padBottom > 0 ? <tr aria-hidden style={{ height: padBottom }} /> : null}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="p-6">{emptyState}</div> : null}
      </div>
    </div>
  );
}
