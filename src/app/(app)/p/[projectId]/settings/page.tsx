'use client';

import { useParams } from 'next/navigation';
import { SettingsScreen } from '@/components/admin/settings-screen';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <SettingsScreen projectId={projectId} />;
}
