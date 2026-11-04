#!/usr/bin/env node
/**
 * TestBuddy MCP server, stdio transport. Same tools and rules as POST /api/mcp.
 *
 *   TESTBUDDY_MCP_TOKEN=tb_demo_tester_local_only node mcp/server.mjs
 *
 * No build step and no tsx: Node 24 strips/transforms the TypeScript sources itself. This launcher
 * re-runs Node with the flag and a small resolver for the "@/" alias and extensionless imports.
 * M0 demo data, separate from your browser; M1 uses PocketBase. See docs/mcp/README.md.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const child = spawn(
  process.execPath,
  ['--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--experimental-transform-types', '--import', here('./register.mjs'), here('./main.ts')],
  { stdio: 'inherit', env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'development' } },
);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
