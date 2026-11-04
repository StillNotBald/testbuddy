'use client';

import { CircleHelp, Compass, Keyboard, Menu, Plus, Search } from 'lucide-react';
import { useTour } from '@/guide/tour';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { can } from '@/lib/permissions';
import type { ProjectRole } from '@/services/types';
import { ThemeToggle } from './theme-toggle';

export interface TopbarProps {
  projectId?: string;
  role: ProjectRole | null;
  switcher: ReactNode;
  user: ReactNode;
  onSearch: () => void;
  onHelp: () => void;
  onMenu?: () => void;
}

/** 52px topbar: switcher, search, Create (role-gated), theme, help, user. */
export function Topbar({ projectId, role, switcher, user, onSearch, onHelp, onMenu }: TopbarProps) {
  const canCase = can(role, 'cases.write');
  const canRun = can(role, 'runs.write');
  const tour = useTour();
  return (
    <header className="sticky top-0 z-30 flex min-w-0 h-[var(--tb-topbar-h)] items-center gap-2 border-b border-subtle bg-canvas px-3">
      {onMenu ? <Button variant="ghost" size="sm" aria-label="Open navigation" onClick={onMenu}><Menu className="size-4" aria-hidden /></Button> : null}
      <Link href="/" className="hidden rounded-md px-1 text-lg font-semibold text-ink sm:block">TestBuddy</Link>
      <div className="mx-1 hidden h-5 w-px bg-subtle sm:block" aria-hidden />
      <div className="min-w-0 shrink">{switcher}</div>
      <div className="flex-1" />
      <Button variant="outline" size="sm" data-tour="topbar-search" aria-label="Search" onClick={onSearch} iconLeft={<Search className="size-4" aria-hidden />} className="text-ink-muted">
        <span className="hidden sm:inline">Search</span><Kbd className="hidden sm:inline-flex">/</Kbd>
      </Button>
      {projectId && (canCase || canRun) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="primary" size="sm" data-tour="topbar-create" aria-label="Create" iconLeft={<Plus className="size-4" aria-hidden />}><span className="hidden sm:inline">Create</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            {canCase ? <DropdownMenuItem asChild><Link href={`/p/${projectId}/cases/new`}>New case</Link></DropdownMenuItem> : null}
            {canRun ? <DropdownMenuItem asChild><Link href={`/p/${projectId}/runs/new`}>New run</Link></DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {/* Phones: theme follows the system; Help items are also in the user menu. */}
      <div className="hidden sm:block"><ThemeToggle /></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label="Help" data-tour="topbar-help" className="hidden sm:inline-flex"><CircleHelp className="size-4" aria-hidden /></Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => tour.open()}><Compass className="size-4" aria-hidden />Take the guide</DropdownMenuItem>
          <DropdownMenuItem onSelect={onHelp}><Keyboard className="size-4" aria-hidden />Keyboard shortcuts<Kbd>?</Kbd></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/how-it-works">How it works</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {user}
    </header>
  );
}
