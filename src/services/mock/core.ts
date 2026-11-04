import { can, type Action } from '@/lib/permissions';
import { ServiceError, type Progress, type StatusCounts } from '../interfaces';
import type {
  AuditLog, Id, Project, ProjectMember, ProjectRole, Status, TestRunCase, TestStatusKey, User,
} from '../types';
import { buildFixtures, IDS } from './fixtures';
import { buildHeavyFixtures } from './heavy-seed';
import { MockDb, MOCKDB_KEY, MOCKDB_SCHEMA_VERSION, type PersistFailureReason, type StorageLike } from './mockdb';

/** Shared plumbing for the mock service implementations. */

export const mockConfig = {
  /** 150-400 ms simulated latency (off under test). */
  latency: process.env.NODE_ENV !== 'test',
  /** Dev toggles: force a network failure on every call / on writes only. */
  forceError: false,
  offlineWrites: false,
};

const SESSION_KEY = 'testbuddy.session.v1';

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

// ---- persistence failure notice -----------------------------------------------------------
type FailureListener = (reason: PersistFailureReason) => void;
const failureListeners = new Set<FailureListener>();
let lastFailure: PersistFailureReason | null = null;

export function onMockPersistFailure(fn: FailureListener): () => void {
  failureListeners.add(fn);
  if (lastFailure) fn(lastFailure);
  return () => failureListeners.delete(fn);
}

function reportFailure(reason: PersistFailureReason): void {
  lastFailure = reason;
  failureListeners.forEach((fn) => fn(reason));
}

// ---- demo seed choice -----------------------------------------------------------------------
export type DemoSeedKind = 'standard' | 'heavy';
const SEED_KIND_KEY = 'testbuddy.demoseed.v1';
/** The heavy seed is stored under the same key with its own schema version, so switching kind re-seeds cleanly. */
export const HEAVY_SCHEMA_VERSION = MOCKDB_SCHEMA_VERSION + 1000;

/** NEXT_PUBLIC_DEMO_SEED=heavy makes the heavy seed the default when the browser has no saved choice. */
export function envSeedKind(): DemoSeedKind {
  return process.env.NEXT_PUBLIC_DEMO_SEED === 'heavy' ? 'heavy' : 'standard';
}

/** The kind this browser uses: the saved choice, else the env default. */
export function currentSeedKind(): DemoSeedKind {
  try {
    const saved = browserStorage()?.getItem(SEED_KIND_KEY);
    if (saved === 'standard' || saved === 'heavy') return saved;
  } catch {
    // fall through to the env default
  }
  return envSeedKind();
}

function saveSeedKind(kind: DemoSeedKind): void {
  try {
    browserStorage()?.setItem(SEED_KIND_KEY, kind);
  } catch {
    // the choice then only lasts until the page reloads
  }
}

// ---- db singleton --------------------------------------------------------------------------
let db: MockDb | null = null;
let dbKind: DemoSeedKind | null = null;

function createDb(kind: DemoSeedKind): MockDb {
  dbKind = kind;
  return new MockDb({
    storage: browserStorage(), key: MOCKDB_KEY, onPersistFailure: (reason) => reportFailure(reason),
    seed: kind === 'heavy' ? () => buildHeavyFixtures() : buildFixtures,
    schemaVersion: kind === 'heavy' ? HEAVY_SCHEMA_VERSION : MOCKDB_SCHEMA_VERSION,
  });
}

export function getMockDb(): MockDb {
  db ??= createDb(currentSeedKind());
  return db;
}

/** Tests inject their own db (or null to drop the singleton). */
export function setMockDb(next: MockDb | null): void {
  db = next;
  dbKind = null;
}

/** Re-seed the demo data. Pass a kind to switch between the standard and the heavy ("Busy team") seed. */
export function resetMockDb(kind?: DemoSeedKind): void {
  const want = kind ?? currentSeedKind();
  if (kind) saveSeedKind(kind);
  if (db && (dbKind === null || dbKind === want)) {
    db.reset();
    return;
  }
  // Different kind: drop the old data and build a fresh db (its schema version differs, so it seeds itself).
  try {
    browserStorage()?.removeItem(MOCKDB_KEY);
  } catch {
    // ignore: the new db reports a real storage problem
  }
  db = createDb(want);
}

// ---- session ---------------------------------------------------------------------------------
let memorySession: string | null = null;

export function readSessionUserId(): string | null {
  try {
    const raw = browserStorage()?.getItem(SESSION_KEY);
    if (raw) return raw;
  } catch {
    // fall through to memory
  }
  return memorySession;
}

export function writeSessionUserId(id: string | null): void {
  memorySession = id;
  try {
    const s = browserStorage();
    if (!s) return;
    if (id) s.setItem(SESSION_KEY, id);
    else s.removeItem(SESSION_KEY);
  } catch {
    // session stays in memory
  }
}

export function me(): User {
  const id = readSessionUserId();
  const user = id ? getMockDb().get<User>('users', id) : undefined;
  if (!user || !user.is_active) throw new ServiceError('unauthenticated', 'Sign in to continue.');
  return user;
}

// ---- latency / errors ------------------------------------------------------------------------
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Wrap a synchronous mock operation so it behaves like a network call. */
export async function sim<T>(fn: () => T, opts: { write?: boolean } = {}): Promise<T> {
  if (mockConfig.latency) await wait(150 + Math.random() * 250);
  if (mockConfig.forceError || (opts.write && mockConfig.offlineWrites)) throw new ServiceError('network', 'Could not reach the server. Check your connection and retry.');
  return fn();
}

// ---- roles -----------------------------------------------------------------------------------
export function roleIn(projectId: Id): ProjectRole | null {
  const user = me();
  return getMockDb().find<ProjectMember>('project_members', (m) => m.project === projectId && m.user === user.id)?.role ?? null;
}

export function project(projectId: Id): Project {
  const p = getMockDb().get<Project>('projects', projectId);
  if (!p) throw new ServiceError('not_found', 'Project not found.');
  return p;
}

/** Throws forbidden / archived. Returns the caller's role. */
export function need(projectId: Id, action: Action, opts: { allowArchived?: boolean } = {}): ProjectRole {
  const role = roleIn(projectId);
  if (!role) throw new ServiceError('forbidden', 'You do not have access to this project. Ask an admin.');
  if (!can(role, action)) throw new ServiceError('forbidden', 'Your role does not allow this.');
  if (!opts.allowArchived && project(projectId).is_archived) throw new ServiceError('archived', 'This project is archived. Read-only.');
  return role;
}

/** Throws forbidden if the caller is not a member (read access). */
export function needMember(projectId: Id): ProjectRole {
  const role = roleIn(projectId);
  if (!role) throw new ServiceError('forbidden', 'You do not have access to this project. Ask an admin.');
  return role;
}

// ---- status helpers --------------------------------------------------------------------------
const KEY_BY_NAME: Record<string, TestStatusKey> = { passed: 'passed', failed: 'failed', blocked: 'blocked', retest: 'retest', untested: 'untested' };

export function statusKeyOf(status: Status | undefined): TestStatusKey {
  if (!status) return 'untested';
  return KEY_BY_NAME[status.name.toLowerCase()] ?? 'custom';
}

export function statusKeyById(statusId: Id): TestStatusKey {
  return statusKeyOf(getMockDb().get<Status>('statuses', statusId));
}

export function emptyCounts(): StatusCounts {
  return { passed: 0, failed: 0, blocked: 0, retest: 0, untested: 0 };
}

export function progressOf(tests: TestRunCase[]): Progress {
  const counts = emptyCounts();
  for (const t of tests) {
    const k = statusKeyById(t.status);
    if (k !== 'custom') counts[k] += 1;
  }
  const total = tests.length;
  const done = total - counts.untested;
  return {
    counts, total,
    done_pct: total ? Math.round((done / total) * 100) : 0,
    pass_pct: done ? Math.round((counts.passed / done) * 100) : 0, // passed ÷ executed (untested excluded; blocked counts as not passed)
  };
}

export function mergeProgress(list: Progress[]): Progress {
  const counts = emptyCounts();
  for (const p of list) (Object.keys(counts) as Array<keyof StatusCounts>).forEach((k) => { counts[k] += p.counts[k]; });
  const total = list.reduce((s, p) => s + p.total, 0);
  const done = total - counts.untested;
  return { counts, total, done_pct: total ? Math.round((done / total) * 100) : 0, pass_pct: done ? Math.round((counts.passed / done) * 100) : 0 };
}

export function userMap(): Map<Id, User> {
  return new Map(getMockDb().list<User>('users').map((u) => [u.id, u]));
}

export function audit(projectId: Id, action: string, entityType: string, entityId: string, before?: unknown, after?: unknown): void {
  const p = getMockDb().get<Project>('projects', projectId);
  getMockDb().create<AuditLog>('audit_logs', {
    project: projectId, project_name: p?.name, actor: readSessionUserId() ?? undefined, action, entity_type: entityType, entity_id: entityId, before, after, ip: '127.0.0.1',
  });
}

/** Runtime whitelist for patch inputs: unknown keys (project, id, is_closed ...) are dropped, never written. */
export function pickFields<T extends object>(src: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src && (src as Record<string, unknown>)[k] !== undefined) out[k] = (src as Record<string, unknown>)[k];
  return out as Partial<T>;
}

export function requireText(value: string | undefined, label: string): string {
  const v = (value ?? '').trim();
  if (!v) throw new ServiceError('validation', `${label} is required.`, { [label.toLowerCase()]: 'required' });
  return v;
}

export { IDS };
