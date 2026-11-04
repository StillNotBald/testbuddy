'use client';

import { useParams } from 'next/navigation';
import { MilestoneDetailScreen } from '@/components/admin/milestone-detail-screen';

export default function Page() {
  const { projectId, milestoneId } = useParams<{ projectId: string; milestoneId: string }>();
  return <MilestoneDetailScreen projectId={projectId} milestoneId={milestoneId} />;
}
