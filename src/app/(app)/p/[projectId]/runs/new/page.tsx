'use client';

import { useSearchParams } from 'next/navigation';
import { RunCreateScreen } from '@/components/exec/run-create-screen';

export default function Page() {
  const sp = useSearchParams();
  return <RunCreateScreen initialPlan={sp.get('plan') ?? undefined} initialMilestone={sp.get('milestone') ?? undefined} initialCases={sp.get('cases')?.split(',').filter(Boolean)} />;
}
