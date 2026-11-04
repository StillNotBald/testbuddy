'use client';

import { Children, cloneElement, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import { can, DISABLED_REASON, type Action } from '@/lib/permissions';
import type { ProjectRole } from '@/services/types';
import { Tooltip } from '@/components/ui/tooltip';
import { ProjectContext } from './project-context';

export interface RoleGateProps {
  /** Roles allowed. Alternatively pass `action` to use the permission matrix. */
  allow?: ProjectRole[];
  action?: Action;
  /** hide = the role can never use it here; disable = it could in another state. */
  mode?: 'hide' | 'disable';
  /** Tooltip when disabled because of the role. */
  reason?: string;
  /** State-based block for allowed roles (closed run, completed milestone). Disables with this tooltip. */
  blockedReason?: string;
  /** Archived projects disable writes (default true). */
  writes?: boolean;
  /** Override the role (tests, previews). */
  role?: ProjectRole | null;
  children: ReactNode;
}

function disabledCopy(child: ReactNode, reason: string): ReactNode {
  const el = Children.only(child) as ReactElement<Record<string, unknown>>;
  const cloned = isValidElement(el)
    ? cloneElement(el, { disabled: true, 'aria-disabled': true, tabIndex: -1, onClick: undefined, onSelect: undefined })
    : el;
  return (
    <Tooltip content={reason}>
      <span tabIndex={0} aria-label={reason} className="inline-flex">{cloned}</span>
    </Tooltip>
  );
}

/**
 * The single place that implements the hide/disable rule (DESIGN.md section 8).
 * Never show a control that will 403; server stays authoritative.
 */
export function RoleGate({ allow, action, mode = 'hide', reason, blockedReason, writes = true, role: roleProp, children }: RoleGateProps) {
  const ctx = useContext(ProjectContext);
  const role = roleProp !== undefined ? roleProp : ctx?.role ?? null;
  const allowed = action ? can(role, action) : !!role && !!allow?.includes(role);
  if (!allowed) {
    if (mode === 'hide') return null;
    return <>{disabledCopy(children, reason ?? DISABLED_REASON.role)}</>;
  }
  if (writes && ctx?.archived) return <>{disabledCopy(children, DISABLED_REASON.archived)}</>;
  if (blockedReason) return <>{disabledCopy(children, blockedReason)}</>;
  return <>{children}</>;
}
