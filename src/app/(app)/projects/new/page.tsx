'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** The new-project form is a dialog on the project list (DESIGN.md 6.2). This URL opens it. */
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace('/projects?new=1'); }, [router]);
  return <p role="status" className="text-base text-ink-muted">Opening the new project form.</p>;
}
