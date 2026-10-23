import { useEffect, useMemo, useState } from 'react';
import type { OmicsDataset } from './dataset';
import { defaultProvider } from './provider';
import { useDisplay, type DataPalette, type Theme } from '../app/theme';
import { okabeTypeColors } from '../viz/palette';

/**
 * Views call this hook and never touch the generator: swapping the provider swaps demo data for real data.
 * The colour-vision-safe palette returns a recoloured view of the same dataset. Arrays are shared, not copied,
 * and each view is built once per (dataset, palette, theme), so analysis caches are rebuilt at most once per view.
 */
const views = new WeakMap<OmicsDataset, Map<string, OmicsDataset>>();
export function recolor(ds: OmicsDataset, palette: DataPalette, theme: Theme): OmicsDataset {
  if (palette === 'default') return ds;
  const key = `${palette}:${theme}`;
  let m = views.get(ds); if (!m) { m = new Map(); views.set(ds, m); }
  let v = m.get(key);
  if (!v) {
    const c = okabeTypeColors(theme);
    v = { ...ds, cellTypes: ds.cellTypes.map((t) => ({ ...t, color: c[t.id] ?? t.color })) };
    m.set(key, v);
  }
  return v;
}

export function useDataset(): OmicsDataset | null {
  const [ds, setDs] = useState<OmicsDataset | null>(null);
  const { palette, resolved } = useDisplay();
  useEffect(() => { let live = true; defaultProvider.load().then((d) => live && setDs(d)); return () => { live = false; }; }, []);
  return useMemo(() => (ds ? recolor(ds, palette, resolved) : null), [ds, palette, resolved]);
}
