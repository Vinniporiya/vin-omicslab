import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { prefersReducedMotion, useTheme } from '../app/theme';
import { useElementWidth } from './useWidth';

export interface ScatterProps {
  x: ArrayLike<number>; y: ArrayLike<number>;
  color: (i: number) => string;
  alpha?: (i: number) => number;
  /** draw order (later = on top) */
  order?: ArrayLike<number>;
  radius?: number; aspect?: number; equal?: boolean;
  /** cells settle from a diffuse cloud into the embedding once on mount (skipped for reduced motion) */
  animate?: boolean;
  axes?: [string, string];
  tooltip?: (i: number) => string;
  ariaLabel: string;
}

const PAD = 0.05;
export function ScatterCanvas(p: ScatterProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const width = useElementWidth(wrap);
  const theme = useTheme();
  const height = Math.max(160, Math.round(width * (p.aspect ?? 0.8)));
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const progress = useRef(p.animate && !prefersReducedMotion() ? 0 : 1);
  const [, force] = useState(0);
  const n = p.x.length;


  const geo = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { const a = p.x[i], b = p.y[i]; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
    const w = width * (1 - 2 * PAD), h = height * (1 - 2 * PAD);
    let sx = w / (x1 - x0 || 1), sy = h / (y1 - y0 || 1);
    if (p.equal) sx = sy = Math.min(sx, sy);
    const ox = (width - (x1 - x0) * sx) / 2, oy = (height - (y1 - y0) * sy) / 2;
    const X = new Float32Array(n), Y = new Float32Array(n);
    for (let i = 0; i < n; i++) { X[i] = ox + (p.x[i] - x0) * sx; Y[i] = height - (oy + (p.y[i] - y0) * sy); }
    // deterministic diffuse start positions for the settle animation
    const SX = new Float32Array(n), SY = new Float32Array(n);
    let s = 12345;
    const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.5; SX[i] = width / 2 + Math.cos(a) * d * width; SY[i] = height / 2 + Math.sin(a) * d * height; }
    return { X, Y, SX, SY };
  }, [p.x, p.y, width, height, p.equal, n]);

  useLayoutEffect(() => {
    const c = cv.current; if (!c || !width) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr); c.height = Math.round(height * dpr);
  }, [width, height]);

  const draw = (t: number) => {
    const c = cv.current; if (!c || !width) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const e = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
    const rad = (p.radius ?? 2) * Math.min(1, Math.max(0.62, width / 560));
    for (let k = 0; k < n; k++) {
      const i = p.order ? p.order[k] : k;
      const x = geo.SX[i] + (geo.X[i] - geo.SX[i]) * e, y = geo.SY[i] + (geo.Y[i] - geo.SY[i]) * e;
      ctx.globalAlpha = (p.alpha ? p.alpha(i) : 0.85) * (0.35 + 0.65 * e);
      ctx.fillStyle = p.color(i);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (p.axes) {
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#999';
      ctx.strokeStyle = muted; ctx.fillStyle = muted; ctx.lineWidth = 1; ctx.font = '11px "IBM Plex Sans", system-ui, sans-serif';
      ctx.beginPath(); ctx.moveTo(10, height - 34); ctx.lineTo(10, height - 10); ctx.lineTo(34, height - 10); ctx.stroke();
      ctx.fillText(p.axes[0], 40, height - 6);
      ctx.save(); ctx.translate(8, height - 40); ctx.rotate(-Math.PI / 2); ctx.fillText(p.axes[1], 0, 0); ctx.restore();
    }
  };

  // redraw on every render (data, colours, hover) and while the settle animation runs
  useEffect(() => { draw(progress.current); });
  useEffect(() => {
    if (progress.current >= 1 || !width) return;
    let raf = 0; const t0 = performance.now(); const D = 1500;
    const tick = (now: number) => { progress.current = Math.min(1, (now - t0) / D); draw(progress.current); if (progress.current < 1) raf = requestAnimationFrame(tick); else force((v) => v + 1); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width > 0]);
  void theme;

  const onMove = (ev: ReactPointerEvent) => {
    if (!p.tooltip || progress.current < 1) return;
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    let best = -1, bd = ev.pointerType === 'touch' ? 400 : 100;
    for (let i = 0; i < n; i++) { if (p.alpha && p.alpha(i) < 0.2) continue; const d = (geo.X[i] - mx) ** 2 + (geo.Y[i] - my) ** 2; if (d < bd) { bd = d; best = i; } }
    setHover(best >= 0 ? { i: best, px: geo.X[best], py: geo.Y[best] } : null);
  };

  return (
    <div className="scatter" ref={wrap} style={{ height }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(ev) => { if (ev.pointerType !== 'touch') setHover(null); }}>
      <canvas ref={cv} style={{ width, height }} role="img" aria-label={p.ariaLabel} />
      {hover && p.tooltip && (
        <>
          <span className="scatter-ring" style={{ left: hover.px, top: hover.py }} />
          <div className="plot-tip" style={{ left: Math.min(hover.px + 12, Math.max(0, width - 180)), top: Math.max(4, hover.py - 44) }}>{p.tooltip(hover.i)}</div>
        </>
      )}
    </div>
  );
}
