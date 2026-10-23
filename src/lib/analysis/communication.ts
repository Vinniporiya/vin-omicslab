import type { OmicsDataset } from '../../data/dataset';
import { LR_PAIRS, type LRPair } from '../../data/demo/genes';
import { geneSummaries } from './summary';

export type CommMode = 'all' | 'Control' | 'Disease' | 'diff';
export interface CommResult { pair: LRPair; matrix: number[][] /* [sender][receiver] */ }

/**
 * Descriptive ligand-receptor scores: mean(ligand in sender) x mean(receptor in receiver), per cell-type pair.
 * No permutation test is applied here (unlike CellPhoneDB/LIANA), so scores are for exploration only.
 */
export function communication(ds: OmicsDataset, mode: CommMode): CommResult[] {
  const S = geneSummaries(ds);
  const nT = ds.cellTypes.length;
  const score = (lig: string, rec: string, cond: 'all' | 'Control' | 'Disease') =>
    Array.from({ length: nT }, (_, s) => Array.from({ length: nT }, (_, r) => S[lig].mean[cond][s] * S[rec].mean[cond][r]));
  return LR_PAIRS.map((pair) => {
    if (mode === 'diff') {
      const a = score(pair.ligand, pair.receptor, 'Disease'), b = score(pair.ligand, pair.receptor, 'Control');
      return { pair, matrix: a.map((row, s) => row.map((v, r) => v - b[s][r])) };
    }
    return { pair, matrix: score(pair.ligand, pair.receptor, mode) };
  });
}

export function topInteractions(results: CommResult[], ds: OmicsDataset, n = 8) {
  const out: { pair: string; sender: string; receiver: string; score: number }[] = [];
  for (const r of results) r.matrix.forEach((row, s) => row.forEach((v, t) => out.push({ pair: r.pair.label, sender: ds.cellTypes[s].short, receiver: ds.cellTypes[t].short, score: v })));
  return out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, n);
}
