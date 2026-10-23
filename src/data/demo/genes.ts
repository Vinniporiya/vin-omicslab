/**
 * Cell-type and gene-program definitions for the SIMULATED demonstration dataset.
 * Canonical marker genes are real gene symbols with textbook cell-type specificity; disease-associated
 * shifts are arbitrary demo effects and carry no biological claim.
 */
export type TypeId = 'CD4T' | 'CD8T' | 'NK' | 'B' | 'Plasma' | 'Myeloid' | 'Fibro' | 'Endo' | 'Epi';
export type TypeMap = Partial<Record<TypeId, number>>;

export interface CellTypeDef { id: TypeId; label: string; short: string; lineage: string; color: string }

export const CELL_TYPES: CellTypeDef[] = [
  { id: 'CD4T', label: 'CD4 T cell', short: 'CD4 T', lineage: 'Lymphoid', color: '#4C9BE8' },
  { id: 'CD8T', label: 'CD8 T cell', short: 'CD8 T', lineage: 'Lymphoid', color: '#2FB5A5' },
  { id: 'NK', label: 'NK cell', short: 'NK', lineage: 'Lymphoid', color: '#7DBB5A' },
  { id: 'B', label: 'B cell', short: 'B', lineage: 'Lymphoid', color: '#E8A23A' },
  { id: 'Plasma', label: 'Plasma cell', short: 'Plasma', lineage: 'Lymphoid', color: '#C77B3D' },
  { id: 'Myeloid', label: 'Monocyte / macrophage', short: 'Myeloid', lineage: 'Myeloid', color: '#E0607E' },
  { id: 'Fibro', label: 'Fibroblast', short: 'Fibro', lineage: 'Stromal', color: '#9B7FD1' },
  { id: 'Endo', label: 'Endothelial cell', short: 'Endo', lineage: 'Stromal', color: '#D6BE36' },
  { id: 'Epi', label: 'Epithelial cell', short: 'Epi', lineage: 'Epithelial', color: '#8C9BA8' },
];
export const TYPE_IDS = CELL_TYPES.map((c) => c.id);

export interface GeneProgram { base: TypeMap; disease?: TypeMap; group: 'marker' | 'signalling' | 'regulator' }
const g = (group: GeneProgram['group'], base: TypeMap, disease?: TypeMap): GeneProgram => ({ group, base, disease });

export const PROGRAMS: Record<string, GeneProgram> = {
  PTPRC: g('marker', { CD4T: 3, CD8T: 3, NK: 2.8, B: 3, Plasma: 1.2, Myeloid: 2.5 }),
  CD3E: g('marker', { CD4T: 3, CD8T: 3.2, NK: 0.8 }),
  CD4: g('marker', { CD4T: 2.6, Myeloid: 0.6 }),
  CD8A: g('marker', { CD8T: 3 }),
  NKG7: g('marker', { NK: 3.5, CD8T: 2 }),
  GNLY: g('marker', { NK: 3.2, CD8T: 0.8 }),
  GZMB: g('marker', { NK: 2.8, CD8T: 2 }),
  MS4A1: g('marker', { B: 3.2 }),
  CD79A: g('marker', { B: 3, Plasma: 1.5 }),
  MZB1: g('marker', { Plasma: 3.8, B: 0.6 }),
  SDC1: g('marker', { Plasma: 2.5 }),
  LYZ: g('marker', { Myeloid: 3.8 }),
  CD68: g('marker', { Myeloid: 3 }),
  CD14: g('marker', { Myeloid: 3 }),
  CSF1R: g('marker', { Myeloid: 2.4 }),
  C1QA: g('marker', { Myeloid: 2.2 }, { Myeloid: 0.9 }),
  COL1A1: g('marker', { Fibro: 3.8 }, { Fibro: 0.8 }),
  DCN: g('marker', { Fibro: 3.6 }),
  PDGFRA: g('marker', { Fibro: 2.6 }),
  PECAM1: g('marker', { Endo: 3.2 }),
  VWF: g('marker', { Endo: 3.4 }),
  EPCAM: g('marker', { Epi: 3.6 }),
  KRT8: g('marker', { Epi: 3.8 }),
  KRT18: g('marker', { Epi: 3.4 }),
  // signalling genes (ligands / receptors)
  IFNG: g('signalling', { CD8T: 1.6, NK: 1.8 }, { CD8T: 1.0 }),
  PDCD1: g('signalling', { CD8T: 1.6, CD4T: 0.8 }, { CD8T: 0.7 }),
  CD274: g('signalling', { Myeloid: 1.0, Epi: 0.8 }, { Epi: 0.8, Myeloid: 0.5 }),
  CD40: g('signalling', { B: 1.8, Myeloid: 1.4 }),
  CD40LG: g('signalling', { CD4T: 1.5 }),
  CXCR4: g('signalling', { CD4T: 1.8, CD8T: 1.8, NK: 1.6, B: 2, Myeloid: 1.3 }),
  CXCL12: g('signalling', { Fibro: 3, Endo: 1.2 }),
  CCL5: g('signalling', { CD8T: 3, NK: 2.8, CD4T: 1 }),
  CCR5: g('signalling', { CD8T: 1.5, Myeloid: 1.2 }),
  TGFB1: g('signalling', { Myeloid: 2, Fibro: 1.6 }),
  TGFBR2: g('signalling', { Fibro: 2.2, CD4T: 1, Endo: 1.2 }),
  CSF1: g('signalling', { Fibro: 1.8, Epi: 1 }),
  VEGFA: g('signalling', { Epi: 2, Myeloid: 1.5, Fibro: 1 }, { Epi: 0.6 }),
  KDR: g('signalling', { Endo: 2.4 }),
  IFNGR1: g('signalling', { Myeloid: 2, Fibro: 1.6, Epi: 1.5 }),
  TNF: g('signalling', { Myeloid: 1.4 }, { Myeloid: 0.6 }),
  TNFRSF1A: g('signalling', { Fibro: 1.6, Endo: 1.6, Epi: 1.4, Myeloid: 1.5, CD4T: 1 }),
  // transcriptional regulators
  SPI1: g('regulator', { Myeloid: 2.2, B: 1 }),
  IRF8: g('regulator', { Myeloid: 1.6, B: 1.4 }),
  CEBPB: g('regulator', { Myeloid: 2.2 }),
  PAX5: g('regulator', { B: 2 }),
  TBX21: g('regulator', { CD8T: 1.8, NK: 2 }),
  EOMES: g('regulator', { CD8T: 1.4, NK: 2 }),
  TCF7: g('regulator', { CD4T: 2, CD8T: 1.4 }),
};
export const PANEL = Object.keys(PROGRAMS);
export const GENE_GROUPS: { id: GeneProgram['group']; label: string }[] = [
  { id: 'marker', label: 'Cell-type markers' },
  { id: 'signalling', label: 'Ligands and receptors' },
  { id: 'regulator', label: 'Transcriptional regulators' },
];

export interface LRPair { ligand: string; receptor: string; label: string }
/** Ligand-receptor pairs from textbook biology; scores computed on simulated expression only. */
export const LR_PAIRS: LRPair[] = [
  { ligand: 'CXCL12', receptor: 'CXCR4', label: 'CXCL12 to CXCR4' },
  { ligand: 'CD40LG', receptor: 'CD40', label: 'CD40LG to CD40' },
  { ligand: 'IFNG', receptor: 'IFNGR1', label: 'IFNG to IFNGR1' },
  { ligand: 'TGFB1', receptor: 'TGFBR2', label: 'TGFB1 to TGFBR2' },
  { ligand: 'CSF1', receptor: 'CSF1R', label: 'CSF1 to CSF1R' },
  { ligand: 'VEGFA', receptor: 'KDR', label: 'VEGFA to KDR' },
  { ligand: 'CCL5', receptor: 'CCR5', label: 'CCL5 to CCR5' },
  { ligand: 'CD274', receptor: 'PDCD1', label: 'CD274 (PD-L1) to PDCD1 (PD-1)' },
  { ligand: 'TNF', receptor: 'TNFRSF1A', label: 'TNF to TNFRSF1A' },
];

export interface Regulon { tf: string; targets: { gene: string; sign: 1 | -1 }[] }
/** Hand-specified, illustrative regulons. NOT inferred from data; SCENIC+ style inference replaces this in Phase 2. */
export const REGULONS: Regulon[] = [
  { tf: 'SPI1', targets: ['LYZ', 'CD68', 'CSF1R', 'CD14', 'C1QA'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'CEBPB', targets: ['LYZ', 'TNF', 'CD14', 'TGFB1'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'IRF8', targets: ['CD68', 'CD40', 'C1QA', 'MS4A1'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'PAX5', targets: ['MS4A1', 'CD79A', 'CD40'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'TBX21', targets: ['IFNG', 'GZMB', 'NKG7', 'CCL5'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'EOMES', targets: ['GZMB', 'NKG7', 'GNLY', 'PDCD1'].map((gene) => ({ gene, sign: 1 as const })) },
  { tf: 'TCF7', targets: [{ gene: 'CD3E', sign: 1 as const }, { gene: 'CXCR4', sign: 1 as const }, { gene: 'GZMB', sign: -1 as const }] },
];
