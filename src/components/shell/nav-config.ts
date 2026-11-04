import { BarChart3, Flag, LayoutDashboard, ListChecks, Play, ScrollText, Settings, Users, Workflow, type LucideIcon } from 'lucide-react';
import type { Action } from '@/lib/permissions';

export interface NavItem {
  id: string;
  label: string;
  /** Path under /p/{projectId}. '' = overview. */
  path: string;
  icon: LucideIcon;
  /** Permission needed to see the item (omit = everyone in the project). */
  action?: Action;
  group: 'main' | 'admin';
  /** g + key shortcut. */
  goKey?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '', icon: LayoutDashboard, group: 'main', goKey: 'o' },
  { id: 'cases', label: 'Repository', path: '/cases', icon: ListChecks, group: 'main', goKey: 'c' },
  { id: 'milestones', label: 'Milestones', path: '/milestones', icon: Flag, group: 'main', goKey: 'm' },
  // Plans is not a default nav item (D-2): it is reached from the Runs header.
  { id: 'runs', label: 'Runs', path: '/runs', icon: Play, group: 'main', goKey: 'r' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: BarChart3, group: 'main', goKey: 'e' },
  { id: 'automation', label: 'Automation', path: '/automation', icon: Workflow, group: 'main', goKey: 'a' },
  { id: 'members', label: 'Members', path: '/members', icon: Users, action: 'members.view', group: 'admin' },
  { id: 'audit', label: 'Audit log', path: '/audit', icon: ScrollText, action: 'audit.view', group: 'admin' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, action: 'settings.announcement', group: 'admin' },
];
