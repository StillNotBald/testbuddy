'use client';

import { Archive, Lock, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ServiceError } from '@/services/interfaces';
import { useMyProjectRole, useProject } from '@/services/hooks';
import { rememberProject } from '@/components/shell/project-switcher';
import { EmptyState } from './empty-state';
import { ProjectRoleProvider } from './project-context';

/**
 * Loads the membership once and exposes it to the whole project subtree (`useProjectRole`, `useCan`, `RoleGate`).
 * Non-members see the in-shell no-access state so the switcher stays usable; archived projects get the read-only banner.
 */
export function ProjectBoundary({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const roleQ = useMyProjectRole(projectId);
  const projectQ = useProject(projectId);
  useEffect(() => { if (roleQ.data) rememberProject(projectId); }, [roleQ.data, projectId]);

  if (roleQ.isLoading) return <div role="status" aria-label="Loading project" className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  const notFound = (roleQ.error instanceof ServiceError && roleQ.error.code === 'not_found') || (projectQ.error instanceof ServiceError && projectQ.error.code === 'not_found');
  if (notFound) {
    return <EmptyState icon={SearchX} title="Not found" description="This project does not exist or was deleted." action={<Button><Link href="/projects">Back to projects</Link></Button>} />;
  }
  if (roleQ.isError) {
    return <EmptyState tone="error" title="Could not load this project" description={roleQ.error.message} action={<Button onClick={() => void roleQ.refetch()}>Retry</Button>} />;
  }
  if (roleQ.data === null) {
    return <EmptyState icon={Lock} tone="locked" title="You do not have access to this project" description="Ask an admin to add you." action={<Link href="/projects" className="text-accent-text underline">Back to projects</Link>} />;
  }
  const archived = projectQ.data?.is_archived ?? false;
  return (
    <ProjectRoleProvider value={{ projectId, project: projectQ.data, role: roleQ.data ?? null, archived }}>
      {archived ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-subtle bg-status-blocked-bg px-3 py-2 text-base text-status-blocked-text">
          <Archive className="size-4" aria-hidden />This project is archived. Read-only.
        </div>
      ) : null}
      {children}
    </ProjectRoleProvider>
  );
}
