import { safeGet, safeSet } from '@/lib/use-media-query';

/** A saved dynamic set: filters are re-evaluated every time the set is applied (client-local until M1). */
export interface SavedSet {
  id: string;
  name: string;
  suiteId?: string;
  sectionId?: string;
  q?: string;
  priority: string[];
  type: string[];
  automation: string[];
  tag: string[];
}

const key = (projectId: string) => `testbuddy.runSets.${projectId}`;

export function readSets(projectId: string): SavedSet[] {
  try {
    const raw = safeGet(key(projectId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as SavedSet[]) : [];
  } catch {
    return [];
  }
}

export function writeSets(projectId: string, sets: SavedSet[]): void {
  safeSet(key(projectId), JSON.stringify(sets));
}
