import { useMemo } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { TypeLegend } from '../../../components/science/TypeLegend';
import { differentialAbundance, proportions } from '../../../lib/analysis/composition';
import { fmtNum, fmtP, pct } from '../../../lib/format';
import type { ClaimStack } from '../../../lib/evidence';
import { RUN, type ViewProps } from './types';

export function Composition({ ds, embedded }: ViewProps) {
  const props = useMemo(() => proportions(ds), [ds]);
  const da = useMemo(() => differentialAbundance(ds), [ds]);
  const ranked = [...da].sort((a, b) => a.p - b.p);
  const W = 580, H = 300, m = { l: 44, r: 8, t: 10, b: 44 };
  const bw = (W - m.l - m.r) / (ds.donors.length + 0.6);
  const xOf = (di: number) => m.l + di * bw + (di >= 4 ? bw * 0.6 : 0) + bw * 0.1;
  const yOf = (v: number) => m.t + (1 - v) * (H - m.t - m.b);

  const bars = ds.donors.map((d, di) => {
    let acc = 0;
    return (
      <g key={d.id}>
        {ds.cellTypes.map((c, ti) => { const v = props[ti][di]; const y0 = yOf(acc + v); acc += v; return <rect key={c.id} x={xOf(di)} y={y0} width={bw * 0.8} height={yOf(acc - v) - y0} fill={c.color}><title>{`${d.id} ${c.label}: ${pct(v)}`}</title></rect>; })}
        <text className="svg-label" x={xOf(di) + bw * 0.4} y={H - m.b + 16} textAnchor="middle">{d.id}</text>
      </g>
    );
  });
  const figure = (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Stacked bars of cell-type proportion per donor">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="grid" x1={m.l} x2={W - m.r} y1={yOf(t)} y2={yOf(t)} /><text className="svg-label" x={m.l - 6} y={yOf(t) + 4} textAnchor="end">{Math.round(t * 100)}%</text></g>)}
        {bars}
        <text className="svg-label" x={m.l + (bw * 4) / 2} y={H - 8} textAnchor="middle">Control donors</text>
        <text className="svg-label" x={xOf(4) + (bw * 4) / 2} y={H - 8} textAnchor="middle">Disease donors</text>
      </svg>
      <TypeLegend ds={ds} />
      <table className="table">
        <thead><tr><th>Cell type</th><th className="num">Control</th><th className="num">Disease</th><th className="num">log2 fold change</th><th className="num">Adjusted P</th></tr></thead>
        <tbody>{(embedded ? ranked.slice(0, 4) : ranked).map((r) => (
          <tr key={r.typeId} className={r.padj < 0.05 ? 'is-sig' : ''}>
            <td><span className="swatch" style={{ background: r.color }} />{r.label}</td><td className="num">{pct(r.meanControl)}</td><td className="num">{pct(r.meanDisease)}</td>
            <td className="num">{fmtNum(r.log2fc)}</td><td className="num">{fmtP(r.padj)}{r.padj < 0.05 ? ' \u2022' : ''}</td>
          </tr>))}</tbody>
      </table>
    </>
  );
  const top = ranked[0];
  const claims: ClaimStack[] = [{
    statement: `${top.label} proportion differs between conditions`, simulated: true,
    layers: {
      observed: { text: `Mean proportion of ${top.label}: ${pct(top.meanControl)} in control donors, ${pct(top.meanDisease)} in disease donors (4 donors per group).` },
      statistical: { text: `Welch t-test on logit proportions, t = ${fmtNum(top.t)}, df = ${fmtNum(top.df, 1)}; adjusted P = ${fmtP(top.padj)} (Benjamini-Hochberg over ${da.length} cell types).`, test: 'Welch t-test on logit proportions, BH', adjP: top.padj, runId: RUN(ds, 'composition') },
      inference: { text: 'If this were real data, the change would suggest a shift in tissue composition. Here it comes from hand-written multipliers in the simulator, and part of any drop is compositional: other populations expanding lowers every other proportion. No biological conclusion follows.' },
      hypothesis: { text: 'Altered abundance of this population contributes to the modelled phenotype. A test would be independent quantification by imaging or flow cytometry.' },
    },
  }];
  return (
    <VizPanel viewKey="composition" title="Cell-type composition and differential abundance" embedded={embedded} figure={figure} claims={claims}
      caption="Cell-type proportions per simulated donor, with donor-level tests. A dot marks adjusted P below 0.05."
      record={{
        dataset: `${ds.meta.title}. Cell counts per cell type and donor. Simulated.`,
        method: 'Per-donor cell-type proportions; differential abundance per cell type.',
        test: 'Welch two-sample t-test on logit(proportion) with a 0.5 pseudocount, donors as replicates; Benjamini-Hochberg across cell types.',
        parameters: [['Replicates', '4 control, 4 disease donors'], ['Transform', 'logit, pseudocount 0.5'], ['Correction', 'BH across 9 types']],
        interpretation: 'Proportions sum to 1, so an increase in one population lowers the others. Read all rows together.',
        limitations: ['Four donors per group gives low power and wide uncertainty.', 'Demo-grade test: production analyses use compositional or neighbourhood-level models (scCODA, Milo).', 'Capture and dissociation bias which cells are counted.'],
      }} />
  );
}
