'use client';

import { useSyncExternalStore } from 'react';

/** SSR-safe media query. Returns `fallback` on the server and first paint. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** localStorage helpers that never throw. */
export function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* per-viewer convenience only */ }
}
