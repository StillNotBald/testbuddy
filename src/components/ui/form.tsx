'use client';

import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const field = 'w-full rounded-md border-[1.5px] border-strong bg-surface px-3 py-1.5 text-base text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger';

export function Input({ className, ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(field, 'min-h-8 pointer-coarse:min-h-11', className)} {...rest} />;
}

export function Textarea({ className, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(field, 'min-h-20', className)} {...rest} />;
}

export interface FormFieldProps { label: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactElement<Record<string, unknown>>; className?: string }

/** Visible label, hint and error wired with aria-describedby; injects id/aria props into the child control. */
export function FormField({ label, hint, error, required, children, className }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, 'aria-required': required || undefined })
    : children;
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 font-normal text-ink-muted">(required)</span> : null}
      </label>
      {control}
      {hint ? <p id={hintId} className="text-sm text-ink-muted">{hint}</p> : null}
      {error ? <p id={errId} role="alert" className="text-sm text-status-failed-text">{error}</p> : null}
    </div>
  );
}
