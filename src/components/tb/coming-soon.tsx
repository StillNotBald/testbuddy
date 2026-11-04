'use client';

import { Construction, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Action } from '@/lib/permissions';
import { PageHeader, type Crumb } from '@/components/shell/page-header';
import { EmptyState } from './empty-state';
import { useCan, useProjectRole } from './project-context';

export interface ComingSoonProps {
  title: string;
  breadcrumbs?: Crumb[];
  /** Permission needed to open the screen; others see the no-permission state. */
  requires?: Action;
  actions?: ReactNode;
}

/** Route placeholder: PageHeader + EmptyState. Screen agents replace this with the real screen. */
export function ComingSoon({ title, breadcrumbs, requires, actions }: ComingSoonProps) {
  const role = useProjectRole();
  const allowed = useCan(requires ?? 'cases.write', { writes: false });
  const blocked = requires && role !== null && !allowed;
  return (
    <>
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={blocked ? undefined : actions} />
      {blocked ? (
        <EmptyState icon={Lock} tone="locked" title="You do not have permission to view this" description="Ask an admin if you need access." />
      ) : (
        <EmptyState icon={Construction} title="Coming in the next wave" description="This screen is part of the route skeleton and has no content yet." />
      )}
    </>
  );
}
