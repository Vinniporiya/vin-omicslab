import type { ProvenanceRecord } from '../data/schema';
import type { OmicsDataset } from '../data/dataset';
import { runDemoAnalysis, type RunResult } from './run';

export interface ReproItem { id: string; label: string; present: boolean; note: string }
export interface ReproAssessment { items: ReproItem[]; status: 'complete' | 'partial' | 'none'; missing: string[] }

/**
 * The platform may only call a result reproducible when every element of the computational record exists.
 * "complete" requires executable code that actually produced the result and a pinned environment.
 */
export function assessReproducibility(p: ProvenanceRecord): ReproAssessment {
  const items: ReproItem[] = [
    { id: 'inputs', label: 'Input dataset identified and fingerprinted', present: p.inputChecksums && !!p.datasetFingerprint, note: `dataset ${p.datasetId}, fingerprint ${p.datasetFingerprint}` },
    { id: 'params', label: 'Parameters recorded', present: Object.keys(p.parameters).length > 0, note: JSON.stringify(p.parameters) },
    { id: 'logs', label: 'Analysis log captured', present: p.logsCaptured, note: 'timestamped log stored with the run' },
    { id: 'code', label: 'Executable code that produced the result', present: p.codeExecuted, note: p.codeExecuted ? 'code executed and archived' : 'The exported R and Python files are templates and were not executed. The demo result came from the in-browser engine.' },
    { id: 'versions', label: 'Software versions of the executing code', present: p.codeExecuted && Object.keys(p.softwareVersions).length > 1, note: `recorded: ${Object.entries(p.softwareVersions).map(([k, v]) => `${k} = ${v}`).join('; ')}` },
    { id: 'env', label: 'Pinned environment (container digest or lockfile)', present: /container|lockfile:/.test(p.environment) && !/no container/.test(p.environment), note: p.environment },
  ];
  const missing = items.filter((i) => !i.present).map((i) => i.label);
  const status = missing.length === 0 ? 'complete' : items.filter((i) => i.present).length >= 3 ? 'partial' : 'none';
  return { items, status, missing };
}

/** Deterministic in-browser check: re-run with identical inputs and compare result hashes. */
export function verifyRerun(ds: OmicsDataset, run: RunResult): { matched: boolean; hash: string } {
  const again = runDemoAnalysis(ds, run.params);
  return { matched: again.resultHash === run.resultHash, hash: again.resultHash };
}
