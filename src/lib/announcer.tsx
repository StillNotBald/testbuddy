'use client';

import { useEffect, useState } from 'react';

type Politeness = 'polite' | 'assertive';
type Listener = (msg: string, p: Politeness) => void;
const listeners = new Set<Listener>();

/** Announce a message to screen readers. Polite for "Saved"/realtime, assertive for errors. */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  listeners.forEach((l) => l(message, politeness));
}

/** Mount once (Providers). */
export function LiveRegion() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  useEffect(() => {
    const l: Listener = (msg, p) => {
      // clear first so repeated identical messages are announced again
      const set = p === 'polite' ? setPolite : setAssertive;
      set('');
      setTimeout(() => set(msg), 30);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic className="sr-only" data-testid="live-polite">{polite}</div>
      <div role="alert" aria-live="assertive" aria-atomic className="sr-only" data-testid="live-assertive">{assertive}</div>
    </>
  );
}
