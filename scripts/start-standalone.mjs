#!/usr/bin/env node
// Run the production build locally the way it deploys (Next `output: 'standalone'`).
// Usage: npm run build && npm run start:standalone   (PORT defaults to 3100)
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');
if (!existsSync(join(standalone, 'server.js'))) {
  console.error('No standalone build found. Run `npm run build` first.');
  process.exit(1);
}
// Next does not copy static assets into the standalone folder; do it here.
cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });
if (existsSync(join(root, 'public'))) {
  cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true });
}
const port = process.env.PORT ?? '3100';
const child = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME ?? '127.0.0.1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
