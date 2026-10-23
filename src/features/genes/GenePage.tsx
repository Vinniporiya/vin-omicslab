import { useMemo, useRef } from 'react';
import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DemoStamp } from '../../components/science/badges';
import { EvidenceStack } from '../../components/science/EvidenceStack';
import { MethodRecord } from '../../components/science/VizPanel';
import { FigureTools } from '../../components/science/FigureTools';
import { GenomeTrack, NeighbourNote, fmtBp, fmtCoord } from '../../components/genome/GenomeTrack';
import { GENE_GROUPS, LR_PAIRS, PANEL, PROGRAMS, REGULONS } from '../../data/demo/genes';
import { useDataset } from '../../data/useDataset';
import type { OmicsDataset } from '../../data/dataset';
import { geneProfile, MIN_EXPR, type GeneProfile } from '../../lib/analysis/geneStats';
import { geneSummaries } from '../../lib/analysis/summary';
import type { ClaimStack } from '../../lib/evidence';
import { fmtNum, fmtP } from '../../lib/format';
import { bandAt, externalLinks, fetchChromosome, fetchGene, fetchNeighbours, type GeneModel, type Sourced } from '../../lib/genome/ensembl';
import { useAsync } from '../../lib/useAsync';
import { ScatterCanvas } from '../../viz/ScatterCanvas';
import { CONDITION_COLOR, seqColor } from '../../viz/palette';

const PANEL_SET = new Set(PANEL);
const GroupLabel = (g: string) => GENE_GROUPS.find((x) => x.id === g)?.label ?? g;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function GenomeSection({ symbol }: { symbol: string }) {
  const gene = useAsync<Sourced<GeneModel>>(`gene:${symbol}`, () => fetchGene(symbol));
  const g = gene.status === 'ok' ? gene.data.data : null;
  const chr = useAsync(g ? `chr:${g.chr}` : null, () => fetchChromosome(g!.chr));
  const nb = useAsync(g ? `nb:${g.id}` : null, () => fetchNeighbours(g!.chr, g!.start - 250_000, g!.end + 250_000));
  const figRef = useRef<HTMLDivElement>(null);

  if (gene.status === 'loading' || gene.status === 'idle') return <p className="empty" role="status">Loading the gene model from Ensembl.</p>;
  if (gene.status === 'error') return (
    <div className="notice" role="status">
      <strong>Genome annotation is unavailable.</strong> {gene.error.message} Nothing is shown in its place: this platform does not store or invent coordinates.
      <div className="btn-row"><Button onClick={gene.retry}>Try again</Button><a className="btn btn-quiet" href={externalLinks(symbol)[0].href} target="_blank" rel="noreferrer">Open {symbol} in Ensembl</a></div>
    </div>
  );
  const m = gene.data.data;
  const canon = m.transcripts.find((t) => t.canonical) ?? m.transcripts[0];
  const cdsLen = canon?.cds ? canon.exons.reduce((a, e) => a + Math.max(0, Math.min(e.end, canon.cds!.end) - Math.max(e.start, canon.cds!.start) + 1), 0) : 0;
  const band = chr.status === 'ok' ? bandAt(chr.data.data, (m.start + m.end) / 2) : null;
  return (
    <>
      <div className="gene-facts">
        <dl className="facts">
          <div><dt>Location</dt><dd><code>chr{m.chr}:{fmtCoord(m.start)}-{fmtCoord(m.end)}</code></dd></div>
          <div><dt>Cytoband</dt><dd>{band ?? (chr.status === 'loading' ? 'loading' : 'not available')}</dd></div>
          <div><dt>Strand</dt><dd>{m.strand === 1 ? 'Forward (+)' : 'Reverse (−)'}</dd></div>
          <div><dt>Gene span</dt><dd>{fmtBp(m.end - m.start + 1)}</dd></div>
          <div><dt>Biotype</dt><dd>{m.biotype.replace(/_/g, ' ')}</dd></div>
          <div><dt>Transcripts</dt><dd>{m.transcripts.length}</dd></div>
          <div><dt>Canonical transcript</dt><dd>{canon ? <>{canon.name}, {canon.exons.length} exons{cdsLen ? `, CDS ${fmtCoord(cdsLen)} bp (${fmtCoord(Math.round(cdsLen / 3) - 1)} aa)` : ', non-coding'}</> : 'none'}</dd></div>
          <div><dt>Ensembl ID</dt><dd><a className="link-strong" href={externalLinks(symbol, m.id)[0].href} target="_blank" rel="noreferrer">{m.id}</a></dd></div>
        </dl>
      </div>
      <div ref={figRef}>
        <GenomeTrack gene={m} chr={chr.status === 'ok' ? chr.data.data : null} neighbours={nb.status === 'ok' ? nb.data.data : null} panel={PANEL_SET} />
      </div>
      {nb.status === 'ok' && <NeighbourNote count={nb.data.data.length} />}
      {(chr.status === 'error' || nb.status === 'error') && <p className="small muted" role="status">{chr.status === 'error' ? 'Chromosome bands could not be loaded. ' : ''}{nb.status === 'error' ? 'Neighbouring genes could not be loaded.' : ''}</p>}
      <FigureTools target={figRef} name={`${symbol}-genome-track`} footer={`${symbol} · Ensembl ${m.assembly} · ${m.id} · retrieved ${when(gene.data.retrievedAt)}`} />
      <p className="source-line small"><Badge tone="verified">Live annotation</Badge> Source: Ensembl REST API, {m.assembly}. Retrieved {when(gene.data.retrievedAt)}{gene.data.cached ? ' (cached in this browser)' : ''}.</p>
    </>
  );
}

function StripPlot({ ds, prof }: { ds: OmicsDataset; prof: GeneProfile }) {
  const W = 560, rowH = 30, m = { l: 74, r: 14, t: 8, b: 32 };
  const H = m.t + m.b + prof.rows.length * rowH;
  const all = prof.rows.flatMap((r) => [...r.control, ...r.disease]);
  const hi = Math.max(0.5, ...all) * 1.08;
  const x = (v: number) => m.l + (v / hi) * (W - m.l - m.r);
  const tk = [0, 1, 2, 3, 4, 5].filter((t) => t <= hi);
  const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Donor-level mean expression of ${prof.gene} by cell type and condition`}>
      {tk.map((t) => <g key={t}><line className="grid" x1={x(t)} x2={x(t)} y1={m.t} y2={H - m.b} /><text className="svg-label" x={x(t)} y={H - m.b + 14} textAnchor="middle">{t}</text></g>)}
      {prof.rows.map((r, i) => {
        const y = m.t + i * rowH + rowH / 2, ct = ds.cellTypes[r.typeIdx];
        const sig = r.testable && r.padj < 0.05;
        return (
          <g key={ct.id}>
            <rect x={m.l - 70} y={y - 4} width={8} height={8} rx={4} fill={ct.color} />
            <text className={`svg-label${sig ? ' is-focus' : ''}`} x={m.l - 58} y={y + 4}>{ct.short}{sig ? ' *' : ''}</text>
            {(['control', 'disease'] as const).map((k, j) => {
              const vals = r[k], yy = y + (j ? 5 : -5), c = CONDITION_COLOR[k === 'control' ? 'Control' : 'Disease'];
              const mu = avg(vals);
              return (
                <g key={k}>
                  {Number.isFinite(mu) && <line x1={x(mu)} x2={x(mu)} y1={yy - 5} y2={yy + 5} stroke={c} strokeWidth={2.5} />}
                  {vals.map((v, n) => <circle key={n} cx={x(v)} cy={yy} r={3} fill={c} fillOpacity={0.75}><title>{`${ct.label}, ${k}: donor mean ${v.toFixed(2)}`}</title></circle>)}
                </g>
              );
            })}
          </g>
        );
      })}
      <text className="svg-label" x={(m.l + W - m.r) / 2} y={H - 4} textAnchor="middle">Mean expression per donor (simulated, log-normalised scale)</text>
    </svg>
  );
}

function ExpressionSection({ ds, symbol }: { ds: OmicsDataset; symbol: string }) {
  const prof = useMemo(() => geneProfile(ds, symbol), [ds, symbol]);
  const S = geneSummaries(ds)[symbol];
  const L = ds.landscape, e = L.expr[symbol], sp = ds.spatial, se = sp.expr[symbol];
  const maxE = useMemo(() => Math.max(1e-6, ...Array.from(e)), [e]);
  const maxS = useMemo(() => Math.max(1e-6, ...Array.from(se ?? [0])), [se]);
  const order = useMemo(() => Uint32Array.from(Array.from({ length: L.n }, (_, i) => i).sort((a, b) => e[a] - e[b])), [e, L.n]);
  const sOrder = useMemo(() => (se ? Uint32Array.from(Array.from({ length: sp.n }, (_, i) => i).sort((a, b) => se[a] - se[b])) : undefined), [se, sp.n]);
  const prog = PROGRAMS[symbol];
  const figRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLElement>(null);
  const top = ds.cellTypes[prof.topType];
  const tested = prof.rows.filter((r) => r.testable).sort((a, b) => a.p - b.p);
  const best = tested[0];

  const claims: ClaimStack[] = [];
  if (best) {
    const ct = ds.cellTypes[best.typeIdx];
    const planted = prog.disease?.[ct.id];
    const sig = best.padj < 0.05;
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    claims.push({
      statement: sig ? `${symbol} expression differs in ${ct.label}, disease versus control` : `Largest observed difference for ${symbol} (${ct.label}) is not significant`, simulated: true,
      layers: {
        observed: { text: `Mean of donor means: ${fmtNum(mean(best.control))} in control and ${fmtNum(mean(best.disease))} in disease (${best.control.length} vs ${best.disease.length} donors); log2 ratio ${fmtNum(best.log2fc)}.${sig ? '' : ` A Welch test across donors gives adjusted P = ${fmtP(best.padj)}, so this difference is not statistically supported.`}` },
        ...(sig ? { statistical: { text: `Welch t-test on donor means, t = ${fmtNum(best.t)}, df = ${fmtNum(best.df, 1)}; adjusted P = ${fmtP(best.padj)} (Benjamini-Hochberg over ${tested.length} testable cell types).`, test: 'Welch t-test on donor means, BH across cell types', adjP: best.padj, runId: `gene-${symbol}@${ds.meta.fingerprint}` } } : {}),
        inference: { text: planted !== undefined
          ? `The simulator adds +${planted} to this gene's mean in ${ct.label} for disease donors, so ${sig ? 'the test recovered a programmed effect' : 'a programmed effect exists but was not detected with 4 donors per group'}.`
          : `No disease effect is programmed for this gene in ${ct.label}. ${sig ? 'This is a false positive, a reminder of why one test is not evidence.' : 'The difference is sampling noise, as expected.'}` },
      },
    });
  }

  return (
    <>
      <div className="two-col">
        <div>
          <figure className="figure" ref={stripRef}>
            <StripPlot ds={ds} prof={prof} />
            <ul className="legend"><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Control }} />Control donor</span></li><li><span className="legend-item"><span className="swatch" style={{ background: CONDITION_COLOR.Disease }} />Disease donor</span></li><li><span className="legend-item">Bar: group mean · * adjusted P below 0.05</span></li></ul>
            <figcaption>Each dot is one simulated donor's mean expression within a cell type. Donors with fewer than {prof.minCells} cells of a type are excluded.</figcaption>
          </figure>
          <FigureTools target={stripRef} name={`${symbol}-by-cell-type`} footer={`${symbol} · simulated dataset ${ds.meta.fingerprint} · SIMULATED DATA`} />
        </div>
        <div>
          <dl className="facts facts-tight">
            <div><dt>Highest in</dt><dd><span className="swatch" style={{ background: top.color }} />{top.label}, mean {fmtNum(S.mean.all[prof.topType])}, detected in {Math.round(S.pct.all[prof.topType] * 100)}% of cells</dd></div>
            <div><dt>Cell-type specificity (tau)</dt><dd><span className="tau"><span style={{ width: `${prof.tau * 100}%` }} /></span>{fmtNum(prof.tau)} <span className="muted small">0 = uniform, 1 = one cell type</span></dd></div>
            <div><dt>Simulator design input</dt><dd>Elevated in {Object.keys(prog.base).map((k) => ds.cellTypes.find((c) => c.id === k)?.short).join(', ')}{prog.disease ? `; disease shift in ${Object.keys(prog.disease).map((k) => ds.cellTypes.find((c) => c.id === k)?.short).join(', ')}` : '; no disease shift'}. <span className="muted small">This is how the demo data were generated, shown so results can be checked against it.</span></dd></div>
          </dl>
          <table className="table">
            <thead><tr><th>Cell type</th><th className="num">Control</th><th className="num">Disease</th><th className="num">log2 ratio</th><th className="num">Adj. P</th></tr></thead>
            <tbody>{prof.rows.map((r) => {
              const ct = ds.cellTypes[r.typeIdx], mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
              return <tr key={ct.id} className={r.testable && r.padj < 0.05 ? 'is-sig' : ''}><td><span className="swatch" style={{ background: ct.color }} />{ct.short}</td><td className="num">{fmtNum(mean(r.control))}</td><td className="num">{fmtNum(mean(r.disease))}</td><td className="num">{fmtNum(r.log2fc)}</td><td className="num">{r.testable ? fmtP(r.padj) : <span className="muted" title="Too few donors, or not expressed">n/t</span>}</td></tr>;
            })}</tbody>
          </table>
          <p className="small muted">n/t: not tested (fewer than 2 donors per group with {prof.minCells}+ cells, or mean expression below {MIN_EXPR} in both groups).</p>
        </div>
      </div>

      <h3 className="h-sm">Where it is expressed</h3>
      <figure className="figure" ref={figRef}>
        <div className="pair">
          <div><div className="panel-title"><strong>Cell landscape</strong><span className="muted"> {L.n.toLocaleString('en-US')} cells</span></div>
            <ScatterCanvas x={L.x} y={L.y} order={order} color={(i) => seqColor(e[i] / maxE)} alpha={() => 0.9} radius={1.8} aspect={0.8} axes={['UMAP 1', 'UMAP 2']} tooltip={(i) => `${ds.cellTypes[L.type[i]].label}\n${symbol}: ${e[i].toFixed(2)}`} ariaLabel={`Embedding coloured by ${symbol} expression`} /></div>
          {se && <div><div className="panel-title"><strong>Tissue section</strong><span className="muted"> {sp.n.toLocaleString('en-US')} cells</span></div>
            <ScatterCanvas x={sp.x} y={sp.y} order={sOrder} equal color={(i) => seqColor(se[i] / maxS)} alpha={() => 0.9} radius={2.3} aspect={0.8} tooltip={(i) => `${ds.cellTypes[sp.type[i]].label}\n${sp.regionNames[sp.region[i]]}\n${symbol}: ${se[i].toFixed(2)}`} ariaLabel={`Tissue map coloured by ${symbol} expression`} /></div>}
        </div>
        <div className="ramp-legend"><span>low</span><span className="ramp" /><span>high</span><span className="muted">{symbol} expression, scaled per panel (simulated)</span></div>
        <figcaption>Cells ordered so the highest expressers are drawn on top. <Link to={`/explore/landscape?gene=${symbol}`} className="link-strong">Open in the Explorer</Link></figcaption>
      </figure>
      <FigureTools target={figRef} name={`${symbol}-expression-maps`} footer={`${symbol} · simulated dataset ${ds.meta.fingerprint} · SIMULATED DATA`} />

      {claims.length > 0 && (
        <div className="two-col gene-evidence">
          <div><h3 className="h-sm">Evidence for the strongest cell-type difference</h3><EvidenceStack claim={claims[0]} /></div>
          <div><h3 className="h-sm">Method record</h3>
            <MethodRecord r={{
              dataset: `${ds.meta.title} (${ds.meta.id}), fingerprint ${ds.meta.fingerprint}. Simulated.`,
              method: 'Mean expression per donor within each cell type; condition comparison per cell type; tau specificity on cell-type means.',
              test: 'Welch two-sample t-test on donor means (donor is the replicate); Benjamini-Hochberg across testable cell types.',
              parameters: [['Minimum cells per donor', String(prof.minCells)], ['Testable cell types', String(tested.length)], ['Effect size', 'log2((disease + 0.1) / (control + 0.1))']],
              interpretation: 'A difference within one cell type is a lead. A claim needs an independent cohort and, ideally, protein-level confirmation.',
              limitations: ['Four donors per group gives low power and inflated effect sizes among significant results.', 'Expression values are simulated; nothing here describes real biology.', 'Testing nine cell types per gene, across 48 genes, multiplies chances of a false positive beyond the per-gene correction.'],
            }} />
          </div>
        </div>
      )}
    </>
  );
}

function ContextSection({ symbol }: { symbol: string }) {
  const asTf = REGULONS.find((r) => r.tf === symbol);
  const asTarget = REGULONS.filter((r) => r.targets.some((t) => t.gene === symbol));
  const lr = LR_PAIRS.filter((p) => p.ligand === symbol || p.receptor === symbol);
  const G = ({ s }: { s: string }) => (PANEL_SET.has(s) ? <Link to={`/genes/${s}`} className="gene-chip">{s}</Link> : <span className="gene-chip is-off">{s}</span>);
  if (!asTf && !asTarget.length && !lr.length) return <p className="muted">This gene is not part of a demo regulon or ligand-receptor pair.</p>;
  return (
    <div className="context-grid">
      {asTf && <div><h3 className="h-sm">Regulates (as transcription factor)</h3><p className="chips">{asTf.targets.map((t) => <span key={t.gene} className="ctx-item"><G s={t.gene} /><span className="muted small">{t.sign > 0 ? 'activates' : 'represses'}</span></span>)}</p><Link to="/explore/regulation" className="link-strong small">Open the regulatory network</Link></div>}
      {asTarget.length > 0 && <div><h3 className="h-sm">Regulated by</h3><p className="chips">{asTarget.map((r) => <span key={r.tf} className="ctx-item"><G s={r.tf} /><span className="muted small">{r.targets.find((t) => t.gene === symbol)!.sign > 0 ? 'activates' : 'represses'}</span></span>)}</p></div>}
      {lr.length > 0 && <div><h3 className="h-sm">Signalling partners</h3><ul className="plain">{lr.map((p) => <li key={p.label}><G s={p.ligand} /> <span className="muted">ligand to receptor</span> <G s={p.receptor} /></li>)}</ul><Link to="/explore/communication" className="link-strong small">Open cell-cell communication</Link></div>}
      <p className="small muted ctx-note">Regulons here are hand-specified for illustration, not inferred. Ligand-receptor pairs are textbook interactions.</p>
    </div>
  );
}

export function GenePage({ symbol }: { symbol: string }) {
  const ds = useDataset();
  const sym = PANEL.find((g) => g.toUpperCase() === symbol.toUpperCase());
  if (!sym) return (
    <PageHead title="Gene not in the panel" lede={`${symbol} is not one of the ${PANEL.length} genes in this demonstration panel.`}>
      <p><Link to="/genes" className="link-strong">Browse the gene atlas</Link> or <a className="link-strong" href={externalLinks(symbol)[0].href} target="_blank" rel="noreferrer">look it up in Ensembl</a>.</p>
    </PageHead>
  );
  const prog = PROGRAMS[sym];
  const i = PANEL.indexOf(sym), prev = PANEL[(i - 1 + PANEL.length) % PANEL.length], next = PANEL[(i + 1) % PANEL.length];
  return (
    <>
      <PageHead bg="hic" title={sym}>
        <p className="crumb"><Link to="/genes">Gene atlas</Link> / {GroupLabel(prog.group)}</p>
        <GeneDescription symbol={sym} />
        <div className="head-badges"><Badge tone="verified">Genome: live Ensembl annotation</Badge><DemoStamp label="Expression: simulated" /></div>
        <nav className="gene-nav" aria-label="Neighbouring genes in the panel"><Link to={`/genes/${prev}`}>← {prev}</Link><Link to={`/genes/${next}`}>{next} →</Link></nav>
      </PageHead>
      <Section><h2>Genome</h2><GenomeSection symbol={sym} /></Section>
      <Section tone="raised"><h2>Expression in the demonstration dataset</h2>{ds ? <ExpressionSection ds={ds} symbol={sym} /> : <p className="empty">Loading the simulated dataset.</p>}</Section>
      <Section><h2>Regulatory and signalling context</h2><ContextSection symbol={sym} /></Section>
      <Section tone="raised">
        <h2>External resources</h2>
        <ul className="ext-links">{externalLinks(sym).map((l) => <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer"><strong>{l.label}</strong><span>{l.note}</span></a></li>)}</ul>
        <p className="small muted">Links open the external resource's own search for {sym}. This page shows no literature claims about the gene.</p>
      </Section>
    </>
  );
}

/** The gene's full name, from the same Ensembl record (shared cache, so no extra request). */
function GeneDescription({ symbol }: { symbol: string }) {
  const r = useAsync(`gene:${symbol}`, () => fetchGene(symbol));
  if (r.status === 'ok' && r.data.data.description) return <p className="lede">{r.data.data.description.charAt(0).toUpperCase() + r.data.data.description.slice(1)}</p>;
  return <p className="lede">{r.status === 'error' ? 'Full gene name unavailable offline.' : '\u00a0'}</p>;
}
