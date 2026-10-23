import type { EvidenceLevel } from '../data/schema';

/**
 * Evidence hierarchy: a design principle enforced in code, not only in copy.
 * The UI renders every level in this fixed order and NEVER fills an empty level automatically.
 */
export interface LevelDef { level: EvidenceLevel; label: string; definition: string; requires: string }
export const EVIDENCE_LEVELS: LevelDef[] = [
  { level: 'observed', label: 'Observed', definition: 'What the data show, stated without interpretation.', requires: 'A value computed from a named dataset.' },
  { level: 'statistical', label: 'Statistically supported', definition: 'A stated test, with its unit of replication and multiple-testing correction.', requires: 'Test name, adjusted P value, run ID.' },
  { level: 'literature', label: 'Literature supported', definition: 'Published or preprint evidence that a person or verified database record has linked.', requires: 'Citation with DOI or PMID, marked verified.' },
  { level: 'inference', label: 'Model inference', definition: 'An interpretation derived by a method or a model. Never presented as published evidence.', requires: 'At least one observed or statistical layer.' },
  { level: 'hypothesis', label: 'Hypothesis', definition: 'A testable proposal that goes beyond the evidence in hand.', requires: 'An observed or inferred basis, and a proposed test.' },
];

export interface EvidenceLayer {
  text: string;
  runId?: string; test?: string; adjP?: number;            // statistical
  citation?: string; doi?: string; pmid?: string; verified?: boolean; // literature
}
export interface ClaimStack { statement: string; simulated: boolean; layers: Partial<Record<EvidenceLevel, EvidenceLayer>> }

/** Returns human-readable rule violations; an empty array means the claim is structurally valid. */
export function validateClaim(c: ClaimStack): string[] {
  const L = c.layers, issues: string[] = [];
  if (L.statistical && (!L.statistical.test || L.statistical.adjP === undefined || !L.statistical.runId)) issues.push('Statistical layer needs a test name, an adjusted P value and a run ID.');
  if (L.literature && !((L.literature.doi || L.literature.pmid) && L.literature.verified)) issues.push('Literature layer needs a verified citation with a DOI or PMID.');
  if (L.literature && c.simulated) issues.push('Literature cannot support a result computed on simulated data.');
  if (L.inference && !(L.observed || L.statistical)) issues.push('Model inference needs an observed or statistical layer beneath it.');
  if (L.hypothesis && !(L.inference || L.observed)) issues.push('A hypothesis needs an observed or inferred basis.');
  return issues;
}
