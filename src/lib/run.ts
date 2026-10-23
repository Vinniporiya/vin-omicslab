import type { OmicsDataset } from '../data/dataset';
import type { TypeId } from '../data/demo/genes';
import type { ProvenanceRecord } from '../data/schema';
import { differentialAbundance, type DARow } from './analysis/composition';
import { pseudobulkDE, isSignificant, type DEResult } from './analysis/de';
import { overRepresentation, type EnrichRow } from './analysis/pathway';
import { runQc, type QcCheck } from './qc';
import type { ClaimStack } from './evidence';
import { fmtNum, fmtP, pct } from './format';
import { fnv } from './stats';

export const ENGINE_VERSION = 'vin-omicslab-demo-engine 0.1.0';

export interface RunParams { typeId: TypeId; minCells: number; fdr: number; lfc: number }
export const DEFAULT_RUN_PARAMS: RunParams = { typeId: 'Myeloid', minCells: 10, fdr: 0.1, lfc: 0.5 };

export interface RunResult {
  id: string; params: RunParams; logs: string[]; de: DEResult; da: DARow[]; up: EnrichRow[]; down: EnrichRow[];
  qc: QcCheck[]; claims: ClaimStack[]; provenance: ProvenanceRecord; resultHash: string; elapsedMs: number;
}

/** Deterministic hash over the numeric results (rounded), used by the in-browser reproducibility check. */
export function hashResults(de: DEResult, da: DARow[], params: RunParams): string {
  const de50 = de.rows.slice(0, 50).map((r) => `${r.gene}:${r.log2fc.toFixed(5)}:${r.padj.toExponential(4)}`).join('|');
  const da9 = da.map((r) => `${r.typeId}:${r.log2fc.toFixed(5)}:${r.padj.toExponential(4)}`).join('|');
  return fnv(`${JSON.stringify(params)}#${de50}#${da9}`);
}

/**
 * Runs the demo analysis in the browser. This is a real computation on SIMULATED input; the run is labelled
 * "simulated execution" everywhere because there is no cloud compute, container or R/Python process behind it.
 * TODO(compute): replace with POST /analysis-runs and stream logs from the job queue (docs/ARCHITECTURE.md section G).
 */
export function runDemoAnalysis(ds: OmicsDataset, params: RunParams, now: Date = new Date()): RunResult {
  const t0 = performance.now();
  const logs: string[] = [];
  const stamp = () => `[${((performance.now() - t0) / 1000).toFixed(3).padStart(7, '0')}s]`;
  const log = (m: string) => logs.push(`${stamp()} ${m}`);
  const label = ds.cellTypes.find((c) => c.id === params.typeId)!;

  log('SIMULATED EXECUTION: in-browser engine, no cloud compute, no R or Python process');
  log(`load dataset ${ds.meta.id} (${ds.meta.nCells} cells, ${ds.donors.length} donors, fingerprint ${ds.meta.fingerprint})`);
  log(`parameters ${JSON.stringify(params)}`);
  const da = differentialAbundance(ds);
  log(`differential abundance: ${da.length} cell types tested (Welch t on logit proportions, BH)`);
  const de = pseudobulkDE(ds, params.typeId, { minCells: params.minCells, minTotalCounts: 10 });
  log(`pseudobulk DE (${label.label}): ${de.nControl} control vs ${de.nDisease} disease donors, ${de.genesTested} genes tested, ${de.genesFiltered} filtered`);
  if (de.message) log(`WARNING ${de.message}`);
  const universe = de.rows.map((r) => r.gene);
  const up = overRepresentation(universe, ds.pseudobulk.geneSets, de.rows.filter((r) => r.p < 0.05 && r.log2fc > 0).map((r) => r.gene));
  const down = overRepresentation(universe, ds.pseudobulk.geneSets, de.rows.filter((r) => r.p < 0.05 && r.log2fc < 0).map((r) => r.gene));
  log(`over-representation: ${ds.pseudobulk.geneSets.length} gene sets, hits defined as nominal P < 0.05`);
  const qc = runQc(ds, de);
  log(`quality review: ${qc.filter((c) => c.status === 'PASS').length} pass, ${qc.filter((c) => c.status === 'WARNING').length} warning, ${qc.filter((c) => c.status === 'REQUIRES REVIEW').length} requires review, ${qc.filter((c) => c.status === 'FAILED').length} failed`);

  const runId = `run-${fnv(JSON.stringify(params) + ds.meta.fingerprint)}`;
  const resultHash = hashResults(de, da, params);
  const elapsedMs = performance.now() - t0;
  log(`complete in ${elapsedMs.toFixed(0)} ms, result hash ${resultHash}`);

  const claims = buildClaims(ds, params, de, da, up, runId);
  const provenance: ProvenanceRecord = {
    runId, createdAt: now.toISOString(), datasetId: ds.meta.id, datasetFingerprint: ds.meta.fingerprint,
    parameters: { ...params }, softwareVersions: { engine: ENGINE_VERSION }, environment: 'browser JavaScript runtime (no container, no lockfile)',
    codeExecuted: false, logsCaptured: true, inputChecksums: true,
  };
  return { id: runId, params, logs, de, da, up, down, qc, claims, provenance, resultHash, elapsedMs };
}

function buildClaims(ds: OmicsDataset, p: RunParams, de: DEResult, da: DARow[], up: EnrichRow[], runId: string): ClaimStack[] {
  const ct = ds.cellTypes.find((c) => c.id === p.typeId)!;
  const d = da.find((r) => r.typeId === p.typeId)!;
  const sig = de.rows.filter((r) => isSignificant(r, p.fdr, p.lfc));
  const top = de.rows[0];
  const dir = d.log2fc >= 0 ? 'higher' : 'lower';
  const nC = ds.donors.filter((x) => x.condition === 'Control').length, nD = ds.donors.length - nC;
  return [
    {
      statement: `${ct.label} abundance differs between conditions`, simulated: true,
      layers: {
        observed: { text: `Mean ${ct.label} proportion is ${pct(d.meanDisease)} in disease donors and ${pct(d.meanControl)} in control donors (${dir} in disease; n = ${nD} and ${nC} donors).` },
        statistical: { text: `Welch t-test on logit proportions across donors: t = ${fmtNum(d.t)}, df = ${fmtNum(d.df, 1)}, adjusted P = ${fmtP(d.padj)} (Benjamini-Hochberg across ${da.length} cell types).`, test: 'Welch t-test on logit proportions, BH', adjP: d.padj, runId },
        inference: { text: `If this were real data, the shift would suggest altered representation of ${ct.label} in the disease condition. Here the shift comes from hand-written multipliers in the simulator, and part of any drop is compositional (other populations expanding).` },
        hypothesis: { text: `Altered ${ct.label} abundance could contribute to the modelled phenotype. A test would be orthogonal quantification, for example imaging or flow cytometry, in independent samples.` },
      },
    },
    {
      statement: `Gene expression changes within ${ct.label}`, simulated: true,
      layers: {
        observed: { text: `${sig.length} of ${de.genesTested} genes pass |log2FC| ≥ ${p.lfc} and adjusted P < ${p.fdr}${top ? `; the smallest P value belongs to ${top.gene} (log2FC ${fmtNum(top.log2fc)})` : ''}.` },
        statistical: { text: `Pseudobulk Welch t-test on log2 CPM with donors as replicates, Benjamini-Hochberg across ${de.genesTested} genes.${top ? ` Top gene adjusted P = ${fmtP(top.padj)}.` : ''}`, test: 'Pseudobulk Welch t-test on log2 CPM, BH', adjP: top?.padj ?? 1, runId },
        inference: { text: up[0] ? `The most enriched gene set among up-regulated genes is "${up[0].name}" (${up[0].overlap} of ${up[0].setSize} members, adjusted P = ${fmtP(up[0].padj)}). Gene-set labels in the demo are placeholders and membership is simulated.` : 'No gene set could be tested.' },
        hypothesis: { text: 'A coordinated gene program could be shifted in this cell type. A test would be an independent cohort and a perturbation experiment.' },
      },
    },
  ];
}
