// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { demoData } from '@/mcp/data-source';
import { resetRateLimits } from '@/mcp/rate-limit';
import { DELETE, GET, POST } from './route';

const T = { admin: 'tb_demo_admin_local_only', manager: 'tb_demo_manager_local_only', tester: 'tb_demo_tester_local_only', viewer: 'tb_demo_viewer_local_only' };
let n = 0;

const send = (body: unknown, token: string | null = T.tester, headers: Record<string, string> = {}) =>
  POST(new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
const rpc = (method: string, params?: unknown, token: string | null = T.tester) => send({ jsonrpc: '2.0', id: ++n, method, params }, token);
async function call(name: string, args: Record<string, unknown> = {}, token = T.tester) {
  const res = await rpc('tools/call', { name, arguments: args }, token);
  const body = await res.json();
  const text = body.result?.content?.[0]?.text;
  return { res, body, data: text ? JSON.parse(text) : null, isError: body.result?.isError === true };
}

beforeEach(() => {
  demoData.reset();
  resetRateLimits();
});

describe('initialize, ping, tools/list', () => {
  it('initialize negotiates the version and says the data is demo data', async () => {
    const res = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    expect(res.status).toBe(200);
    const { result } = await res.json();
    expect(result.protocolVersion).toBe('2025-03-26');
    expect(result.capabilities.tools).toBeDefined();
    expect(result.serverInfo.name).toBe('testbuddy');
    expect(result.instructions).toContain('M0 demo data, separate from your browser; M1 uses PocketBase');
  });
  it('falls back to the latest supported version for an unknown one', async () => {
    const { result } = await (await rpc('initialize', { protocolVersion: '1999-01-01' })).json();
    expect(result.protocolVersion).toBe('2025-06-18');
  });
  it('ping returns an empty result; notifications return 202', async () => {
    expect((await (await rpc('ping')).json()).result).toEqual({});
    expect((await send({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
  });
  it('tools/list returns every tool with a schema, a description and the demo-data note', async () => {
    const { result } = await (await rpc('tools/list')).json();
    const names = result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(expect.arrayContaining(['list_projects', 'get_project', 'list_suites', 'list_cases', 'get_case', 'list_milestones', 'list_runs', 'get_run', 'list_run_tests', 'get_test', 'add_case', 'update_case', 'add_run', 'add_result', 'close_run']));
    for (const t of result.tools) {
      expect(t.inputSchema.type).toBe('object');
      expect(t.description.length).toBeGreaterThan(30);
      expect(t.description).toContain('M0 demo data, separate from your browser; M1 uses PocketBase');
    }
    const byName = Object.fromEntries(result.tools.map((t: { name: string; annotations: Record<string, boolean> }) => [t.name, t.annotations]));
    expect(byName.list_cases.readOnlyHint).toBe(true);
    expect(byName.close_run.destructiveHint).toBe(true);
  });
});

describe('read tools (happy path)', () => {
  it('walks projects, suites, cases, milestones, runs and tests', async () => {
    const projects = (await call('list_projects')).data.items;
    expect(projects.map((p: { id: string }) => p.id)).toContain('prj_core');
    const core = projects.find((p: { id: string }) => p.id === 'prj_core');
    expect(core.my_role).toBe('tester');

    const project = (await call('get_project', { project_id: 'prj_core' })).data;
    expect(project.project.ref_prefix).toBe('CORE');

    const suites = (await call('list_suites', { project_id: 'prj_core' })).data.items;
    expect(suites.length).toBeGreaterThan(0);
    expect(suites[0].sections.length).toBeGreaterThan(0);

    const p1 = (await call('list_cases', { project_id: 'prj_core', limit: 5 })).data;
    expect(p1.items).toHaveLength(5);
    expect(p1.total).toBeGreaterThan(5);
    expect(p1.next_cursor).toBeTruthy();
    const p2 = (await call('list_cases', { project_id: 'prj_core', limit: 5, cursor: p1.next_cursor })).data;
    expect(p2.items[0].id).not.toBe(p1.items[0].id);
    const filtered = (await call('list_cases', { project_id: 'prj_core', suite_id: 'suite_api', limit: 200 })).data;
    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.total).toBeLessThan(p1.total);

    const detail = (await call('get_case', { case_id: p1.items[0].id })).data;
    expect(detail.case.id).toBe(p1.items[0].id);
    expect(Array.isArray(detail.steps)).toBe(true);

    expect((await call('list_milestones', { project_id: 'prj_core' })).data.items.length).toBeGreaterThan(0);

    const runs = (await call('list_runs', { project_id: 'prj_core', state: 'open' })).data.items;
    expect(runs.length).toBeGreaterThan(0);
    const run = (await call('get_run', { run_id: runs[0].id })).data;
    expect(run.progress.total).toBeGreaterThan(0);
    expect(run.progress.counts).toBeDefined();

    const tests = (await call('list_run_tests', { run_id: runs[0].id, limit: 3 })).data;
    expect(tests.items).toHaveLength(3);
    const test = (await call('get_test', { test_id: tests.items[0].id })).data;
    expect(test.id).toBe(tests.items[0].id);
    expect(Array.isArray(test.results)).toBe(true);
  });
  it('returns a legible not_found tool error for an unknown project (no stack trace)', async () => {
    const r = await call('get_project', { project_id: 'prj_nope' });
    expect(r.isError).toBe(true);
    expect(r.data.error.code).toBe('not_found');
    expect(JSON.stringify(r.data)).not.toMatch(/\bat \w+.*\.(ts|js):\d+/);
  });
});

async function firstOpenRun() {
  const run = (await call('list_runs', { project_id: 'prj_core', state: 'open' })).data.items[0];
  const test = (await call('list_run_tests', { run_id: run.id, status: ['untested'], limit: 1 })).data.items[0];
  return { run, test };
}

describe('write tools (happy path)', () => {
  it('add_case creates version 1; update_case saves a new version and rejects a stale one', async () => {
    const sec = (await call('list_suites', { project_id: 'prj_core' })).data.items[0];
    const added = await call('add_case', { project_id: 'prj_core', suite_id: sec.id, section_id: sec.sections[0].id, title: 'Agent added case', steps: [{ description: 'Open page', expected_result: 'It loads' }] });
    expect(added.isError).toBe(false);
    expect(added.data.version).toBe(1);
    const upd = await call('update_case', { case_id: added.data.id, expected_version: 1, title: 'Agent edited case', note: 'rename' });
    expect(upd.data).toMatchObject({ previous_version: 1, version: 2, title: 'Agent edited case' });
    const stale = await call('update_case', { case_id: added.data.id, expected_version: 1, title: 'Again' });
    expect(stale.isError).toBe(true);
    expect(stale.data.error.code).toBe('conflict');
    expect((await call('update_case', { case_id: added.data.id })).data.error.code).toBe('validation');
  });
  it('add_run builds a run from case ids', async () => {
    const cases = (await call('list_cases', { project_id: 'prj_core', suite_id: 'suite_web', limit: 3 })).data.items;
    const run = await call('add_run', { project_id: 'prj_core', suite_id: 'suite_web', name: 'Agent run', case_ids: cases.map((c: { id: string }) => c.id) });
    expect(run.isError).toBe(false);
    expect(run.data.progress.total).toBe(3);
    expect(run.data.progress.counts.untested).toBe(3);
    expect((await call('add_run', { project_id: 'prj_core', suite_id: 'suite_web', name: 'Empty' })).data.error.code).toBe('validation');
  });
  it('add_result updates the test and the run progress', async () => {
    const { run, test } = await firstOpenRun();
    const before = (await call('get_run', { run_id: run.id })).data.progress;
    const r = await call('add_result', { test_id: test.id, status: 'passed', elapsed: 12 });
    expect(r.isError).toBe(false);
    expect(r.data.run_progress.counts.passed).toBe(before.counts.passed + 1);
    expect((await call('get_test', { test_id: test.id })).data.status).toBe('passed');
  });
  it('every write is audited as coming from an agent', async () => {
    const { test } = await firstOpenRun();
    await call('add_result', { test_id: test.id, status: 'failed', comment: 'broken' });
    const sa = await call('get_project', { project_id: 'prj_core' }, T.admin);
    expect(sa.isError).toBe(false);
    // Read the audit log as admin through the service layer.
    const audit = await demoData.runAs('u_avery', (s) => s.audit.list({ projectId: 'prj_core', pageSize: 500 }));
    const entry = audit.items.find((a) => a.log.action === 'agent.add_result');
    expect(entry).toBeDefined();
    expect(entry!.log.actor).toBe('u_dana');
    expect(entry!.log.after).toMatchObject({ agent: true, via: 'mcp', tool: 'add_result' });
  });
});

describe('rules', () => {
  it('a viewer cannot write', async () => {
    const { test, run } = await firstOpenRun();
    const r = await call('add_result', { test_id: test.id, status: 'passed' }, T.viewer);
    expect(r.isError).toBe(true);
    expect(r.data.error).toMatchObject({ code: 'forbidden', status: 403 });
    expect((await call('add_case', { project_id: 'prj_core', suite_id: 'suite_web', section_id: 'x', title: 'No' }, T.viewer)).data.error.code).toBe('forbidden');
    expect((await call('close_run', { run_id: run.id, confirm: true }, T.viewer)).data.error.code).toBe('forbidden');
    expect((await call('get_test', { test_id: test.id }, T.viewer)).isError).toBe(false); // reads are fine
  });
  it('close_run follows lib/permissions: runs.close is Admin/Manager/Tester, so a viewer is refused and a tester is not', async () => {
    const { run } = await firstOpenRun();
    expect((await call('close_run', { run_id: run.id, confirm: true }, T.viewer)).data.error.code).toBe('forbidden');
    expect((await call('close_run', { run_id: run.id, confirm: true }, T.tester)).isError).toBe(false);
  });
  it('close_run goes through the service rule D26: a tester who is not the assignee is refused, a manager is not', async () => {
    const run = (await call('get_run', { run_id: 'run_api' })).data; // assigned to Sam, not to the tester token's user
    expect((await call('close_run', { run_id: run.id, confirm: true }, T.tester)).data.error.code).toBe('forbidden');
    expect((await call('get_run', { run_id: run.id })).data.is_closed).toBe(false);
    expect((await call('close_run', { run_id: run.id, confirm: true }, T.manager)).isError).toBe(false);
  });
  it('milestone attach needs Manager (runs.attach): a tester is refused, a manager is not', async () => {
    const cases = (await call('list_cases', { project_id: 'prj_core', suite_id: 'suite_web', limit: 1 })).data.items;
    const args = { project_id: 'prj_core', suite_id: 'suite_web', name: 'With milestone', case_ids: [cases[0].id], milestone_id: 'ms_24' };
    expect((await call('add_run', args)).data.error.code).toBe('forbidden');
    expect((await call('add_run', args, T.manager)).isError).toBe(false);
  });
  it('failed and blocked need a comment; untested cannot be posted', async () => {
    const { test } = await firstOpenRun();
    for (const status of ['failed', 'blocked']) {
      const r = await call('add_result', { test_id: test.id, status });
      expect(r.data.error).toMatchObject({ code: 'validation' });
      expect(r.data.error.message).toContain('comment');
      expect((await call('add_result', { test_id: test.id, status, comment: '   ' })).isError).toBe(true);
    }
    const untested = await rpc('tools/call', { name: 'add_result', arguments: { test_id: test.id, status: 'untested' } });
    expect((await untested.json()).error.code).toBe(-32602);
    expect((await call('add_result', { test_id: test.id, status: 'blocked', comment: 'env down' })).isError).toBe(false);
  });
  it('close_run needs confirm and is irreversible', async () => {
    const { run, test } = await firstOpenRun();
    const noConfirm = await call('close_run', { run_id: run.id, confirm: false });
    expect(noConfirm.data.error.code).toBe('confirmation_required');
    expect((await call('get_run', { run_id: run.id })).data.is_closed).toBe(false);
    const missing = await rpc('tools/call', { name: 'close_run', arguments: { run_id: run.id } });
    expect((await missing.json()).error.code).toBe(-32602);

    const closed = await call('close_run', { run_id: run.id, confirm: true });
    expect(closed.isError).toBe(false);
    expect(closed.data.is_closed).toBe(true);
    expect((await call('close_run', { run_id: run.id, confirm: true })).data.error.code).toBe('closed');
    const after = await call('add_result', { test_id: test.id, status: 'passed' });
    expect(after.data.error.code).toBe('closed');
    expect((await call('get_run', { run_id: run.id })).data.is_closed).toBe(true);
  });
  it('a manager and an admin can also write', async () => {
    const { test } = await firstOpenRun();
    expect((await call('add_result', { test_id: test.id, status: 'retest' }, T.manager)).isError).toBe(false);
    expect((await call('add_result', { test_id: test.id, status: 'passed' }, T.admin)).isError).toBe(false);
  });
});

describe('protocol errors and auth', () => {
  it('unknown method is -32601; bad params are -32602; bad JSON is -32700; bad request is -32600', async () => {
    expect((await (await rpc('does/not/exist')).json()).error.code).toBe(-32601);
    expect((await (await rpc('tools/call', {})).json()).error.code).toBe(-32602);
    expect((await (await rpc('tools/call', { name: 'nope' })).json()).error.code).toBe(-32602);
    const bad = await (await rpc('tools/call', { name: 'list_runs', arguments: { project_id: 5, extra: 1 } })).json();
    expect(bad.error.code).toBe(-32602);
    expect(bad.error.data.length).toBeGreaterThan(0);
    const parse = await send('{not json');
    expect(parse.status).toBe(400);
    expect((await parse.json()).error.code).toBe(-32700);
    expect((await (await send({ hello: 'world' })).json()).error.code).toBe(-32600);
  });
  it('401 without or with a bad token, never echoing the token; X-API-Token works', async () => {
    const none = await rpc('ping', undefined, null);
    expect(none.status).toBe(401);
    expect(none.headers.get('www-authenticate')).toContain('Bearer');
    const bad = await rpc('ping', undefined, 'tb_demo_wrong');
    expect(bad.status).toBe(401);
    expect(JSON.stringify(await bad.json())).not.toContain('tb_demo_wrong');
    const viaHeader = await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, null, { 'x-api-token': T.viewer });
    expect(viaHeader.status).toBe(200);
  });
  it('403 for a disallowed Origin', async () => {
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, T.tester, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await send({ jsonrpc: '2.0', id: 1, method: 'ping' }, T.tester, { origin: 'https://claude.ai' })).status).toBe(200);
  });
  it('403 when the user behind the token is disabled', async () => {
    process.env.MCP_DEMO_TOKENS = 'tb_demo_gone_local_only:u_inactive';
    try {
      expect((await rpc('ping', undefined, 'tb_demo_gone_local_only')).status).toBe(403);
    } finally {
      delete process.env.MCP_DEMO_TOKENS;
    }
  });
  it('custom MCP_DEMO_TOKENS replace the defaults', async () => {
    process.env.MCP_DEMO_TOKENS = 'tb_demo_custom_local_only:viewer';
    try {
      expect((await rpc('ping', undefined, 'tb_demo_custom_local_only')).status).toBe(200);
      expect((await rpc('ping', undefined, T.tester)).status).toBe(401);
    } finally {
      delete process.env.MCP_DEMO_TOKENS;
    }
  });
  it('rate limits per token with 429 and Retry-After', async () => {
    process.env.MCP_RATE_LIMIT_PER_MIN = '3';
    try {
      for (let i = 0; i < 3; i += 1) expect((await rpc('ping')).status).toBe(200);
      const limited = await rpc('ping');
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
      expect((await rpc('ping', undefined, T.viewer)).status).toBe(200); // other token unaffected
    } finally {
      delete process.env.MCP_RATE_LIMIT_PER_MIN;
    }
  });
  it('GET and DELETE return 405 with a reason and Allow: POST', async () => {
    for (const res of [GET(), DELETE()]) {
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
      expect((await res.json()).error.message).toMatch(/stateless/);
    }
  });
  it('supports JSON-RPC batches', async () => {
    const res = await send([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
    const out = await res.json();
    expect(out).toHaveLength(2);
  });
});
