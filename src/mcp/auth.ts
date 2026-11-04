/**
 * Token auth for the MCP server (M0).
 *
 * A token maps to one fictional demo user from the fixtures. The agent then acts under that
 * person's project roles (BR-8). Tokens are compared in constant time and are never logged.
 * M1: swap `authenticate` for a PocketBase token / personal-access-token lookup.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { demoData, DEMO_USER_IDS, type DemoRoleKey } from './data-source';

export interface Principal {
  userId: string;
  userName: string;
  /** Demo role label of the token (the real project role is still checked per project). */
  label: string;
  /** Stable, non-reversible id for rate limiting and logs. Never the token itself. */
  tokenKey: string;
}

export type AuthFailure = { ok: false; status: 401 | 403; message: string };
export type AuthResult = { ok: true; principal: Principal } | AuthFailure;

/** Defaults for local development only. Ignored in production unless MCP_DEMO_TOKENS is set. */
export const DEFAULT_DEMO_TOKENS = 'tb_demo_admin_local_only:admin,tb_demo_manager_local_only:manager,tb_demo_tester_local_only:tester,tb_demo_viewer_local_only:viewer';

interface Entry { digest: Buffer; label: string; userId: string }

const sha = (v: string) => createHash('sha256').update(v).digest();

/** Parses `token:role[,token:role]`. `role` is admin|manager|tester|viewer or a fixture user id. */
export function parseTokens(raw: string): Entry[] {
  const out: Entry[] = [];
  for (const part of raw.split(',')) {
    const i = part.lastIndexOf(':');
    if (i < 1) continue;
    const token = part.slice(0, i).trim();
    const who = part.slice(i + 1).trim();
    if (!token) continue;
    const userId = (DEMO_USER_IDS as Record<string, string>)[who as DemoRoleKey] ?? who;
    out.push({ digest: sha(token), label: who, userId });
  }
  return out;
}

function configured(): Entry[] {
  const env = process.env.MCP_DEMO_TOKENS?.trim();
  if (env) return parseTokens(env);
  return process.env.NODE_ENV === 'production' ? [] : parseTokens(DEFAULT_DEMO_TOKENS);
}

/** Extracts the token from `Authorization: Bearer` or `X-API-Token`. */
export function tokenFromHeaders(get: (name: string) => string | null): string | null {
  const authz = get('authorization');
  if (authz) {
    const m = /^Bearer\s+(.+)$/i.exec(authz.trim());
    if (m) return m[1]!.trim() || null;
  }
  const x = get('x-api-token')?.trim();
  return x || null;
}

export function authenticate(token: string | null): AuthResult {
  if (!token) return { ok: false, status: 401, message: 'Missing token. Send "Authorization: Bearer <token>" or "X-API-Token: <token>".' };
  const d = sha(token);
  let hit: Entry | undefined;
  for (const e of configured()) if (timingSafeEqual(e.digest, d) && !hit) hit = e;
  if (!hit) return { ok: false, status: 401, message: 'Invalid token.' };
  const user = demoData.userExists(hit.userId);
  if (!user) return { ok: false, status: 401, message: 'Invalid token.' };
  if (!user.is_active) return { ok: false, status: 403, message: 'The user behind this token is disabled.' };
  return { ok: true, principal: { userId: user.id, userName: user.name, label: hit.label, tokenKey: d.toString('hex').slice(0, 16) } };
}

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://claude.ai', 'https://www.claude.ai'];

/** DNS-rebinding guard (MCP spec). Requests with no Origin (server-to-server, CLI) pass. */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  const list = (process.env.MCP_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean)) ?? DEFAULT_ORIGINS;
  return list.includes('*') || list.includes(origin);
}
