'use client';

import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
}

/** Right-hand modal panel for forms that should keep context (invite, token, milestone). */
export function SidePanel({ open, onOpenChange, title, description, width = 480, footer, children }: SidePanelProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-[var(--tb-overlay)]" />
        <RD.Content style={{ width: `min(${width}px, 100vw)` }} className="fixed inset-y-0 right-0 z-50 flex flex-col border-l border-subtle bg-surface shadow-lg">
          <div className="flex items-start justify-between gap-4 border-b border-subtle p-4">
            <div>
              <RD.Title className="text-lg font-semibold text-ink">{title}</RD.Title>
              <RD.Description className={description ? 'mt-0.5 text-sm text-ink-muted' : 'sr-only'}>{description ?? title}</RD.Description>
            </div>
            <RD.Close aria-label="Close" className="rounded-sm p-1 text-ink-muted hover:bg-sunken hover:text-ink"><X className="size-4" /></RD.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-subtle p-4">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
