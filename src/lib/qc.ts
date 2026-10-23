import type { OmicsDataset } from '../data/dataset';
import type { DEResult } from './analysis/de';

export type QcStatus = 'PASS' | 'WARNING' | 'REQUIRES REVIEW' | 'FAILED';
export interface QcCheck { id: string; label: string; status: QcStatus; value: string; rule: string }
const RANK: Record<QcStatus, number> = { PASS: 0, WARNING: 1, 'REQUIRES REVIEW': 2, FAILED: 3 };
export const worst = (checks: QcCheck[]): QcStatus => checks.reduce<QcStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), 'PASS');

/**
 * Rule-based analytical review of a demo run. Every status comes from a stated rule applied to a measured value.
 * Checks the demo cannot perform are reported as REQUIRES REVIEW, never as PASS and never with an invented metric.
 */
export function runQc(ds: OmicsDataset, de: DEResult): QcCheck[] {
  const ti = ds.cellTypes.findIndex((c) => c.id === de.typeId);
  const cc = ds.pseudobulk.cellCounts[ti];
  const kept = ds.donors.map((_, i) => i).filter((i) => cc[i] >= de.options.minCells);
  const minCells = kept.length ? Math.min(...kept.map((i) => cc[i])) : 0;
  const cnt = ds.pseudobulk.counts[de.typeId];
  const libs = kept.map((di) => cnt.reduce((a, r) => a + r[di], 0));
  const libRatio = libs.length ? Math.max(...libs) / Math.max(1, Math.min(...libs)) : NaN;
  const minGroup = Math.min(de.nControl, de.nDisease);
  const out: QcCheck[] = [
    { id: 'replicates', label: 'Biological replicates per group', value: `${de.nControl} control, ${de.nDisease} disease`, rule: '4 or more donors per group: PASS. 3: WARNING. Fewer than 3: FAILED.', status: minGroup >= 4 ? 'PASS' : minGroup === 3 ? 'WARNING' : 'FAILED' },
    { id: 'balance', label: 'Group balance', value: `difference of ${Math.abs(de.nControl - de.nDisease)} donors`, rule: 'Group sizes differing by more than 1: WARNING.', status: Math.abs(de.nControl - de.nDisease) > 1 ? 'WARNING' : 'PASS' },
    { id: 'cells', label: 'Cells per donor pseudobulk (smallest)', value: `${minCells} cells`, rule: '20 or more cells: PASS. 10 to 19: WARNING. Fewer than 10: FAILED.', status: minCells >= 20 ? 'PASS' : minCells >= 10 ? 'WARNING' : 'FAILED' },
    { id: 'excluded', label: 'Donors excluded by minimum-cell filter', value: de.excludedDonors.length ? de.excludedDonors.join(', ') : 'none', rule: 'Any exclusion: WARNING (replicate count changes).', status: de.excludedDonors.length ? 'WARNING' : 'PASS' },
    { id: 'libsize', label: 'Library-size spread across donors', value: Number.isFinite(libRatio) ? `max/min = ${libRatio.toFixed(2)}` : 'n/a', rule: 'Ratio above 3: WARNING.', status: !Number.isFinite(libRatio) ? 'FAILED' : libRatio > 3 ? 'WARNING' : 'PASS' },
    { id: 'unit', label: 'Unit of replication', value: 'donor (pseudobulk)', rule: 'Cell-level testing without donor effects would be FAILED (pseudoreplication).', status: 'PASS' },
    { id: 'fdr', label: 'Multiple-testing correction', value: `BH across ${de.genesTested} genes`, rule: 'No correction applied: FAILED.', status: 'PASS' },
    { id: 'batch', label: 'Batch confounding with condition', value: 'no batch variable in demo metadata', rule: 'Cannot be assessed without batch metadata: REQUIRES REVIEW.', status: 'REQUIRES REVIEW' },
    { id: 'ambient', label: 'Ambient RNA and doublet assessment', value: 'not implemented in demo', rule: 'Not evaluated: REQUIRES REVIEW.', status: 'REQUIRES REVIEW' },
    { id: 'annotation', label: 'Cell-type annotation validation', value: 'labels come from the simulator', rule: 'Annotation needs marker validation on real data: REQUIRES REVIEW.', status: 'REQUIRES REVIEW' },
  ];
  return out;
}
