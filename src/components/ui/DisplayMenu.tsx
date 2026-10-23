import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PALETTES, THEMES, updateDisplay, useDisplay } from '../../app/theme';

const SWATCH: Record<string, [string, string, string]> = {
  system: ['#181622', '#f8f6fa', '#e68ca8'], dark: ['#181622', '#2a2639', '#e68ca8'], light: ['#f8f6fa', '#ffffff', '#b03a60'],
  journal: ['#fbf8f1', '#efe9dc', '#8e2b2b'], contrast: ['#000000', '#1c1c1c', '#ffa3c4'],
};
const PAL: Record<string, string[]> = {
  default: ['#4C9BE8', '#2FB5A5', '#7DBB5A', '#E8A23A', '#E0607E', '#9B7FD1'],
  okabe: ['#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
};

/** Theme and data-palette picker. Radio groups, so it works with keyboard and screen readers without custom roles. */
export function DisplayMenu() {
  const d = useDisplay();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const [pos, setPos] = useState<{ top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const place = () => setPos(window.innerWidth < 600 ? { top: ref.current!.getBoundingClientRect().bottom + 8 } : null);
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, { passive: true });
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place); };
  }, [open]);
  const current = THEMES.find((t) => t.id === d.theme)!;
  return (
    <div className="display-menu" ref={ref}>
      <button type="button" className="icon-btn" aria-expanded={open} aria-controls="display-panel" onClick={() => setOpen(!open)} title="Theme and colours">
        <span className="dm-dot" style={{ background: SWATCH[d.theme][2] }} aria-hidden="true" />Display<span className="sr-only">: {current.label}</span>
      </button>
      {open && (
        <div id="display-panel" className={`dm-panel${pos ? ' is-pinned' : ''}`} style={pos ? { top: pos.top, maxHeight: `calc(100vh - ${pos.top + 12}px)` } : undefined} role="dialog" aria-label="Display settings">
          <fieldset>
            <legend>Theme</legend>
            {THEMES.map((t) => (
              <label key={t.id} className={`dm-opt${d.theme === t.id ? ' is-on' : ''}`}>
                <input type="radio" name="dm-theme" value={t.id} checked={d.theme === t.id} onChange={() => updateDisplay({ theme: t.id })} />
                <span className="dm-sw" aria-hidden="true">{SWATCH[t.id].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                <span><strong>{t.label}</strong><small>{t.note}</small></span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Data colours</legend>
            {PALETTES.map((p) => (
              <label key={p.id} className={`dm-opt${d.palette === p.id ? ' is-on' : ''}`}>
                <input type="radio" name="dm-pal" value={p.id} checked={d.palette === p.id} onChange={() => updateDisplay({ palette: p.id })} />
                <span className="dm-sw dm-sw-pal" aria-hidden="true">{PAL[p.id].map((c) => <i key={c} style={{ background: c }} />)}</span>
                <span><strong>{p.label}</strong><small>{p.note}</small></span>
              </label>
            ))}
          </fieldset>
          <p className="small muted dm-foot">Saved in this browser. Applies to every figure, including downloaded ones.</p>
        </div>
      )}
    </div>
  );
}
