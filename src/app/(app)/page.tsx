'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveWorkspace } from '@/lib/active-workspace';
import { safeGet } from '@/lib/use-media-query';
import { useProjects } from '@/services/hooks/access';

/**
 * Redirect to the last project, else the first project in the active workspace,
 * else the project list. (The project list is a placeholder until its mockup is
 * approved, so falling back to it straight away left users with no way into a project.)
 */
export default function HomePage() {
  const router = useRouter();
  const { workspace, isLoading: wsLoading } = useActiveWorkspace();
  const projects = useProjects(workspace?.id);

  useEffect(() => {
    let last: string | undefined;
    try { last = (JSON.parse(safeGet('testbuddy.recentProjects') ?? '[]') as string[])[0]; } catch { last = undefined; }
    if (last) { router.replace(`/p/${last}`); return; }
    if (wsLoading || projects.isLoading) return;
    const first = projects.data?.[0]?.project;
    router.replace(first ? `/p/${first.id}` : '/projects');
  }, [router, wsLoading, projects.isLoading, projects.data]);

  return <Skeleton className="h-8 w-48" />;
}
