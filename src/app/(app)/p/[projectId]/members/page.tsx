'use client';

import { useParams } from 'next/navigation';
import { MembersScreen } from '@/components/admin/members-screen';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <MembersScreen projectId={projectId} />;
}
