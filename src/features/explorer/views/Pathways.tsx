import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Segmented, Select } from '../../../components/ui/Controls';
import { pseudobulkDE } from '../../../lib/analysis/de';
import { overRepresentation } from '../../../lib/analysis/pathway';
import { fmtNum, fmtP } from '../../../lib/format';
import type { ClaimStack } from '../../../lib/evidence';
import type { TypeId } from '../../../data/demo/genes';
import { RUN, type ViewProps } from './types';

export function Pathways({ ds, embedded }: ViewProps) {
  const [type, setType] = useState<TypeId>('Myeloid');
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const [cut, setCut] = useState('0.05');
  const de = useMemo(() => pseudobulkDE(ds, type), [ds, type]);
  const hits = de.rows.filter((r) => r.p < Number(cut) && (dir === 'up' ? r.log2fc > 0 : r.log2fc < 0)).map((r) => r.gene);
  const enr = useMemo(() => overRepresentation(de.rows.map((r) => r.gene), ds.pseudobulk.geneSets, hits), [de, ds, hits.join(',')]);
  const maxLog = Math.max(4, ...enr.map((r) => -Math.log10(Math.max(r.padj, 1e-12))));
  const label = ds.cellTypes.find((c) => c.id === type)!.label;
  const figure = de.rows.length === 0 ? <p className="empty" role="status">{de.message}</p> : (
    <>
      <ul className="bars" aria-label="Gene-set enrichment, ranked by adjusted P">
        {enr.map((r) => {
          const v = -Math.log10(Math.max(r.padj, 1e-12)); const sig = r.padj < 0.05;
          return (
            <li key={r.id}>
              <div className="bar-label">{r.name}</div>
              <div className="bar-track"><span className={`bar-fill${sig ? ' is-sig' : ''}`} style={{ width: `${Math.min(100, (v / maxLog) * 100)}%` }} /></div>
              <div className="bar-val">{r.overlap} of {r.setSize}<span className="muted">, adjusted P {fmtP(r.padj)}</span></div>
            </li>
          );
        })}
      </ul>
      <p className="small muted">Bar length is -log10 adjusted P. Solid bars pass adjusted P below 0.05. Universe: {de.genesTested} tested genes. Hits: {hits.length} {dir}-regulated genes with P below {cut}.</p>
    </>
  );
  const best = enr[0];
  const claims: ClaimStack[] = best && de.rows.length ? [{
    statement: `A gene set is over-represented among ${dir}-regulated genes in ${label}`, simulated: true,
    layers: {
      observed: { text: `${best.overlap} of ${best.setSize} genes in "${best.name}" are among the ${hits.length} ${dir}-regulated hits (${fmtNum(best.expected, 1)} expected by chance).` },
      statistical: { text: `One-sided hypergeometric test, adjusted P = ${fmtP(best.padj)} (Benjamini-Hochberg over ${enr.length} gene sets).`, test: 'Hypergeometric over-representation, BH', adjP: best.padj, runId: RUN(ds, `pathway-${type}-${dir}`) },
      inference: { text: 'If the labels were real, this would suggest coordinated change in that program. In the demo the set labels are placeholders and membership was simulated.' },
    },
  }] : [];
  const controls = (
    <>
      <Select label="Cell type" value={type} onChange={setType} options={ds.cellTypes.map((c) => ({ value: c.id, label: c.short }))} />
      <Segmented label="Direction" value={dir} onChange={setDir} options={[{ value: 'up', label: 'Up in disease' }, { value: 'down', label: 'Down in disease' }]} />
      {!embedded && <Select label="Hit threshold, P below" value={cut} onChange={setCut} options={[{ value: '0.01', label: '0.01' }, { value: '0.05', label: '0.05' }, { value: '0.1', label: '0.1' }]} />}
    </>
  );
  return (
    <VizPanel viewKey="pathways" title="Pathway enrichment" embedded={embedded} controls={controls} figure={figure} claims={claims}
      caption={`Over-representation of eight simulated gene sets among ${dir}-regulated genes in ${label}.`}
      record={{
        dataset: `${ds.meta.title}. Differential expression from the same simulated pseudobulk table; 8 gene sets of 30 synthetic genes each.`,
        method: 'Over-representation analysis of the significant-direction genes against each gene set, with tested genes as the background.',
        test: 'One-sided hypergeometric test; Benjamini-Hochberg across gene sets.',
        parameters: [['Cell type', label], ['Direction', dir], ['Hit definition', `P below ${cut} and ${dir === 'up' ? 'positive' : 'negative'} log2FC`], ['Universe', `${de.genesTested} tested genes`]],
        interpretation: 'Enrichment says the hit list overlaps a gene set more than chance predicts. It does not say the pathway is causal or active.',
        limitations: ['Gene-set names are placeholders; membership was simulated, so no real pathway is being tested.', 'Hit lists defined by a P threshold are sensitive to the cut-off.', 'Real analyses must name the gene-set database and version.'],
      }} />
  );
}
