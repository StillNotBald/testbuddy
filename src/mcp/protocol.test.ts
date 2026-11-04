// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { authenticate, parseTokens, tokenFromHeaders } from './auth';
import { validate } from './protocol';
import { checkRate, resetRateLimits } from './rate-limit';
import { TOOLS } from './tools';

describe('validate', () => {
  const schema = { type: 'object', required: ['a'], additionalProperties: false, properties: { a: { type: 'string', minLength: 1 }, n: { type: 'integer', minimum: 1, maximum: 3 }, e: { type: 'string', enum: ['x', 'y'] } } } as const;
  it('accepts valid input', () => expect(validate(schema, { a: 'v', n: 2, e: 'x' })).toEqual([]));
  it('reports every problem', () => {
    const errs = validate(schema, { n: 9, e: 'z', extra: 1 });
    expect(errs.join('|')).toMatch(/a is required/);
    expect(errs.join('|')).toMatch(/<= 3/);
    expect(errs.join('|')).toMatch(/one of/);
    expect(errs.join('|')).toMatch(/not a known argument/);
  });
});

describe('tool registry', () => {
  it('has unique names, descriptions and the demo-data note', () => {
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length);
    for (const t of TOOLS) expect(t.description).toContain('M0 demo data, separate from your browser; M1 uses PocketBase');
  });
});

describe('auth helpers', () => {
  it('reads Bearer or X-API-Token', () => {
    const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;
    expect(tokenFromHeaders(h({ authorization: 'Bearer abc' }))).toBe('abc');
    expect(tokenFromHeaders(h({ authorization: 'bearer  abc ' }))).toBe('abc');
    expect(tokenFromHeaders(h({ 'x-api-token': 'xyz' }))).toBe('xyz');
    expect(tokenFromHeaders(h({ authorization: 'Basic zzz' }))).toBeNull();
  });
  it('parses the token map and maps roles to fixture users', () => {
    const e = parseTokens('t1:admin, t2:u_dana ,bad');
    expect(e.map((x) => x.userId)).toEqual(['u_avery', 'u_dana']);
  });
  it('never exposes the token in the principal', () => {
    const r = authenticate('tb_demo_viewer_local_only');
    expect(r.ok).toBe(true);
    if (r.ok) expect(JSON.stringify(r.principal)).not.toContain('tb_demo_viewer_local_only');
  });
});

describe('rate limit window', () => {
  it('resets after a minute', () => {
    resetRateLimits();
    process.env.MCP_RATE_LIMIT_PER_MIN = '1';
    try {
      expect(checkRate('k', 0).ok).toBe(true);
      expect(checkRate('k', 1000).ok).toBe(false);
      expect(checkRate('k', 61_000).ok).toBe(true);
    } finally {
      delete process.env.MCP_RATE_LIMIT_PER_MIN;
    }
  });
});
