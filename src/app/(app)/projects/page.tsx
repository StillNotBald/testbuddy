'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProjectList } from '@/components/entry/project-list';

function ProjectsInner() {
  const openNew = useSearchParams().get('new') === '1';
  return <ProjectList openNew={openNew} />;
}

export default function Page() {
  return <Suspense><ProjectsInner /></Suspense>;
}
