import type { OmicsDataset } from './dataset';
import { generateDemoDataset } from './demo/generate';

/**
 * Data access boundary. Every view receives an OmicsDataset from a provider and never imports the generator.
 * To use real data, implement DatasetProvider (e.g. fetch derived tables from object storage) and register it.
 * TODO(real-data): RemoteDatasetProvider -> GET /datasets/{id}/tables (see docs/ARCHITECTURE.md section G).
 */
export interface DatasetProvider { id: string; label: string; kind: 'simulated' | 'real'; load(): Promise<OmicsDataset> }

let demoCache: OmicsDataset | null = null;
export const demoProvider: DatasetProvider = {
  id: 'demo', label: 'Simulated demonstration dataset', kind: 'simulated',
  load: async () => (demoCache ??= generateDemoDataset()),
};
export const providers: DatasetProvider[] = [demoProvider];
export const defaultProvider = demoProvider;
