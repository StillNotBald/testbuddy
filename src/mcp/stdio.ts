/**
 * stdio transport over the same core. Newline-delimited JSON-RPC on stdin/stdout.
 * Token comes from env TESTBUDDY_MCP_TOKEN (same token map as HTTP). stdout carries protocol
 * messages only; diagnostics go to stderr and never include the token.
 */
import { createInterface } from 'node:readline';
import { authenticate } from './auth';
import { ERR, handleMessage, rpcError, type RpcResponse } from './protocol';

export async function runStdio(): Promise<void> {
  const auth = authenticate(process.env.TESTBUDDY_MCP_TOKEN?.trim() || null);
  if (!auth.ok) {
    process.stderr.write(`[testbuddy-mcp] ${auth.message} Set TESTBUDDY_MCP_TOKEN (see docs/mcp/README.md).\n`);
    process.exit(1);
  }
  const opts = { principal: auth.principal, client: 'stdio' };
  const send = (r: RpcResponse | RpcResponse[]) => process.stdout.write(`${JSON.stringify(r)}\n`);
  const rl = createInterface({ input: process.stdin });
  let chain: Promise<void> = Promise.resolve();
  rl.on('line', (line) => {
    if (!line.trim()) return;
    chain = chain.then(async () => {
      let msg: unknown;
      try { msg = JSON.parse(line); } catch { send(rpcError(null, ERR.parse, 'Parse error: line is not valid JSON.')); return; }
      if (Array.isArray(msg)) {
        const out = (await Promise.all(msg.map((m) => handleMessage(m, opts)))).filter((r): r is RpcResponse => r !== null);
        if (out.length) send(out);
        return;
      }
      const res = await handleMessage(msg, opts);
      if (res) send(res);
    });
  });
  await new Promise<void>((resolve) => rl.on('close', resolve));
  await chain;
}
