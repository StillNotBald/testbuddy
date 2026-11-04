import { setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';

export { IDS };
export function freshDbForTest(userId: string): void {
  const m = new Map<string, string>();
  setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
  writeSessionUserId(userId);
}
