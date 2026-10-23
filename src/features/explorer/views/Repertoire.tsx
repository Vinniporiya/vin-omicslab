import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Segmented } from '../../../components/ui/Controls';
import { CONDITION_COLOR } from '../../../viz/palette';
import { compareMetric, meanBy, repertoireMetrics, type Chain } from '../../../lib/analysis/repertoire';
import { fmtNum, fmtP } from '../../../lib/format';
import type { ClaimStack } from '../../../lib/evidence';
import { RUN, type ViewProps } from './types';

export function Repertoire({ ds, embedded }: ViewProps) {
  const [chain, setChain] = useState<Chain>('TCR');
  const rows = useMemo(() => repertoireMetrics(ds, chain), [ds, chain]);
  const cmp = compareMetric(rows, 'shannon');
  const W = 580, H = 340, m = { l: 56, r: 14, t: 12, b: 44 };
  const maxRank = Math.max(...rows.map((r) => r.clonotypes));
  const lx = (v: number) => m.l + (Math.log10(v) / Math.log10(maxRank)) * (W - m.l - m.r);
  const ymin = Math.log10(1 / Math.max(...rows.map((r) => r.cells)));
  const ly = (f: number) => m.t + (Math.log10(f) / ymin) * (H - m.t - m.b);
  const yTicks = [1, 0.1, 0.01, 0.001].filter((t) => Math.log10(t) >= ymin);
  const figure = (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Rank-abundance curves of ${chain} clonotypes per donor`}>
        {yTicks.map((t) => <g key={t}><line className="grid" x1={m.l} x2={W - m.r} y1={ly(t)} y2={ly(t)} /><text className="svg-label" x={m.l - 6} y={ly(t) + 4} textAnchor="end">{t}</text></g>)}
        {[1, 10, 100].filter((t) => t <= maxRank).map((t) => <g key={t}><line className="grid" x1={lx(t)} x2={lx(t)} y1={m.t} y2={H - m.b} /><text className="svg-label" x={lx(t)} y={H - m.b + 16} textAnchor="middle">{t}</text></g>)}
        <line className="axis" x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} /><line className="axis" x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} />
        {rows.map((r) => {
          const tot = r.cells; const d = r.sizes.map((s, i) => `${i ? 'L' : 'M'}${lx(i + 1).toFixed(1)},${ly(s / tot).toFixed(1)}`).join('');
          return <path key={r.donor} d={d} fill="none" stroke={CONDITION_COLOR[r.condition as 'Control']} strokeWidth={1.8} opacity={0.85}><title>{`${r.donor} (${r.condition}): ${r.clonotypes} clonotypes, top clone ${fmtNum(r.topClonePct, 1)}%`}</title></path>;
        })}
        <text className="svg-label" x={(m.l + W - m.r) / 2} y={H - 8} textAnchor="middle">Clonotype rank (log scale)</text>
        <text className="svg-label" transform={`translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle">Clone frequency (log scale)</text>
      </svg>
      <ul className="legend"><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Control }} />Control donors</span></li><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Disease }} />Disease donors</span></li></ul>
      {!embedded && (
        <table className="table">
          <thead><tr><th>Donor</th><th>Condition</th><th className="num">Cells</th><th className="num">Clonotypes</th><th className="num">Shannon</th><th className="num">Simpson</th><th className="num">Top clone</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.donor}><td>{r.donor}</td><td>{r.condition}</td><td className="num">{r.cells}</td><td className="num">{r.clonotypes}</td><td className="num">{fmtNum(r.shannon)}</td><td className="num">{fmtNum(r.simpson, 3)}</td><td className="num">{fmtNum(r.topClonePct, 1)}%</td></tr>)}</tbody>
        </table>
      )}
    </>
  );
  const claims: ClaimStack[] = [{
    statement: `${chain} diversity differs between conditions`, simulated: true,
    layers: {
      observed: { text: `Mean Shannon index of ${chain} clonotypes is ${fmtNum(meanBy(rows, 'Control', 'shannon'))} in control donors and ${fmtNum(meanBy(rows, 'Disease', 'shannon'))} in disease donors.` },
      statistical: { text: `Welch t-test on Shannon index across donors: t = ${fmtNum(cmp.t)}, df = ${fmtNum(cmp.df, 1)}, P = ${fmtP(cmp.p)}. One pre-specified metric, so no multiplicity correction.`, test: 'Welch t-test on Shannon index (single metric)', adjP: cmp.p, runId: RUN(ds, `repertoire-${chain}`) },
      inference: { text: 'Lower diversity is consistent with clonal expansion. Diversity also depends on how many cells were sampled, and the simulator set that by construction.' },
      hypothesis: { text: 'Expanded clones respond to a shared antigen. A test would be receptor specificity assays on the expanded clonotypes.' },
    },
  }];
  return (
    <VizPanel viewKey="repertoire" title="TCR and BCR repertoire" embedded={embedded} controls={<Segmented label="Receptor" value={chain} onChange={setChain} options={[{ value: 'TCR', label: 'TCR (T cells)' }, { value: 'BCR', label: 'BCR (B and plasma cells)' }]} />} figure={figure} claims={claims}
      caption={`Rank-abundance curves of ${chain} clonotypes for eight simulated donors. Steeper, shorter curves mean more clonal expansion.`}
      record={{
        dataset: `${ds.meta.title}. Simulated clone-size tables per donor for ${chain}.`,
        method: 'Clone sizes generated by a Chinese-restaurant process (smaller concentration parameter in disease gives more expansion). Metrics: Shannon and Simpson diversity, top-clone share.',
        test: 'Welch two-sample t-test on Shannon index, donors as replicates.',
        parameters: [['Receptor', chain], ['Donors', '4 control, 4 disease'], ['Clonotype rule', 'simulated clone IDs']],
        interpretation: 'Diversity summarises how evenly cells are spread across clones. It is a property of the sample, not a direct measure of immune function.',
        limitations: ['Diversity estimates depend on sampled cell number; real analyses fix a rarefaction depth.', 'Clonotype definition (chains, identity rule) changes every number here.', 'Clone frequency in a sample is not frequency in the body.'],
      }} />
  );
}
