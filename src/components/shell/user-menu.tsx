'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Compass, Keyboard, LogOut, RotateCcw, UserRound } from 'lucide-react';
import { useTour } from '@/guide/tour';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { setSingleKeyShortcuts, useSingleKeyShortcuts } from '@/lib/hotkeys';
import { ROLE_LABEL } from '@/lib/permissions';
import { isMockSource } from '@/services';
import { useDemoUsers, useSession, useSignInAs, useSignOut } from '@/services/hooks';
import { resetMockDb, type DemoSeedKind } from '@/services/mock/core';
import type { ProjectRole } from '@/services/types';

export function UserMenu({ role, onOpenHelp }: { role: ProjectRole | null; onOpenHelp: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const singleKeys = useSingleKeyShortcuts();
  const demo = useDemoUsers();
  const signInAs = useSignInAs();
  const signOut = useSignOut();
  const [resetOpen, setResetOpen] = useState(false);
  const [seedKind, setSeedKind] = useState<DemoSeedKind>('standard');
  const user = session?.user;
  const tour = useTour();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="User menu" data-tour="user-menu" iconLeft={<UserRound className="size-4" aria-hidden />}>
            <span className="hidden max-w-32 truncate sm:inline">{user?.name ?? 'Account'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>
            <div className="text-base font-medium text-ink">{user?.name}</div>
            <div className="font-normal">{user?.email}{role ? ` - ${ROLE_LABEL[role]} here` : ''}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={singleKeys} onCheckedChange={(v) => setSingleKeyShortcuts(!!v)} onSelect={(e) => e.preventDefault()}>Single-key shortcuts</DropdownMenuCheckboxItem>
          <DropdownMenuItem onSelect={() => tour.open()}><Compass className="size-4" aria-hidden />Take the guide</DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenHelp}><Keyboard className="size-4" aria-hidden />Keyboard shortcuts</DropdownMenuItem>
          {isMockSource() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Demo: sign in as</DropdownMenuLabel>
              {(demo.data ?? []).filter((d) => d.user.is_active).map((d) => (
                <DropdownMenuItem key={d.user.id} disabled={d.user.id === user?.id} onSelect={() => signInAs.mutate(d.user.id, { onSuccess: () => { toast.info(`Signed in as ${d.user.name}`); router.refresh(); } })}>
                  <span className="flex-1">{d.user.name}</span><span className="text-xs text-ink-muted">{d.core_role ? ROLE_LABEL[d.core_role] : 'No CORE access'}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => { setSeedKind('standard'); setResetOpen(true); }}><RotateCcw className="size-4" aria-hidden />Reset demo data</DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut.mutate(undefined, { onSuccess: () => router.replace('/sign-in') })}><LogOut className="size-4" aria-hidden />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={resetOpen} onOpenChange={setResetOpen} tone="danger" title="Reset demo data?"
        description={(
          <>
            <span className="block">This replaces everything in this browser with the original demo data. Your edits will be lost.</span>
            <fieldset className="mt-3 space-y-1">
              <legend className="mb-1 text-sm font-medium text-ink">Demo data</legend>
              {([['standard', 'Standard demo'], ['heavy', 'Busy team (heavy)']] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-ink">
                  <input type="radio" name="demo-seed" value={value} checked={seedKind === value} onChange={() => setSeedKind(value)} />
                  {label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        confirmLabel="Reset demo data"
        onConfirm={() => { resetMockDb(seedKind); void qc.invalidateQueries(); toast.success('Demo data was reset.'); router.refresh(); }}
      />
    </>
  );
}
