import type { OmicsDataset } from '../../data/dataset';
import { REGULONS, type Regulon } from '../../data/demo/genes';
import { geneSummaries } from './summary';
import { mean, sd } from '../stats';

/** Mean signed z-scored target expression per cell type (a simple regulon activity proxy, not SCENIC/AUCell). */
export function regulonActivity(ds: OmicsDataset, regulons: Regulon[] = REGULONS): { tfs: string[]; matrix: number[][] } {
  const S = geneSummaries(ds);
  const z = (gene: string) => { const m = S[gene].mean.all; const mu = mean(m), s = sd(m) || 1; return m.map((v) => (v - mu) / s); };
  return {
    tfs: regulons.map((r) => r.tf),
    matrix: regulons.map((r) => {
      const zs = r.targets.map((t) => z(t.gene).map((v) => v * t.sign));
      return ds.cellTypes.map((_, ti) => mean(zs.map((row) => row[ti])));
    }),
  };
}

export interface NetNode { id: string; kind: 'tf' | 'target'; x: number; y: number }
export interface NetEdge { source: string; target: string; sign: 1 | -1 }

/** Deterministic radial layout: TFs on an inner ring, private targets fan out beside their TF, shared targets sit between. */
export function networkLayout(regulons: Regulon[] = REGULONS): { nodes: NetNode[]; edges: NetEdge[] } {
  const nodes: NetNode[] = [], edges: NetEdge[] = [];
  const tfPos = new Map<string, [number, number, number]>();
  regulons.forEach((r, i) => {
    const a = (i / regulons.length) * Math.PI * 2 - Math.PI / 2;
    tfPos.set(r.tf, [Math.cos(a) * 0.5, Math.sin(a) * 0.5, a]);
    nodes.push({ id: r.tf, kind: 'tf', x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5 });
  });
  const regsOf = new Map<string, string[]>();
  regulons.forEach((r) => r.targets.forEach((t) => { regsOf.set(t.gene, [...(regsOf.get(t.gene) ?? []), r.tf]); edges.push({ source: r.tf, target: t.gene, sign: t.sign }); }));
  const priv = new Map<string, number>();
  for (const [gene, tfs] of regsOf) {
    if (tfs.length === 1) {
      const [, , a] = tfPos.get(tfs[0])!;
      const k = priv.get(tfs[0]) ?? 0; priv.set(tfs[0], k + 1);
      const aa = a + (k - 1.2) * 0.27;
      nodes.push({ id: gene, kind: 'target', x: Math.cos(aa) * 0.95, y: Math.sin(aa) * 0.95 });
    } else {
      const px = tfs.reduce((s, t) => s + tfPos.get(t)![0], 0) / tfs.length, py = tfs.reduce((s, t) => s + tfPos.get(t)![1], 0) / tfs.length;
      const norm = Math.hypot(px, py) || 1;
      nodes.push({ id: gene, kind: 'target', x: (px / norm) * 0.78, y: (py / norm) * 0.78 });
    }
  }
  return { nodes, edges };
}
