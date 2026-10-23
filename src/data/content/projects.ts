import type { ContentStatus } from '../schema';

export interface Field { text?: string; status: ContentStatus }
const draft = (text: string): Field => ({ text, status: 'draft' });
const todo = (): Field => ({ status: 'placeholder' });

export interface ProjectRecord {
  slug: string; title: string; domainIds: string[]; oneLine: string;
  explorerView?: string; methodSlugs: string[];
  question: Field; data: Field; challenge: Field; method: Field; workflow: Field; result: Field;
  interpretation: Field; limitations: Field; evidence: Field; reproducibility: Field; publication: Field; code: Field;
}

/**
 * Flagship research records. Titles come from the founder's brief. "Draft" text is a neutral framing of the question and
 * the general computational challenge; it contains no result. Every other field is a placeholder until the author supplies it.
 * TODO(content): replace placeholders with author-verified text, datasets, figures, DOIs and repository links.
 */
export const PROJECTS: ProjectRecord[] = [
  {
    slug: 'hypertension-single-cell-atlas', title: 'Hypertension single-cell atlas', domainIds: ['single-cell', 'transcriptomics'],
    oneLine: 'A single-cell view of how cell types and cell states differ in hypertension.', explorerView: 'landscape',
    methodSlugs: ['single-cell-qc', 'cell-type-annotation', 'pseudobulk-de'],
    question: draft('Which cell types and cell states differ in hypertension, and which gene programs change within them?'),
    data: todo(),
    challenge: draft('Comparing conditions across donors while keeping the donor as the unit of replication, and harmonising cell-type annotation across samples.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
  {
    slug: 'snrna-snatac-multiome', title: 'snRNA-seq and snATAC-seq multi-omics', domainIds: ['multi-omics', 'single-cell'],
    oneLine: 'Expression and chromatin accessibility read together to define regulatory programs.', explorerView: 'multiomics',
    methodSlugs: ['multiome-integration', 'gene-regulatory-networks'],
    question: draft('How do chromatin accessibility and gene expression together define the regulatory programs that change with disease?'),
    data: todo(),
    challenge: draft('Linking accessible regions to genes and transcription factors across two modalities, when accessibility data are sparse.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
  {
    slug: 'spatial-pan-cancer-immune-repertoire', title: 'Spatial pan-cancer immune repertoire atlas', domainIds: ['spatial', 'immunology', 'cancer'],
    oneLine: 'Where immune clones sit in tumour tissue, compared across cancers.', explorerView: 'spatial',
    methodSlugs: ['spatial-transcriptomics', 'tcr-repertoire', 'bcr-repertoire'],
    question: draft('How are immune clones organised within tumour tissue, and does that organisation differ across cancer types?'),
    data: todo(),
    challenge: draft('Combining spatial position with receptor sequence across sections and cancer types, when position and clone identity are measured at different resolutions.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
  {
    slug: 'als-ftd-transcriptomics-splicing', title: 'ALS/FTD transcriptomic and splicing biology', domainIds: ['transcriptomics'],
    oneLine: 'Transcript-level and splicing differences in ALS and FTD.', explorerView: 'differential',
    methodSlugs: ['pseudobulk-de', 'pathway-analysis'],
    question: draft('Which transcripts and splicing events differ in ALS and FTD tissue, and in which cell types?'),
    data: todo(),
    challenge: draft('Detecting splicing differences reliably, and separating disease effects from RNA quality and cell-type composition.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
  {
    slug: 'computational-peptide-drug-design', title: 'Computational peptide and drug design', domainIds: ['therapeutic'],
    oneLine: 'Sequence, structure and docking analysis for candidate peptides and molecules.',
    methodSlugs: ['molecular-docking'],
    question: draft('Which peptide or small-molecule candidates are predicted to bind a target of interest, and how confident is the prediction?'),
    data: todo(),
    challenge: draft('Docking scores are approximate, so candidates need to be ranked with uncertainty and validated experimentally.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
  {
    slug: 'machine-learning-biomarker-prediction', title: 'Machine-learning biomarker prediction', domainIds: ['ai', 'cancer'],
    oneLine: 'Predictive models from molecular features, tested on data they have not seen.', explorerView: 'differential',
    methodSlugs: ['machine-learning', 'biomarker-discovery'],
    question: draft('Which measurable features predict a biological or clinical outcome, and does the prediction hold in independent data?'),
    data: todo(),
    challenge: draft('Avoiding information leakage and overfitting when samples are few and features are many.'),
    method: todo(), workflow: todo(), result: todo(), interpretation: todo(), limitations: todo(), evidence: todo(), reproducibility: todo(), publication: todo(), code: todo(),
  },
];

export const PROJECT_FIELDS: { key: keyof Omit<ProjectRecord, 'slug' | 'title' | 'domainIds' | 'oneLine' | 'explorerView' | 'methodSlugs'>; label: string; prompt: string }[] = [
  { key: 'question', label: 'Biological question', prompt: 'What biological problem was being addressed?' },
  { key: 'data', label: 'Data', prompt: 'What data were available? Cohort, assay, size, accession.' },
  { key: 'challenge', label: 'Computational challenge', prompt: 'What made the analysis hard?' },
  { key: 'method', label: 'Method', prompt: 'What was developed or applied, and why?' },
  { key: 'workflow', label: 'Workflow', prompt: 'The steps from raw data to result.' },
  { key: 'result', label: 'Result', prompt: 'What was found, with effect sizes and statistics.' },
  { key: 'interpretation', label: 'Biological interpretation', prompt: 'What the result means, kept separate from the result.' },
  { key: 'limitations', label: 'Limitations', prompt: 'What the analysis cannot show.' },
  { key: 'evidence', label: 'Evidence', prompt: 'Figures, tables and statistics that support the conclusion.' },
  { key: 'reproducibility', label: 'Reproducibility', prompt: 'Environment, versions and workflow that reproduce it.' },
  { key: 'publication', label: 'Publication', prompt: 'Paper or preprint, with DOI.' },
  { key: 'code', label: 'Code', prompt: 'Repository and release.' },
];
