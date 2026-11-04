'use client';

import { useParams } from 'next/navigation';
import { RunReportScreen } from '@/components/exec/reports-screens';

export default function Page() {
  const { runId } = useParams<{ runId: string }>();
  return <RunReportScreen runId={runId} />;
}
