import type { ComponentType } from 'react';
import { Landscape } from './views/Landscape';
import { Composition } from './views/Composition';
import { Differential } from './views/Differential';
import { HeatmapView } from './views/HeatmapView';
import { Pathways } from './views/Pathways';
import { Spatial } from './views/Spatial';
import { Communication } from './views/Communication';
import { Regulation } from './views/Regulation';
import { Repertoire } from './views/Repertoire';
import { Multiomics } from './views/Multiomics';
import type { ViewProps } from './views/types';

export interface ViewDef { key: string; title: string; sub: string; Component: ComponentType<ViewProps> }
export const VIEWS: ViewDef[] = [
  { key: 'landscape', title: 'Cell landscape', sub: 'UMAP, gene expression', Component: Landscape },
  { key: 'composition', title: 'Composition', sub: 'Cell types, differential abundance', Component: Composition },
  { key: 'differential', title: 'Differential expression', sub: 'Volcano plot, results', Component: Differential },
  { key: 'heatmap', title: 'Heatmap and dot plot', sub: 'Expression by cell type', Component: HeatmapView },
  { key: 'pathways', title: 'Pathway enrichment', sub: 'Over-representation', Component: Pathways },
  { key: 'spatial', title: 'Spatial map', sub: 'Tissue layout, neighbourhoods', Component: Spatial },
  { key: 'communication', title: 'Cell-cell communication', sub: 'Ligand-receptor scores', Component: Communication },
  { key: 'regulation', title: 'Regulatory network', sub: 'Regulons, activity', Component: Regulation },
  { key: 'repertoire', title: 'TCR and BCR repertoire', sub: 'Clonality, diversity', Component: Repertoire },
  { key: 'multiomics', title: 'Multi-omics integration', sub: 'RNA, ATAC, joint', Component: Multiomics },
];
export const VIEW_KEYS = VIEWS.map((v) => v.key);
