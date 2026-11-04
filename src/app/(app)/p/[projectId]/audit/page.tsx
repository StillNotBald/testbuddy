'use client';

import { useParams } from 'next/navigation';
import { AuditScreen } from '@/components/admin/audit-screen';

export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  return <AuditScreen projectId={projectId} />;
}
