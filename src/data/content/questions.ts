export interface ScientificQuestion { id: string; question: string; view: string; approach: string; caution: string }

/** Each question is paired with the explorer view that would begin to answer it, on SIMULATED data. */
export const QUESTIONS: ScientificQuestion[] = [
  { id: 'q-states', question: 'How does disease alter cellular states?', view: 'landscape', approach: 'Embed cells, annotate populations, then compare conditions within each population.', caution: 'Shifts in an embedding are a description. They become a result only after a donor-level test.' },
  { id: 'q-immune', question: 'Which immune populations drive tumour progression?', view: 'composition', approach: 'Estimate cell-type abundance per donor and test change between conditions.', caution: 'Abundance change does not show that a population drives progression.' },
  { id: 'q-regulation', question: 'How do regulatory programs change across disease?', view: 'regulation', approach: 'Score transcription-factor regulons per cell type, then compare conditions.', caution: 'Regulon activity is an inference from expression, not a measurement of protein activity.' },
  { id: 'q-biomarker', question: 'Which biomarkers distinguish responders from non-responders?', view: 'differential', approach: 'Start from differential features; a predictive claim needs held-out validation.', caution: 'A significant difference is not a validated biomarker.' },
  { id: 'q-clones', question: 'How are immune clones organised within spatial tissue?', view: 'spatial', approach: 'Map clones to tissue coordinates and test neighbourhood structure against a permutation null.', caution: 'Sections from one donor are not independent replicates.' },
  { id: 'q-multiomics', question: 'How can multi-omics reveal mechanisms invisible to a single assay?', view: 'multiomics', approach: 'Compare how well each modality, and their combination, separates cell populations.', caution: 'Better separation is not the same as better biology.' },
];
