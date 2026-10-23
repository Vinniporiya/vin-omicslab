import type { OmicsDataset } from '../../data/dataset';
import { bh, mean, welch } from '../stats';
import { geneSummaries } from './summary';

/** Cell types where neither group reaches this mean are not tested: absent genes only dilute the correction. */
export const MIN_EXPR = 0.1;

export interface GeneTypeRow {
  typeIdx: number; control: number[]; disease: number[]; cells: number[]; excluded: string[];
  log2fc: number; t: number; df: number; p: number; padj: number; testable: boolean;
}
export interface GeneProfile { gene: string; rows: GeneTypeRow[]; tau: number; topType: number; minCells: number }

/**
 * Per-gene condition comparison on the simulated landscape: mean expression per donor within each cell type,
 * Welch t-test across donors (donor is the replicate), Benjamini-Hochberg across cell types.
 * Tissue-specificity index tau (Yanai et al. 2005) on cell-type means: 0 = uniform, 1 = one cell type only.
 */
export function geneProfile(ds: OmicsDataset, gene: string, minCells = 5): GeneProfile {
  const L = ds.landscape, e = L.expr[gene];
  if (!e) throw new Error(`Gene ${gene} is not in the panel`);
  const nT = ds.cellTypes.length, nD = ds.donors.length;
  const sum = Array.from({ length: nT }, () => new Array(nD).fill(0));
  const cnt = Array.from({ length: nT }, () => new Array(nD).fill(0));
  for (let i = 0; i < L.n; i++) { sum[L.type[i]][L.donor[i]] += e[i]; cnt[L.type[i]][L.donor[i]]++; }
  const rows: GeneTypeRow[] = [];
  for (let t = 0; t < nT; t++) {
    const control: number[] = [], disease: number[] = [], excluded: string[] = [];
    ds.donors.forEach((d, di) => {
      if (cnt[t][di] < minCells) { excluded.push(d.id); return; }
      (d.condition === 'Control' ? control : disease).push(sum[t][di] / cnt[t][di]);
    });
    const testable = control.length >= 2 && disease.length >= 2 && (mean(control) >= MIN_EXPR || mean(disease) >= MIN_EXPR);
    const w = testable ? welch(control, disease) : null; // welch(a, b) reports b minus a, so t > 0 means higher in disease
    rows.push({
      typeIdx: t, control, disease, cells: cnt[t], excluded,
      log2fc: Math.log2((mean(disease) + 0.1) / (mean(control) + 0.1)),
      t: w && Number.isFinite(w.t) ? w.t : NaN, df: w ? w.df : NaN, p: w && Number.isFinite(w.p) ? w.p : NaN, padj: NaN, testable: !!w && Number.isFinite(w.p),
    });
  }
  const tested = rows.filter((r) => r.testable);
  bh(tested.map((r) => r.p)).forEach((q, i) => { tested[i].padj = q; });
  const m = geneSummaries(ds)[gene].mean.all;
  const mx = Math.max(...m);
  const tau = mx > 0 ? m.reduce((a, v) => a + (1 - v / mx), 0) / (m.length - 1) : 0;
  return { gene, rows, tau, topType: m.indexOf(mx), minCells };
}
