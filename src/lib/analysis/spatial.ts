import type { SpatialSection } from '../../data/dataset';
import { makeRng } from '../../data/demo/rng';
import { mean, sd } from '../stats';

export interface NhoodResult { z: number[][]; observed: number[][]; nEdges: number; radius: number; permutations: number }

/**
 * Neighbourhood enrichment: observed cell-type adjacency counts (pairs within `radius`) versus a null from
 * permuting cell-type labels over fixed positions; z = (obs - mean_null) / sd_null. Same idea as squidpy.gr.nhood_enrichment.
 */
export function neighbourhoodEnrichment(s: SpatialSection, nTypes: number, radius = 3.4, permutations = 200, seed = 7): NhoodResult {
  const cell = radius;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < s.n; i++) { const k = `${Math.floor(s.x[i] / cell)},${Math.floor(s.y[i] / cell)}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); }
  const ei: number[] = [], ej: number[] = [];
  for (let i = 0; i < s.n; i++) {
    const gx = Math.floor(s.x[i] / cell), gy = Math.floor(s.y[i] / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
      if (j > i && Math.hypot(s.x[i] - s.x[j], s.y[i] - s.y[j]) <= radius) { ei.push(i); ej.push(j); }
    }
  }
  const count = (labels: Uint8Array): number[][] => {
    const m = Array.from({ length: nTypes }, () => new Array<number>(nTypes).fill(0));
    for (let e = 0; e < ei.length; e++) { const a = labels[ei[e]], b = labels[ej[e]]; m[a][b]++; if (a !== b) m[b][a]++; }
    return m;
  };
  const observed = count(s.type);
  const rng = makeRng(seed);
  const perm = Uint8Array.from(s.type);
  const draws: number[][][] = [];
  for (let p = 0; p < permutations; p++) { rng.shuffle(perm as unknown as number[]); draws.push(count(perm)); }
  const z = observed.map((row, a) => row.map((v, b) => { const nulls = draws.map((d) => d[a][b]); const sdv = sd(nulls); return sdv > 0 ? (v - mean(nulls)) / sdv : 0; }));
  return { z, observed, nEdges: ei.length, radius, permutations };
}
