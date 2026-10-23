/**
 * PROTOTYPE planner: keyword routing to reviewed plan templates. There is no language model behind this,
 * and it never invents data or results. A question it cannot route yields clarifying prompts, not a guess.
 * TODO(phase-4): replace routing with an LLM planner that is constrained to this same PlanSection schema,
 * grounded in dataset inspection, and reviewed by the analytical QC layer (docs/ARCHITECTURE.md section H).
 */
export type SectionKey = 'question' | 'data' | 'design' | 'analysis' | 'statistics' | 'qc' | 'workflow' | 'outputs' | 'limitations';
export type IntentId = 'sc_de_pathway' | 'composition' | 'spatial_immune' | 'repertoire' | 'multiome_grn' | 'biomarker_ml' | 'splicing';

export interface PlanSection { key: SectionKey; title: string; items: string[]; why: string; edited?: boolean }
export interface AnalysisPlan {
  id: string; intent: IntentId; intentLabel: string; userQuestion: string; createdAt: string;
  sections: PlanSection[]; executableInDemo: boolean; modified: boolean;
}
export type PlanOutcome = { kind: 'plan'; plan: AnalysisPlan } | { kind: 'clarify'; prompts: string[] };

export const SECTION_TITLES: Record<SectionKey, string> = {
  question: 'Biological question', data: 'Data requirements', design: 'Experimental design', analysis: 'Analysis plan',
  statistics: 'Statistical model', qc: 'Quality control', workflow: 'Workflow', outputs: 'Expected outputs', limitations: 'Limitations',
};
const KEYS = Object.keys(SECTION_TITLES) as SectionKey[];

interface Template { label: string; executable: boolean; match: RegExp; body: Record<Exclude<SectionKey, 'question'>, { items: string[]; why: string }>; comparison: string }

const WHY: Record<SectionKey, string> = {
  question: 'A precise, testable question decides which comparison, data and model are appropriate.',
  data: 'Analyses fail more often from missing metadata or too few replicates than from method choice.',
  design: 'The unit of replication and the confounding structure are fixed by the design, not by the software.',
  analysis: 'The order of steps matters: each step changes the data the next one sees.',
  statistics: 'The model states what is being tested, against which null, and how errors are controlled.',
  qc: 'Quality control is where problems are found before they become conclusions.',
  workflow: 'A declared workflow with pinned software is what makes the analysis repeatable.',
  outputs: 'Listing outputs in advance keeps the analysis from drifting toward whatever looks interesting.',
  limitations: 'Stating limits before results are seen keeps interpretation honest.',
};

const TEMPLATES: Record<IntentId, Template> = {
  sc_de_pathway: {
    label: 'Cell-type-specific differential expression and pathways', executable: true,
    match: /pathway|differential expression|\bDE\b|cell[- ]type[- ]specific|altered by|disease.*(gene|expression)/i,
    comparison: 'Disease versus control within each annotated cell type, summarised as pathway-level programs.',
    body: {
      data: { why: WHY.data, items: ['Raw count matrices per sample (scRNA-seq or snRNA-seq), not only normalised objects', 'Sample metadata: donor, condition, batch or run, and covariates such as sex and age', 'At least 3, ideally 5 or more, independent donors per condition', 'A cell-type reference or marker list for annotation'] },
      design: { why: WHY.design, items: ['Unit of replication is the donor: cells from one donor are not independent', 'Condition varies between donors; check that batch is not confounded with condition', 'Fix the covariates to model before looking at results'] },
      analysis: { why: WHY.analysis, items: ['Per-sample QC (genes detected, UMI counts, mitochondrial fraction); remove empty droplets', 'Ambient RNA and doublet assessment, then normalisation', 'Integrate only if batch structure requires it, and check that biology is retained', 'Clustering and cell-type annotation, validated against marker genes', 'Pseudobulk aggregation per cell type and donor, differential expression, then pathway analysis'] },
      statistics: { why: WHY.statistics, items: ['Per cell type: counts ~ condition + batch (+ covariates) with edgeR, DESeq2 or limma-voom on pseudobulk profiles', 'Exclude donor and cell-type combinations below a minimum cell count', 'Benjamini-Hochberg FDR within each cell type; report effect sizes with intervals', 'Pathway step: over-representation or GSEA against a named gene-set database and version'] },
      qc: { why: WHY.qc, items: ['Table of cells per donor per cell type; flag rare populations', 'PCA of pseudobulk profiles to spot outlier donors', 'P-value histogram per cell type to check calibration', 'Independent review of annotation and model design before interpretation'] },
      workflow: { why: WHY.workflow, items: ['Snakemake or Nextflow: qc, doublets, normalise, integrate, cluster, annotate, pseudobulk, DE, pathways, report', 'Pinned containers for R and Python steps', 'All parameters in one config file stored with the run'] },
      outputs: { why: WHY.outputs, items: ['Annotated single-cell object and QC report', 'Per-cell-type DE tables with effect sizes and adjusted P values', 'Pathway tables and figures', 'Code, environment and provenance record'] },
      limitations: { why: WHY.limitations, items: ['Findings depend on annotation quality', 'Rare cell types have low power at small donor counts', 'Pathway databases are incomplete and biased toward well-studied genes', 'Association in tissue does not establish mechanism'] },
    },
  },
  composition: {
    label: 'Differential cell-type abundance', executable: true,
    match: /abundance|composition|proportion|expan|deplet|frequenc/i,
    comparison: 'Change in the proportion of each cell population between conditions.',
    body: {
      data: { why: WHY.data, items: ['Cell-type labels per cell with donor and condition metadata', 'Total cells captured per donor (proportions depend on capture and dissociation)', 'At least 4 donors per condition for a stable estimate'] },
      design: { why: WHY.design, items: ['Donor is the replicate; proportions sum to 1, so one change moves all others', 'Decide whether the question is about coarse populations or fine neighbourhoods'] },
      analysis: { why: WHY.analysis, items: ['Verify annotation resolution and remove doublet-driven populations', 'Count cells per donor and type', 'Model compositional change (scCODA, Milo or logit-based models)'] },
      statistics: { why: WHY.statistics, items: ['Donor-level model on counts or logit proportions with condition and batch terms', 'Correct across cell types (BH) or use a credible-effect criterion for Bayesian models', 'Report effect size with an interval, not only a P value'] },
      qc: { why: WHY.qc, items: ['Per-donor total cell numbers and capture batch', 'Sensitivity check: drop one donor at a time', 'Compare with an orthogonal measure (imaging, flow cytometry) if available'] },
      workflow: { why: WHY.workflow, items: ['Declared rules from annotated object to composition table, model, figures and report'] },
      outputs: { why: WHY.outputs, items: ['Per-donor composition table', 'Effect sizes with adjusted P values', 'Composition figure and provenance record'] },
      limitations: { why: WHY.limitations, items: ['Tissue dissociation biases which cells are captured', 'Compositional data cannot separate expansion of one type from loss of others', 'Small donor numbers give wide intervals'] },
    },
  },
  spatial_immune: {
    label: 'Spatial immune architecture', executable: false,
    match: /spatial|tissue|neighbo|niche|architecture|infiltrat/i,
    comparison: 'How immune populations are positioned relative to tumour, stroma and each other.',
    body: {
      data: { why: WHY.data, items: ['Spatial transcriptomics or imaging data with coordinates and tissue images', 'Matched single-cell reference for deconvolution when spots contain several cells', 'Sample metadata, tissue region annotations if available'] },
      design: { why: WHY.design, items: ['Sections from the same donor are not independent replicates', 'Decide the spatial scale of the question (cell contacts, niches, regions)'] },
      analysis: { why: WHY.analysis, items: ['Spatial QC and tissue detection', 'Cell-type mapping or deconvolution against a reference', 'Spatial domains and neighbourhood enrichment', 'Ligand-receptor analysis restricted to neighbouring cells'] },
      statistics: { why: WHY.statistics, items: ['Permutation nulls that keep positions fixed and shuffle labels', 'Donor-level aggregation before comparing conditions', 'FDR control across cell-type pairs'] },
      qc: { why: WHY.qc, items: ['Spot or cell quality by section', 'Deconvolution validation against marker genes', 'Edge and tissue-fold artefacts'] },
      workflow: { why: WHY.workflow, items: ['Squidpy or Seurat spatial workflow declared in Snakemake or Nextflow, with pinned containers'] },
      outputs: { why: WHY.outputs, items: ['Annotated spatial object', 'Neighbourhood enrichment tables and maps', 'Provenance record'] },
      limitations: { why: WHY.limitations, items: ['Resolution limits what can be called a contact', 'Two-dimensional sections sample three-dimensional tissue', 'Deconvolution is an estimate, not a measurement'] },
    },
  },
  repertoire: {
    label: 'Immune repertoire and clonality', executable: false,
    match: /tcr|bcr|repertoire|clon|antigen|receptor sequence/i,
    comparison: 'Diversity, expansion and sharing of T-cell or B-cell clones between conditions or compartments.',
    body: {
      data: { why: WHY.data, items: ['Paired VDJ and gene-expression libraries, or bulk repertoire sequencing', 'Donor, condition and tissue metadata', 'Read depth and cell numbers per sample for diversity normalisation'] },
      design: { why: WHY.design, items: ['Donor is the replicate', 'Diversity estimates depend on the number of sampled cells: fix a rarefaction or downsampling rule in advance'] },
      analysis: { why: WHY.analysis, items: ['Contig annotation and clonotype definition (chain pairing, CDR3 identity rule)', 'Clone size distributions and diversity indices', 'Clone overlap between samples and links to cell states'] },
      statistics: { why: WHY.statistics, items: ['Donor-level comparison of diversity metrics', 'Report metric, sampling depth and correction method'] },
      qc: { why: WHY.qc, items: ['Fraction of cells with productive paired chains', 'Chimeric and ambient contigs', 'Depth sensitivity of diversity estimates'] },
      workflow: { why: WHY.workflow, items: ['Scirpy or Immcantation steps declared in a workflow with pinned containers'] },
      outputs: { why: WHY.outputs, items: ['Clonotype table', 'Diversity and expansion figures', 'Provenance record'] },
      limitations: { why: WHY.limitations, items: ['Clone frequency in a sample is not frequency in the body', 'Antigen specificity is inferred, not measured, unless tested'] },
    },
  },
  multiome_grn: {
    label: 'Multi-omic regulatory programs', executable: false,
    match: /atac|multiome|regulat|chromatin|transcription factor|\bTF\b|enhancer|grn|epigen/i,
    comparison: 'Which transcription factors and regulatory elements drive cell-state or disease-associated expression programs.',
    body: {
      data: { why: WHY.data, items: ['Joint or matched snRNA-seq and snATAC-seq with fragment files', 'Donor and condition metadata; genome build', 'Motif database and its version'] },
      design: { why: WHY.design, items: ['Donor is the replicate for any condition comparison', 'Decide whether the aim is cell-state description or condition-associated change'] },
      analysis: { why: WHY.analysis, items: ['Modality-specific QC (TSS enrichment, fragment size, UMI counts)', 'Joint embedding and cell-type annotation', 'Peak calling per cell type, motif activity, peak-gene links', 'Regulon or enhancer-driven network inference'] },
      statistics: { why: WHY.statistics, items: ['Pseudobulk differential accessibility and expression with donors as replicates', 'FDR control per modality', 'Network edges reported with the evidence that supports each'] },
      qc: { why: WHY.qc, items: ['Per-modality QC thresholds recorded', 'Peak-calling reproducibility across donors', 'Motif enrichment against a matched background'] },
      workflow: { why: WHY.workflow, items: ['ArchR or Signac plus SCENIC+ style steps declared in a workflow with pinned containers'] },
      outputs: { why: WHY.outputs, items: ['Joint object', 'Differential accessibility and expression tables', 'Regulatory network with edge evidence', 'Provenance record'] },
      limitations: { why: WHY.limitations, items: ['Accessibility does not equal regulatory function', 'Motif-based TF assignment is ambiguous within TF families', 'Network edges are hypotheses until perturbed'] },
    },
  },
  biomarker_ml: {
    label: 'Biomarker discovery and prediction', executable: false,
    match: /biomarker|responder|predict|classif|prognos|signature|machine learning|\bML\b/i,
    comparison: 'Which measurable features distinguish groups, and how well a model built on them generalises.',
    body: {
      data: { why: WHY.data, items: ['Feature matrix with outcome labels and clinical covariates', 'An independent cohort or a pre-specified hold-out set', 'Definition of the outcome and time point'] },
      design: { why: WHY.design, items: ['Split by patient, never by sample or cell, before any feature selection', 'Pre-specify the performance metric and the decision it supports'] },
      analysis: { why: WHY.analysis, items: ['Feature filtering inside the cross-validation loop', 'Penalised regression or tree-based models with a simple baseline', 'Calibration and decision-curve assessment'] },
      statistics: { why: WHY.statistics, items: ['Nested cross-validation for tuning and error estimation', 'Confidence intervals on performance', 'Permutation test against label shuffling'] },
      qc: { why: WHY.qc, items: ['Leakage audit: confirm no information from test samples reaches training', 'Batch and site effects as confounders of the label', 'Stability of selected features across resamples'] },
      workflow: { why: WHY.workflow, items: ['Scripted pipeline with fixed seeds, stored splits and pinned environment'] },
      outputs: { why: WHY.outputs, items: ['Model and feature list', 'Performance with intervals on held-out and independent data', 'Provenance record including splits and seeds'] },
      limitations: { why: WHY.limitations, items: ['Predictive performance is not causal evidence', 'Small cohorts overestimate performance', 'Performance may not transfer across sites or assays'] },
    },
  },
  splicing: {
    label: 'Alternative splicing and isoform analysis', executable: false,
    match: /splic|isoform|transcript[- ]level|long[- ]read|exon/i,
    comparison: 'Differential splicing or isoform usage between conditions, and the cell types or tissues where it occurs.',
    body: {
      data: { why: WHY.data, items: ['Short-read RNA-seq with sufficient depth for junction detection, or long-read data for full-length isoforms', 'Sample metadata with donor, condition, tissue and RNA quality', 'Reference annotation and genome build'] },
      design: { why: WHY.design, items: ['Donor is the replicate', 'Match tissue and RNA quality between groups: degradation changes apparent isoform usage'] },
      analysis: { why: WHY.analysis, items: ['Alignment or long-read isoform discovery and quantification', 'Differential junction or isoform usage testing', 'Annotation of candidate events and predicted functional consequence'] },
      statistics: { why: WHY.statistics, items: ['Count-based models of junction or isoform usage with donor as replicate', 'FDR control across events; report effect size as change in percent spliced in or isoform fraction'] },
      qc: { why: WHY.qc, items: ['RNA integrity and 3-prime bias per sample', 'Junction coverage thresholds', 'Orthogonal validation plan for top events (RT-PCR, long-read)'] },
      workflow: { why: WHY.workflow, items: ['Nextflow or Snakemake pipeline with pinned aligner, quantifier and annotation versions'] },
      outputs: { why: WHY.outputs, items: ['Event tables with effect sizes and adjusted P values', 'Sashimi-style figures', 'Provenance record'] },
      limitations: { why: WHY.limitations, items: ['Short reads cannot resolve full isoforms', 'Annotation incompleteness causes missed and mis-assigned events', 'Statistical detection does not imply functional consequence'] },
    },
  },
};

const ORDER: IntentId[] = ['repertoire', 'spatial_immune', 'multiome_grn', 'biomarker_ml', 'splicing', 'composition', 'sc_de_pathway'];

export const EXAMPLE_QUESTIONS = [
  'I want to identify cell-type-specific pathways altered by disease.',
  'Which immune cell populations expand in disease compared with control?',
  'How are T-cell clones organised within the tumour microenvironment?',
  'Which transcription factors drive the regulatory programs that change with disease?',
  'Which biomarkers distinguish responders from non-responders?',
];

export const CLARIFYING_PROMPTS = [
  'What data do you have or expect to have (assay, number of donors, conditions)?',
  'What comparison do you want to make (for example disease versus control, or before versus after treatment)?',
  'What would count as an answer: genes, pathways, cell populations, regulators, or a predictive model?',
];

export function buildPlan(question: string, now: Date = new Date()): PlanOutcome {
  const q = question.trim();
  if (q.length < 12) return { kind: 'clarify', prompts: CLARIFYING_PROMPTS };
  const intent = ORDER.find((id) => TEMPLATES[id].match.test(q));
  if (!intent) return { kind: 'clarify', prompts: CLARIFYING_PROMPTS };
  const t = TEMPLATES[intent];
  const sections: PlanSection[] = KEYS.map((key) =>
    key === 'question'
      ? { key, title: SECTION_TITLES.question, why: WHY.question, items: [`Your question, as written: "${q}"`, `Comparison this plan would test: ${t.comparison}`, 'Decision the answer would inform: to be stated by you before approval'] }
      : { key, title: SECTION_TITLES[key], why: t.body[key].why, items: [...t.body[key].items] },
  );
  return { kind: 'plan', plan: { id: `plan-${now.getTime().toString(36)}`, intent, intentLabel: t.label, userQuestion: q, createdAt: now.toISOString(), sections, executableInDemo: t.executable, modified: false } };
}
