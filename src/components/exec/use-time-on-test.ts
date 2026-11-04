'use client';

import { useCallback, useEffect, useRef } from 'react';

const IDLE_MS = 60_000;

/**
 * Captures time-on-test automatically (D-9): counts seconds while the tab is visible and the user was active in
 * the last minute. No start button. `read()` returns whole seconds; `set()` lets the tester correct it.
 */
export function useTimeOnTest(active = true): { read: () => number; set: (seconds: number) => void } {
  const ms = useRef(0);
  const last = useRef(0);
  useEffect(() => {
    if (!active) return undefined;
    last.current = Date.now();
    const touch = () => { last.current = Date.now(); };
    const events = ['keydown', 'pointerdown', 'pointermove'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last.current < IDLE_MS) ms.current += 1000;
    }, 1000);
    return () => { clearInterval(id); events.forEach((e) => window.removeEventListener(e, touch)); };
  }, [active]);
  const read = useCallback(() => Math.floor(ms.current / 1000), []);
  const set = useCallback((s: number) => { ms.current = Math.max(0, s) * 1000; }, []);
  return { read, set };
}

/** "mm:ss" or "h:mm:ss" -> seconds; a bare number is minutes; null when not parseable. */
export function parseDuration(text: string): number | null {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (m) return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) * 60 : null;
}
