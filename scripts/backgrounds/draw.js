// Procedural scientific background images for Vin-OmicsLab. Deterministic (seeded), no external images.
// These are illustrations in the style of microscopy and genomics data. They are not data.
'use strict';
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// smooth value noise
function noise2(seed) {
  const r = rng(seed), P = new Float32Array(512 * 512); for (let i = 0; i < P.length; i++) P[i] = r();
  const at = (x, y) => P[((y & 511) << 9) | (x & 511)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
}
function fbm(n, x, y, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * n(x * f, y * f); f *= 2; a *= 0.5; } return v; }

/** Bridson Poisson-disk sampling: irregular, evenly spaced points, like packed cells. */
function poisson(W, H, rad, r, k = 18) {
  const cs = rad / Math.SQRT2, gw = Math.ceil(W / cs), gh = Math.ceil(H / cs), grid = new Int32Array(gw * gh).fill(-1), pts = [], act = [];
  const add = (x, y) => { pts.push([x, y]); act.push(pts.length - 1); grid[Math.floor(y / cs) * gw + Math.floor(x / cs)] = pts.length - 1; };
  add(r() * W, r() * H);
  while (act.length) {
    const ai = Math.floor(r() * act.length), [px, py] = pts[act[ai]]; let ok = false;
    for (let t = 0; t < k; t++) {
      const a = r() * 6.283, d = rad * (1 + r()), x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const gx = Math.floor(x / cs), gy = Math.floor(y / cs); let far = true;
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && far; yy++) for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
        const q = grid[yy * gw + xx]; if (q >= 0 && (pts[q][0] - x) ** 2 + (pts[q][1] - y) ** 2 < rad * rad) { far = false; break; } }
      if (far) { add(x, y); ok = true; break; }
    }
    if (!ok) act.splice(ai, 1);
  }
  return pts;
}

/** Voronoi-like polygon for each cell: a box clipped by perpendicular bisectors to neighbours. Gives packed epithelium. */
function cellPolygons(cells, sel, sp) {
  const bin = new Map(), key = (x, y) => `${Math.floor(x / sp)},${Math.floor(y / sp)}`;
  for (const c of cells) if (sel(c)) { const k = key(c.x, c.y); (bin.get(k) ?? bin.set(k, []).get(k)).push(c); }
  const clip = (poly, px, py, nx, ny) => { // keep (p - (px,py)) . (nx,ny) <= 0
    const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[0] - px) * nx + (a[1] - py) * ny, db = (b[0] - px) * nx + (b[1] - py) * ny;
      if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out; };
  const res = new Map();
  for (const c of cells) { if (!sel(c)) continue; const R = sp * 1.0;
    let poly = Array.from({ length: 14 }, (_, i) => [c.x + Math.cos(i / 14 * 6.283) * R, c.y + Math.sin(i / 14 * 6.283) * R]);
    const gx = Math.floor(c.x / sp), gy = Math.floor(c.y / sp);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (const o of bin.get(`${gx + dx},${gy + dy}`) ?? []) {
      if (o === c) continue; poly = clip(poly, (c.x + o.x) / 2, (c.y + o.y) / 2, o.x - c.x, o.y - c.y); if (poly.length < 3) break; }
    res.set(c, poly); }
  return res;
}
function wobbly(ctx, rx, ry, r, amp) { ctx.beginPath(); const n = 12; for (let i = 0; i <= n; i++) { const a = (i / n) * 6.283, q = 1 + (r() - 0.5) * amp; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rx * q, Math.sin(a) * ry * q); } ctx.closePath(); }

/** Draws with `paint` on an offscreen layer, then composites it once with a blur (per-shape blur is far too slow). */
function layer(ctx, W, H, blur, op, paint) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const l = c.getContext('2d'); paint(l);
  ctx.save(); ctx.globalCompositeOperation = op; ctx.filter = blur ? `blur(${blur}px)` : 'none'; ctx.drawImage(c, 0, 0); ctx.restore();
}

/** Tissue layout shared by the fluorescence and H&E renders: nests of epithelium, invasive margin, stroma, a lymphoid aggregate. */
function tissue(W, H, seed) {
  const r = rng(seed), n = noise2(seed + 1), flow = noise2(seed + 2), m = noise2(seed + 3);
  const k = 1 / (W * 0.16);
  // tumour nests: organic noise field, more likely to the right so text sits on calmer stroma at the left
  const field = (x, y) => fbm(m, x * k + 3.1, y * k + 7.7, 4) + 0.32 * (x / W - 0.55) + 0.05 * (y / H - 0.5);
  const THR = 0.56, BAND = 0.045;
  const nestD = (x, y) => { const v = field(x, y); return v >= THR ? (1 - (v - THR) / 0.2) * 0.999 : 1 + ((THR - v) / BAND) * 0.35; };
  const agg = { x: 0.6 * W, y: 0.7 * H, r: 0.055 * W };
  const cells = [];
  const sp = W / 58;
  for (const [x, y] of poisson(W, H, sp * 0.86, r)) {
    const d = nestD(x, y), da = Math.hypot(x - agg.x, y - agg.y) / agg.r;
    const density = 0.3 + 0.7 * Math.min(1, x / (W * 0.5));
    let type;
    if (d < 1) type = 'epi';
    else if (da < 1) type = r() < 0.5 ? 'cd8' : r() < 0.6 ? 'b' : 'cd4';
    else if (d < 1.35) { if (r() > 0.85) continue; type = r() < 0.42 ? 'cd8' : r() < 0.45 ? 'mac' : r() < 0.5 ? 'cd4' : 'fib'; }
    else { if (r() > density * 0.5) continue; type = r() < 0.6 ? 'fib' : r() < 0.45 ? 'mac' : r() < 0.6 ? 'cd8' : 'cd4'; }
    const ang = (flow(x * 0.004, y * 0.004) - 0.5) * Math.PI * 3;
    // immune cells are smaller and denser: add a second, offset one in immune-rich zones
    cells.push({ x, y, type, ang, r: sp });
    if ((type === 'cd8' || type === 'b' || type === 'cd4') && r() < 0.5) cells.push({ x: x + sp * 0.45, y: y + sp * 0.2, type, ang, r: sp });
  }
  return { cells, agg, nestD, flow, n, r, field, THR };
}

function drawIF(ctx, W, H, seed) {
  const T = tissue(W, H, seed), r = T.r;
  ctx.fillStyle = '#020309'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  // collagen (second-harmonic-like) fibres along the flow field
  ctx.lineCap = 'round';
  for (let i = 0; i < 1800; i++) {
    let x = r() * W, y = r() * H; if (T.nestD(x, y) < 1.05) continue;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 26; k++) { const a = (T.flow(x * 0.004, y * 0.004) - 0.5) * Math.PI * 3; x += Math.cos(a) * 6; y += Math.sin(a) * 6; ctx.lineTo(x, y); }
    ctx.strokeStyle = `rgba(60,110,150,${0.06 + r() * 0.1})`; ctx.lineWidth = 1 + r() * 2.2; ctx.stroke();
  }
  // cytokeratin sheet: polygonal epithelial cells (cytoplasm fill + brighter cell borders)
  const sp = W / 58, polys = cellPolygons(T.cells, (c) => c.type === 'epi', sp);
  layer(ctx, W, H, 1.6, 'lighter', (ctx) => {
    for (const [c, poly] of polys) {
      const shrink = 0.94, g = 0.6 + 0.4 * r();
      ctx.beginPath(); poly.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](c.x + (x - c.x) * shrink, c.y + (y - c.y) * shrink)); ctx.closePath();
      ctx.fillStyle = `rgba(230,140,30,${0.2 * g})`; ctx.fill();
      ctx.strokeStyle = `rgba(255,185,70,${0.42 * g})`; ctx.lineWidth = 2.4; ctx.stroke();
    }
  });
  // immune and stromal membranes, irregular outlines
  const MEM = { cd8: [40, 235, 120], cd4: [80, 200, 255], mac: [255, 60, 170], b: [255, 230, 60], fib: [120, 100, 255] };
  layer(ctx, W, H, 1.8, 'lighter', (ctx) => { ctx.globalCompositeOperation = 'lighter';
    for (const c of T.cells) { if (c.type === 'epi') continue;
      const [R, G, B] = MEM[c.type], k = c.type === 'fib' ? 0.3 : 0.85;
      const rx = c.r * (c.type === 'fib' ? 0.8 : c.type === 'mac' ? 0.48 : 0.3) * (0.85 + r() * 0.3), ry = c.type === 'fib' ? rx * 0.28 : rx * (0.8 + r() * 0.25);
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.type === 'fib' ? c.ang : r() * 6.28);
      wobbly(ctx, rx, ry, r, c.type === 'mac' ? 0.55 : 0.22);
      ctx.strokeStyle = `rgba(${R},${G},${B},${0.7 * k})`; ctx.lineWidth = c.type === 'mac' ? 3.4 : 2.8; ctx.stroke();
      ctx.fillStyle = `rgba(${R},${G},${B},${0.12 * k})`; ctx.fill();
      ctx.restore(); }
  });
  // nuclei (DAPI)
  layer(ctx, W, H, 0.9, 'lighter', (ctx) => { ctx.globalCompositeOperation = 'lighter';
  for (const c of T.cells) {
    const big = c.type === 'epi' ? 0.3 : c.type === 'fib' ? 0.28 : c.type === 'mac' ? 0.22 : 0.17;
    const rx = c.r * big * (0.85 + r() * 0.3), ry = c.type === 'fib' ? rx * 0.36 : rx * (0.78 + r() * 0.2);
    ctx.save(); ctx.translate(c.x + gauss(r) * c.r * 0.06, c.y + gauss(r) * c.r * 0.06); ctx.rotate(c.type === 'fib' ? c.ang : r() * 6.28);
    const g = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, 0, 0, 0, rx);
    const br = (c.type === 'cd8' || c.type === 'cd4' || c.type === 'b' ? 1 : 0.72) * (0.6 + 0.4 * r());
    g.addColorStop(0, `rgba(110,150,255,${0.95 * br})`); g.addColorStop(0.7, `rgba(50,90,235,${0.75 * br})`); g.addColorStop(1, 'rgba(20,40,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  });
  // chromatin speckle
  for (const c of T.cells) for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(160,190,255,0.25)'; ctx.fillRect(c.x + gauss(r) * c.r * 0.12, c.y + gauss(r) * c.r * 0.12, 1.4, 1.4); }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W * 0.62, H * 0.5, H * 0.2, W * 0.6, H * 0.5, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function drawHE(ctx, W, H, seed) {
  const T = tissue(W, H, seed), r = T.r;
  // eosin ground with fibrous texture, computed at half resolution (smooth) and scaled up
  const S = 2, w = Math.ceil(W / S), h = Math.ceil(H / S);
  const off = document.createElement('canvas'); off.width = w; off.height = h;
  const octx = off.getContext('2d'), img = octx.createImageData(w, h), D = img.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const x = xx * S, y = yy * S;
    const f = fbm(T.n, x * 0.0045 + y * 0.0021, y * 0.0045 - x * 0.0013, 3), fib = 0;
    const inNest = T.nestD(x, y) < 1;
    let R = 238, G = 176, B = 199;
    if (inNest) { R = 226; G = 160; B = 196; }
    const t = 0.82 + 0.18 * f + (inNest ? 0 : 0.06 * fib);
    const i = (yy * w + xx) * 4; D[i] = R * t; D[i + 1] = G * t; D[i + 2] = B * t; D[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H);
  // collagen fibres: wavy eosinophilic strands following the flow field
  ctx.lineCap = 'round';
  for (let i = 0; i < 1400; i++) {
    let x = r() * W, y = r() * H; if (T.nestD(x, y) < 1.1) continue;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 30; k++) { const a = (T.flow(x * 0.004, y * 0.004) - 0.5) * Math.PI * 3; x += Math.cos(a) * 7; y += Math.sin(a) * 7; ctx.lineTo(x, y); }
    ctx.strokeStyle = `rgba(${200 + r() * 30},${90 + r() * 30},${135 + r() * 25},${0.18 + r() * 0.2})`; ctx.lineWidth = 1.2 + r() * 2.4; ctx.stroke();
  }
  // epithelial cells: lilac cytoplasm polygons with faint borders
  { const sp = W / 58, polys = cellPolygons(T.cells, (c) => c.type === 'epi', sp);
    for (const [c, poly] of polys) { ctx.beginPath(); poly.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](c.x + (x - c.x) * 0.97, c.y + (y - c.y) * 0.97)); ctx.closePath();
      const g = r(); ctx.fillStyle = `rgba(${205 + g * 20},${140 + g * 25},${195 + g * 15},0.55)`; ctx.fill();
      ctx.strokeStyle = 'rgba(150,80,150,0.35)'; ctx.lineWidth = 1.2; ctx.stroke(); } }
  // empty spaces: fat and vessel lumens (white)
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H; if (T.nestD(x, y) < 1.3) continue;
    const rad = 10 + r() * 34; ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.28);
    ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, q = rad * (0.75 + r() * 0.4); ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q * 0.75); } ctx.closePath();
    ctx.fillStyle = '#fbf3f6'; ctx.fill(); ctx.strokeStyle = 'rgba(200,110,150,0.6)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  }
  // gland lumens inside nests
  for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H; if (T.nestD(x, y) > 0.55) continue; ctx.beginPath(); ctx.ellipse(x, y, 10 + r() * 22, 7 + r() * 14, r() * 3, 0, 6.283); ctx.fillStyle = '#fbf2f7'; ctx.fill(); }
  // hematoxylin nuclei, one blurred multiply layer
  layer(ctx, W, H, 0.7, 'multiply', (ctx) => {
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  for (const c of T.cells) {
    const lymph = c.type === 'cd8' || c.type === 'cd4' || c.type === 'b';
    const big = c.type === 'epi' ? 0.28 : c.type === 'fib' ? 0.27 : c.type === 'mac' ? 0.22 : 0.15;
    const rx = c.r * big * (0.85 + r() * 0.35), ry = c.type === 'fib' ? rx * 0.33 : rx * (0.75 + r() * 0.25);
    ctx.save(); ctx.translate(c.x + gauss(r) * 1.2, c.y + gauss(r) * 1.2); ctx.rotate(c.type === 'fib' ? c.ang : r() * 6.28);
    const dark = lymph ? 0.95 : c.type === 'epi' ? 0.55 : 0.8;
    ctx.fillStyle = `rgba(${Math.round(70 - 30 * dark)},${Math.round(40 - 25 * dark)},${Math.round(130 - 20 * dark)},${0.55 + 0.4 * dark})`;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.283); ctx.fill();
    if (c.type === 'epi') { ctx.fillStyle = 'rgba(210,180,235,0.55)'; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(55,20,105,0.85)'; ctx.beginPath(); ctx.arc(rx * 0.15, -ry * 0.1, rx * 0.2, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  });
  // slide grain
  ctx.fillStyle = 'rgba(120,60,110,0.035)'; for (let i = 0; i < W * H / 90; i++) ctx.fillRect(r() * W, r() * H, 1, 1);
}

/** 10x Visium-style capture spots (hexagonal grid) over an H&E section, coloured by cluster where tissue is present. */
function drawVisium(ctx, W, H, seed) {
  drawHE(ctx, W, H, seed);
  const T = tissue(W, H, seed); // same layout as the H&E underneath (same seed)
  const r = rng(seed + 9), pitch = W / 46, rad = pitch * 0.34;
  const COL = { tumour: [214, 72, 110], margin: [240, 165, 40], immune: [24, 170, 150], stroma: [96, 120, 210] };
  ctx.globalCompositeOperation = 'source-over';
  for (let row = 0; row * pitch * 0.866 < H + pitch; row++) for (let col = 0; col * pitch < W + pitch; col++) {
    const x = col * pitch + (row % 2 ? pitch / 2 : 0), y = row * pitch * 0.866;
    if (x < W * 0.4 && r() < 1.05 - x / (W * 0.4)) continue; // fade in from the left
    const d = T.nestD(x, y), da = Math.hypot(x - T.agg.x, y - T.agg.y) / T.agg.r;
    const k = d < 0.9 ? 'tumour' : da < 1.1 ? 'immune' : d < 1.3 ? 'margin' : 'stroma';
    const [R, G, B] = COL[k];
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283);
    const al = k === 'stroma' ? 0.2 : 0.36; ctx.fillStyle = `rgba(${R},${G},${B},${al})`; ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = `rgba(${R},${G},${B},${al + 0.3})`; ctx.stroke();
  }
}

/** Hi-C contact map, upper triangle rotated 45 degrees. Alpha carries intensity so the page can tint it (CSS mask). */
function drawHiC(ctx, W, H, seed) {
  const r = rng(seed), N = 260;
  // TAD boundaries and A/B compartments
  const bounds = [0]; while (bounds[bounds.length - 1] < N) bounds.push(bounds[bounds.length - 1] + 10 + Math.floor(r() * 26));
  const tadOf = new Int16Array(N); bounds.forEach((b, i) => { for (let k = b; k < Math.min(N, bounds[i + 1] ?? N); k++) tadOf[k] = i; });
  const comp = new Float32Array(N); let c = 1; for (let i = 0; i < N; i++) { if (r() < 0.035) c = -c; comp[i] = c; }
  const M = new Float32Array(N * N);
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
    const d = j - i + 1; let v = Math.pow(d, -1.05);
    if (tadOf[i] === tadOf[j]) v *= 2.3;
    v *= 1 + 0.16 * comp[i] * comp[j];
    v *= Math.exp(gauss(r) * 0.28);
    M[i * N + j] = v;
  }
  // loops at TAD corners
  for (let t = 0; t < bounds.length - 1; t++) { const a = bounds[t], b = Math.min(N - 1, bounds[t + 1] - 1); if (b - a > 6) for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const ii = a + 1 + di, jj = b - 1 + dj; if (ii >= 0 && jj < N && ii <= jj) M[ii * N + jj] *= 2.4 - Math.abs(di) * 0.5 - Math.abs(dj) * 0.5; } }
  const maxD = Math.round(N * 0.3), cell = W / N, sy = H / (maxD * cell / 2);
  const vals = []; for (let i = 0; i < N; i++) for (let j = i; j < Math.min(N, i + maxD); j++) vals.push(Math.log(M[i * N + j]));
  vals.sort((a, b) => a - b); const lo = vals[Math.floor(vals.length * 0.04)], hi = vals[Math.floor(vals.length * 0.997)];
  // matrix as one N x N image (pixel per bin), then a single affine transform rotates it 45 degrees with smoothing
  const off = document.createElement('canvas'); off.width = N; off.height = N;
  const oc = off.getContext('2d'), img = oc.createImageData(N, N);
  for (let i = 0; i < N; i++) for (let j = i; j < Math.min(N, i + maxD); j++) {
    const v = Math.max(0, Math.min(1, (Math.log(M[i * N + j]) - lo) / (hi - lo)));
    img.data[(i * N + j) * 4 + 3] = Math.round(255 * Math.pow(v, 1.25));
  }
  oc.putImageData(img, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // image pixel (u = column j, v = row i) -> x = cell/2 (u + v), y = H - sy cell/2 (u - v)
  ctx.setTransform(cell / 2, -sy * cell / 2, cell / 2, sy * cell / 2, 0, H);
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

function drawTracks(ctx, W, H, seed) {
  const r = rng(seed); ctx.clearRect(0, 0, W, H);
  const peaks = Array.from({ length: 34 }, () => ({ x: r() * W, w: 6 + r() * 26, h: 0.2 + r() * 0.8 }));
  const tracks = [{ y: 0.12, h: 0.16, a: 0.9 }, { y: 0.32, h: 0.12, a: 0.65 }, { y: 0.48, h: 0.12, a: 0.5 }];
  for (const t of tracks) {
    const base = t.y * H + t.h * H;
    ctx.beginPath(); ctx.moveTo(0, base);
    for (let x = 0; x <= W; x += 2) {
      let v = 0.03 + 0.03 * r();
      for (const p of peaks) { const z = (x - p.x) / p.w; v += p.h * Math.exp(-z * z) * (0.5 + r() * 0.5 + (t.a < 0.6 ? 0.2 * Math.sin(p.x) : 0)); }
      ctx.lineTo(x, base - Math.min(1, v) * t.h * H);
    }
    ctx.lineTo(W, base); ctx.closePath(); ctx.fillStyle = `rgba(0,0,0,${t.a})`; ctx.fill();
    ctx.fillRect(0, base, W, 1);
  }
  // gene models
  const gy = 0.7 * H;
  for (let g = 0; g < 5; g++) {
    const x0 = r() * W * 0.85, len = W * (0.08 + r() * 0.2), y = gy + (g % 2) * 22;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x0, y, len, 1.6);
    const ne = 4 + Math.floor(r() * 7); for (let e = 0; e < ne; e++) { const ex = x0 + (e / (ne - 1)) * (len - 8); ctx.fillRect(ex, y - 6, 4 + r() * 10, 13); }
    for (let k = x0 + 14; k < x0 + len - 6; k += 22) { ctx.beginPath(); ctx.moveTo(k - 3, y - 3); ctx.lineTo(k, y + 0.8); ctx.lineTo(k - 3, y + 4); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  // read pileup
  for (let i = 0; i < 520; i++) {
    const p = peaks[Math.floor(r() * peaks.length)], x = p.x + gauss(r) * p.w * 1.2, lane = Math.floor(r() * 9);
    ctx.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.3})`; ctx.fillRect(x, 0.82 * H + lane * 7, 26 + r() * 30, 4);
  }
}
window.Draw = { drawIF, drawHE, drawVisium, drawHiC, drawTracks, rng, gauss, noise2, fbm, tissue };
