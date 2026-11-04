'use client';

import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './form';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, footer, className }: DialogProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-[var(--tb-overlay)]" />
        <RD.Content className={cn('fixed top-1/2 left-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-subtle bg-surface p-5 shadow-lg', className)}>
          <div className="mb-3 flex items-start justify-between gap-4">
            <RD.Title className="text-lg font-semibold text-ink">{title}</RD.Title>
            <RD.Close aria-label="Close" className="rounded-sm p-1 text-ink-muted hover:bg-sunken hover:text-ink"><X className="size-4" /></RD.Close>
          </div>
          {description ? <RD.Description className="mb-3 text-base text-ink-secondary">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
          {children}
          {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Verb + target, e.g. "Delete 3 cases". */
  confirmLabel: string;
  tone?: 'danger' | 'default';
  /** Typed confirmation: the user must type this exact text. */
  requireText?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = 'default', requireText, onConfirm }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = !!requireText && typed !== requireText;
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); setTyped(''); }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) setTyped(''); onOpenChange(o); }}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} disabled={blocked} onClick={run}>{confirmLabel}</Button>
        </>
      )}
    >
      {requireText ? (
        <label className="block space-y-1 text-sm text-ink">
          <span>Type <strong className="font-mono">{requireText}</strong> to confirm</span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </label>
      ) : null}
    </Dialog>
  );
}
