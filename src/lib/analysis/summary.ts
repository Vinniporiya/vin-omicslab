import type { Condition, OmicsDataset } from '../../data/dataset';

export interface GeneSummary {
  /** mean[condition][typeIdx]; condition 'all' pools every cell */
  mean: Record<'all' | Condition, number[]>;
  /** fraction of cells with expression > 0 */
  pct: Record<'all' | Condition, number[]>;
}
const cache = new WeakMap<OmicsDataset, Record<string, GeneSummary>>();

/** Per-gene mean expression and detection rate per cell type and condition. */
export function geneSummaries(ds: OmicsDataset): Record<string, GeneSummary> {
  const hit = cache.get(ds);
  if (hit) return hit;
  const { landscape: L, cellTypes, donors, panel } = ds;
  const nT = cellTypes.length;
  const condOf = donors.map((d) => d.condition);
  const out: Record<string, GeneSummary> = {};
  for (const gene of panel) {
    const e = L.expr[gene];
    const sum = { all: new Array(nT).fill(0), Control: new Array(nT).fill(0), Disease: new Array(nT).fill(0) };
    const pos = { all: new Array(nT).fill(0), Control: new Array(nT).fill(0), Disease: new Array(nT).fill(0) };
    const n = { all: new Array(nT).fill(0), Control: new Array(nT).fill(0), Disease: new Array(nT).fill(0) };
    for (let i = 0; i < L.n; i++) {
      const t = L.type[i], c = condOf[L.donor[i]];
      for (const k of ['all', c] as const) { sum[k][t] += e[i]; n[k][t]++; if (e[i] > 0) pos[k][t]++; }
    }
    const fin = (a: number[], b: number[]) => a.map((v, i) => (b[i] ? v / b[i] : 0));
    out[gene] = {
      mean: { all: fin(sum.all, n.all), Control: fin(sum.Control, n.Control), Disease: fin(sum.Disease, n.Disease) },
      pct: { all: fin(pos.all, n.all), Control: fin(pos.Control, n.Control), Disease: fin(pos.Disease, n.Disease) },
    };
  }
  cache.set(ds, out);
  return out;
}
