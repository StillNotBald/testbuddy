'use client';

import PocketBase from 'pocketbase';

// Browser-only PocketBase client. Base URL '/' goes through the Next rewrites
// (/api/* -> PocketBase), so there is no CORS and no PB URL in the bundle.
// Import from client components only.
let client: PocketBase | undefined;

export function getPb(): PocketBase {
  client ??= new PocketBase('/');
  return client;
}
