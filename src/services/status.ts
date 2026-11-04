import type { Status, TestStatusKey } from './types';

/** Shared (client + mock) mapping from a status row to its derived key. */
const KEYS: Record<string, TestStatusKey> = { passed: 'passed', failed: 'failed', blocked: 'blocked', retest: 'retest', untested: 'untested' };
export function statusKeyOfRow(status: Pick<Status, 'name'> | undefined): TestStatusKey {
  return status ? (KEYS[status.name.toLowerCase()] ?? 'custom') : 'untested';
}
