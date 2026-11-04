import type { ReactNode } from 'react';
import { ProjectBoundary } from '@/components/tb/project-boundary';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return <ProjectBoundary>{children}</ProjectBoundary>;
}
