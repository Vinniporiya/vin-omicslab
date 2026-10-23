import type { OmicsDataset } from '../../data/dataset';
import type { TypeId } from '../../data/demo/genes';
import { bh, mean, welch } from '../stats';

export interface DEOptions { minCells: number; minTotalCounts: number }
export const DEFAULT_DE_OPTIONS: DEOptions = { minCells: 10, minTotalCounts: 10 };

export interface DERow { gene: string; log2fc: number; meanExpr: number; t: number; df: number; p: number; padj: number }
export interface DEResult {
  typeId: TypeId; rows: DERow[]; nControl: number; nDisease: number;
  excludedDonors: string[]; genesTested: number; genesFiltered: number; message?: string; options: DEOptions;
}

/**
 * Pseudobulk differential expression, Disease vs Control, within one cell type.
 * Counts are summed per donor (donor = replicate), converted to log2 CPM, and compared with a Welch t-test;
 * p-values are BH-adjusted. DEMO STAND-IN: production analyses use edgeR / DESeq2 / limma-voom
 * (see the generated R/Python templates). Donors with fewer than `minCells` cells are excluded.
 */
export function pseudobulkDE(ds: OmicsDataset, typeId: TypeId, opts: DEOptions = DEFAULT_DE_OPTIONS): DEResult {
  const ti = ds.cellTypes.findIndex((c) => c.id === typeId);
  const pb = ds.pseudobulk;
  const keep = ds.donors.map((d, di) => ({ d, di })).filter(({ di }) => pb.cellCounts[ti][di] >= opts.minCells);
  const excludedDonors = ds.donors.filter((_, di) => pb.cellCounts[ti][di] < opts.minCells).map((d) => d.id);
  const ctrl = keep.filter((k) => k.d.condition === 'Control').map((k) => k.di);
  const dis = keep.filter((k) => k.d.condition === 'Disease').map((k) => k.di);
  const base = { typeId, nControl: ctrl.length, nDisease: dis.length, excludedDonors, options: opts };
  if (ctrl.length < 2 || dis.length < 2) {
    return { ...base, rows: [], genesTested: 0, genesFiltered: pb.genes.length, message: 'Fewer than 2 donors per group remain after the minimum-cell filter; test not run.' };
  }
  const cnt = pb.counts[typeId];
  const lib = ds.donors.map((_, di) => cnt.reduce((a, row) => a + row[di], 0));
  const rows: DERow[] = [];
  pb.genes.forEach((gene, gi) => {
    const total = keep.reduce((a, k) => a + cnt[gi][k.di], 0);
    if (total < opts.minTotalCounts) return;
    const l2 = (di: number) => Math.log2((cnt[gi][di] / lib[di]) * 1e6 + 1);
    const a = ctrl.map(l2), b = dis.map(l2);
    const tt = welch(a, b);
    rows.push({ gene, log2fc: tt.diff, meanExpr: mean([...a, ...b]), t: tt.t, df: tt.df, p: tt.p, padj: 1 });
  });
  const adj = bh(rows.map((r) => r.p));
  rows.forEach((r, i) => (r.padj = adj[i]));
  rows.sort((x, y) => x.p - y.p);
  return { ...base, rows, genesTested: rows.length, genesFiltered: pb.genes.length - rows.length };
}

export const isSignificant = (r: DERow, fdr: number, lfc: number): boolean => r.padj < fdr && Math.abs(r.log2fc) >= lfc;
