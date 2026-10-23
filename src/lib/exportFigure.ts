/**
 * Figure export. SVG figures are cloned with computed styles inlined, so theme variables resolve and the file opens
 * correctly in Illustrator or Inkscape. Canvas figures are composed into a PNG together with their HTML legend and a
 * provenance footer, because a scatter plot without its legend cannot be read.
 */
const PROPS = ['stop-color', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline'];

function saveBlob(blob: Blob, name: string): boolean {
  try {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); return true;
  } catch { return false; }
}
const bg = () => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#000000';
const muted = () => getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#666666';

/** Joins a legend item's text pieces with spaces; on screen they are separated by CSS margins, which textContent drops. */
function legendText(el: Element): string {
  const parts: string[] = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) { const t = (n.textContent ?? '').trim(); if (t) parts.push(t); }
  return parts.join(' ');
}

export function svgString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll('*'))], dst = [clone, ...Array.from(clone.querySelectorAll('*'))];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el as Element), d = dst[i] as SVGElement;
    for (const p of PROPS) { const v = cs.getPropertyValue(p); if (v) d.style.setProperty(p, v); }
    d.removeAttribute('class');
    // theme variables mean nothing outside the page: drop attributes that still reference them (computed values are inlined above)
    for (const a of Array.from(d.attributes)) if (a.value.includes('var(')) d.removeAttribute(a.name);
  });
  const vb = svg.viewBox.baseVal, w = vb && vb.width ? vb.width : svg.clientWidth, h = vb && vb.height ? vb.height : svg.clientHeight;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', String(w)); clone.setAttribute('height', String(h));
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', vb && vb.width ? String(vb.x) : '0'); rect.setAttribute('y', vb && vb.height ? String(vb.y) : '0');
  rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h)); rect.setAttribute('fill', bg());
  clone.insertBefore(rect, clone.firstChild);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

export function exportSvg(root: HTMLElement, name: string): boolean {
  const svg = root.querySelector('svg.chart, svg.heatmap, .genome-track svg, .karyogram svg, svg') as SVGSVGElement | null;
  return !!svg && saveBlob(new Blob([svgString(svg)], { type: 'image/svg+xml' }), `${name}.svg`);
}

function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => res(img); img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(svg));
  });
}

export async function exportPng(root: HTMLElement, name: string, footer: string): Promise<boolean> {
  const S = 2, pad = 16;
  const canvases = Array.from(root.querySelectorAll('canvas')) as HTMLCanvasElement[];
  const svg = canvases.length ? null : (root.querySelector('svg') as SVGSVGElement | null);
  const tiles: { img: CanvasImageSource; w: number; h: number }[] = [];
  if (canvases.length) for (const c of canvases) tiles.push({ img: c, w: c.clientWidth, h: c.clientHeight });
  else if (svg) { const img = await loadSvgImage(svg); const r = svg.getBoundingClientRect(); tiles.push({ img, w: r.width, h: r.height }); }
  if (!tiles.length) return false;
  const legend = Array.from(root.querySelectorAll('.legend li')).map((li) => ({ color: (li.querySelector('.swatch') as HTMLElement | null)?.style.background ?? '', text: legendText(li) })).filter((l) => l.text);
  const W = tiles.reduce((a, t) => a + t.w, 0) + pad * (tiles.length + 1);
  const legendRows = Math.ceil(legend.length / Math.max(1, Math.floor(W / 130)));
  const H = Math.max(...tiles.map((t) => t.h)) + pad * 2 + legendRows * 20 + 26;
  const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
  const ctx = cv.getContext('2d'); if (!ctx) return false;
  ctx.scale(S, S); ctx.fillStyle = bg(); ctx.fillRect(0, 0, W, H);
  let x = pad; for (const t of tiles) { ctx.drawImage(t.img, x, pad, t.w, t.h); x += t.w + pad; }
  let y = pad + Math.max(...tiles.map((t) => t.h)) + 14; x = pad;
  ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif'; ctx.textBaseline = 'middle';
  for (const l of legend) {
    const lw = ctx.measureText(l.text).width + 30;
    if (x + lw > W - pad) { x = pad; y += 20; }
    if (l.color) { ctx.fillStyle = l.color; ctx.beginPath(); ctx.arc(x + 5, y, 5, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = ink(); ctx.fillText(l.text, x + 14, y); x += lw;
  }
  ctx.fillStyle = muted(); ctx.font = '11px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillText(footer, pad, H - 12);
  return new Promise((res) => cv.toBlob((b) => res(!!b && saveBlob(b, `${name}.png`)), 'image/png'));
}
