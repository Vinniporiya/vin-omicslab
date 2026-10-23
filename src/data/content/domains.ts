export type GlyphKind = 'cells' | 'spatial' | 'layers' | 'repertoire' | 'tumour' | 'volcano' | 'boundary' | 'molecule';
export interface Domain { id: string; title: string; blurb: string; glyph: GlyphKind; explorerView?: string }

export const DOMAINS: Domain[] = [
  { id: 'single-cell', title: 'Single-cell biology', blurb: 'Cell states, composition and regulation resolved one cell at a time.', glyph: 'cells', explorerView: 'landscape' },
  { id: 'spatial', title: 'Spatial biology', blurb: 'Where cells sit, and who their neighbours are.', glyph: 'spatial', explorerView: 'spatial' },
  { id: 'multi-omics', title: 'Multi-omics', blurb: 'Several layers of one system read together: expression, chromatin, protein.', glyph: 'layers', explorerView: 'multiomics' },
  { id: 'immunology', title: 'Computational immunology', blurb: 'T-cell and B-cell repertoires, clonality and immune states.', glyph: 'repertoire', explorerView: 'repertoire' },
  { id: 'cancer', title: 'Cancer biology', blurb: 'Tumour microenvironment, heterogeneity and biomarkers.', glyph: 'tumour', explorerView: 'communication' },
  { id: 'transcriptomics', title: 'Transcriptomics', blurb: 'Expression, splicing and isoforms across conditions.', glyph: 'volcano', explorerView: 'differential' },
  { id: 'ai', title: 'AI for biology', blurb: 'Prediction and representation learning, validated before it is believed.', glyph: 'boundary' },
  { id: 'therapeutic', title: 'Therapeutic bioinformatics', blurb: 'Sequence, structure and docking for target and peptide design.', glyph: 'molecule' },
];
