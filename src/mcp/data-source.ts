/**
 * The MCP server's ONE data seam.
 *
 * M0 data reality: the app's demo database lives in the browser (localStorage) and the server
 * cannot see it. So the MCP server runs against a server-side, in-memory demo dataset built from
 * the same standard fixtures through the same mock service layer. It is one instance per server
 * process, separate from any browser, and is lost on restart.
 *
 * M1: replace this module with a PocketBase-backed implementation of `DemoData` (call the facade
 * with the caller's token). Nothing else under src/mcp or src/app/api/mcp imports the mock layer.
 */
import type { Services } from '@/services/interfaces';
import { mockServices } from '@/services/mock';
import { mockConfig, setMockDb, writeSessionUserId } from '@/services/mock/core';
import { buildFixtures, IDS } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import type { AuditLog, Id, Project, User } from '@/services/types';

export const DATA_SOURCE_NOTE = 'M0 demo data, separate from your browser; M1 uses PocketBase';

/** Fictional demo users in the fixtures, one per role. */
export const DEMO_USER_IDS = {
  admin: IDS.users.avery,
  manager: IDS.users.raj,
  tester: IDS.users.dana,
  viewer: IDS.users.mia,
} as const;
export type DemoRoleKey = keyof typeof DEMO_USER_IDS;

export interface AgentAudit {
  actorId: Id;
  projectId: Id;
  action: string;
  entityType: string;
  entityId: Id;
  tool: string;
  client?: string;
  detail?: unknown;
}

export interface DemoData {
  /** Run `fn` as `userId`. Calls are serialised so one request's identity never leaks into another. */
  runAs<T>(userId: Id, fn: (services: Services) => Promise<T>): Promise<T>;
  /** Append an audit entry marked as coming from an agent (via MCP). Call inside `runAs`. */
  recordAgentAudit(entry: AgentAudit): void;
  /** Look up a user's display fields for the token map. */
  userExists(userId: Id): { id: Id; name: string; is_active: boolean } | null;
  /** Tests only: drop all state and re-seed. */
  reset(): void;
}

type G = typeof globalThis & { __tbMcpDb?: MockDb; __tbMcpTail?: Promise<unknown> };
const g = globalThis as G;

function freshDb(): MockDb {
  // storage: null keeps the dataset purely in memory (the "unavailable storage" notice is browser-only).
  return new MockDb({ storage: null, seed: buildFixtures, onPersistFailure: () => undefined });
}

function db(): MockDb {
  g.__tbMcpDb ??= freshDb();
  return g.__tbMcpDb;
}

export const demoData: DemoData = {
  runAs(userId, fn) {
    const run = (g.__tbMcpTail ?? Promise.resolve()).then(async () => {
      mockConfig.latency = false;
      mockConfig.forceError = false;
      mockConfig.offlineWrites = false;
      setMockDb(db());
      writeSessionUserId(userId);
      try {
        return await fn(mockServices);
      } finally {
        writeSessionUserId(null);
      }
    });
    g.__tbMcpTail = run.catch(() => undefined);
    return run;
  },
  recordAgentAudit(e) {
    setMockDb(db());
    const project = db().get<Project>('projects', e.projectId);
    db().create<AuditLog>('audit_logs', {
      project: e.projectId,
      project_name: project?.name,
      actor: e.actorId,
      action: e.action,
      entity_type: e.entityType,
      entity_id: e.entityId,
      after: { agent: true, via: 'mcp', tool: e.tool, client: e.client ?? 'unknown', detail: e.detail },
      ip: 'mcp',
    });
  },
  userExists(userId) {
    const u = db().get<User>('users', userId);
    return u ? { id: u.id, name: u.name, is_active: u.is_active } : null;
  },
  reset() {
    g.__tbMcpDb = freshDb();
    g.__tbMcpTail = undefined;
    setMockDb(g.__tbMcpDb);
  },
};
