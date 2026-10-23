import { useEffect, useSyncExternalStore } from 'react';

/**
 * Display settings: interface theme and data palette, chosen independently.
 * Themes are CSS token sets (styles/tokens.css). "system" follows the OS light/dark preference live.
 * The data palette recolours categorical data (cell types, donors); see data/useDataset.ts.
 */
export type ThemeChoice = 'system' | 'dark' | 'light' | 'journal' | 'contrast';
export type Theme = Exclude<ThemeChoice, 'system'>;
export type DataPalette = 'default' | 'okabe';
export interface DisplaySettings { theme: ThemeChoice; palette: DataPalette }

export const THEMES: { id: ThemeChoice; label: string; note: string }[] = [
  { id: 'system', label: 'System', note: 'Follows your device, light or dark.' },
  { id: 'dark', label: 'Hematoxylin', note: 'Dark scientific interface (default).' },
  { id: 'light', label: 'Eosin', note: 'Light interface for daytime reading.' },
  { id: 'journal', label: 'Journal', note: 'Warm paper and ink, for figures and printing.' },
  { id: 'contrast', label: 'High contrast', note: 'Maximum contrast, thicker focus rings.' },
];
export const PALETTES: { id: DataPalette; label: string; note: string }[] = [
  { id: 'default', label: 'Histology', note: 'Default categorical colours.' },
  { id: 'okabe', label: 'Colour-vision safe', note: 'Okabe-Ito colours, distinguishable with common colour-vision deficiencies.' },
];

const KEY = 'vinomicslab-display';
const DARK_Q = '(prefers-color-scheme: dark)';
const isTheme = (v: unknown): v is ThemeChoice => THEMES.some((t) => t.id === v);

function load(): DisplaySettings {
  const fallback: DisplaySettings = { theme: 'dark', palette: 'default' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { theme: isTheme(v.theme) ? v.theme : 'dark', palette: v.palette === 'okabe' ? 'okabe' : 'default' };
    }
    const legacy = localStorage.getItem('vinomicslab-theme'); // earlier builds stored only 'dark' | 'light'
    if (legacy === 'light' || legacy === 'dark') return { ...fallback, theme: legacy };
  } catch { /* storage unavailable */ }
  return fallback;
}

const osDark = () => typeof matchMedia !== 'function' || matchMedia(DARK_Q).matches;
let settings = load();
let resolved: Theme = 'dark';
const subs = new Set<() => void>();
let snapshot: DisplaySettings & { resolved: Theme } = { ...settings, resolved };

function apply() {
  resolved = settings.theme === 'system' ? (osDark() ? 'dark' : 'light') : settings.theme;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-palette', settings.palette);
  snapshot = { ...settings, resolved };
  subs.forEach((f) => f());
}

export function initTheme(): void {
  apply();
  if (typeof matchMedia === 'function') matchMedia(DARK_Q).addEventListener('change', () => settings.theme === 'system' && apply());
}
export function updateDisplay(next: Partial<DisplaySettings>): void {
  settings = { ...settings, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* choice lasts for this page view */ }
  apply();
}
/** Back-compat helper used by earlier code paths. */
export const setTheme = (t: ThemeChoice): void => updateDisplay({ theme: t });

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useDisplay(): DisplaySettings & { resolved: Theme } {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
/** The theme actually in force (system resolved to dark or light). Charts drawn in canvas or inline colour use this. */
export function useTheme(): Theme { return useDisplay().resolved; }
export const isDarkTheme = (t: Theme): boolean => t === 'dark' || t === 'contrast';

export const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Keeps document <meta name="theme-color"> in step so mobile browser chrome matches the page. */
export function useThemeColorMeta(): void {
  const t = useTheme();
  useEffect(() => {
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
    m.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#181622');
  }, [t]);
}
