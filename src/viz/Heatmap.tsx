import { useTheme } from '../app/theme';
import { EXPR_RAMP, divColor, seqColor, surfaceMid } from './palette';

export interface HeatmapProps {
  rows: string[]; cols: string[]; values: number[][];
  /** when given, draws a dot plot: dot area follows sizes (0 to 1), colour follows values */
  sizes?: number[][];
  mode: 'seq' | 'div'; domain: [number, number];
  cell?: [number, number]; labelW?: number; legend: string; sizeLegend?: string;
  colColors?: string[]; title?: (r: number, c: number) => string; ariaLabel: string;
}

export function Heatmap(p: HeatmapProps) {
  const theme = useTheme();
  const [cw, ch] = p.cell ?? [44, 22];
  const lw = p.labelW ?? 120, top = 70;
  const W = lw + p.cols.length * cw + 12, H = top + p.rows.length * ch + 46;
  const [lo, hi] = p.domain;
  const colorOf = (v: number) => (p.mode === 'seq' ? seqColor((v - lo) / (hi - lo || 1)) : divColor(v / Math.max(Math.abs(lo), Math.abs(hi), 1e-9), surfaceMid(theme)));
  const maxR = Math.min(cw, ch) / 2 - 1.5;
  const gid = `hm-${p.ariaLabel.replace(/\W+/g, '')}`;
  return (
    <svg className="heatmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={p.ariaLabel} style={{ maxWidth: W }}>
      {p.cols.map((c, j) => (
        <g key={c} transform={`translate(${lw + j * cw + cw / 2},${top - 8})`}>
          {p.colColors && <rect x={-cw / 2 + 4} y={2} width={cw - 8} height={3} fill={p.colColors[j]} />}
          <text className="svg-label" transform="rotate(-42)" x={0} y={-2}>{c}</text>
        </g>
      ))}
      {p.rows.map((r, i) => (
        <g key={r} transform={`translate(0,${top + i * ch})`}>
          <text className="svg-label" x={lw - 8} y={ch / 2 + 4} textAnchor="end">{r}</text>
          {p.cols.map((c, j) => {
            const v = p.values[i][j];
            const t = p.title ? p.title(i, j) : `${r} in ${c}: ${v.toFixed(2)}`;
            return p.sizes ? (
              <circle key={c} cx={lw + j * cw + cw / 2} cy={ch / 2} r={Math.max(0.8, Math.sqrt(p.sizes[i][j]) * maxR)} fill={colorOf(v)}><title>{t}</title></circle>
            ) : (
              <rect key={c} x={lw + j * cw + 0.5} y={0.5} width={cw - 1} height={ch - 1} fill={colorOf(v)}><title>{t}</title></rect>
            );
          })}
        </g>
      ))}
      <defs>
        <linearGradient id={gid}>
          {p.mode === 'seq'
            ? EXPR_RAMP.map((c, k) => <stop key={k} offset={`${(k / (EXPR_RAMP.length - 1)) * 100}%`} stopColor={c} />)
            : [<stop key="a" offset="0%" stopColor={divColor(-1, surfaceMid(theme))} />, <stop key="b" offset="50%" stopColor={surfaceMid(theme)} />, <stop key="c" offset="100%" stopColor={divColor(1, surfaceMid(theme))} />]}
        </linearGradient>
      </defs>
      <g transform={`translate(${lw},${top + p.rows.length * ch + 16})`}>
        <rect width={140} height={8} fill={`url(#${gid})`} />
        <text className="svg-label" x={0} y={22}>{lo.toFixed(1)}</text>
        <text className="svg-label" x={140} y={22} textAnchor="end">{hi.toFixed(1)}</text>
        <text className="svg-label" x={152} y={8}>{p.legend}</text>
        {p.sizes && p.sizeLegend && <text className="svg-label" x={152} y={22}>{p.sizeLegend}</text>}
      </g>
    </svg>
  );
}
