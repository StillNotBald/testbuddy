import { can, type Action } from '@/lib/permissions';
import type { ProjectRole } from '@/services/types';
import type { TourContent, TourStep } from './types';

/** A step with its id and the screen it opens, ready for the provider. */
export interface ResolvedStep extends TourStep {
  id: string;
  href: string;
}

export const ALL_PATH = 'all';

export function allowed(role: ProjectRole | null, requires?: readonly Action[]): boolean {
  return (requires ?? []).every((action) => can(role, action));
}

/** Goals this role may start. */
export function visibleGoals(content: TourContent, role: ProjectRole | null) {
  return content.goals.filter((g) => allowed(role, g.requires));
}

/** Steps for a goal (or `all`) in order, with steps this role may not use left out. */
export function resolvePath(content: TourContent, pathId: string, role: ProjectRole | null): ResolvedStep[] {
  const ids = content.paths[pathId] ?? [];
  const out: ResolvedStep[] = [];
  for (const id of ids) {
    const step = content.steps[id];
    if (!step || !allowed(role, step.requires)) continue;
    const screen = content.screens[step.screen];
    if (!screen) continue;
    out.push({ ...step, id, href: withParams(screen.href, step.params) });
  }
  return out;
}

export function withParams(href: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return href;
  return `${href}?${new URLSearchParams(params).toString()}`;
}

/** True when the browser is already on the step's screen (path and query). */
export function onStepScreen(href: string, pathname: string, search: string): boolean {
  const [path, query = ''] = href.split('?');
  if (path !== pathname) return false;
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search);
  for (const [k, v] of want) if (have.get(k) !== v) return false;
  return true;
}

export interface Placement {
  top: number;
  left: number;
  side: 'above' | 'below';
}

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Places a popover beside an anchor: below it when there is room, otherwise above, and clamped inside the viewport.
 * Pure so it can be tested without a layout engine.
 */
export function placePopover(anchor: Box, pop: { width: number; height: number }, view: { width: number; height: number }, gap = 12, margin = 16): Placement {
  const spaceBelow = view.height - (anchor.top + anchor.height) - gap - margin;
  const side: Placement['side'] = spaceBelow >= pop.height || spaceBelow >= anchor.top - gap - margin ? 'below' : 'above';
  const rawTop = side === 'below' ? anchor.top + anchor.height + gap : anchor.top - gap - pop.height;
  const maxTop = Math.max(margin, view.height - pop.height - margin);
  const top = Math.min(Math.max(rawTop, margin), maxTop);
  const centre = anchor.left + anchor.width / 2 - pop.width / 2;
  const left = Math.min(Math.max(centre, margin), Math.max(margin, view.width - pop.width - margin));
  return { top, left, side };
}
