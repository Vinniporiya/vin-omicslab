import type { OmicsDataset } from '../../data/dataset';

export interface EmbeddingSet {
  rna: { x: Float32Array; y: Float32Array }; atac: { x: Float32Array; y: Float32Array }; joint: { x: Float32Array; y: Float32Array };
  silhouette: { rna: number; atac: number; joint: number }; subsample: number;
}
const cache = new WeakMap<OmicsDataset, EmbeddingSet>();

/** Mean silhouette width (Euclidean) over a deterministic stride subsample. */
export function silhouette(points: number[][], labels: number[], maxN = 700): number {
  const stride = Math.max(1, Math.floor(points.length / maxN));
  const idx: number[] = []; for (let i = 0; i < points.length; i += stride) idx.push(i);
  const labs = [...new Set(idx.map((i) => labels[i]))];
  let total = 0;
  for (const i of idx) {
    const sum = new Map<number, number>(), cnt = new Map<number, number>();
    for (const j of idx) {
      if (j === i) continue;
      let d = 0; for (let k = 0; k < points[i].length; k++) d += (points[i][k] - points[j][k]) ** 2;
      const l = labels[j]; sum.set(l, (sum.get(l) ?? 0) + Math.sqrt(d)); cnt.set(l, (cnt.get(l) ?? 0) + 1);
    }
    const own = labels[i];
    if (!cnt.get(own)) continue;
    const a = sum.get(own)! / cnt.get(own)!;
    let b = Infinity;
    for (const l of labs) if (l !== own && cnt.get(l)) b = Math.min(b, sum.get(l)! / cnt.get(l)!);
    total += (b - a) / Math.max(a, b);
  }
  return total / idx.length;
}

/** Top-2 principal components by power iteration with deflation on standardised columns. */
export function pca2(data: number[][]): number[][] {
  const n = data.length, d = data[0].length;
  const mu = Array.from({ length: d }, (_, k) => data.reduce((a, r) => a + r[k], 0) / n);
  const sg = Array.from({ length: d }, (_, k) => Math.sqrt(data.reduce((a, r) => a + (r[k] - mu[k]) ** 2, 0) / (n - 1)) || 1);
  const X = data.map((r) => r.map((v, k) => (v - mu[k]) / sg[k]));
  const C = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => X.reduce((s, r) => s + r[a] * r[b], 0) / (n - 1)));
  const comps: number[][] = [];
  for (let c = 0; c < 2; c++) {
    let v: number[] = Array.from({ length: d }, (_, k) => (k === c ? 1 : 0.5));
    for (let it = 0; it < 200; it++) {
      const w = C.map((row) => row.reduce((s, x, k) => s + x * v[k], 0));
      const nm = Math.hypot(...w) || 1; v = w.map((x) => x / nm);
    }
    const lam = C.map((row) => row.reduce((s, x, k) => s + x * v[k], 0)).reduce((s, x, k) => s + x * v[k], 0);
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) C[a][b] -= lam * v[a] * v[b];
    comps.push(v);
  }
  return X.map((r) => comps.map((v) => r.reduce((s, x, k) => s + x * v[k], 0)));
}

export function embeddings(ds: OmicsDataset): EmbeddingSet {
  const hit = cache.get(ds); if (hit) return hit;
  const L = ds.landscape;
  const lab = Array.from(L.type);
  const rna = Array.from({ length: L.n }, (_, i) => [L.x[i], L.y[i]]);
  const atac = Array.from({ length: L.n }, (_, i) => [L.ax[i], L.ay[i]]);
  const cat = rna.map((r, i) => [...r, ...atac[i]]);
  const proj = pca2(cat);
  const jx = Float32Array.from(proj.map((p) => p[0])), jy = Float32Array.from(proj.map((p) => p[1]));
  const res: EmbeddingSet = {
    rna: { x: L.x, y: L.y }, atac: { x: L.ax, y: L.ay }, joint: { x: jx, y: jy },
    silhouette: { rna: silhouette(rna, lab), atac: silhouette(atac, lab), joint: silhouette(cat, lab) },
    subsample: Math.min(L.n, 700),
  };
  cache.set(ds, res);
  return res;
}
