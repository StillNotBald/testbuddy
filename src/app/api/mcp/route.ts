/**
 * POST /api/mcp: MCP over Streamable HTTP (JSON responses, stateless).
 * Thin by design (R-137): auth, origin and rate checks, then hand the JSON-RPC message to
 * src/mcp/protocol. No domain logic and no data store here. Filesystem routes win over the
 * /api/:path* PocketBase rewrite in next.config.ts.
 * Pattern adapted from an Apache-2.0 reference credited in NOTICE.
 */
import { authenticate, originAllowed, tokenFromHeaders } from '@/mcp/auth';
import { ERR, handleMessage, rpcError, type RpcResponse } from '@/mcp/protocol';
import { checkRate } from '@/mcp/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 256 * 1024;
const BASE = { 'Cache-Control': 'no-store' };

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { ...BASE, ...extra } });

export async function POST(request: Request): Promise<Response> {
  if (!originAllowed(request.headers.get('origin'))) return json(rpcError(null, -32000, 'Origin not allowed.'), 403);

  const auth = authenticate(tokenFromHeaders((n) => request.headers.get(n)));
  if (!auth.ok) {
    return json(rpcError(null, -32001, auth.message), auth.status, auth.status === 401 ? { 'WWW-Authenticate': 'Bearer realm="testbuddy-mcp"' } : {});
  }
  const rate = checkRate(auth.principal.tokenKey);
  if (!rate.ok) return json(rpcError(null, -32002, 'Rate limit exceeded. Slow down and retry.'), 429, { 'Retry-After': String(rate.retryAfterSec) });

  const text = await request.text();
  if (text.length > MAX_BODY) return json(rpcError(null, ERR.invalidRequest, 'Request body too large.'), 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(rpcError(null, ERR.parse, 'Parse error: body is not valid JSON.'), 400);
  }

  const opts = { principal: auth.principal, client: request.headers.get('user-agent')?.slice(0, 80) ?? undefined };
  if (Array.isArray(body)) {
    if (!body.length) return json(rpcError(null, ERR.invalidRequest, 'Empty batch.'), 400);
    const out = (await Promise.all(body.map((m) => handleMessage(m, opts)))).filter((r): r is RpcResponse => r !== null);
    return out.length ? json(out) : new Response(null, { status: 202, headers: BASE });
  }
  const res = await handleMessage(body, opts);
  return res ? json(res) : new Response(null, { status: 202, headers: BASE });
}

const notAllowed = (reason: string) => new Response(JSON.stringify(rpcError(null, -32000, reason)), { status: 405, headers: { ...BASE, Allow: 'POST', 'Content-Type': 'application/json' } });

/** No server-initiated SSE stream: this server is stateless and sends no notifications. */
export function GET(): Response {
  return notAllowed('GET is not supported: this server is stateless and opens no SSE stream. Use POST.');
}

/** No sessions to terminate. */
export function DELETE(): Response {
  return notAllowed('DELETE is not supported: this server is stateless and has no sessions.');
}
