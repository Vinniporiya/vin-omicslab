import type { OmicsDataset } from '../../data/dataset';
import { mean, welch, type TTest } from '../stats';

export type Chain = 'TCR' | 'BCR';
export interface RepMetrics { donor: string; condition: string; cells: number; clonotypes: number; shannon: number; simpson: number; topClonePct: number; sizes: number[] }

export function repertoireMetrics(ds: OmicsDataset, chain: Chain): RepMetrics[] {
  return ds.donors.map((d) => {
    const sizes = ds.repertoire[chain][d.id];
    const n = sizes.reduce((a, b) => a + b, 0);
    const p = sizes.map((s) => s / n);
    return {
      donor: d.id, condition: d.condition, cells: n, clonotypes: sizes.length, sizes,
      shannon: -p.reduce((a, v) => a + v * Math.log(v), 0), simpson: 1 - p.reduce((a, v) => a + v * v, 0), topClonePct: (100 * sizes[0]) / n,
    };
  });
}

export function compareMetric(rows: RepMetrics[], key: 'shannon' | 'simpson' | 'clonotypes' | 'topClonePct'): TTest {
  return welch(rows.filter((r) => r.condition === 'Control').map((r) => r[key]), rows.filter((r) => r.condition === 'Disease').map((r) => r[key]));
}
export const meanBy = (rows: RepMetrics[], cond: string, key: 'shannon' | 'simpson' | 'clonotypes' | 'topClonePct'): number => mean(rows.filter((r) => r.condition === cond).map((r) => r[key]));
