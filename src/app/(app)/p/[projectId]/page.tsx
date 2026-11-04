'use client';

import { useParams } from 'next/navigation';
import { ProjectOverviewScreen } from '@/components/entry/overview';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectOverviewScreen projectId={projectId} />;
}
