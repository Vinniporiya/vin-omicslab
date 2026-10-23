/**
 * Vin-OmicsLab scientific data model (client-side view of the platform entities).
 * The persistent equivalents live in docs/ARCHITECTURE.md (section F, Postgres DDL).
 * Everything the UI renders about a result should be traceable through these types:
 *   ScientificClaim -> EvidenceSource -> AnalysisRun -> (Dataset, Workflow, CodeArtifact, ProvenanceRecord)
 */

export type ProvenanceKind = 'simulated' | 'real';
export type ContentStatus = 'placeholder' | 'draft' | 'verified';

export interface User { id: string; name: string; orcid?: string; role: 'owner' | 'collaborator' | 'viewer' }
export interface Project { id: string; slug: string; title: string; domainIds: string[]; status: ContentStatus }
export interface Tissue { id: string; label: string; ontologyId?: string }
export interface Disease { id: string; label: string; ontologyId?: string }
export interface CellType { id: string; label: string; ontologyId?: string; lineage: string }
export interface Gene { symbol: string; ensemblId?: string; species: 'human' | 'mouse' }

export interface Dataset {
  id: string; title: string; kind: ProvenanceKind; description: string;
  modality: string[]; species: string; nCells?: number; nSamples: number;
  source: string; licence?: string; accession?: string; seed?: number; generatorVersion?: string;
}
export interface Sample { id: string; datasetId: string; donorId: string; condition: string; tissueId?: string; batch?: string }
export interface Experiment { id: string; projectId: string; datasetIds: string[]; design: string; replicateUnit: 'donor' | 'sample' | 'cell' }

export interface Workflow { id: string; engine: 'nextflow' | 'snakemake' | 'in-browser-demo'; definition: string; rules: string[] }
export interface CodeArtifact { id: string; language: 'R' | 'Python' | 'Snakemake' | 'YAML'; filename: string; content: string; executed: boolean }
export interface ProvenanceRecord {
  runId: string; createdAt: string; datasetId: string; datasetFingerprint: string;
  parameters: Record<string, string | number | boolean>;
  softwareVersions: Record<string, string>; environment: string;
  codeExecuted: boolean; logsCaptured: boolean; inputChecksums: boolean;
}
export interface AnalysisRun { id: string; analysisId: string; status: 'queued' | 'running' | 'complete' | 'failed'; provenance: ProvenanceRecord }
export interface Result { id: string; runId: string; kind: string; label: string; resultHash: string }
export interface Figure { id: string; resultId: string; caption: string }

export type EvidenceLevel = 'observed' | 'statistical' | 'literature' | 'inference' | 'hypothesis';
export interface EvidenceSource {
  id: string; type: 'analysis-run' | 'publication' | 'preprint' | 'database' | 'model-output' | 'user-result';
  citation?: string; doi?: string; pmid?: string; runId?: string; verified: boolean;
}
export interface ScientificClaim {
  id: string; statement: string;
  layers: Partial<Record<EvidenceLevel, { text: string; sourceIds?: string[] }>>;
  simulated: boolean;
}

export interface Publication {
  id: string; title: string; authors: string[]; venue: string; year: number; doi?: string; preprint?: string;
  researchQuestion: string; datasetIds: string[]; computationalContribution: string;
  figureIds: string[]; codeUrl?: string; explorerView?: string; relatedProjectSlugs: string[]; status: ContentStatus;
}
export interface Method { slug: string; title: string; tags: string[] }
