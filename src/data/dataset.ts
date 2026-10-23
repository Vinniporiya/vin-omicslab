import type { Dataset } from './schema';
import type { TypeId } from './demo/genes';

export type Condition = 'Control' | 'Disease';
export interface DonorDef { id: string; condition: Condition }

export interface LandscapeCells {
  n: number;
  /** RNA embedding (UMAP-like) */
  x: Float32Array; y: Float32Array;
  /** second modality embedding (ATAC-like) */
  ax: Float32Array; ay: Float32Array;
  type: Uint8Array;   // index into cellTypes
  donor: Uint8Array;  // index into donors
  expr: Record<string, Float32Array>; // panel gene -> log-normalised-like expression
}

export interface PseudobulkTable {
  genes: string[];
  /** counts[typeId][geneIdx][donorIdx] */
  counts: Record<TypeId, number[][]>;
  /** cells[typeIdx][donorIdx] */
  cellCounts: number[][];
  geneSets: { id: string; name: string; members: string[] }[];
}

export interface SpatialSection {
  n: number; width: number; height: number;
  x: Float32Array; y: Float32Array;
  type: Uint8Array; region: Uint8Array; clone: Int16Array; // clone: -1 none, 0..2 top clones, 3 other
  regionNames: string[]; cloneNames: string[];
  expr: Record<string, Float32Array>;
}

export interface RepertoireTable { TCR: Record<string, number[]>; BCR: Record<string, number[]> }

export interface OmicsDataset {
  meta: Dataset & { kind: 'simulated' | 'real'; fingerprint: string };
  cellTypes: { id: TypeId; label: string; short: string; lineage: string; color: string }[];
  donors: DonorDef[];
  panel: string[];
  landscape: LandscapeCells;
  pseudobulk: PseudobulkTable;
  spatial: SpatialSection;
  repertoire: RepertoireTable;
}
