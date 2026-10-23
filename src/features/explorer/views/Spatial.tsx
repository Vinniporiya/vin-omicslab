import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { TypeLegend } from '../../../components/science/TypeLegend';
import { Segmented, Select } from '../../../components/ui/Controls';
import { ScatterCanvas } from '../../../viz/ScatterCanvas';
import { Heatmap } from '../../../viz/Heatmap';
import { seqColor } from '../../../viz/palette';
import { neighbourhoodEnrichment } from '../../../lib/analysis/spatial';
import type { ClaimStack } from '../../../lib/evidence';
import type { ViewProps } from './types';

const REGION_COLORS = ['#E0607E', '#E8A23A', '#8C9BA8', '#4C9BE8'];
const CLONE_COLORS = ['#F2C94C', '#56CCF2', '#BB6BD9', '#2FB5A5'];
type By = 'type' | 'region' | 'clone' | 'gene';

export function Spatial({ ds, embedded }: ViewProps) {
  const S = ds.spatial;
  const [by, setBy] = useState<By>(embedded ? 'clone' : 'type');
  const [gene, setGene] = useState('CD3E');
  const e = S.expr[gene];
  const maxE = useMemo(() => Math.max(1e-6, ...Array.from(e)), [e]);
  const nh = useMemo(() => (embedded ? null : neighbourhoodEnrichment(S, ds.cellTypes.length)), [S, ds.cellTypes.length, embedded]);
  const color = (i: number) => (by === 'type' ? ds.cellTypes[S.type[i]].color : by === 'region' ? REGION_COLORS[S.region[i]] : by === 'clone' ? (S.clone[i] >= 0 ? CLONE_COLORS[S.clone[i]] : 'var(--line-strong)') : seqColor(e[i] / maxE));
  const alpha = (i: number) => (by === 'clone' ? (S.clone[i] >= 0 && S.clone[i] < 3 ? 0.98 : S.clone[i] === 3 ? 0.5 : 0.16) : 0.9);
  const tip = (i: number) => `${ds.cellTypes[S.type[i]].label}\n${S.regionNames[S.region[i]]}${S.clone[i] >= 0 ? `\n${S.cloneNames[S.clone[i]]}` : ''}\n${gene}: ${e[i].toFixed(2)}`;

  const figure = (
    <div className={embedded ? '' : 'spatial-grid'}>
      <div>
        <ScatterCanvas x={S.x} y={S.y} color={color} alpha={alpha} radius={by === 'clone' ? 3.1 : 2.7} aspect={1} equal tooltip={tip} ariaLabel="Simulated tissue section" />
        {by === 'type' && <TypeLegend ds={ds} />}
        {by === 'region' && <ul className="legend">{S.regionNames.map((n, i) => <li key={n}><span className="legend-item"><span className="swatch" style={{ background: REGION_COLORS[i] }} />{n}</span></li>)}</ul>}
        {by === 'clone' && <ul className="legend">{S.cloneNames.map((n, i) => <li key={n}><span className="legend-item"><span className="swatch" style={{ background: CLONE_COLORS[i] }} />{n}</span></li>)}</ul>}
        {by === 'gene' && <div className="ramp-legend"><span>0</span><span className="ramp" /><span>{maxE.toFixed(1)}</span><span className="muted">{gene} (simulated)</span></div>}
      </div>
      {nh && (
        <div>
          <h3 className="h-sm">Neighbourhood enrichment</h3>
          <Heatmap ariaLabel="Neighbourhood enrichment z-scores" rows={ds.cellTypes.map((c) => c.short)} cols={ds.cellTypes.map((c) => c.short)} colColors={ds.cellTypes.map((c) => c.color)}
            values={nh.z} mode="div" domain={[-25, 25]} cell={[34, 24]} labelW={64} legend="z-score vs permuted labels"
            title={(r, c) => `${ds.cellTypes[r].short} next to ${ds.cellTypes[c].short}: z = ${nh.z[r][c].toFixed(1)} (${nh.observed[r][c]} adjacent pairs)`} />
          <p className="small muted">Colour scale is capped at ±25; larger values are drawn at the cap.</p>
        </div>
      )}
    </div>
  );
  let claims: ClaimStack[] = [];
  if (nh) {
    let best = { a: 0, b: 1, z: -Infinity };
    nh.z.forEach((row, a) => row.forEach((z, b) => { if (b > a && z > best.z) best = { a, b, z }; }));
    claims = [{
      statement: `${ds.cellTypes[best.a].short} and ${ds.cellTypes[best.b].short} cells are adjacent more often than expected`, simulated: true,
      layers: {
        observed: { text: `${nh.observed[best.a][best.b]} adjacent ${ds.cellTypes[best.a].short}-${ds.cellTypes[best.b].short} pairs within ${nh.radius} units (strongest off-diagonal enrichment; z = ${best.z.toFixed(1)}).` },
        inference: { text: 'The layout was built by region rules in the simulator, so the enrichment reflects those rules and nothing biological.' },
      },
    }];
  }
  const controls = (
    <>
      <Segmented label="Colour by" value={by} onChange={setBy} options={[{ value: 'type', label: 'Cell type' }, { value: 'region', label: 'Region' }, { value: 'clone', label: 'Clone' }, { value: 'gene', label: 'Gene' }]} />
      {by === 'gene' && <Select label="Gene" value={gene} onChange={setGene} options={ds.panel.map((g) => ({ value: g, label: g }))} />}
    </>
  );
  return (
    <VizPanel viewKey="spatial" title="Spatial tissue map" embedded={embedded} controls={controls} figure={figure} claims={claims}
      caption={`A simulated tissue section of ${S.n.toLocaleString('en-US')} cells: two tumour nests, an invasive margin, stroma and a lymphoid aggregate. Clone positions are assigned by rule in the simulator.`}
      record={{
        dataset: `${ds.meta.title}. One simulated section, ${S.n.toLocaleString('en-US')} cells with coordinates, cell type, region and CD8 T-cell clone label.`,
        method: 'Cells plotted at their coordinates. Neighbourhood enrichment counts adjacent cell-type pairs within a radius and compares them with label-permuted layouts.',
        test: `Permutation test, ${nh?.permutations ?? 200} shuffles of cell-type labels over fixed positions; z = (observed - mean null) / sd null. No P value or correction is reported.`,
        parameters: [['Neighbour radius', `${nh?.radius ?? 3.4} units`], ['Permutations', String(nh?.permutations ?? 200)], ['Adjacent pairs', nh ? String(nh.nEdges) : 'computed on the full page']],
        interpretation: 'Enriched pairs indicate spatial organisation to follow up. Clone overlays show where a clone sits, not why.',
        limitations: ['One section is one observation. Sections from a donor are not independent replicates.', 'Clone labels here are simulated by rule; real clone-to-position mapping has its own error.', 'Neighbourhood z-scores are large because thousands of pairs are tested at once; they are descriptive, not calibrated P values.'],
      }} />
  );
}
