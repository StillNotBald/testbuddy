'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type ThemeChoice = 'light' | 'dark' | 'system';
const listeners = new Set<() => void>();
let mem: ThemeChoice = 'system';

function read(): ThemeChoice {
  try {
    const v = window.localStorage.getItem('theme');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* use memory */ }
  return mem;
}

/** Applies the choice to <html> and persists it where the no-flash script in layout.tsx reads it. */
export function setTheme(choice: ThemeChoice): void {
  mem = choice;
  try { window.localStorage.setItem('theme', choice); } catch { /* memory only */ }
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, read, () => 'system');
}

const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const theme = useTheme();
  const Icon = ICON[theme];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Theme: ${theme}`}><Icon className="size-4" aria-hidden /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(['light', 'dark', 'system'] as const).map((t) => {
          const I = ICON[t];
          return <DropdownMenuItem key={t} onSelect={() => setTheme(t)}><I className="size-4" aria-hidden />{t[0]?.toUpperCase()}{t.slice(1)}{theme === t ? ' (current)' : ''}</DropdownMenuItem>;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
