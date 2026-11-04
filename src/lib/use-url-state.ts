'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export type UrlValue = string | number | boolean | string[] | null | undefined;

export interface UrlState {
  get(key: string): string | undefined;
  /** Comma-separated list param. */
  getList(key: string): string[];
  getNumber(key: string, fallback: number): number;
  /** Merge a patch into the query string. null/undefined/''/[] removes a key. `replace` (default) keeps history clean while typing; pass `push: true` for navigation-like changes. */
  set(patch: Record<string, UrlValue>, opts?: { push?: boolean }): void;
  /** Current query string (no leading ?). */
  toString(): string;
}

/** URL is the source of truth for filters, selection and tabs (DESIGN.md section 12). */
export function useUrlState(): UrlState {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const latest = useRef(params.toString());
  useEffect(() => { latest.current = params.toString(); }, [params]);

  const set = useCallback<UrlState['set']>((patch, opts) => {
    const next = new URLSearchParams(latest.current);
    for (const [k, v] of Object.entries(patch)) {
      const empty = v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);
      if (empty) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
    }
    const qs = next.toString();
    latest.current = qs;
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (opts?.push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  }, [pathname, router]);

  return {
    get: (key) => params.get(key) ?? undefined,
    getList: (key) => (params.get(key) ?? '').split(',').filter(Boolean),
    getNumber: (key, fallback) => { const n = Number(params.get(key)); return Number.isFinite(n) && params.get(key) ? n : fallback; },
    set,
    toString: () => params.toString(),
  };
}

/** Single param helper: const [tab, setTab] = useUrlParam('tab', 'mappings'). */
export function useUrlParam(key: string, fallback: string): [string, (v: string | null, opts?: { push?: boolean }) => void] {
  const url = useUrlState();
  const value = url.get(key) ?? fallback;
  return [value, (v, opts) => url.set({ [key]: v === fallback ? null : v }, opts)];
}
