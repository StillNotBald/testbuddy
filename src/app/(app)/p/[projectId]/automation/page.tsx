'use client';

import { useParams } from 'next/navigation';
import { AutomationScreen } from '@/components/entry/automation';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <AutomationScreen projectId={projectId} />;
}
