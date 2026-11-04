'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { MockDbNotice } from '@/components/shell/mock-db-notice';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LiveRegion } from '@/lib/announcer';
import { ServiceError } from '@/services/interfaces';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          // forbidden / not found / validation will not succeed on retry
          retry: (count, error) => !(error instanceof ServiceError && ['forbidden', 'not_found', 'unauthenticated', 'validation', 'not_implemented'].includes(error.code)) && count < 1,
        },
      },
    }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster position="bottom-left" visibleToasts={3} closeButton />
        <LiveRegion />
        <MockDbNotice />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
