/** Deterministic helpers for the fixture generator. */
export type Rng = () => number;

/** mulberry32: small, fast, seedable PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Exactly `n` values spread by integer-rounded weights (largest remainder), shuffled. */
export function distribute<T>(rng: Rng, n: number, weights: ReadonlyArray<readonly [T, number]>): T[] {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const raw = weights.map(([v, w]) => ({ v, exact: (w / total) * n }));
  const counts = raw.map((r) => Math.floor(r.exact));
  let left = n - counts.reduce((s, c) => s + c, 0);
  const order = raw.map((r, i) => ({ i, rem: r.exact - Math.floor(r.exact) })).sort((a, b) => b.rem - a.rem);
  for (const o of order) {
    if (left <= 0) break;
    counts[o.i] = (counts[o.i] ?? 0) + 1;
    left -= 1;
  }
  const out: T[] = [];
  raw.forEach((r, i) => {
    for (let k = 0; k < (counts[i] ?? 0); k += 1) out.push(r.v);
  });
  return shuffle(rng, out);
}
