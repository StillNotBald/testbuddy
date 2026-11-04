'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export const PAGE_SIZES = [25, 50, 100, 200] as const;

export interface PaginationProps { page: number; pageSize: number; total: number; onChange: (page: number, pageSize: number) => void; sizes?: readonly number[] }

/** "1-50 of 212" with page-size select and prev/next. 1-based pages. */
export function Pagination({ page, pageSize, total, onChange, sizes = PAGE_SIZES }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm text-ink-secondary">
      <span className="tabular-nums">{from}-{to} of {total}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          Rows
          <select value={pageSize} onChange={(e) => onChange(1, Number(e.target.value))} className="min-h-8 rounded-md border-[1.5px] border-strong bg-surface px-1.5 text-sm text-ink">
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1, pageSize)}><ChevronLeft className="size-4" aria-hidden /></Button>
        <span className="tabular-nums">Page {page} of {pages}</span>
        <Button size="sm" variant="outline" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1, pageSize)}><ChevronRight className="size-4" aria-hidden /></Button>
      </div>
    </nav>
  );
}
