'use client';

import { CircleAlert, FlaskConical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_LABEL } from '@/lib/permissions';
import { useDemoUsers, useSignInAs } from '@/services/hooks';
import { resetMockDb } from '@/services/mock/core';

/**
 * Sign in. The demo build has no real credentials: the list below is the demo picker, which is also what the
 * test suite signs in with. Behaviour is unchanged from the placeholder; only the presentation is finished.
 */
function SignInInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const demo = params.get('demo');
  const qc = useQueryClient();
  const seeded = useRef(false);
  const users = useDemoUsers();
  const signIn = useSignInAs();
  // ?demo=heavy|standard re-seeds once through the same path as the Reset demo data dialog.
  useEffect(() => {
    if (seeded.current || (demo !== 'heavy' && demo !== 'standard')) return;
    seeded.current = true;
    resetMockDb(demo);
    void qc.invalidateQueries();
  }, [demo, qc]);
  const target = next && next.startsWith('/') ? next : '/';

  return (
    <Card className="w-full max-w-md space-y-5 p-6">
      <header className="space-y-2 text-center">
        <span className="mx-auto inline-flex size-10 items-center justify-center rounded-md bg-primary text-primary-fg" aria-hidden>
          <FlaskConical className="size-5" />
        </span>
        <p className="text-sm font-semibold tracking-wide text-ink-muted">TestBuddy</p>
        <h1 className="text-xl font-semibold text-ink">Sign in to your workspace</h1>
      </header>

      <div role="note" className="flex items-start gap-2 rounded-md border border-subtle bg-selected px-3 py-2 text-sm text-ink">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
        <span>Demo mode. Choose a demo user. This build has no real credentials.</span>
      </div>

      {signIn.error ? <p role="alert" className="text-sm text-status-failed-text">{signIn.error.message}</p> : null}

      {users.isLoading ? (
        <div role="status" aria-label="Loading demo users" className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : users.isError ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-status-failed-text">Could not load the demo users. {users.error.message}</p>
          <Button variant="outline" className="w-full" onClick={() => void users.refetch()}>Try again</Button>
        </div>
      ) : (
        <ul aria-label="Demo users" className="space-y-2">
          {(users.data ?? []).map((d) => {
            const disabled = !d.user.is_active;
            const pending = signIn.isPending && signIn.variables === d.user.id;
            return (
              <li key={d.user.id}>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-between"
                  disabled={disabled}
                  loading={pending}
                  onClick={() => signIn.mutate(d.user.id, { onSuccess: () => router.replace(target) })}
                >
                  <span className="flex min-w-0 flex-col items-start text-left">
                    <span>Sign in as {d.user.name}</span>
                    <span className="text-sm font-normal text-ink-muted">{d.user.email}</span>
                  </span>
                  {disabled ? (
                    <Badge tone="neutral">Disabled</Badge>
                  ) : (
                    <Badge tone="accent">{d.core_role ? ROLE_LABEL[d.core_role] : 'Not in CORE'}</Badge>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-sm text-ink-muted">Disabled accounts cannot sign in. Ask an admin to re-enable them.</p>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <main className="w-full max-w-md">
      <Suspense><SignInInner /></Suspense>
    </main>
  );
}
