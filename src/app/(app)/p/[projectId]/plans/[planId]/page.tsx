'use client';

import { useParams } from 'next/navigation';
import { PlanDetailScreen } from '@/components/exec/plans-screens';

export default function Page() {
  const { planId } = useParams<{ planId: string }>();
  return <PlanDetailScreen planId={planId} />;
}
