#!/usr/bin/env node
/**
 * Smoke test for the HTTP MCP endpoint. Needs a running dev server.
 *   TESTBUDDY_MCP_URL (default http://localhost:3000/api/mcp)
 *   TESTBUDDY_MCP_TOKEN (default tb_demo_tester_local_only), TESTBUDDY_MCP_VIEWER_TOKEN (default tb_demo_viewer_local_only)
 * Writes to the in-memory demo dataset only (one result on the demo run). Never prints tokens.
 * Pattern adapted from an Apache-2.0 reference credited in NOTICE.
 */
const url = process.env.TESTBUDDY_MCP_URL || 'http://localhost:3000/api/mcp';
const token = process.env.TESTBUDDY_MCP_TOKEN || 'tb_demo_tester_local_only';
const viewer = process.env.TESTBUDDY_MCP_VIEWER_TOKEN || 'tb_demo_viewer_local_only';
let id = 0;
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` (${extra})` : ''}`); if (!ok) failures += 1; };

async function rpc(method, params, tok = token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const call = async (name, args, tok) => {
  const r = await rpc('tools/call', { name, arguments: args }, tok);
  const text = r.body?.result?.content?.[0]?.text;
  return { ...r, data: text ? JSON.parse(text) : null, isError: r.body?.result?.isError === true };
};

try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } });
  check(init.status === 200 && init.body.result?.serverInfo?.name === 'testbuddy', 'initialize');
  const list = await rpc('tools/list', {});
  const names = (list.body.result?.tools ?? []).map((t) => t.name);
  check(names.length >= 15, 'tools/list', `${names.length} tools`);
  check((await rpc('ping', {})).status === 200, 'ping');

  const projects = await call('list_projects', {});
  const pid = projects.data?.items?.[0]?.id;
  check(!!pid, 'list_projects', `${projects.data?.items?.length ?? 0} projects`);
  const runs = await call('list_runs', { project_id: pid, state: 'open' });
  const run = runs.data?.items?.[0];
  check(!!run, 'list_runs', run?.name);
  const tests = await call('list_run_tests', { run_id: run.id, status: ['untested'], limit: 1 });
  const test = tests.data?.items?.[0];
  check(!!test, 'list_run_tests');

  const noComment = await call('add_result', { test_id: test.id, status: 'failed' });
  check(noComment.isError && noComment.data.error.code === 'validation', 'failed without comment is rejected');
  const denied = await call('add_result', { test_id: test.id, status: 'passed' }, viewer);
  check(denied.isError && denied.data.error.code === 'forbidden', 'viewer cannot add_result');
  const ok = await call('add_result', { test_id: test.id, status: 'passed', comment: 'smoke test' });
  check(!ok.isError && ok.data.status === 'passed', 'tester add_result', `done ${ok.data?.run_progress?.done_pct}%`);
  const noConfirm = await call('close_run', { run_id: run.id, confirm: false });
  check(noConfirm.isError && noConfirm.data.error.code === 'confirmation_required', 'close_run needs confirm (run left open)');

  check((await rpc('nope', {})).body.error?.code === -32601, 'unknown method returns -32601');
  check((await rpc('ping', {}, null)).status === 401, 'no token returns 401');
  check((await rpc('ping', {}, 'wrong')).status === 401, 'bad token returns 401');
  const g = await fetch(url, { method: 'GET', headers: { authorization: `Bearer ${token}` } });
  check(g.status === 405, 'GET returns 405');
} catch (e) {
  console.error('smoke failed:', e instanceof Error ? e.message : e);
  failures += 1;
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
