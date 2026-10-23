import { useMemo, useState } from 'react';
import { VizPanel } from '../../../components/science/VizPanel';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Controls';
import { isSignificant, pseudobulkDE } from '../../../lib/analysis/de';
import { downloadText, toCsv } from '../../../lib/download';
import { fmtNum, fmtP } from '../../../lib/format';
import type { ClaimStack } from '../../../lib/evidence';
import { NEG, POS, CONDITION_COLOR } from '../../../viz/palette';
import type { TypeId } from '../../../data/demo/genes';
import { RUN, type ViewProps } from './types';

export function Differential({ ds, embedded }: ViewProps) {
  const [type, setType] = useState<TypeId>('Myeloid');
  const [fdr, setFdr] = useState('0.1');
  const [lfc, setLfc] = useState('0.5');
  const [sel, setSel] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const de = useMemo(() => pseudobulkDE(ds, type), [ds, type]);
  const F = Number(fdr), T = Number(lfc);
  const sig = de.rows.filter((r) => isSignificant(r, F, T));
  const nUp = sig.filter((r) => r.log2fc > 0).length;

  const W = 580, H = 400, m = { l: 48, r: 14, t: 12, b: 44 };
  const maxX = Math.max(1.5, ...de.rows.map((r) => Math.abs(r.log2fc))) * 1.05;
  const maxY = Math.max(3, ...de.rows.map((r) => -Math.log10(r.p))) * 1.05;
  const xs = (v: number) => m.l + ((v + maxX) / (2 * maxX)) * (W - m.l - m.r);
  const ys = (v: number) => H - m.b - (v / maxY) * (H - m.t - m.b);
  const colorOf = (r: (typeof de.rows)[number]) => (isSignificant(r, F, T) ? (r.log2fc > 0 ? POS : NEG) : 'var(--line-strong)');

  const gene = de.rows.find((r) => r.gene === sel) ?? null;
  const donorVals = useMemo(() => {
    if (!gene) return null;
    const gi = ds.pseudobulk.genes.indexOf(gene.gene), cnt = ds.pseudobulk.counts[type];
    const ti = ds.cellTypes.findIndex((c) => c.id === type);
    return ds.donors.map((d, di) => {
      const lib = cnt.reduce((a, r) => a + r[di], 0);
      return { id: d.id, cond: d.condition, v: Math.log2((cnt[gi][di] / lib) * 1e6 + 1), ok: ds.pseudobulk.cellCounts[ti][di] >= de.options.minCells };
    });
  }, [gene, ds, type, de.options.minCells]);

  const figure = de.rows.length === 0 ? (
    <p className="empty" role="status">{de.message}</p>
  ) : (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Volcano plot of pseudobulk differential expression">
        {[-1, 0, 1].map((t) => <line key={t} className="grid" x1={xs(t * maxX * 0.8)} x2={xs(t * maxX * 0.8)} y1={m.t} y2={H - m.b} />)}
        <line className="grid" x1={xs(-T)} x2={xs(-T)} y1={m.t} y2={H - m.b} strokeDasharray="4 3" />
        <line className="grid" x1={xs(T)} x2={xs(T)} y1={m.t} y2={H - m.b} strokeDasharray="4 3" />
        <line className="axis" x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} /><line className="axis" x1={m.l} x2={m.l} y1={m.t} y2={H - m.b} />
        {de.rows.map((r) => (
          <circle key={r.gene} cx={xs(r.log2fc)} cy={ys(-Math.log10(r.p))} r={r.gene === sel ? 5.5 : 3.2} fill={colorOf(r)} fillOpacity={isSignificant(r, F, T) ? 0.9 : 0.55}
            stroke={r.gene === sel ? 'var(--text)' : 'none'} strokeWidth={1.5} style={{ cursor: 'pointer' }} onClick={() => setSel(r.gene)} tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSel(r.gene)} aria-label={`${r.gene}, log2 fold change ${fmtNum(r.log2fc)}, adjusted P ${fmtP(r.padj)}`}>
            <title>{`${r.gene}\nlog2FC ${fmtNum(r.log2fc)}\nP ${fmtP(r.p)}, adjusted P ${fmtP(r.padj)}`}</title>
          </circle>
        ))}
        <text className="svg-label" x={(m.l + W - m.r) / 2} y={H - 8} textAnchor="middle">log2 fold change (disease vs control)</text>
        <text className="svg-label" transform={`translate(14,${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle">-log10 P (nominal)</text>
        {[-Math.round(maxX * 0.8), 0, Math.round(maxX * 0.8)].map((t) => <text key={t} className="svg-label" x={xs(t)} y={H - m.b + 16} textAnchor="middle">{t}</text>)}
        {[0, 2, 4, 6].filter((t) => t <= maxY).map((t) => <text key={t} className="svg-label" x={m.l - 6} y={ys(t) + 4} textAnchor="end">{t}</text>)}
        <text className="svg-label" x={xs(-maxX * 0.97)} y={m.t + 12}>Down in disease</text><text className="svg-label" x={xs(maxX * 0.97)} y={m.t + 12} textAnchor="end">Up in disease</text>
      </svg>
      <p className="small muted">Colour marks genes with adjusted P below {fdr} and |log2FC| of at least {lfc}. Vertical position is the nominal P value. Click a gene to see its donor-level values.</p>
      {gene && donorVals && (
        <div className="gene-card">
          <strong>{gene.gene}</strong> <span className="muted">log2FC {fmtNum(gene.log2fc)}, P {fmtP(gene.p)}, adjusted P {fmtP(gene.padj)}</span>
          <svg viewBox="0 0 240 90" className="chart-sm" role="img" aria-label={`Per-donor log2 CPM of ${gene.gene}`}>
            {donorVals.map((d, i) => { const vmin = Math.min(...donorVals.map((x) => x.v)), vmax = Math.max(...donorVals.map((x) => x.v)); const y = 74 - ((d.v - vmin) / (vmax - vmin || 1)) * 60; const x = (d.cond === 'Control' ? 60 : 160) + ((i % 4) - 1.5) * 14; return <circle key={d.id} cx={x} cy={y} r={4.5} fill={CONDITION_COLOR[d.cond]} opacity={d.ok ? 1 : 0.25}><title>{`${d.id}: ${fmtNum(d.v)} log2 CPM${d.ok ? '' : ' (excluded)'}`}</title></circle>; })}
            <text className="svg-label" x={60} y={88} textAnchor="middle">Control</text><text className="svg-label" x={160} y={88} textAnchor="middle">Disease</text>
          </svg>
        </div>
      )}
      {!embedded && (
        <table className="table">
          <thead><tr><th>Gene</th><th className="num">log2FC</th><th className="num">Mean log2 CPM</th><th className="num">P</th><th className="num">Adjusted P</th></tr></thead>
          <tbody>{de.rows.slice(0, 12).map((r) => <tr key={r.gene} className={r.gene === sel ? 'is-sig' : ''} onClick={() => setSel(r.gene)}><td>{r.gene}</td><td className="num">{fmtNum(r.log2fc)}</td><td className="num">{fmtNum(r.meanExpr)}</td><td className="num">{fmtP(r.p)}</td><td className="num">{fmtP(r.padj)}</td></tr>)}</tbody>
        </table>
      )}
    </>
  );

  const label = ds.cellTypes.find((c) => c.id === type)!.label;
  const top = de.rows[0];
  const claims: ClaimStack[] = de.rows.length ? [{
    statement: `Gene expression changes within ${label}`, simulated: true,
    layers: {
      observed: { text: `${sig.length} of ${de.genesTested} genes (${nUp} up, ${sig.length - nUp} down in disease) pass |log2FC| ≥ ${lfc} and adjusted P < ${fdr}. Smallest P: ${top.gene}, log2FC ${fmtNum(top.log2fc)}.` },
      statistical: { text: `Pseudobulk Welch t-test on log2 CPM (${de.nControl} vs ${de.nDisease} donors), Benjamini-Hochberg over ${de.genesTested} genes; ${top.gene} adjusted P = ${fmtP(top.padj)}.`, test: 'Pseudobulk Welch t-test on log2 CPM, BH', adjP: top.padj, runId: RUN(ds, `de-${type}`) },
      hypothesis: { text: 'A coordinated program may differ between conditions in this cell type. A test would be an independent cohort and a perturbation experiment.' },
    },
  }] : [];

  const controls = (
    <>
      <Select label="Cell type" value={type} onChange={setType} options={ds.cellTypes.map((c, i) => ({ value: c.id, label: `${c.short} (${ds.pseudobulk.cellCounts[i].reduce((a, b) => a + b, 0)} cells)` }))} />
      {!embedded && <Select label="Adjusted P below" value={fdr} onChange={setFdr} options={[{ value: '0.05', label: '0.05' }, { value: '0.1', label: '0.1' }, { value: '0.25', label: '0.25' }]} />}
      {!embedded && <Select label="|log2FC| at least" value={lfc} onChange={setLfc} options={[{ value: '0', label: '0' }, { value: '0.5', label: '0.5' }, { value: '1', label: '1' }]} />}
      {!embedded && <Button disabled={!de.rows.length} onClick={() => setSaved(downloadText(`de_${type}.csv`, toCsv(de.rows, ['gene', 'log2fc', 'meanExpr', 't', 'df', 'p', 'padj']), 'text/csv') ? `Saved de_${type}.csv` : 'Download blocked by the browser.')}>Download results</Button>}
      {saved && <span className="small" role="status">{saved}</span>}
    </>
  );
  return (
    <VizPanel viewKey="differential" title="Differential expression" embedded={embedded} controls={controls} figure={figure} claims={claims}
      caption={<>Pseudobulk differential expression in {label}, disease versus control. {de.excludedDonors.length ? `Excluded donors (fewer than ${de.options.minCells} cells): ${de.excludedDonors.join(', ')}. ` : ''}Simulated counts; effects were assigned at random to synthetic gene IDs.</>}
      record={{
        dataset: `${ds.meta.title}. Simulated donor-level pseudobulk counts for ${ds.pseudobulk.genes.length} synthetic genes (IDs SIM0001 onward).`,
        method: 'Counts summed per donor within one cell type, converted to log2 CPM; disease minus control.',
        test: 'Welch two-sample t-test per gene (donors as replicates); Benjamini-Hochberg across tested genes. Demo stand-in for edgeR, DESeq2 or limma-voom.',
        parameters: [['Cell type', label], ['Minimum cells per donor', String(de.options.minCells)], ['Minimum total counts per gene', String(de.options.minTotalCounts)], ['Adjusted P threshold', fdr], ['|log2FC| threshold', lfc], ['Donors used', `${de.nControl} control, ${de.nDisease} disease`]],
        interpretation: 'Genes in colour are candidates. They are supported statistically only to the extent that four donors per group allow.',
        limitations: ['With 4 donors per group, power is limited and effect sizes of significant genes tend to be overstated.', 'A t-test on log2 CPM ignores the count-model mean-variance relationship that edgeR and DESeq2 model.', 'Gene IDs are synthetic; no gene here has a biological meaning.'],
      }} />
  );
}
