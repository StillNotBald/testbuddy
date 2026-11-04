import type { Services } from './interfaces';
import { mockServices } from './mock';
import { pocketbaseServices } from './pocketbase';

export * from './interfaces';
export * from './types';

/** Picks the data source once: NEXT_PUBLIC_DATA_SOURCE=mock (default) | pocketbase. */
export function getServices(): Services {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === 'pocketbase' ? pocketbaseServices : mockServices;
}

export const isMockSource = () => process.env.NEXT_PUBLIC_DATA_SOURCE !== 'pocketbase';
