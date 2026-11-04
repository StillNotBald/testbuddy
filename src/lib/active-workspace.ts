'use client';

import { useSyncExternalStore } from 'react';
import { safeGet, safeSet } from '@/lib/use-media-query';
import { useWorkspaces } from '@/services/hooks';

const KEY = 'testbuddy.workspace';
const listeners = new Set<() => void>();

/** The workspace switch lives in the topbar (not the URL). Falls back to the first workspace. */
export function useActiveWorkspace() {
  const list = useWorkspaces();
  const stored = useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => safeGet(KEY), () => null);
  const workspaces = list.data ?? [];
  const workspace = workspaces.find((w) => w.id === stored) ?? workspaces[0];
  return {
    workspace, workspaces, isLoading: list.isLoading,
    setWorkspaceId: (id: string) => { safeSet(KEY, id); listeners.forEach((l) => l()); },
  };
}
