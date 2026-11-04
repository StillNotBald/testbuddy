'use client';

import * as RS from '@radix-ui/react-select';
import { Command } from 'cmdk';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface Option { value: string; label: string; disabled?: boolean }

const trigger = 'inline-flex min-h-8 w-full items-center justify-between gap-2 rounded-md border-[1.5px] border-strong bg-surface px-3 text-base text-ink disabled:cursor-not-allowed disabled:opacity-60 pointer-coarse:min-h-11 aria-[invalid=true]:border-danger';
const CLEAR = '__clear__';

export interface SelectProps {
  options: Option[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
}

/** Radix Select with an optional "clear" entry. */
export function Select({ options, value, onChange, placeholder = 'Select', clearable, disabled, className, ...aria }: SelectProps) {
  return (
    <RS.Root value={value ?? ''} onValueChange={(v) => onChange(v === CLEAR ? undefined : v)} disabled={disabled}>
      <RS.Trigger className={cn(trigger, className)} {...aria}>
        <RS.Value placeholder={<span className="text-ink-muted">{placeholder}</span>} />
        <RS.Icon><ChevronDown className="size-4 text-ink-muted" aria-hidden /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content position="popper" sideOffset={4} className="z-[60] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-subtle bg-surface text-ink shadow-md">
          <RS.Viewport className="p-1">
            {clearable && value ? (
              <RS.Item value={CLEAR} className="flex min-h-8 items-center gap-2 rounded-sm px-2 text-base text-ink-muted outline-none data-[highlighted]:bg-sunken"><RS.ItemText>Clear selection</RS.ItemText></RS.Item>
            ) : null}
            {options.map((o) => (
              <RS.Item key={o.value} value={o.value} disabled={o.disabled} className="flex min-h-8 items-center justify-between gap-2 rounded-sm px-2 text-base outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-sunken">
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator><Check className="size-4" aria-hidden /></RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}

export interface ComboboxProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Single select closes after a pick. Default multi. */
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/** Searchable select (Popover + cmdk listbox), single or multi. */
export function Combobox({ options, value, onChange, multiple = true, placeholder = 'Select', searchPlaceholder = 'Search', clearable, disabled, className, id, ...aria }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.value));
  const toggle = (v: string) => {
    if (!multiple) { onChange([v]); setOpen(false); return; }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const label = selected.length === 0 ? placeholder : multiple && selected.length > 2 ? `${selected.length} selected` : selected.map((s) => s.label).join(', ');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- aria-controls is provided by the Popover trigger */}
        <button id={id} type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox" disabled={disabled} className={cn(trigger, className)} {...aria}>
          <span className={cn('truncate', selected.length === 0 && 'text-ink-muted')}>{label}</span>
          <span className="flex items-center gap-1">
            {clearable && selected.length > 0 ? (
              <span role="button" tabIndex={-1} aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange([]); }} className="rounded-xs p-0.5 hover:bg-sunken"><X className="size-3.5" aria-hidden /></span>
            ) : null}
            <ChevronDown className="size-4 text-ink-muted" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <Command label={placeholder}>
          <Command.Input placeholder={searchPlaceholder} className="w-full border-b border-subtle bg-transparent px-3 py-2 text-base outline-none" />
          <Command.List className="max-h-64 overflow-auto p-1">
            <Command.Empty className="px-3 py-2 text-sm text-ink-muted">No matches</Command.Empty>
            {options.map((o) => (
              <Command.Item key={o.value} value={o.label} disabled={o.disabled} onSelect={() => toggle(o.value)} className="flex min-h-8 cursor-default items-center justify-between gap-2 rounded-sm px-2 text-base data-[disabled=true]:opacity-50 data-[selected=true]:bg-sunken">
                {o.label}
                {value.includes(o.value) ? <Check className="size-4" aria-hidden /> : null}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
