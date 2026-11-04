'use client';

import { PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { ProjectRole } from '@/services/types';
import { NAV_ITEMS } from './nav-config';

export interface ProjectSidebarProps {
  projectId: string;
  role: ProjectRole | null;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Called after a link is chosen (closes the mobile slide-over). */
  onNavigate?: () => void;
}

/** Per-project navigation. Items come from `NAV_ITEMS`, filtered by role. */
export function ProjectSidebar({ projectId, role, collapsed = false, onToggle, onNavigate }: ProjectSidebarProps) {
  const pathname = usePathname();
  const base = `/p/${projectId}`;
  const items = NAV_ITEMS.filter((i) => !i.action || can(role, i.action));
  const render = (group: 'main' | 'admin') => items.filter((i) => i.group === group).map((i) => {
    const href = `${base}${i.path}`;
    const active = i.path === '' ? pathname === base : pathname.startsWith(href);
    const Icon = i.icon;
    return (
      <li key={i.id}>
        <Tooltip content={collapsed ? i.label : undefined} side="right">
          <Link href={href} data-tour={`nav-${i.id}`} onClick={onNavigate} aria-current={active ? 'page' : undefined} aria-label={collapsed ? i.label : undefined}
            className={cn('relative flex min-h-9 items-center gap-3 rounded-md px-3 text-base text-ink-secondary hover:bg-sunken', active && 'bg-[var(--tb-sidebar-active-bg)] font-semibold text-ink', collapsed && 'justify-center px-0')}>
            {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" /> : null}
            <Icon className="size-4.5 shrink-0" aria-hidden />
            {collapsed ? null : <span className="truncate">{i.label}</span>}
          </Link>
        </Tooltip>
      </li>
    );
  });
  const hasAdmin = items.some((i) => i.group === 'admin');
  return (
    <nav aria-label="Project" className="flex h-full flex-col gap-2 p-2">
      <ul className="space-y-0.5">{render('main')}</ul>
      {hasAdmin ? <><hr className="my-1 border-subtle" /><ul className="space-y-0.5">{render('admin')}</ul></> : null}
      {onToggle ? (
        <div className="mt-auto">
          <Button variant="ghost" size="sm" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} iconLeft={<PanelLeft className="size-4" aria-hidden />}>{collapsed ? null : 'Collapse'}</Button>
        </div>
      ) : null}
    </nav>
  );
}
