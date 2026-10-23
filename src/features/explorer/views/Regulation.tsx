import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Heatmap } from '../../../viz/Heatmap';
import { Select } from '../../../components/ui/Controls';
import { seqColor } from '../../../viz/palette';
import { REGULONS } from '../../../data/demo/genes';
import { networkLayout, regulonActivity } from '../../../lib/analysis/regulation';
import { geneSummaries } from '../../../lib/analysis/summary';
import type { ViewProps } from './types';

export function Regulation({ ds, embedded }: ViewProps) {
  const [ti, setTi] = useState(5);
  const S = useMemo(() => geneSummaries(ds), [ds]);
  const act = useMemo(() => regulonActivity(ds), [ds]);
  const net = useMemo(() => networkLayout(), []);
  const pos = new Map(net.nodes.map((n) => [n.id, n]));
  const N = 520, c = N / 2, R = c - 46;
  const px = (v: number) => c + v * R, py = (v: number) => c + v * R;
  const figure = (
    <div className={embedded ? '' : 'spatial-grid'}>
      <div>
        <svg viewBox={`0 0 ${N} ${N}`} className="chart" role="img" aria-label="Regulon network coloured by expression in the selected cell type">
          {net.edges.map((e, i) => { const a = pos.get(e.source)!, b = pos.get(e.target)!; return <line key={i} x1={px(a.x)} y1={py(a.y)} x2={px(b.x)} y2={py(b.y)} className="edge" strokeDasharray={e.sign < 0 ? '4 3' : undefined} />; })}
          {net.nodes.map((n) => {
            const v = S[n.id].mean.all[ti], t = Math.min(1, v / 4);
            return (
              <g key={n.id}>
                <circle cx={px(n.x)} cy={py(n.y)} r={n.kind === 'tf' ? 15 : 8} fill={seqColor(t)} stroke={n.kind === 'tf' ? 'var(--text)' : 'var(--line-strong)'} strokeWidth={n.kind === 'tf' ? 2 : 1}><title>{`${n.id}: mean ${v.toFixed(2)} in ${ds.cellTypes[ti].label}`}</title></circle>
                <text className="svg-label" x={px(n.x)} y={py(n.y) + (n.kind === 'tf' ? 30 : 20)} textAnchor="middle" style={n.kind === 'tf' ? { fontWeight: 600 } : undefined}>{n.id}</text>
              </g>
            );
          })}
        </svg>
        <p className="small muted">Large outlined nodes are transcription factors; small nodes are targets. Dashed edges mark a repressive relationship. Fill shows mean expression in {ds.cellTypes[ti].label}.</p>
      </div>
      <div>
        <h3 className="h-sm">Regulon activity by cell type</h3>
        <Heatmap ariaLabel="Regulon activity per cell type" rows={act.tfs} cols={ds.cellTypes.map((x) => x.short)} colColors={ds.cellTypes.map((x) => x.color)} values={act.matrix} mode="div" domain={[-2, 2]} cell={[36, 26]} labelW={60} legend="mean signed z of targets" />
      </div>
    </div>
  );
  const controls = <Select label="Colour nodes by expression in" value={String(ti)} onChange={(v) => setTi(Number(v))} options={ds.cellTypes.map((x, i) => ({ value: String(i), label: x.short }))} />;
  return (
    <VizPanel viewKey="regulation" title="Gene regulatory network" embedded={embedded} controls={controls} figure={figure}
      caption="Illustrative regulons (hand-specified, not inferred) with activity scored on simulated expression."
      record={{
        dataset: `${ds.meta.title}. Seven transcription-factor regulons of 3 to 5 targets each; expression from the panel genes.`,
        method: `Regulon activity per cell type is the mean of z-scored target expression (sign-adjusted). Layout is a deterministic radial arrangement of ${REGULONS.length} regulons.`,
        test: 'None. Activity scores are descriptive.',
        parameters: [['Regulons', `${REGULONS.length}, hand-specified`], ['Score', 'mean signed z of target expression'], ['Node colour', `mean expression in ${ds.cellTypes[ti].short}`]],
        interpretation: 'A regulon that scores high in a cell type is consistent with that program being active there. It is a hypothesis to test with chromatin and perturbation data.',
        limitations: ['Regulons here are written by hand for illustration. Real networks are inferred (SCENIC+, pySCENIC) and carry inference error.', 'RNA-based activity does not measure transcription-factor protein activity.', 'Network edges are hypotheses until perturbed.'],
      }} />
  );
}
