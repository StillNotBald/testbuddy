'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey, type UseMutationOptions } from '@tanstack/react-query';
import { getServices } from '..';
import type { Services } from '../interfaces';

/** The active service set (mock or pocketbase). Components never import implementations. */
export function useServices(): Services {
  return getServices();
}

/** useMutation that invalidates the given key prefixes on success. */
export function useInvalidatingMutation<TIn, TOut>(
  fn: (input: TIn) => Promise<TOut>,
  invalidate: (input: TIn, out: TOut) => QueryKey[],
  options?: Omit<UseMutationOptions<TOut, Error, TIn>, 'mutationFn'>,
) {
  const qc = useQueryClient();
  return useMutation<TOut, Error, TIn>({
    ...options,
    mutationFn: fn,
    onSuccess: async (out, input, ctx, meta) => {
      await Promise.all(invalidate(input, out).map((queryKey) => qc.invalidateQueries({ queryKey })));
      return options?.onSuccess?.(out, input, ctx, meta);
    },
  });
}

export { useQuery, useQueryClient };
