'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, buttonStyles } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { can, DISABLED_REASON, type Action } from '@/lib/permissions';
import { useCan, useProjectRole } from '@/components/tb/project-context';

/**
 * A navigation button that follows the role rule: hidden for roles that can never use it,
 * disabled with a reason when the project is archived (DESIGN.md section 8).
 */
export function GatedLink({ action, href, variant = 'primary', children }: { action: Action; href: string; variant?: 'primary' | 'outline'; children: ReactNode }) {
  const role = useProjectRole();
  const allowed = useCan(action);
  if (!can(role, action)) return null;
  if (!allowed) {
    return (
      <Tooltip content={DISABLED_REASON.archived}>
        <span tabIndex={0} aria-label={DISABLED_REASON.archived} className="inline-flex rounded-md">
          <Button variant={variant} disabled>{children}</Button>
        </span>
      </Tooltip>
    );
  }
  return <Link href={href} className={buttonStyles({ variant, size: 'md' })}>{children}</Link>;
}
