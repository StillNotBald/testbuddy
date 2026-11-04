'use client';

import { ArrowLeft } from 'lucide-react';
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { safeGet, safeSet, useMediaQuery } from '@/lib/use-media-query';

export interface SplitViewProps {
  list: ReactNode;
  detail: ReactNode;
  detailOpen: boolean;
  onClose: () => void;
  /** Detail pane width as a percentage of the container. */
  defaultSize?: number;
  /** Minimum detail width in px. */
  minDetail?: number;
  /** localStorage key that remembers the width. */
  storageKey: string;
}

/** List + detail side by side. Drag the separator or use Left/Right arrows. Below 1024px the detail is a full-width overlay with Back. */
export function SplitView({ list, detail, detailOpen, onClose, defaultSize = 45, minDetail = 360, storageKey }: SplitViewProps) {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const box = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(() => {
    const saved = typeof window === 'undefined' ? 0 : Number(safeGet(storageKey));
    return saved >= 20 && saved <= 80 ? saved : defaultSize;
  });

  const apply = useCallback((next: number) => {
    const w = box.current?.getBoundingClientRect().width ?? 1000;
    const min = Math.min(80, (minDetail / w) * 100);
    const v = Math.round(Math.max(min, Math.min(80, next)));
    setPct(v);
    safeSet(storageKey, String(v));
  }, [minDetail, storageKey]);

  const onDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !box.current) return;
    const r = box.current.getBoundingClientRect();
    apply(((r.right - e.clientX) / r.width) * 100);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); apply(pct + 3); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); apply(pct - 3); }
  };

  if (!wide) {
    return (
      <div ref={box}>
        {list}
        {detailOpen ? (
          <div className="fixed inset-0 z-40 overflow-auto bg-surface p-3">
            <Button variant="ghost" iconLeft={<ArrowLeft className="size-4" aria-hidden />} onClick={onClose} className="mb-2">Back</Button>
            {detail}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div ref={box} className="flex min-h-0 gap-0">
      <div className="min-w-0 flex-1">{list}</div>
      {detailOpen ? (
        <>
          <div role="separator" aria-orientation="vertical" aria-label="Resize detail pane" aria-valuenow={pct} aria-valuemin={20} aria-valuemax={80} tabIndex={0}
            onKeyDown={onKey} onPointerMove={onDrag} onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
            className="mx-1 w-1.5 shrink-0 cursor-col-resize rounded-full bg-subtle hover:bg-accent" />
          <aside aria-label="Details" style={{ width: `${pct}%`, minWidth: minDetail }} className="shrink-0 overflow-auto rounded-md border border-subtle bg-surface p-4">{detail}</aside>
        </>
      ) : null}
    </div>
  );
}
