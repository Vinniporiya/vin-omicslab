import type { ReactElement } from 'react';
import { makeRng } from '../../data/demo/rng';
import type { GlyphKind } from '../../data/content/domains';

const C = ['#4C9BE8', '#2FB5A5', '#E8A23A', '#E0607E', '#9B7FD1', '#7DBB5A'];
/** Small decorative sketches of each domain's characteristic figure. They are drawings, not data. */
export function DomainGlyph({ kind }: { kind: GlyphKind }) {
  const r = makeRng(kind.length * 977 + kind.charCodeAt(0));
  const dots: ReactElement[] = [];
  const dot = (x: number, y: number, c: string, rad = 2.2, o = 0.9) => dots.push(<circle key={dots.length} cx={x} cy={y} r={rad} fill={c} opacity={o} />);
  const line = (x1: number, y1: number, x2: number, y2: number, o = 0.5) => dots.push(<line key={dots.length} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line-strong)" strokeWidth="1" opacity={o} />);
  if (kind === 'cells') { [[36, 40, 0], [78, 26, 1], [112, 52, 3]].forEach(([cx, cy, k]) => { for (let i = 0; i < 34; i++) dot(cx + r.normal(0, 8), cy + r.normal(0, 6.5), C[k]); }); }
  if (kind === 'spatial') { for (let y = 8; y < 78; y += 6) for (let x = 8; x < 152; x += 6) { const d = Math.hypot(x - 62, y - 42); dot(x + r.normal(0, 0.6), y + r.normal(0, 0.6), d < 22 ? C[3] : d < 32 ? C[2] : C[4], 2, d < 22 ? 0.9 : 0.55); } }
  if (kind === 'layers') { [0, 1].forEach((k) => { const oy = 12 + k * 34; dots.push(<path key={`p${k}`} d={`M20,${oy + 24} L44,${oy} L146,${oy} L122,${oy + 24} Z`} fill="var(--surface-2)" stroke="var(--line-strong)" />); for (let i = 0; i < 18; i++) dot(50 + r.next() * 80 - (r.next() * 18), oy + 5 + r.next() * 14, C[k === 0 ? 3 : 1], 2); }); for (let i = 0; i < 6; i++) { const x = 58 + i * 14; line(x, 28, x - 6 + r.normal(0, 4), 62, 0.7); } }
  if (kind === 'repertoire') { for (let i = 0; i < 14; i++) { const h = 62 * Math.pow(0.72, i) + 2; dots.push(<rect key={i} x={14 + i * 10} y={76 - h} width={7} height={h} fill={i < 3 ? C[1] : 'var(--line-strong)'} />); } }
  if (kind === 'tumour') { [30, 21, 12].forEach((rad, i) => dots.push(<circle key={`c${i}`} cx={80} cy={42} r={rad} fill="none" stroke={C[3]} strokeOpacity={0.35 + i * 0.2} />)); for (let i = 0; i < 40; i++) { const a = r.next() * 6.283, d = 30 + r.next() * 22; dot(80 + Math.cos(a) * d * 1.5, 42 + Math.sin(a) * d * 0.9, C[i % 3 === 0 ? 1 : 0], 1.8, 0.8); } }
  if (kind === 'volcano') { for (let i = 0; i < 70; i++) { const x = r.normal(0, 1), y = Math.abs(x) * (0.8 + r.next() * 1.1) + r.next() * 0.3; dot(80 + x * 28, 74 - y * 22, Math.abs(x) > 1 && y > 1.2 ? (x > 0 ? C[3] : C[0]) : 'var(--line-strong)', 2, 0.85); } }
  if (kind === 'boundary') { for (let i = 0; i < 26; i++) { dot(r.normal(52, 14), r.normal(42, 14), C[0], 2.2); dot(r.normal(108, 14), r.normal(42, 14), C[2], 2.2); } dots.push(<path key="b" d="M80,6 C68,26 92,54 80,78" fill="none" stroke="var(--text-2)" strokeDasharray="3 3" />); }
  if (kind === 'molecule') { const pts: [number, number][] = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * 6.283; return [80 + Math.cos(a) * 34, 42 + Math.sin(a) * 26] as [number, number]; }); pts.forEach((p, i) => line(p[0], p[1], pts[(i + 1) % 9][0], pts[(i + 1) % 9][1], 0.8)); line(pts[0][0], pts[0][1], pts[4][0], pts[4][1], 0.6); pts.forEach((p, i) => dot(p[0], p[1], C[i % 6], 4.2)); dot(80, 42, 'var(--text-2)', 3); }
  return <svg viewBox="0 0 160 84" className="glyph" aria-hidden="true">{dots}</svg>;
}
