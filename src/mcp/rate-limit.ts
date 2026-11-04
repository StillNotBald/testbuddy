/** Fixed-window, in-memory rate limit per token (basic abuse guard; one process). */
type G = typeof globalThis & { __tbMcpRate?: Map<string, { start: number; n: number }> };
const g = globalThis as G;

export function rateLimitPerMinute(): number {
  const n = Number(process.env.MCP_RATE_LIMIT_PER_MIN);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120;
}

export function checkRate(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const map = (g.__tbMcpRate ??= new Map());
  const limit = rateLimitPerMinute();
  const w = map.get(key);
  if (!w || now - w.start >= 60_000) {
    map.set(key, { start: now, n: 1 });
    if (map.size > 1000) for (const [k, v] of map) if (now - v.start >= 60_000) map.delete(k);
    return { ok: true };
  }
  w.n += 1;
  if (w.n > limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((w.start + 60_000 - now) / 1000)) };
  return { ok: true };
}

export function resetRateLimits(): void {
  g.__tbMcpRate = new Map();
}
