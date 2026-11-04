'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/form';
import { Kbd } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import { setSingleKeyShortcuts, useHotkeys, useRegisteredShortcuts, useSingleKeyShortcuts, type ShortcutScope } from '@/lib/hotkeys';

const GLOBAL_ITEMS: ShortcutScope = {
  id: 'static-global', scope: 'Global',
  items: [
    { keys: '?', label: 'Show keyboard shortcuts' }, { keys: '/', label: 'Search' }, { keys: 'Ctrl/Cmd+K', label: 'Search' },
    { keys: 'g o', label: 'Go to Overview' }, { keys: 'g c', label: 'Go to Cases' }, { keys: 'g m', label: 'Go to Milestones' },
    { keys: 'g r', label: 'Go to Runs' }, { keys: 'g e', label: 'Go to Reports' }, { keys: 'g a', label: 'Go to Automation' },
  ],
};

export interface KeyboardHelpProps { open: boolean; onOpenChange: (open: boolean) => void; scopes?: ShortcutScope[] }

/** `?` overlay. Defaults to every scope currently registered with useHotkeys, newest screen first. */
export function KeyboardHelp({ open, onOpenChange, scopes }: KeyboardHelpProps) {
  const registered = useRegisteredShortcuts();
  const singleKeys = useSingleKeyShortcuts();
  const [q, setQ] = useState('');
  const all = [...(scopes ?? [...registered].reverse()), GLOBAL_ITEMS];
  const shown = all.map((s) => ({ ...s, items: s.items.filter((i) => !q || `${i.keys} ${i.label}`.toLowerCase().includes(q.toLowerCase())) })).filter((s) => s.items.length);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts" className="w-[min(36rem,calc(100vw-2rem))]">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-sunken p-2">
        <label htmlFor="single-key-switch" className="text-base text-ink">Single-key shortcuts</label>
        <Switch id="single-key-switch" checked={singleKeys} onCheckedChange={setSingleKeyShortcuts} />
      </div>
      {!singleKeys ? <p className="mb-2 text-sm text-ink-muted">Single-key shortcuts are off. Modifier shortcuts still work.</p> : null}
      <Input aria-label="Search shortcuts" placeholder="Search shortcuts" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
      <div className="space-y-4">
        {shown.length === 0 ? <p className="text-base text-ink-muted">No shortcuts match.</p> : null}
        {shown.map((s) => (
          <section key={s.id}>
            <h3 className="mb-1 text-sm font-semibold text-ink-secondary">{s.scope}</h3>
            <ul className="divide-y divide-subtle">
              {s.items.map((i) => (
                <li key={i.keys + i.label} className="flex items-center justify-between py-1.5 text-base">
                  <span>{i.label}</span>
                  <span className="flex gap-1">{i.keys.split(' ').map((k, n) => <Kbd key={n}>{k}</Kbd>)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

/** Opens the help dialog on `?`. Mount once in the shell. */
export function useKeyboardHelpHotkey(open: () => void): void {
  useHotkeys('Help', { '?': open });
}
