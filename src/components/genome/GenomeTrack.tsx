import { useRef, useState } from 'react';
import { Link } from '../../app/router';
import { useElementWidth } from '../../viz/useWidth';
import type { Chromosome, GeneModel, Neighbour, Transcript } from '../../lib/genome/ensembl';

export const fmtBp = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)} Mb` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)} kb` : `${n} bp`);
export const fmtCoord = (n: number): string => n.toLocaleString('en-US');

const STAIN: Record<string, string> = { gneg: 'var(--surface)', gpos25: 'var(--line)', gpos50: 'var(--line-strong)', gpos75: 'var(--muted)', gpos100: 'var(--text-2)', gvar: 'var(--line-strong)', stalk: 'var(--line)', acen: 'var(--accent-soft)' };

/** Nice tick step for a span in bp, aiming for about `target` ticks. */
function ticks(lo: number, hi: number, target: number): number[] {
  const raw = (hi - lo) / Math.max(1, target), p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

/** Greedy lane assignment so labels and features never overlap. Returns lane per item, in input order. */
function lanes(items: { x0: number; x1: number }[], gap = 6): number[] {
  const ends: number[] = [];
  const order = items.map((_, i) => i).sort((a, b) => items[a].x0 - items[b].x0);
  const lane = new Array(items.length).fill(0);
  for (const i of order) {
    let l = ends.findIndex((e) => e + gap <= items[i].x0);
    if (l < 0) { l = ends.length; ends.push(0); }
    ends[l] = items[i].x1; lane[i] = l;
  }
  return lane;
}

function Ideogram({ chr, gene, w }: { chr: Chromosome; gene: GeneModel; w: number }) {
  const x = (v: number) => 8 + (v / chr.length) * (w - 16);
  const gx = (x(gene.start) + x(gene.end)) / 2;
  const acen = chr.bands.filter((b) => b.stain === 'acen');
  const cen = acen.length ? (acen[0].start + acen[acen.length - 1].end) / 2 : null;
  const H = 18, y = 22;
  return (
    <g>
      <text className="svg-label" x={8} y={12}>chr{chr.name} · {fmtBp(chr.length)}</text>
      <clipPath id="chr-clip"><rect x={8} y={y} width={w - 16} height={H} rx={H / 2} /></clipPath>
      <g clipPath="url(#chr-clip)">
        {chr.bands.length ? chr.bands.map((b) => <rect key={b.name + b.start} x={x(b.start)} y={y} width={Math.max(0.6, x(b.end) - x(b.start))} height={H} fill={STAIN[b.stain] ?? 'var(--line)'}><title>{`${chr.name}${b.name} (${b.stain})`}</title></rect>)
          : <rect x={8} y={y} width={w - 16} height={H} fill="var(--surface-2)" />}
      </g>
      {cen !== null && <path d={`M${x(cen) - 5},${y - 1} L${x(cen)},${y + H / 2} L${x(cen) - 5},${y + H + 1} M${x(cen) + 5},${y - 1} L${x(cen)},${y + H / 2} L${x(cen) + 5},${y + H + 1}`} stroke="var(--bg)" strokeWidth={3} fill="none" />}
      <rect x={8} y={y} width={w - 16} height={H} rx={H / 2} fill="none" stroke="var(--line-strong)" />
      <rect x={gx - 2} y={y - 5} width={4} height={H + 10} fill="var(--accent)" />
      <path d={`M${gx},${y + H + 5} L8,${y + H + 34} M${gx},${y + H + 5} L${w - 8},${y + H + 34}`} stroke="var(--line-strong)" strokeDasharray="3 3" fill="none" />
    </g>
  );
}

function Axis({ lo, hi, x, y, w, label }: { lo: number; hi: number; x: (v: number) => number; y: number; w: number; label?: string }) {
  const tk = ticks(lo, hi, Math.max(3, Math.floor(w / 130)));
  return (
    <g>
      <line className="axis" x1={x(lo)} x2={x(hi)} y1={y} y2={y} />
      {tk.map((t) => <g key={t}><line className="axis" x1={x(t)} x2={x(t)} y1={y} y2={y + 4} /><text className="svg-label" x={x(t)} y={y + 16} textAnchor="middle">{(t / 1e6).toFixed(hi - lo < 2e5 ? 3 : 2)}</text></g>)}
      {label && <text className="svg-label" x={x(hi)} y={y - 6} textAnchor="end">{label}</text>}
    </g>
  );
}

/** Strand chevrons drawn along an intron line. */
function chevrons(x0: number, x1: number, y: number, strand: 1 | -1, every = 26): string {
  let d = '';
  for (let cx = x0 + every / 2; cx < x1 - 4; cx += every) d += strand === 1 ? `M${cx - 3},${y - 3} L${cx},${y} L${cx - 3},${y + 3} ` : `M${cx + 3},${y - 3} L${cx},${y} L${cx + 3},${y + 3} `;
  return d;
}

function TranscriptRow({ t, x, y, chr }: { t: Transcript; x: (v: number) => number; y: number; chr: string }) {
  const n = t.exons.length;
  return (
    <g>
      <line x1={x(t.start)} x2={x(t.end)} y1={y} y2={y} stroke="var(--text-2)" strokeWidth={1} />
      <path d={chevrons(x(t.start), x(t.end), y, t.strand)} stroke="var(--text-2)" fill="none" strokeWidth={1} />
      {t.exons.map((e, i) => {
        const num = t.strand === 1 ? i + 1 : n - i;
        const tip = `${t.name} exon ${num} of ${n}\nchr${chr}:${fmtCoord(e.start)}-${fmtCoord(e.end)} (${fmtCoord(e.end - e.start + 1)} bp)`;
        const parts: { s: number; e: number; cds: boolean }[] = [];
        if (!t.cds) parts.push({ s: e.start, e: e.end, cds: false });
        else {
          const cs = Math.max(e.start, t.cds.start), ce = Math.min(e.end, t.cds.end);
          if (cs > ce) parts.push({ s: e.start, e: e.end, cds: false });
          else { if (e.start < cs) parts.push({ s: e.start, e: cs - 1, cds: false }); parts.push({ s: cs, e: ce, cds: true }); if (ce < e.end) parts.push({ s: ce + 1, e: e.end, cds: false }); }
        }
        return <g key={i}>{parts.map((p, k) => <rect key={k} x={x(p.s)} y={y - (p.cds ? 8 : 4.5)} width={Math.max(1.2, x(p.e) - x(p.s))} height={p.cds ? 16 : 9} fill={t.canonical ? 'var(--accent)' : 'var(--text-2)'} opacity={p.cds ? 1 : 0.75}><title>{tip}</title></rect>)}</g>;
      })}
    </g>
  );
}

export function GenomeTrack({ gene, chr, neighbours, panel }: { gene: GeneModel; chr: Chromosome | null; neighbours: Neighbour[] | null; panel: Set<string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = Math.max(300, useElementWidth(ref));
  const [all, setAll] = useState(false);
  const coding = gene.transcripts;
  const shown = all ? coding : coding.slice(0, 4);
  const pad = Math.max(400, (gene.end - gene.start) * 0.04);
  const lo = gene.start - pad, hi = gene.end + pad;
  const x = (v: number) => 12 + ((v - lo) / (hi - lo)) * (w - 24);

  // neighbourhood track
  const nLo = gene.start - 250_000, nHi = gene.end + 250_000;
  const nx = (v: number) => 12 + ((Math.min(nHi, Math.max(nLo, v)) - nLo) / (nHi - nLo)) * (w - 24);
  const nb = (neighbours ?? []).filter((g) => g.end >= nLo && g.start <= nHi);
  const nItems = nb.map((g) => { const x0 = nx(g.start), x1 = nx(g.end); const lw = g.symbol.length * 6.6 + 8; return { x0: Math.min(x0, (x0 + x1) / 2 - lw / 2), x1: Math.max(x1, (x0 + x1) / 2 + lw / 2) }; });
  const nLane = lanes(nItems);
  const nLanes = Math.min(6, Math.max(1, ...nLane.map((l) => l + 1)));

  let y = 0;
  const yIdeo = y; if (chr) y += 74;
  const yNb = y; if (neighbours) y += 48 + nLanes * 26;
  const yModel = y; y += 50 + shown.length * 34 + 6;
  const H = y;
  const strandWord = gene.strand === 1 ? 'forward' : 'reverse';
  return (
    <div className="genome-track" ref={ref}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Genome view of ${gene.symbol}: chromosome ${gene.chr}, ${fmtCoord(gene.start)} to ${fmtCoord(gene.end)}, ${strandWord} strand, ${coding.length} transcripts`}>
        {chr && <g transform={`translate(0,${yIdeo})`}><Ideogram chr={chr} gene={gene} w={w} /></g>}
        {neighbours && (
          <g transform={`translate(0,${yNb})`}>
            <Axis lo={nLo} hi={nHi} x={nx} y={4} w={w} label={`Neighbourhood ±250 kb, Mb on chr${gene.chr}`} />
            {nb.map((g, i) => {
              const yy = 50 + nLane[i] * 26; if (nLane[i] >= 6) return null;
              const focus = g.id === gene.id, inPanel = panel.has(g.symbol);
              const x0 = nx(g.start), x1 = Math.max(nx(g.end), x0 + 2);
              const fill = focus ? 'var(--accent)' : inPanel ? 'var(--ev-literature)' : g.biotype === 'protein_coding' ? 'var(--text-2)' : 'var(--line-strong)';
              const label = <text className={`svg-label${focus ? ' is-focus' : ''}`} x={(x0 + x1) / 2} y={yy - 5} textAnchor="middle">{g.symbol}{g.strand === 1 ? ' ›' : ' ‹'}</text>;
              return (
                <g key={g.id}>
                  <rect x={x0} y={yy - 2} width={x1 - x0} height={6} fill={fill}><title>{`${g.symbol} (${g.biotype.replace(/_/g, ' ')})\nchr${gene.chr}:${fmtCoord(g.start)}-${fmtCoord(g.end)}, ${g.strand === 1 ? '+' : '−'} strand`}</title></rect>
                  {inPanel && !focus ? <a href={`#/genes/${g.symbol}`}>{label}</a> : label}
                </g>
              );
            })}
          </g>
        )}
        <g transform={`translate(0,${yModel})`}>
          <Axis lo={lo} hi={hi} x={x} y={4} w={w} label={`${gene.symbol} gene model, Mb on chr${gene.chr}`} />
          {shown.map((t, i) => (
            <g key={t.id}>
              <text className={`svg-label${t.canonical ? ' is-focus' : ''}`} x={12} y={50 + i * 34 - 12}>{t.name} · {t.biotype.replace(/_/g, ' ')}{t.canonical ? ' · canonical' : ''}</text>
              <TranscriptRow t={t} x={x} y={50 + i * 34 + 2} chr={gene.chr} />
            </g>
          ))}
        </g>
      </svg>
      <div className="track-foot">
        <span className="track-key"><i className="k-cds" />coding exon <i className="k-utr" />untranslated <i className="k-strand">›</i>strand {gene.strand === 1 ? '+' : '−'}{neighbours && <><i className="k-panel" />panel gene</>}</span>
        {coding.length > 4 && <button type="button" className="btn btn-quiet" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Show 4 transcripts' : `Show all ${coding.length} transcripts`}</button>}
      </div>
    </div>
  );
}

export function NeighbourNote({ count }: { count: number }) {
  return <p className="small muted">{count} genes overlap the ±250 kb window. Blue labels are other genes in this platform's panel and open their pages; <Link to="/genes" className="link-strong">see all panel genes</Link>.</p>;
}
