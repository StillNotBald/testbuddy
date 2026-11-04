'use client';

import { useParams } from 'next/navigation';
import { RunDetailScreen } from '@/components/exec/run-detail-screen';

export default function Page() {
  const { runId } = useParams<{ runId: string }>();
  return <RunDetailScreen runId={runId} />;
}
