import { useMemo, useState } from 'react';
import { ScatterCanvas } from '../../../viz/ScatterCanvas';
import { CONDITION_COLOR, donorColors, seqColor } from '../../../viz/palette';
import { useDisplay } from '../../../app/theme';
import { VizPanel } from '../../../components/science/VizPanel';
import { TypeLegend } from '../../../components/science/TypeLegend';
import { Segmented, Select } from '../../../components/ui/Controls';
import { thousands } from '../../../lib/format';
import type { ViewProps } from './types';
import { Link } from '../../../app/router';

type ColorBy = 'type' | 'condition' | 'donor' | 'gene';

export function Landscape({ ds, embedded, query }: ViewProps) {
  const qGene = query?.get('gene')?.toUpperCase();
  const initialGene = qGene && ds.panel.includes(qGene) ? qGene : null;
  const L = ds.landscape;
  const DONOR_COLORS = donorColors(useDisplay().palette);
  const [by, setBy] = useState<ColorBy>(initialGene ? 'gene' : embedded ? 'condition' : 'type');
  const [gene, setGene] = useState(initialGene ?? 'LYZ');
  const [iso, setIso] = useState<number | null>(null);
  const [show, setShow] = useState<'both' | 'Control' | 'Disease'>('both');
  const condOf = useMemo(() => ds.donors.map((d) => d.condition), [ds]);
  const e = L.expr[gene];
  const maxE = useMemo(() => { let m = 0; for (let i = 0; i < L.n; i++) if (e[i] > m) m = e[i]; return m || 1; }, [e, L.n]);
  const order = useMemo(() => (by === 'gene' ? Uint32Array.from(Array.from({ length: L.n }, (_, i) => i).sort((a, b) => e[a] - e[b])) : undefined), [by, e, L.n]);
  const counts = useMemo(() => { const c = new Array(ds.cellTypes.length).fill(0); for (let i = 0; i < L.n; i++) c[L.type[i]]++; return c; }, [ds, L]);

  const color = (i: number) => (by === 'type' ? ds.cellTypes[L.type[i]].color : by === 'condition' ? CONDITION_COLOR[condOf[L.donor[i]]] : by === 'donor' ? DONOR_COLORS[L.donor[i]] : seqColor(e[i] / maxE));
  const alpha = (i: number) => ((iso !== null && L.type[i] !== iso) || (show !== 'both' && condOf[L.donor[i]] !== show) ? 0.05 : by === 'gene' ? 0.9 : 0.8);
  const tip = (i: number) => `${ds.cellTypes[L.type[i]].label}\nDonor ${ds.donors[L.donor[i]].id} (${condOf[L.donor[i]]})\n${gene}: ${e[i].toFixed(2)}`;

  const controls = (
    <>
      <Segmented label="Colour by" value={by} onChange={setBy} options={[{ value: 'type', label: 'Cell type' }, { value: 'condition', label: 'Condition' }, { value: 'donor', label: 'Donor' }, { value: 'gene', label: 'Gene' }]} />
      {by === 'gene' && <Select label="Gene" value={gene} onChange={setGene} options={ds.panel.map((g) => ({ value: g, label: g }))} />}
      {by === 'gene' && !embedded && <Link to={`/genes/${gene}`} className="link-strong small field-link">{gene} genome page</Link>}
      <Segmented label="Show" value={show} onChange={setShow} options={[{ value: 'both', label: 'Both' }, { value: 'Control', label: 'Control' }, { value: 'Disease', label: 'Disease' }]} />
    </>
  );
  const figure = (
    <>
      <ScatterCanvas x={L.x} y={L.y} color={color} alpha={alpha} order={order} radius={embedded ? 1.8 : 2.1} aspect={embedded ? 0.6 : 0.68} axes={['UMAP 1', 'UMAP 2']} tooltip={tip} animate={!embedded} ariaLabel="Simulated single-cell embedding" />
      {by === 'type' && <TypeLegend ds={ds} isolate={iso} onIsolate={setIso} counts={embedded ? undefined : counts} />}
      {by === 'condition' && <ul className="legend"><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Control }} />Control</span></li><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Disease }} />Disease</span></li></ul>}
      {by === 'donor' && <ul className="legend">{ds.donors.map((d, i) => <li key={d.id}><span className="legend-item"><span className="swatch" style={{ background: DONOR_COLORS[i] }} />{d.id}</span></li>)}</ul>}
      {by === 'gene' && <div className="ramp-legend"><span>0</span><span className="ramp" /><span>{maxE.toFixed(1)}</span><span className="muted">{gene} expression (simulated)</span></div>}
    </>
  );
  return (
    <VizPanel viewKey="landscape" title="Cell landscape" embedded={embedded} controls={controls} figure={figure}
      caption={<>{thousands(L.n)} simulated cells from {ds.donors.length} donors. Positions come from the simulator, standing in for a UMAP of batch-corrected principal components.</>}
      record={{
        dataset: `${ds.meta.title} (${ds.meta.id}), ${thousands(L.n)} cells, ${ds.donors.length} donors (4 control, 4 disease). Simulated.`,
        method: 'Two-dimensional embedding of single cells, coloured by annotation, condition, donor or expression of a panel gene.',
        test: 'None. This is a descriptive view. Comparisons between conditions need donor-level tests (see Composition and Differential expression).',
        parameters: [['Colour by', by], ['Condition shown', show], ['Point radius', '2.1 px'], ['Gene', by === 'gene' ? gene : 'not used']],
        interpretation: 'Cells group into nine populations. Where conditions overlap or separate in the embedding, that is a lead to test, not a result.',
        limitations: ['Distances between clusters and cluster sizes in a UMAP are not quantitative.', 'Overlap of conditions is not evidence of no difference.', 'Positions were drawn from fixed Gaussians; there is no real biology behind the layout.'],
      }}
      claims={[{ statement: 'Cells form nine populations', simulated: true, layers: { observed: { text: `In this embedding, ${thousands(L.n)} cells fall into nine groups that match the simulator's annotation labels.` } } }]}
    />
  );
}
