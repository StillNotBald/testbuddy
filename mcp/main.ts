import { runStdio } from '../src/mcp/stdio';

runStdio().catch((e: unknown) => {
  process.stderr.write(`[testbuddy-mcp] fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
