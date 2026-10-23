import { bh, hypergeomUpper } from '../stats';

export interface EnrichRow { id: string; name: string; setSize: number; overlap: number; expected: number; p: number; padj: number; genes: string[] }

/** Over-representation analysis (one-sided hypergeometric), BH across gene sets. */
export function overRepresentation(universe: string[], sets: { id: string; name: string; members: string[] }[], hits: string[]): EnrichRow[] {
  const U = new Set(universe), H = new Set(hits.filter((h) => U.has(h)));
  const rows = sets.map((s) => {
    const inU = s.members.filter((m) => U.has(m));
    const ov = inU.filter((m) => H.has(m));
    const p = inU.length && H.size ? hypergeomUpper(ov.length, U.size, inU.length, H.size) : 1;
    return { id: s.id, name: s.name, setSize: inU.length, overlap: ov.length, expected: (inU.length * H.size) / U.size, p, padj: 1, genes: ov };
  });
  const adj = bh(rows.map((r) => r.p));
  rows.forEach((r, i) => (r.padj = adj[i]));
  return rows.sort((a, b) => a.p - b.p);
}
