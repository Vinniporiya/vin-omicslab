/**
 * Seeded generator for the SIMULATED demonstration dataset.
 * Nothing here is derived from any real cohort. Disease effects are assigned at random or by
 * hand-written multipliers so the analysis code has structure to detect. The same seed always
 * yields the same dataset (see scripts/selftest.ts).
 *
 * TODO(real-data): replace this module with a DatasetProvider that streams AnnData/H5AD/Zarr
 * derived tables from object storage (see src/data/provider.ts and docs/ARCHITECTURE.md section G).
 */
import { makeRng, type Rng } from './rng';
import { CELL_TYPES, PROGRAMS, PANEL, TYPE_IDS, type TypeId, type TypeMap } from './genes';
import type { DonorDef, OmicsDataset, SpatialSection } from '../dataset';
import { fnv } from '../../lib/stats';

export const GENERATOR_VERSION = '0.1.0';
export const DEFAULT_SEED = 20260918;

const DONORS: DonorDef[] = [
  ...[1, 2, 3, 4].map((i) => ({ id: `C${i}`, condition: 'Control' as const })),
  ...[1, 2, 3, 4].map((i) => ({ id: `D${i}`, condition: 'Disease' as const })),
];

const BASE_PROP: Record<TypeId, number> = { CD4T: 0.2, CD8T: 0.12, NK: 0.05, B: 0.08, Plasma: 0.03, Myeloid: 0.12, Fibro: 0.17, Endo: 0.07, Epi: 0.16 };
const DISEASE_MULT: Record<TypeId, number> = { CD4T: 0.9, CD8T: 1.5, NK: 1, B: 1.1, Plasma: 1.3, Myeloid: 1.8, Fibro: 1.2, Endo: 0.9, Epi: 0.6 };

type Geom = [number, number, number, number];
const RNA_GEOM: Record<TypeId, Geom> = {
  CD4T: [-5, 3, 1.1, 0.9], CD8T: [-2, 5, 1, 0.8], NK: [0.6, 2.6, 0.7, 0.6], B: [-6.5, -3, 0.9, 0.9], Plasma: [-7.9, -4.5, 0.6, 0.6],
  Myeloid: [4.2, 4.6, 1.2, 1], Fibro: [6.4, -3, 1.2, 1.4], Endo: [4.3, -5.4, 0.9, 0.8], Epi: [-1, -3.6, 1.5, 1.1],
};
const ATAC_GEOM: Record<TypeId, Geom> = {
  CD4T: [3, -2, 1.5, 1.2], CD8T: [4.2, -1, 1.3, 1.1], NK: [5.6, 1.6, 0.8, 0.7], B: [-4, 4, 1, 1], Plasma: [-1.6, 7.4, 0.9, 0.8],
  Myeloid: [-6.2, -3, 1.2, 1.1], Fibro: [-0.5, -5.6, 1.1, 1.2], Endo: [2.8, -8, 0.8, 0.7], Epi: [-2, 0.4, 1.4, 1.2],
};
const DISEASE_SHIFT: Partial<Record<TypeId, [number, number]>> = { Myeloid: [0.7, -0.4], CD8T: [0.6, -0.4], Epi: [0.5, 0.5] };

function expressionValue(rng: Rng, gene: string, type: TypeId, disease: boolean): number {
  const p = PROGRAMS[gene];
  const b = p.base[type];
  if (b === undefined) return rng.next() < 0.05 ? Math.abs(rng.normal(0.6, 0.3)) : 0; // ambient-like background
  const mu = b + (disease ? p.disease?.[type] ?? 0 : 0);
  const dropout = Math.min(0.95, Math.max(0.02, 0.6 * Math.exp(-0.55 * mu)));
  return rng.next() < dropout ? 0 : Math.max(0, rng.normal(mu, 0.5));
}

function sampleCounts(rng: Rng, weights: number[], n: number): number[] {
  const tot = weights.reduce((a, b) => a + b, 0);
  const cum: number[] = []; let s = 0;
  for (const w of weights) { s += w / tot; cum.push(s); }
  const out = new Array<number>(weights.length).fill(0);
  for (let i = 0; i < n; i++) { const u = rng.next(); let k = cum.findIndex((c) => u <= c); if (k < 0) k = weights.length - 1; out[k]++; }
  return out;
}

/** Chinese-restaurant-process clone sizes: small theta = more clonal expansion. */
function crp(rng: Rng, n: number, theta: number): number[] {
  const assign: number[] = []; const sizes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || rng.next() < theta / (theta + i)) { sizes.push(1); assign.push(sizes.length - 1); }
    else { const c = assign[rng.int(i)]; sizes[c]++; assign.push(c); }
  }
  return sizes.sort((a, b) => b - a);
}

export function generateDemoDataset(seed = DEFAULT_SEED): OmicsDataset {
  const rng = makeRng(seed);
  const nT = TYPE_IDS.length;

  // ---- 1. per-donor composition -------------------------------------------------------------
  const cellCounts: number[][] = TYPE_IDS.map(() => new Array<number>(DONORS.length).fill(0));
  DONORS.forEach((d, di) => {
    const w = TYPE_IDS.map((t) => BASE_PROP[t] * (d.condition === 'Disease' ? DISEASE_MULT[t] : 1) * Math.exp(rng.normal(0, 0.18)));
    const c = sampleCounts(rng, w, Math.round(rng.normal(520, 55)));
    c.forEach((v, ti) => (cellCounts[ti][di] = v));
  });

  // ---- 2. landscape cells --------------------------------------------------------------------
  const N = cellCounts.flat().reduce((a, b) => a + b, 0);
  const x = new Float32Array(N), y = new Float32Array(N), ax = new Float32Array(N), ay = new Float32Array(N);
  const type = new Uint8Array(N), donor = new Uint8Array(N);
  const expr: Record<string, Float32Array> = Object.fromEntries(PANEL.map((gn) => [gn, new Float32Array(N)]));
  let i = 0;
  DONORS.forEach((d, di) => {
    const off = [rng.normal(0, 0.12), rng.normal(0, 0.12)];
    const dis = d.condition === 'Disease';
    TYPE_IDS.forEach((t, ti) => {
      const [cx, cy, sx, sy] = RNA_GEOM[t]; const [ux, uy, vx, vy] = ATAC_GEOM[t];
      const sh = dis ? DISEASE_SHIFT[t] ?? [0, 0] : [0, 0];
      for (let k = 0; k < cellCounts[ti][di]; k++, i++) {
        x[i] = cx + rng.normal(0, sx) + sh[0] + off[0]; y[i] = cy + rng.normal(0, sy) + sh[1] + off[1];
        ax[i] = ux + rng.normal(0, vx); ay[i] = uy + rng.normal(0, vy);
        type[i] = ti; donor[i] = di;
        for (const gn of PANEL) expr[gn][i] = expressionValue(rng, gn, t, dis);
      }
    });
  });

  // ---- 3. pseudobulk counts (NB-like) ---------------------------------------------------------
  const G = 400;
  const genes = Array.from({ length: G }, (_, k) => `SIM${String(k + 1).padStart(4, '0')}`);
  const shared = genes.map(() => rng.normal(0, 1.5));
  const truth: Record<string, Map<number, number>> = {};
  const counts = {} as Record<TypeId, number[][]>;
  const PHI = 0.04;
  TYPE_IDS.forEach((t, ti) => {
    const rate = shared.map((s) => Math.exp(s + rng.normal(0, 0.5)));
    const tot = rate.reduce((a, b) => a + b, 0);
    const eff = new Map<number, number>();
    for (const gi of rng.shuffle(genes.map((_, k) => k)).slice(0, Math.round(G * 0.12))) eff.set(gi, (rng.next() < 0.55 ? 1 : -1) * (0.8 + rng.next()));
    truth[t] = eff;
    counts[t] = genes.map(() => new Array<number>(DONORS.length).fill(0));
    DONORS.forEach((d, di) => {
      const lib = cellCounts[ti][di] * 1500 * Math.exp(rng.normal(0, 0.1));
      genes.forEach((_, gi) => {
        const lfc = d.condition === 'Disease' ? eff.get(gi) ?? 0 : 0;
        const lam = lib * (rate[gi] / tot) * Math.pow(2, lfc) * (rng.gamma(1 / PHI) * PHI);
        counts[t][gi][di] = rng.poisson(lam);
      });
    });
  });
  const setDefs: [string, TypeId | null, 1 | -1][] = [
    ['Antigen presentation', 'Myeloid', 1], ['Interferon response', 'CD8T', 1], ['Extracellular matrix organisation', 'Fibro', 1],
    ['Hypoxia', 'Epi', 1], ['Complement', 'Myeloid', 1], ['Epithelial to mesenchymal transition', 'Epi', -1],
    ['Oxidative phosphorylation', null, 1], ['Cell cycle', null, 1],
  ];
  const geneSets = setDefs.map(([name, t, sign], k) => {
    const chosen = new Set<number>();
    if (t) {
      const pool = rng.shuffle([...truth[t].entries()].filter(([, v]) => Math.sign(v) === sign).map(([gi]) => gi));
      pool.slice(0, 16).forEach((gi) => chosen.add(gi));
    }
    while (chosen.size < 30) chosen.add(rng.int(G));
    return { id: `S${k + 1}`, name, members: [...chosen].sort((a, b) => a - b).map((gi) => genes[gi]) };
  });

  // ---- 4. spatial section --------------------------------------------------------------------
  const spatial = generateSpatial(rng);

  // ---- 5. immune repertoire ---------------------------------------------------------------------
  const tcrTypes = [TYPE_IDS.indexOf('CD4T'), TYPE_IDS.indexOf('CD8T')];
  const bcrTypes = [TYPE_IDS.indexOf('B'), TYPE_IDS.indexOf('Plasma')];
  const repertoire = { TCR: {} as Record<string, number[]>, BCR: {} as Record<string, number[]> };
  DONORS.forEach((d, di) => {
    const dis = d.condition === 'Disease';
    const nT = Math.round(tcrTypes.reduce((a, ti) => a + cellCounts[ti][di], 0) * 0.6);
    const nB = Math.round(bcrTypes.reduce((a, ti) => a + cellCounts[ti][di], 0) * 0.7);
    repertoire.TCR[d.id] = crp(rng, nT, dis ? 15 : 80);
    repertoire.BCR[d.id] = crp(rng, nB, dis ? 8 : 25);
  });
  void nT;

  const fingerprint = fnv(`${seed}|${GENERATOR_VERSION}|${N}|${cellCounts.flat().join(',')}`);
  return {
    meta: {
      id: `demo-sim-${seed}`, title: 'Simulated multi-sample tissue study', kind: 'simulated',
      description: 'Seeded simulation of 8 donors (4 control, 4 disease) with single-cell, pseudobulk, spatial, repertoire and second-modality tables. No real data.',
      modality: ['scRNA-seq (simulated)', 'snATAC-seq embedding (simulated)', 'spatial (simulated)', 'TCR/BCR (simulated)'],
      species: 'n/a (simulated)', nCells: N, nSamples: DONORS.length, source: 'Vin-OmicsLab demo generator', licence: 'CC0 (synthetic)',
      seed, generatorVersion: GENERATOR_VERSION, fingerprint,
    },
    cellTypes: CELL_TYPES, donors: DONORS, panel: PANEL,
    landscape: { n: N, x, y, ax, ay, type, donor, expr },
    pseudobulk: { genes, counts, cellCounts, geneSets },
    spatial, repertoire,
  };
}

function generateSpatial(rng: Rng): SpatialSection {
  const W = 100, H = 100, step = 1.75;
  const nests: [number, number, number][] = [[30, 35, 17], [68, 62, 15]];
  const agg: [number, number, number] = [72, 20, 7];
  const regionNames = ['Tumour nest', 'Invasive margin', 'Stroma', 'Lymphoid aggregate'];
  const PROB: Record<number, TypeMap> = {
    0: { Epi: 0.78, Fibro: 0.05, Myeloid: 0.06, CD8T: 0.05, CD4T: 0.03, Endo: 0.03 },
    1: { CD8T: 0.24, CD4T: 0.14, Myeloid: 0.22, Fibro: 0.16, Epi: 0.12, NK: 0.04, B: 0.03, Endo: 0.05 },
    2: { Fibro: 0.55, Endo: 0.16, Myeloid: 0.08, CD4T: 0.08, CD8T: 0.05, Epi: 0.02, B: 0.03, Plasma: 0.03 },
    3: { B: 0.45, CD4T: 0.22, Plasma: 0.12, Myeloid: 0.06, CD8T: 0.05, Fibro: 0.1 },
  };
  const xs: number[] = [], ys: number[] = [], ts: number[] = [], rs: number[] = [], cs: number[] = [];
  for (let gy = step / 2; gy < H; gy += step) for (let gx = step / 2; gx < W; gx += step) {
    const px = gx + rng.normal(0, 0.35), py = gy + rng.normal(0, 0.35);
    let best = Infinity, nest = 0;
    nests.forEach(([cx, cy, r], k) => { const d = Math.hypot(px - cx, py - cy) - r; if (d < best) { best = d; nest = k; } });
    const inAgg = Math.hypot(px - agg[0], py - agg[1]) < agg[2];
    const region = inAgg ? 3 : best < 0 ? 0 : best < 6 ? 1 : 2;
    const probs = PROB[region];
    let u = rng.next(), chosen: TypeId = 'Fibro';
    for (const [t, p] of Object.entries(probs) as [TypeId, number][]) { if (u < p) { chosen = t; break; } u -= p; }
    let clone = -1;
    if (chosen === 'CD8T') {
      const r = rng.next();
      if (region === 1 && nest === 0 && r < 0.6) clone = 0;
      else if (region === 1 && nest === 1 && r < 0.55) clone = 1;
      else if ((region === 0 && nest === 1) && r < 0.5) clone = 2;
      else clone = 3;
    }
    xs.push(px); ys.push(py); ts.push(TYPE_IDS.indexOf(chosen)); rs.push(region); cs.push(clone);
  }
  const n = xs.length;
  const expr: Record<string, Float32Array> = Object.fromEntries(PANEL.map((gn) => [gn, new Float32Array(n)]));
  for (let i = 0; i < n; i++) for (const gn of PANEL) expr[gn][i] = expressionValue(rng, gn, TYPE_IDS[ts[i]], true);
  return {
    n, width: W, height: H, x: Float32Array.from(xs), y: Float32Array.from(ys), type: Uint8Array.from(ts), region: Uint8Array.from(rs),
    clone: Int16Array.from(cs), regionNames, cloneNames: ['Clone A', 'Clone B', 'Clone C', 'Other CD8 T'], expr,
  };
}
