/**
 * Live genome annotation from the Ensembl REST API (https://rest.ensembl.org, GRCh38).
 * Nothing genomic is stored in this codebase: coordinates, exons, bands and neighbours are fetched at runtime,
 * labelled with their source and retrieval time, and cached in this browser for 30 days. When a request fails
 * the UI says so; it never substitutes invented coordinates.
 * Requires network access. A page published behind a content-security policy that blocks rest.ensembl.org shows
 * the unavailable state.
 */
export const ENSEMBL = 'https://rest.ensembl.org';
const TTL = 30 * 24 * 3600 * 1000;
const PRIMARY = new Set([...Array.from({ length: 22 }, (_, i) => String(i + 1)), 'X', 'Y', 'MT']);

export interface Sourced<T> { data: T; retrievedAt: string; cached: boolean; url: string }
export interface Exon { start: number; end: number }
export interface Transcript { id: string; name: string; biotype: string; canonical: boolean; start: number; end: number; strand: 1 | -1; exons: Exon[]; cds?: { start: number; end: number } }
export interface GeneModel { id: string; symbol: string; description: string; chr: string; start: number; end: number; strand: 1 | -1; biotype: string; assembly: string; transcripts: Transcript[] }
export interface Band { name: string; start: number; end: number; stain: string }
export interface Chromosome { name: string; length: number; bands: Band[] }
export interface Neighbour { id: string; symbol: string; start: number; end: number; strand: 1 | -1; biotype: string }
export interface GenomeLocation { symbol: string; id: string; chr: string; start: number; end: number; strand: 1 | -1 }

export class GenomeError extends Error {
  constructor(message: string, readonly kind: 'offline' | 'not-found' | 'bad-response' | 'rate-limited') { super(message); }
}

const mem = new Map<string, { t: number; data: unknown }>();
function readCache(key: string): { t: number; data: unknown } | null {
  const m = mem.get(key); if (m) return m;
  try { const raw = localStorage.getItem(key); if (raw) { const v = JSON.parse(raw); if (Date.now() - v.t < TTL) { mem.set(key, v); return v; } } } catch { /* no storage */ }
  return null;
}
function writeCache(key: string, data: unknown) {
  const v = { t: Date.now(), data }; mem.set(key, v);
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota or no storage: memory cache only */ }
}

const inflight = new Map<string, Promise<Sourced<unknown>>>();
/** De-duplicates concurrent identical requests (e.g. page header and genome section asking for the same gene). */
function request<T>(path: string, init?: RequestInit, cacheKey = path): Promise<Sourced<T>> {
  const key = `vol-ens:${cacheKey}`;
  const p = inflight.get(key);
  if (p) return p as Promise<Sourced<T>>;
  const q = requestOnce<T>(path, init, key).finally(() => inflight.delete(key));
  inflight.set(key, q as Promise<Sourced<unknown>>);
  return q;
}
async function requestOnce<T>(path: string, init: RequestInit | undefined, key: string): Promise<Sourced<T>> {
  const url = ENSEMBL + path;
  const hit = readCache(key);
  if (hit) return { data: hit.data as T, retrievedAt: new Date(hit.t).toISOString(), cached: true, url };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctl.signal, headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) } });
  } catch {
    throw new GenomeError('Ensembl could not be reached. You may be offline, or a network policy blocks rest.ensembl.org.', 'offline');
  } finally { clearTimeout(timer); }
  if (res.status === 429) throw new GenomeError('Ensembl rate limit reached. Try again in a minute.', 'rate-limited');
  if (res.status === 400 || res.status === 404) throw new GenomeError('Ensembl has no record for this request.', 'not-found');
  if (!res.ok) throw new GenomeError(`Ensembl returned HTTP ${res.status}.`, 'bad-response');
  let data: T;
  try { data = (await res.json()) as T; } catch { throw new GenomeError('Ensembl returned a response that is not JSON.', 'bad-response'); }
  writeCache(key, data);
  return { data, retrievedAt: new Date().toISOString(), cached: false, url };
}

const num = (v: unknown): number => { if (typeof v !== 'number' || !Number.isFinite(v)) throw new GenomeError('Ensembl response is missing coordinates.', 'bad-response'); return v; };
const strandOf = (v: unknown): 1 | -1 => (v === -1 ? -1 : 1);

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseGene(raw: any): GeneModel {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') throw new GenomeError('Unexpected Ensembl gene record.', 'bad-response');
  const transcripts: Transcript[] = (Array.isArray(raw.Transcript) ? raw.Transcript : []).map((t: any) => ({
    id: String(t.id), name: String(t.display_name ?? t.id), biotype: String(t.biotype ?? ''), canonical: t.is_canonical === 1 || t.is_canonical === true,
    start: num(t.start), end: num(t.end), strand: strandOf(t.strand),
    exons: (Array.isArray(t.Exon) ? t.Exon : []).map((e: any) => ({ start: num(e.start), end: num(e.end) })).sort((a: Exon, b: Exon) => a.start - b.start),
    cds: t.Translation && Number.isFinite(t.Translation.start) ? { start: t.Translation.start, end: t.Translation.end } : undefined,
  }));
  transcripts.sort((a, b) => Number(b.canonical) - Number(a.canonical) || (b.cds ? 1 : 0) - (a.cds ? 1 : 0) || a.id.localeCompare(b.id));
  return {
    id: raw.id, symbol: String(raw.display_name ?? ''), description: String(raw.description ?? '').replace(/\s*\[Source:.*\]$/, ''),
    chr: String(raw.seq_region_name), start: num(raw.start), end: num(raw.end), strand: strandOf(raw.strand),
    biotype: String(raw.biotype ?? ''), assembly: String(raw.assembly_name ?? 'GRCh38'), transcripts,
  };
}

export async function fetchGene(symbol: string): Promise<Sourced<GeneModel>> {
  const r = await request<any>(`/lookup/symbol/homo_sapiens/${encodeURIComponent(symbol)}?content-type=application/json;expand=1`);
  return { ...r, data: parseGene(r.data) };
}

export async function fetchChromosome(chr: string): Promise<Sourced<Chromosome>> {
  const r = await request<any>(`/info/assembly/homo_sapiens/${encodeURIComponent(chr)}?content-type=application/json;bands=1`);
  const bands: Band[] = (Array.isArray(r.data?.karyotype_band) ? r.data.karyotype_band : [])
    .map((b: any) => ({ name: String(b.id ?? ''), start: num(b.start), end: num(b.end), stain: String(b.stain ?? 'gneg') }))
    .sort((a: Band, b: Band) => a.start - b.start);
  return { ...r, data: { name: chr, length: num(r.data?.length), bands } };
}

export async function fetchNeighbours(chr: string, start: number, end: number): Promise<Sourced<Neighbour[]>> {
  const r = await request<any>(`/overlap/region/human/${encodeURIComponent(chr)}:${Math.max(1, Math.round(start))}-${Math.round(end)}?feature=gene;content-type=application/json`);
  const list = (Array.isArray(r.data) ? r.data : []).map((g: any) => ({ id: String(g.id), symbol: String(g.external_name ?? g.gene_id ?? g.id), start: num(g.start), end: num(g.end), strand: strandOf(g.strand), biotype: String(g.biotype ?? '') }));
  return { ...r, data: list };
}

export async function fetchKaryotype(): Promise<Sourced<{ name: string; length: number }[]>> {
  const r = await request<any>('/info/assembly/homo_sapiens?content-type=application/json');
  const regions = (Array.isArray(r.data?.top_level_region) ? r.data.top_level_region : [])
    .filter((x: any) => x.coord_system === 'chromosome' && PRIMARY.has(String(x.name)) && x.name !== 'MT')
    .map((x: any) => ({ name: String(x.name), length: num(x.length) }));
  const order = (n: string) => (n === 'X' ? 23 : n === 'Y' ? 24 : Number(n));
  regions.sort((a: { name: string }, b: { name: string }) => order(a.name) - order(b.name));
  if (regions.length < 24) throw new GenomeError('Ensembl assembly listing is incomplete.', 'bad-response');
  return { ...r, data: regions };
}

/** Batch symbol lookup: one POST, falling back to individual GETs (4 at a time) if the POST is refused. */
export async function fetchLocations(symbols: string[]): Promise<Sourced<GenomeLocation[]>> {
  const toLoc = (sym: string, g: any): GenomeLocation | null =>
    g && typeof g.id === 'string' && PRIMARY.has(String(g.seq_region_name)) ? { symbol: sym, id: g.id, chr: String(g.seq_region_name), start: num(g.start), end: num(g.end), strand: strandOf(g.strand) } : null;
  const key = `batch:${[...symbols].sort().join(',')}`;
  try {
    const r = await request<Record<string, any>>('/lookup/symbol/homo_sapiens', { method: 'POST', body: JSON.stringify({ symbols }) }, key);
    return { ...r, data: symbols.map((s) => toLoc(s, r.data?.[s])).filter((x): x is GenomeLocation => !!x) };
  } catch (e) {
    if (e instanceof GenomeError && e.kind === 'not-found') throw e;
    const out: GenomeLocation[] = []; let firstErr: unknown = null; let last: Sourced<unknown> | null = null;
    for (let i = 0; i < symbols.length; i += 4) {
      const batch = await Promise.allSettled(symbols.slice(i, i + 4).map((s) => request<any>(`/lookup/symbol/homo_sapiens/${encodeURIComponent(s)}?content-type=application/json`).then((r) => ({ s, r }))));
      for (const b of batch) {
        if (b.status === 'fulfilled') { last = b.value.r; const l = toLoc(b.value.s, b.value.r.data); if (l) out.push(l); }
        else firstErr ??= b.reason;
      }
      if (!out.length && firstErr) throw firstErr;
    }
    return { data: out, retrievedAt: last?.retrievedAt ?? new Date().toISOString(), cached: !!last?.cached, url: `${ENSEMBL}/lookup/symbol/homo_sapiens` };
  }
}

/** Cytoband containing a position, e.g. "11q23.3". Derived from the fetched bands, never stored. */
export function bandAt(chr: Chromosome, pos: number): string | null {
  const b = chr.bands.find((x) => pos >= x.start && pos <= x.end);
  return b ? `${chr.name}${b.name}` : null;
}

export const externalLinks = (symbol: string, ensemblId?: string): { label: string; href: string; note: string }[] => [
  { label: 'Ensembl', href: ensemblId ? `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${ensemblId}` : `https://www.ensembl.org/Multi/Search/Results?q=${encodeURIComponent(symbol)};species=Homo_sapiens`, note: 'Gene model, variants, comparative genomics' },
  { label: 'NCBI Gene', href: `https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(symbol)}%5Bsym%5D+AND+human%5Borgn%5D`, note: 'Summary, RefSeq, literature' },
  { label: 'UniProt', href: `https://www.uniprot.org/uniprotkb?query=gene_exact%3A${encodeURIComponent(symbol)}+AND+organism_id%3A9606`, note: 'Protein function and domains' },
  { label: 'GTEx', href: `https://gtexportal.org/home/gene/${encodeURIComponent(symbol)}`, note: 'Bulk tissue expression and eQTLs' },
  { label: 'Human Protein Atlas', href: `https://www.proteinatlas.org/search/${encodeURIComponent(symbol)}`, note: 'Single-cell and tissue protein expression' },
  { label: 'UCSC Genome Browser', href: `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=${encodeURIComponent(symbol)}`, note: 'Full genome browser, hg38' },
];
