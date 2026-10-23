import type { OmicsDataset } from '../../data/dataset';
import { bh, logit, mean, welch } from '../stats';

export interface DARow {
  typeId: string; label: string; color: string;
  meanControl: number; meanDisease: number; log2fc: number;
  t: number; df: number; p: number; padj: number;
}

/** proportions[typeIdx][donorIdx] */
export function proportions(ds: OmicsDataset): number[][] {
  const cc = ds.pseudobulk.cellCounts;
  const totals = ds.donors.map((_, di) => cc.reduce((a, row) => a + row[di], 0));
  return cc.map((row) => row.map((c, di) => c / totals[di]));
}

/**
 * Differential abundance per cell type: Welch t-test on logit-transformed donor-level proportions
 * (donor = unit of replication), Benjamini-Hochberg across cell types.
 * Demo-grade stand-in for compositional / neighbourhood methods (scCODA, Milo).
 */
export function differentialAbundance(ds: OmicsDataset): DARow[] {
  const props = proportions(ds);
  const totals = ds.donors.map((_, di) => ds.pseudobulk.cellCounts.reduce((a, row) => a + row[di], 0));
  const ctrl = ds.donors.map((d, i) => (d.condition === 'Control' ? i : -1)).filter((i) => i >= 0);
  const dis = ds.donors.map((d, i) => (d.condition === 'Disease' ? i : -1)).filter((i) => i >= 0);
  const rows = ds.cellTypes.map((ct, ti) => {
    const lg = (di: number) => logit((ds.pseudobulk.cellCounts[ti][di] + 0.5) / (totals[di] + 1));
    const tt = welch(ctrl.map(lg), dis.map(lg));
    const mc = mean(ctrl.map((i) => props[ti][i])), md = mean(dis.map((i) => props[ti][i]));
    return { typeId: ct.id, label: ct.label, color: ct.color, meanControl: mc, meanDisease: md, log2fc: Math.log2(md / mc), t: tt.t, df: tt.df, p: tt.p, padj: 1 };
  });
  const adj = bh(rows.map((r) => r.p));
  rows.forEach((r, i) => (r.padj = adj[i]));
  return rows;
}
