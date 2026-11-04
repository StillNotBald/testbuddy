import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockDb, MOCKDB_KEY, type DbData, type StorageLike } from './mockdb';
import { buildFixtures } from './fixtures';

class MemStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}
const seed = (): DbData => ({ things: [{ id: 'a', created: 'x', updated: 'x', name: 'A' } as never] });
interface Thing { id: string; created: string; updated: string; name: string }

describe('MockDb', () => {
  let storage: MemStorage;
  beforeEach(() => { storage = new MemStorage(); });

  it('seeds on first load and round-trips writes through storage', () => {
    const db = new MockDb({ storage, seed });
    expect(storage.getItem(MOCKDB_KEY)).toBeTruthy();
    const row = db.create<Thing>('things', { name: 'B' });
    db.update<Thing>('things', 'a', { name: 'A2' });
    const reloaded = new MockDb({ storage, seed: () => ({}) });
    expect(reloaded.list<Thing>('things').map((t) => t.name).sort()).toEqual(['A2', 'B']);
    expect(reloaded.get<Thing>('things', row.id)?.name).toBe('B');
    reloaded.delete('things', 'a');
    expect(new MockDb({ storage, seed: () => ({}) }).count('things')).toBe(1);
  });

  it('reseeds when the schema version differs', () => {
    new MockDb({ storage, seed, schemaVersion: 1 }).create<Thing>('things', { name: 'extra' });
    const db = new MockDb({ storage, seed, schemaVersion: 2 });
    expect(db.count('things')).toBe(1);
    expect(JSON.parse(storage.getItem(MOCKDB_KEY) as string).v).toBe(2);
  });

  it('reseeds on corrupt payload and on reset()', () => {
    storage.setItem(MOCKDB_KEY, '{nope');
    const db = new MockDb({ storage, seed });
    expect(db.count('things')).toBe(1);
    db.create<Thing>('things', { name: 'x' });
    db.reset();
    expect(db.count('things')).toBe(1);
  });

  it('transaction writes once and rolls back on throw', () => {
    const db = new MockDb({ storage, seed });
    const spy = vi.spyOn(storage, 'setItem');
    db.transaction((tx) => { tx.create<Thing>('things', { name: '1' }); tx.create<Thing>('things', { name: '2' }); });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(() => db.transaction((tx) => { tx.create<Thing>('things', { name: '3' }); throw new Error('boom'); })).toThrow('boom');
    expect(db.count('things')).toBe(3);
  });

  it('falls back to memory and reports once when over quota', () => {
    const onPersistFailure = vi.fn();
    const db = new MockDb({ storage, seed, onPersistFailure });
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    db.create<Thing>('things', { name: 'a' });
    db.create<Thing>('things', { name: 'b' });
    expect(onPersistFailure).toHaveBeenCalledTimes(1);
    expect(onPersistFailure.mock.calls[0]?.[0]).toBe('quota');
    expect(db.persistMode).toBe('memory');
    expect(db.count('things')).toBe(3);
  });

  it('works in memory and reports when storage is unavailable', () => {
    const onPersistFailure = vi.fn();
    const broken: StorageLike = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    const db = new MockDb({ storage: broken, seed, onPersistFailure });
    expect(onPersistFailure).toHaveBeenCalledWith('unavailable', expect.anything());
    db.create<Thing>('things', { name: 'a' });
    expect(db.count('things')).toBe(2);
    const none = new MockDb({ storage: null, seed, onPersistFailure: vi.fn() });
    expect(none.persistMode).toBe('memory');
  });
});

describe('fixtures', () => {
  const data = buildFixtures();
  const n = (c: string) => data[c]?.length ?? 0;
  it('matches the documented sizes', () => {
    expect(n('users')).toBe(8);
    expect(n('projects')).toBe(2);
    expect(n('project_members')).toBe(12);
    expect(n('test_cases')).toBe(140);
    expect(n('audit_logs')).toBe(60);
    expect(n('automation_executions')).toBe(6);
    expect(n('test_attachments')).toBe(14);
    expect(n('test_runs')).toBe(4);
  });
  it('is deterministic and under 2 MB', () => {
    expect(JSON.stringify(buildFixtures())).toBe(JSON.stringify(data));
    expect(JSON.stringify(data).length).toBeLessThan(2 * 1024 * 1024);
  });
  it('web smoke has the documented progress', () => {
    const tests = (data.test_run_cases as unknown as Array<{ run: string; status: string }>).filter((t) => t.run === 'run_web');
    const by = (s: string) => tests.filter((t) => t.status === s).length;
    expect([tests.length, by('st_passed'), by('st_failed'), by('st_blocked'), by('st_untested')]).toEqual([38, 20, 3, 1, 14]);
  });
});
