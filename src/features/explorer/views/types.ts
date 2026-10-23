import type { OmicsDataset } from '../../../data/dataset';
export interface ViewProps { ds: OmicsDataset; embedded?: boolean; query?: URLSearchParams }
export const RUN = (ds: OmicsDataset, view: string): string => `explorer-${view}@${ds.meta.fingerprint}`;
