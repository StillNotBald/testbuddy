import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setMockDb, writeSessionUserId, readSessionUserId } from '@/services/mock/core';
import { buildFixtures } from '@/services/mock/fixtures';
import { MockDb } from '@/services/mock/mockdb';
import SignInPage from './page';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams('next=/p/prj_core') }));

describe('Sign in (placeholder role picker)', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    setMockDb(new MockDb({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: (k) => { m.delete(k); } }, seed: buildFixtures }));
    writeSessionUserId(null);
    replace.mockClear();
  });

  it('lists demo users with their roles and signs in as the chosen one', async () => {
    render(<QueryClientProvider client={new QueryClient()}><SignInPage /></QueryClientProvider>);
    const button = await screen.findByRole('button', { name: /Sign in as Dana Lee/ });
    expect(button).toHaveTextContent('Tester');
    expect(screen.getByRole('button', { name: /Sign in as Pat Doe/ })).toHaveTextContent('Disabled');
    fireEvent.click(button);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/p/prj_core'));
    expect(readSessionUserId()).toBe('u_dana');
  });
});
