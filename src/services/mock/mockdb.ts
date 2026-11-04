import type { BaseRecord, Id } from '../types';

/**
 * MockDb: a tiny generic local "database" for Milestone 0.
 *
 * - Collections are arrays of records (`id`, `created`, `updated` + fields).
 * - Seeded on first load, then persisted to one versioned localStorage key.
 * - Every storage access is wrapped in try/catch. If storage is unavailable or over quota the db
 *   keeps working in memory and reports it through `onPersistFailure` (never silent).
 * - Returned rows are shared references: treat them as read-only. Updates replace the row object.
 * - `transaction(fn)` batches writes and persists once at the end; it rolls back on throw.
 */

export const MOCKDB_KEY = 'testbuddy.mockdb.v1';
export const MOCKDB_SCHEMA_VERSION = 2; // bump whenever fixtures change shape or content; old browser data is then re-seeded

export type DbData = Record<string, BaseRecord[]>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PersistMode = 'persisted' | 'memory';
export type PersistFailureReason = 'unavailable' | 'quota' | 'write';

export interface MockDbOptions {
  storage: StorageLike | null;
  seed: () => DbData;
  key?: string;
  schemaVersion?: number;
  onPersistFailure?: (reason: PersistFailureReason, error: unknown) => void;
}

interface Envelope {
  v: number;
  data: DbData;
}

let idCounter = 0;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** PocketBase-style 15 char lowercase id. */
export function newId(): Id {
  idCounter += 1;
  let out = '';
  let n = Date.now() * 1000 + idCounter;
  for (let i = 0; i < 9; i += 1) {
    out += ALPHABET[n % 36];
    n = Math.floor(n / 36);
  }
  for (let i = 0; i < 6; i += 1) out += ALPHABET[Math.floor(Math.random() * 36)];
  return out;
}

function isQuota(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  if (!e) return false;
  return e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(e.message ?? '');
}

export class MockDb {
  private data: DbData = {};
  private mode: PersistMode = 'persisted';
  private txDepth = 0;
  private txSnapshot: DbData | null = null;
  private dirty = false;
  private failureReported = false;
  private listeners = new Set<() => void>();
  private readonly key: string;
  private readonly version: number;

  constructor(private readonly opts: MockDbOptions) {
    this.key = opts.key ?? MOCKDB_KEY;
    this.version = opts.schemaVersion ?? MOCKDB_SCHEMA_VERSION;
    this.load();
  }

  // ---- persistence -------------------------------------------------------------------------

  private load(): void {
    const { storage } = this.opts;
    if (!storage) {
      this.fail('unavailable', new Error('No storage available'));
      this.data = this.opts.seed();
      return;
    }
    let raw: string | null = null;
    try {
      raw = storage.getItem(this.key);
    } catch (error) {
      this.fail('unavailable', error);
      this.data = this.opts.seed();
      return;
    }
    if (raw) {
      try {
        const env = JSON.parse(raw) as Envelope;
        if (env && env.v === this.version && env.data && typeof env.data === 'object') {
          this.data = env.data;
          return;
        }
      } catch {
        // corrupt: fall through to reseed
      }
    }
    // First load, schema-version mismatch or corrupt payload: reseed and persist.
    this.data = this.opts.seed();
    this.persist();
  }

  private persist(): void {
    if (this.mode === 'memory') return;
    const { storage } = this.opts;
    if (!storage) {
      this.fail('unavailable', new Error('No storage available'));
      return;
    }
    try {
      const env: Envelope = { v: this.version, data: this.data };
      storage.setItem(this.key, JSON.stringify(env));
    } catch (error) {
      this.fail(isQuota(error) ? 'quota' : 'write', error);
    }
  }

  private fail(reason: PersistFailureReason, error: unknown): void {
    this.mode = 'memory';
    if (this.failureReported) return;
    this.failureReported = true;
    this.opts.onPersistFailure?.(reason, error);
    this.notify();
  }

  get persistMode(): PersistMode {
    return this.mode;
  }

  /** Approximate serialised size in bytes (for tests and diagnostics). */
  get sizeBytes(): number {
    return JSON.stringify({ v: this.version, data: this.data }).length;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  private touch(): void {
    if (this.txDepth > 0) {
      this.dirty = true;
      return;
    }
    this.persist();
  }

  /** Re-seed everything from fixtures (Reset demo data). Attempts to persist again. */
  reset(): void {
    this.data = this.opts.seed();
    try {
      this.opts.storage?.removeItem(this.key);
    } catch {
      // ignore: persist() below reports if storage is really broken
    }
    if (this.mode === 'memory' && this.opts.storage) {
      this.mode = 'persisted';
      this.failureReported = false;
    }
    this.persist();
    this.notify();
  }

  // ---- queries -----------------------------------------------------------------------------

  private col<T extends BaseRecord>(name: string): T[] {
    return (this.data[name] ??= []) as T[];
  }

  list<T extends BaseRecord>(collection: string, filter?: (row: T) => boolean): T[] {
    const rows = this.col<T>(collection);
    return filter ? rows.filter(filter) : rows.slice();
  }

  get<T extends BaseRecord>(collection: string, id: Id): T | undefined {
    return this.col<T>(collection).find((r) => r.id === id);
  }

  find<T extends BaseRecord>(collection: string, filter: (row: T) => boolean): T | undefined {
    return this.col<T>(collection).find(filter);
  }

  count<T extends BaseRecord>(collection: string, filter?: (row: T) => boolean): number {
    const rows = this.col<T>(collection);
    return filter ? rows.filter(filter).length : rows.length;
  }

  // ---- writes ------------------------------------------------------------------------------

  create<T extends BaseRecord>(collection: string, input: Omit<T, 'id' | 'created' | 'updated'> & { id?: Id }): T {
    const now = new Date().toISOString();
    const row = { ...input, id: input.id ?? newId(), created: now, updated: now } as unknown as T;
    this.col<T>(collection).push(row);
    this.touch();
    return row;
  }

  update<T extends BaseRecord>(collection: string, id: Id, patch: Partial<Omit<T, 'id' | 'created'>>): T {
    const rows = this.col<T>(collection);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`${collection}/${id} not found`);
    const next = { ...rows[idx], ...patch, updated: new Date().toISOString() } as T;
    rows[idx] = next;
    this.touch();
    return next;
  }

  delete(collection: string, id: Id): boolean {
    const rows = this.col(collection);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    rows.splice(idx, 1);
    this.touch();
    return true;
  }

  deleteWhere<T extends BaseRecord>(collection: string, filter: (row: T) => boolean): number {
    const rows = this.col<T>(collection);
    const keep = rows.filter((r) => !filter(r));
    const removed = rows.length - keep.length;
    if (removed > 0) {
      this.data[collection] = keep;
      this.touch();
    }
    return removed;
  }

  /** Run `fn` with writes batched: persisted once at the end, rolled back if it throws. */
  transaction<R>(fn: (db: MockDb) => R): R {
    if (this.txDepth === 0) {
      this.txSnapshot = Object.fromEntries(Object.entries(this.data).map(([k, v]) => [k, v.slice()]));
      this.dirty = false;
    }
    this.txDepth += 1;
    try {
      const result = fn(this);
      this.txDepth -= 1;
      if (this.txDepth === 0) {
        if (this.dirty) this.persist();
        this.txSnapshot = null;
      }
      return result;
    } catch (error) {
      this.txDepth -= 1;
      if (this.txDepth === 0 && this.txSnapshot) {
        this.data = this.txSnapshot;
        this.txSnapshot = null;
        this.dirty = false;
      }
      throw error;
    }
  }
}
