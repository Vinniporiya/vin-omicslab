import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Heatmap } from '../../../viz/Heatmap';
import { Select } from '../../../components/ui/Controls';
import { LR_PAIRS } from '../../../data/demo/genes';
import { communication, topInteractions, type CommMode } from '../../../lib/analysis/communication';
import { fmtNum } from '../../../lib/format';
import type { ViewProps } from './types';

export function Communication({ ds, embedded }: ViewProps) {
  const [mode, setMode] = useState<CommMode>('all');
  const [pair, setPair] = useState('all');
  const results = useMemo(() => communication(ds, mode), [ds, mode]);
  const chosen = pair === 'all' ? results : results.filter((r) => r.pair.label === pair);
  const nT = ds.cellTypes.length;
  const M = Array.from({ length: nT }, (_, s) => Array.from({ length: nT }, (_, r) => chosen.reduce((a, c) => a + c.matrix[s][r], 0)));
  const flat = M.flat();
  const hi = Math.max(0.01, ...flat.map(Math.abs));
  const top = topInteractions(chosen, ds, 6);
  const figure = (
    <div className={embedded ? '' : 'spatial-grid'}>
      <Heatmap ariaLabel="Ligand-receptor interaction scores, sender by receiver" rows={ds.cellTypes.map((c) => c.short)} cols={ds.cellTypes.map((c) => c.short)} colColors={ds.cellTypes.map((c) => c.color)}
        values={M} mode={mode === 'diff' ? 'div' : 'seq'} domain={mode === 'diff' ? [-hi, hi] : [0, hi]} cell={[38, 26]} labelW={64} legend={mode === 'diff' ? 'disease minus control score' : 'interaction score'}
        title={(r, c) => `${ds.cellTypes[r].short} (sender) to ${ds.cellTypes[c].short} (receiver): ${fmtNum(M[r][c], 2)}`} />
      <div>
        <h3 className="h-sm">Strongest interactions</h3>
        <table className="table"><thead><tr><th>Pair</th><th>Sender</th><th>Receiver</th><th className="num">Score</th></tr></thead>
          <tbody>{top.map((t, i) => <tr key={i}><td>{t.pair}</td><td>{t.sender}</td><td>{t.receiver}</td><td className="num">{fmtNum(t.score, 2)}</td></tr>)}</tbody></table>
        <p className="small muted">Rows are the sending cell type (ligand); columns are the receiving cell type (receptor).</p>
      </div>
    </div>
  );
  const controls = (
    <>
      <Select label="Cells" value={mode} onChange={setMode} options={[{ value: 'all', label: 'All cells' }, { value: 'Control', label: 'Control' }, { value: 'Disease', label: 'Disease' }, { value: 'diff', label: 'Disease minus control' }]} />
      <Select label="Ligand-receptor pair" value={pair} onChange={setPair} options={[{ value: 'all', label: 'All nine pairs (summed)' }, ...LR_PAIRS.map((p) => ({ value: p.label, label: p.label }))]} />
    </>
  );
  return (
    <VizPanel viewKey="communication" title="Cell-cell communication" embedded={embedded} controls={controls} figure={figure}
      caption="Ligand-receptor scores between simulated cell types. Pairs are textbook interactions; expression values are simulated."
      record={{
        dataset: `${ds.meta.title}. Mean expression of nine ligand-receptor pairs per cell type and condition.`,
        method: 'For each sender and receiver cell type: mean ligand expression in the sender multiplied by mean receptor expression in the receiver.',
        test: 'None. Scores are descriptive. Unlike CellPhoneDB or LIANA, no permutation test is applied here.',
        parameters: [['Cells', mode], ['Pairs', pair === 'all' ? 'all nine, summed' : pair], ['Score', 'mean(ligand) x mean(receptor)']],
        interpretation: 'A high score means both ligand and receptor are expressed in the respective cell types. It suggests that communication is possible, not that it occurs.',
        limitations: ['Co-expression does not imply physical contact or signalling; spatial proximity is not used.', 'Complexes with several subunits are reduced to a single gene each.', 'Summing pairs mixes very different signalling systems.'],
      }} />
  );
}
