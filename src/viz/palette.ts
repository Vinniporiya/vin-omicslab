import { isDarkTheme, type DataPalette, type Theme } from '../app/theme';

/** Scientific colour scales. Categorical cell-type colours are applied per data palette in data/useDataset.ts. */
export const EXPR_RAMP = ['#5a5672', '#8a5d9c', '#d0658e', '#f0a05c', '#ffe08a'];
/** Blue against orange stays distinct under the common colour-vision deficiencies, so both palettes share it. */
export const CONDITION_COLOR = { Control: '#3D8BC9', Disease: '#E08A1E' } as const;
const DONOR_DEFAULT = ['#4C9BE8', '#2FB5A5', '#7DBB5A', '#E8A23A', '#C77B3D', '#E0607E', '#9B7FD1', '#8C9BA8'];
const OKABE = { orange: '#E69F00', sky: '#56B4E9', green: '#009E73', yellow: '#F0E442', blue: '#0072B2', vermillion: '#D55E00', purple: '#CC79A7', grey: '#999999' };
export const NEG = '#4C83C4', POS = '#D9556F';

/** Okabe-Ito assignment for the nine cell types. Eight colours exist, so the ninth is the theme's ink colour. */
export function okabeTypeColors(theme: Theme): Record<string, string> {
  return { CD4T: OKABE.sky, CD8T: OKABE.green, NK: OKABE.yellow, B: OKABE.blue, Plasma: OKABE.purple, Myeloid: OKABE.vermillion, Fibro: OKABE.orange, Endo: OKABE.grey, Epi: isDarkTheme(theme) ? '#F2F0F7' : '#1A1A1A' };
}
export function donorColors(p: DataPalette): string[] {
  return p === 'okabe' ? [OKABE.sky, OKABE.blue, OKABE.green, OKABE.yellow, OKABE.orange, OKABE.vermillion, OKABE.purple, OKABE.grey] : DONOR_DEFAULT;
}

const hex = (h: string): [number, number, number] => {
  const s = h.trim().replace('#', '');
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
export function mix(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b), u = Math.min(1, Math.max(0, t));
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * u)},${Math.round(A[1] + (B[1] - A[1]) * u)},${Math.round(A[2] + (B[2] - A[2]) * u)})`;
}
export function ramp(stops: string[], t: number): string {
  const u = Math.min(1, Math.max(0, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(u));
  return mix(stops[i], stops[i + 1], u - i);
}
export const seqColor = (t: number): string => ramp(EXPR_RAMP, t);
/** Diverging scale: t in [-1, 1]; `mid` should match the current surface so zero reads as neutral. */
export const divColor = (t: number, mid: string): string => (t < 0 ? mix(mid, NEG, -t) : mix(mid, POS, t));
const MID: Record<Theme, string> = { dark: '#2a2639', light: '#efecf3', journal: '#efe9dc', contrast: '#1c1c1c' };
export const surfaceMid = (theme: Theme): string => MID[theme];
/** Reads a CSS custom property from the root, for canvas drawing. */
export const cssVar = (name: string, fallback: string): string =>
  (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback;
