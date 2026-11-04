// Node resolve hook: maps the "@/" alias to src/ and tries .ts / /index.ts for extensionless imports.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function tryFile(base) {
  for (const c of [base, `${base}.ts`, `${base}/index.ts`]) {
    if (existsSync(c) && statSync(c).isFile()) return pathToFileURL(c).href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = SRC + specifier.slice(2);
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:') && !context.parentURL.includes('/node_modules/')) {
    base = fileURLToPath(new URL(specifier, context.parentURL));
  }
  if (base) {
    const hit = tryFile(base);
    if (hit) return next(hit, context);
  }
  return next(specifier, context);
}
