'use client';

import { useParams } from 'next/navigation';
import { MilestonesScreen } from '@/components/admin/milestones-screen';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <MilestonesScreen projectId={projectId} />;
}
