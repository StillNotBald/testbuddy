'use client';

import { useParams } from 'next/navigation';
import { MilestoneReportScreen } from '@/components/exec/reports-screens';

export default function Page() {
  const { milestoneId } = useParams<{ milestoneId: string }>();
  return <MilestoneReportScreen milestoneId={milestoneId} />;
}
