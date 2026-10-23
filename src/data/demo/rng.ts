/** Deterministic seeded RNG (mulberry32) with the samplers the demo generator needs. */
export interface Rng {
  next(): number;
  normal(mu?: number, sd?: number): number;
  int(n: number): number;
  gamma(shape: number): number;
  poisson(lambda: number): number;
  pick<T>(a: readonly T[]): T;
  shuffle<T>(a: T[]): T[];
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  let spare: number | null = null;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (mu = 0, sd = 1): number => {
    if (spare !== null) { const v = spare; spare = null; return mu + sd * v; }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return mu + sd * r * Math.cos(2 * Math.PI * v);
  };
  const gamma = (k: number): number => {
    if (k < 1) return gamma(k + 1) * Math.pow(next(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = next();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const poisson = (l: number): number => {
    if (l <= 0) return 0;
    if (l < 30) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= next(); } while (p > L); return k - 1; }
    return Math.max(0, Math.round(normal(l, Math.sqrt(l))));
  };
  return {
    next, normal, gamma, poisson,
    int: (n) => Math.floor(next() * n),
    pick: (a) => a[Math.floor(next() * a.length)],
    shuffle: (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}
