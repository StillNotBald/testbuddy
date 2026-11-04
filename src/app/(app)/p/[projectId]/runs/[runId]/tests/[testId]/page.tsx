'use client';

import { useParams } from 'next/navigation';
import { TestExecutionScreen } from '@/components/exec/test-execution-screen';

export default function Page() {
  const { runId, testId } = useParams<{ runId: string; testId: string }>();
  return <TestExecutionScreen runId={runId} testId={testId} />;
}
