'use client';

import { useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import { isMockSource } from '@/services';
import { onMockPersistFailure } from '@/services/mock/core';

/** One-time toast when the mock database cannot persist (storage unavailable or full). Never silent. */
export function MockDbNotice() {
  useEffect(() => {
    if (!isMockSource()) return undefined;
    let shown = false;
    return onMockPersistFailure(() => {
      if (shown) return;
      shown = true;
      toast.error("Changes won't be saved in this browser");
    });
  }, []);
  return null;
}
