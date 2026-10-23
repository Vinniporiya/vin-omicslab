import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Heatmap } from '../../../viz/Heatmap';
import { Segmented, Select } from '../../../components/ui/Controls';
import { GENE_GROUPS, PROGRAMS } from '../../../data/demo/genes';
import { geneSummaries } from '../../../lib/analysis/summary';
import { mean, sd } from '../../../lib/stats';
import type { ViewProps } from './types';

export function HeatmapView({ ds, embedded }: ViewProps) {
  const [group, setGroup] = useState<'marker' | 'signalling' | 'regulator'>('marker');
  const [cond, setCond] = useState<'all' | 'Control' | 'Disease'>('all');
  const [mode, setMode] = useState<'dot' | 'heat'>('dot');
  const S = useMemo(() => geneSummaries(ds), [ds]);
  const genes = ds.panel.filter((g) => PROGRAMS[g].group === group);
  const M = genes.map((g) => S[g].mean[cond]);
  const P = genes.map((g) => S[g].pct[cond]);
  const Z = M.map((row) => { const mu = mean(row), s = sd(row) || 1; return row.map((v) => (v - mu) / s); });
  const scaled = M.map((row) => { const lo = Math.min(...row), hi = Math.max(...row); return row.map((v) => (v - lo) / (hi - lo || 1)); });
  const figure = (
    <div className="heat-wrap">
      {mode === 'heat'
        ? <Heatmap ariaLabel="Heatmap of z-scored mean expression" rows={genes} cols={ds.cellTypes.map((c) => c.short)} colColors={ds.cellTypes.map((c) => c.color)} values={Z} mode="div" domain={[-2.5, 2.5]} legend="z-scored mean expression" />
        : <Heatmap ariaLabel="Dot plot of expression by cell type" rows={genes} cols={ds.cellTypes.map((c) => c.short)} colColors={ds.cellTypes.map((c) => c.color)} values={scaled} sizes={P} mode="seq" domain={[0, 1]} legend="scaled mean expression" sizeLegend="dot area: fraction of cells expressing"
            title={(r, c) => `${genes[r]} in ${ds.cellTypes[c].label}: mean ${M[r][c].toFixed(2)}, ${(P[r][c] * 100).toFixed(0)}% of cells`} />}
    </div>
  );
  const controls = (
    <>
      <Select label="Gene group" value={group} onChange={setGroup} options={GENE_GROUPS.map((g) => ({ value: g.id, label: g.label }))} />
      <Segmented label="Display" value={mode} onChange={setMode} options={[{ value: 'dot', label: 'Dot plot' }, { value: 'heat', label: 'Heatmap' }]} />
      {!embedded && <Segmented label="Cells" value={cond} onChange={setCond} options={[{ value: 'all', label: 'All' }, { value: 'Control', label: 'Control' }, { value: 'Disease', label: 'Disease' }]} />}
    </>
  );
  return (
    <VizPanel viewKey="heatmap" title="Expression by cell type" embedded={embedded} controls={controls} figure={figure}
      caption="Mean expression of panel genes per simulated cell type. Marker genes are real symbols with textbook specificity; expression values are simulated."
      record={{
        dataset: `${ds.meta.title}. ${ds.panel.length} panel genes across ${ds.landscape.n.toLocaleString('en-US')} simulated cells.`,
        method: 'Mean expression and detection rate per gene per cell type. Heatmap: z-score across cell types per gene. Dot plot: colour is mean scaled 0 to 1 per gene, dot area is the fraction of cells with expression above zero.',
        test: 'None. Descriptive summary.',
        parameters: [['Gene group', group], ['Cells', cond], ['Display', mode]],
        interpretation: 'Marker patterns can support an annotation. Confirming an identity needs several markers and, ideally, an independent reference.',
        limitations: ['Values are simulated with dropout; real data have batch and ambient RNA effects that a dot plot does not show.', 'Scaling per gene hides differences in absolute expression between genes.'],
      }} />
  );
}
