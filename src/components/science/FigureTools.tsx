import { useState, type RefObject } from 'react';
import { exportPng, exportSvg } from '../../lib/exportFigure';

/** Download the figure inside `target` as SVG (vector, SVG figures only) or PNG (any figure, with legend and provenance). */
export function FigureTools({ target, name, footer }: { target: RefObject<HTMLElement | null>; name: string; footer: string }) {
  const [msg, setMsg] = useState('');
  const hasSvgOnly = () => !!target.current && !target.current.querySelector('canvas') && !!target.current.querySelector('svg');
  const run = async (kind: 'svg' | 'png') => {
    if (!target.current) return;
    const ok = kind === 'svg' ? exportSvg(target.current, name) : await exportPng(target.current, name, footer);
    setMsg(ok ? `Saved ${name}.${kind}` : 'Download failed or was blocked by the browser.');
  };
  return (
    <div className="viz-tools" role="group" aria-label="Download figure">
      <span className="small muted">Figure</span>
      <button type="button" className="chip" onClick={() => run('png')}>PNG</button>
      <button type="button" className="chip" onClick={() => (hasSvgOnly() ? run('svg') : setMsg('This figure is drawn on canvas; use PNG.'))}>SVG</button>
      <span className="small" role="status">{msg}</span>
    </div>
  );
}
