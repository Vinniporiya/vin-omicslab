import { useRef } from 'react';
import { useElementWidth } from '../../viz/useWidth';
import type { GenomeLocation } from '../../lib/genome/ensembl';

const GROUP_COLOR: Record<string, string> = { marker: 'var(--accent)', signalling: 'var(--ev-literature)', regulator: 'var(--ev-statistical)' };

/** Horizontal karyogram: one bar per chromosome, scaled to length, panel genes placed by their Ensembl coordinates. */
export function Karyogram({ chroms, genes, groupOf }: { chroms: { name: string; length: number }[]; genes: GenomeLocation[]; groupOf: (s: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = Math.max(300, useElementWidth(ref));
  const maxLen = Math.max(...chroms.map((c) => c.length));
  const lw = 40, x = (v: number) => lw + (v / maxLen) * (w - lw - 12);
  let y = 6;
  const rows = chroms.map((c) => {
    const gs = genes.filter((g) => g.chr === c.name).sort((a, b) => a.start - b.start);
    // labels in lanes above the bar so neighbours (e.g. KRT8 and KRT18) never collide
    const ends: number[] = []; const lane: number[] = [];
    for (const g of gs) {
      const cx = x((g.start + g.end) / 2), half = g.symbol.length * 3.4 + 4;
      let l = ends.findIndex((e) => e <= cx - half); if (l < 0) { l = ends.length; ends.push(0); }
      ends[l] = cx + half; lane.push(l);
    }
    const nl = gs.length ? ends.length : 0;
    const top = y + nl * 15; const row = { c, gs, lane, top }; y = top + 26; return row;
  });
  return (
    <div ref={ref} className="karyogram">
      <svg width={w} height={y} viewBox={`0 0 ${w} ${y}`} role="img" aria-label={`Genomic positions of ${genes.length} panel genes on GRCh38 chromosomes`}>
        {rows.map(({ c, gs, lane, top }) => (
          <g key={c.name}>
            <text className="svg-label" x={lw - 8} y={top + 9} textAnchor="end">{c.name}</text>
            <rect x={lw} y={top + 2} width={x(c.length) - lw} height={9} rx={4.5} fill="var(--surface-2)" stroke="var(--line-strong)" />
            {gs.map((g, i) => {
              const cx = x((g.start + g.end) / 2), ly = top - 4 - lane[i] * 15;
              return (
                <a key={g.symbol} href={`#/genes/${g.symbol}`} aria-label={`${g.symbol}, chromosome ${g.chr}, ${(g.start / 1e6).toFixed(2)} Mb`}>
                  <line x1={cx} x2={cx} y1={ly + 3} y2={top + 11} stroke={GROUP_COLOR[groupOf(g.symbol)]} strokeWidth={1} opacity={0.6} />
                  <rect x={cx - 1.5} y={top + 1} width={3} height={11} fill={GROUP_COLOR[groupOf(g.symbol)]} />
                  <text className="svg-label kary-label" x={cx} y={ly} textAnchor="middle" style={{ fill: GROUP_COLOR[groupOf(g.symbol)] }}>{g.symbol}</text>
                  <title>{`${g.symbol}: chr${g.chr}:${g.start.toLocaleString('en-US')}-${g.end.toLocaleString('en-US')}`}</title>
                </a>
              );
            })}
          </g>
        ))}
      </svg>
      <ul className="legend">{Object.entries(GROUP_COLOR).map(([k, v]) => <li key={k}><span className="legend-item"><span className="swatch" style={{ background: v }} />{k === 'marker' ? 'Cell-type marker' : k === 'signalling' ? 'Signalling' : 'Transcription factor'}</span></li>)}</ul>
    </div>
  );
}
