import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { TypeLegend } from '../../../components/science/TypeLegend';
import { ScatterCanvas } from '../../../viz/ScatterCanvas';
import { embeddings } from '../../../lib/analysis/embedding';
import { fmtNum } from '../../../lib/format';
import type { ClaimStack } from '../../../lib/evidence';
import type { ViewProps } from './types';

export function Multiomics({ ds, embedded }: ViewProps) {
  const L = ds.landscape;
  const [iso, setIso] = useState<number | null>(null);
  const em = useMemo(() => embeddings(ds), [ds]);
  const panels = [
    { key: 'rna', name: 'RNA', e: em.rna, s: em.silhouette.rna, axes: ['RNA 1', 'RNA 2'] as [string, string] },
    { key: 'atac', name: 'ATAC', e: em.atac, s: em.silhouette.atac, axes: ['ATAC 1', 'ATAC 2'] as [string, string] },
    { key: 'joint', name: 'Joint', e: em.joint, s: em.silhouette.joint, axes: ['PC 1', 'PC 2'] as [string, string] },
  ];
  const figure = (
    <>
      <div className="triple">
        {panels.map((p) => (
          <div key={p.key}>
            <div className="panel-title"><strong>{p.name}</strong><span className="muted"> silhouette {fmtNum(p.s, 2)}</span></div>
            <ScatterCanvas x={p.e.x} y={p.e.y} aspect={0.95} radius={1.6} color={(i) => ds.cellTypes[L.type[i]].color} alpha={(i) => (iso !== null && L.type[i] !== iso ? 0.05 : 0.8)}
              axes={p.axes} tooltip={(i) => ds.cellTypes[L.type[i]].label} ariaLabel={`${p.name} embedding of simulated cells`} />
          </div>
        ))}
      </div>
      <TypeLegend ds={ds} isolate={iso} onIsolate={setIso} />
    </>
  );
  const claims: ClaimStack[] = [{
    statement: 'Combining modalities changes how well populations separate', simulated: true,
    layers: {
      observed: { text: `Mean silhouette width by annotation: RNA ${fmtNum(em.silhouette.rna, 2)}, ATAC ${fmtNum(em.silhouette.atac, 2)}, joint (both modalities) ${fmtNum(em.silhouette.joint, 2)}, on ${em.subsample} cells.` },
      inference: { text: 'The modality geometries were set by the simulator, so which modality separates better is by design.' },
    },
  }];
  return (
    <VizPanel viewKey="multiomics" title="Multi-omics integration" embedded={embedded} figure={figure} claims={claims}
      caption="The same simulated cells in an RNA embedding, an ATAC embedding and a joint embedding. Cell-type separation is scored with the silhouette width."
      record={{
        dataset: `${ds.meta.title}. Two simulated 2-D embeddings per cell (RNA-like and ATAC-like).`,
        method: 'Joint space: the two embeddings are concatenated, standardised and projected on their first two principal components for display. Silhouette is computed on the concatenated coordinates.',
        test: 'None. Silhouette width is a descriptive score of agreement between embedding and annotation.',
        parameters: [['Silhouette subsample', `${em.subsample} cells, fixed stride`], ['Distance', 'Euclidean'], ['Joint display', 'top two principal components']],
        interpretation: 'A higher silhouette means annotated populations are more compact and better separated in that space.',
        limitations: ['Modality geometries were set by the simulator; the comparison shows how the metric works, not how real modalities behave.', 'Real integration (WNN, MOFA+, multiVI) weights modalities by learned or estimated quality.', 'Better separation does not mean better biology.'],
      }} />
  );
}
