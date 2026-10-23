// Numerical self-tests for the scientific core. Run: npm run selftest
import { tTwoSidedP, bh, hypergeomUpper, welch, fnv } from '../src/lib/stats';
import { generateDemoDataset } from '../src/data/demo/generate';
import { differentialAbundance } from '../src/lib/analysis/composition';
import { pseudobulkDE, isSignificant } from '../src/lib/analysis/de';
import { overRepresentation } from '../src/lib/analysis/pathway';
import { neighbourhoodEnrichment } from '../src/lib/analysis/spatial';
import { repertoireMetrics, compareMetric } from '../src/lib/analysis/repertoire';
import { embeddings } from '../src/lib/analysis/embedding';
import { regulonActivity } from '../src/lib/analysis/regulation';
import { communication, topInteractions } from '../src/lib/analysis/communication';
import { geneProfile } from '../src/lib/analysis/geneStats';
import { parseGene, bandAt } from '../src/lib/genome/ensembl';
import { recolor } from '../src/data/useDataset';
import { PROGRAMS, PANEL } from '../src/data/demo/genes';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); if (!ok) failed++; };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// --- known reference values -------------------------------------------------------------
check('t two-sided p (t=2.447, df=6) ~ 0.05', near(tTwoSidedP(2.447, 6), 0.05, 0.001), String(tTwoSidedP(2.447, 6)));
check('t two-sided p (t=2.228, df=10) ~ 0.05', near(tTwoSidedP(2.228, 10), 0.05, 0.001));
check('t two-sided p (t=0) = 1', near(tTwoSidedP(0, 5), 1, 1e-9));
check('BH known vector', JSON.stringify(bh([0.01, 0.04, 0.03, 0.005]).map((v) => +v.toFixed(4))) === JSON.stringify([0.02, 0.04, 0.04, 0.02]));
check('hypergeom upper (k=2,N=10,K=4,n=3) = 0.3333', near(hypergeomUpper(2, 10, 4, 3), 1 / 3, 1e-9), String(hypergeomUpper(2, 10, 4, 3)));
const w = welch([1, 2, 3, 4], [3, 4, 5, 6]);
check('Welch t (diff 2, var 1.667 each, n=4)', near(w.t, 2.1909, 0.001) && near(w.df, 6, 1e-9), `t=${w.t.toFixed(4)} df=${w.df}`);

// --- determinism --------------------------------------------------------------------------
const t0 = performance.now();
const ds = generateDemoDataset(20260918);
const t1 = performance.now();
const ds2 = generateDemoDataset(20260918);
check('generator deterministic (fingerprint)', ds.meta.fingerprint === ds2.meta.fingerprint);
check('generator deterministic (expression checksum)', fnv(Array.from(ds.landscape.expr.CD3E.slice(0, 500)).join(',')) === fnv(Array.from(ds2.landscape.expr.CD3E.slice(0, 500)).join(',')));
check('different seed differs', generateDemoDataset(1).meta.fingerprint !== ds.meta.fingerprint);
console.log(`     dataset: ${ds.landscape.n} cells, ${ds.spatial.n} spatial cells, generated in ${(t1 - t0).toFixed(0)} ms`);

// --- planted structure recovered --------------------------------------------------------
const da = differentialAbundance(ds);
const my = da.find((r) => r.typeId === 'Myeloid')!, epi = da.find((r) => r.typeId === 'Epi')!;
check('DA: myeloid increased in disease', my.log2fc > 0.4, `log2FC=${my.log2fc.toFixed(2)} p=${my.p.toExponential(2)} padj=${my.padj.toFixed(3)}`);
check('DA: epithelial decreased in disease', epi.log2fc < -0.4, `log2FC=${epi.log2fc.toFixed(2)} padj=${epi.padj.toFixed(3)}`);

const t2 = performance.now();
const de = pseudobulkDE(ds, 'Myeloid');
const t3 = performance.now();
const sig = de.rows.filter((r) => isSignificant(r, 0.1, 0.5));
check('DE: rows produced', de.rows.length > 300, `${de.rows.length} genes tested in ${(t3 - t2).toFixed(0)} ms`);
check('DE: some significant genes (padj<0.1, |log2FC|>=0.5)', sig.length > 5, `${sig.length} significant`);
const nullTypeDE = pseudobulkDE(ds, 'Endo');
console.log(`     Endo DE: ${nullTypeDE.rows.filter((r) => isSignificant(r, 0.1, 0.5)).length} significant, donors excluded: [${nullTypeDE.excludedDonors}]`);
const pdEx = pseudobulkDE(ds, 'Plasma', { minCells: 50, minTotalCounts: 10 });
check('DE: min-cell filter can block test with a message', pdEx.rows.length === 0 && !!pdEx.message, pdEx.message ?? '');

const up = de.rows.filter((r) => r.p < 0.05 && r.log2fc > 0).map((r) => r.gene);
const enr = overRepresentation(de.rows.map((r) => r.gene), ds.pseudobulk.geneSets, up);
console.log('     Myeloid up-gene enrichment top:', enr.slice(0, 3).map((e) => `${e.name} (${e.overlap}/${e.setSize}, padj=${e.padj.toExponential(1)})`).join('; '));
check('Pathway: Myeloid-linked set ranks first', enr[0].name === 'Antigen presentation' || enr[0].name === 'Complement');

const nh = neighbourhoodEnrichment(ds.spatial, ds.cellTypes.length);
const epiIdx = ds.cellTypes.findIndex((c) => c.id === 'Epi');
const fibIdx = ds.cellTypes.findIndex((c) => c.id === 'Fibro');
check('Spatial: epithelial self-adjacency enriched (z>5)', nh.z[epiIdx][epiIdx] > 5, `z=${nh.z[epiIdx][epiIdx].toFixed(1)}; edges=${nh.nEdges}`);
check('Spatial: epi-fibro less than epi-epi', nh.z[epiIdx][fibIdx] < nh.z[epiIdx][epiIdx]);

const tcr = repertoireMetrics(ds, 'TCR');
const cmp = compareMetric(tcr, 'shannon');
check('Repertoire: TCR diversity lower in disease', cmp.diff < 0, `dShannon=${cmp.diff.toFixed(2)} p=${cmp.p.toFixed(4)}`);

const em = embeddings(ds);
check('Embeddings: silhouettes computed', [em.silhouette.rna, em.silhouette.atac, em.silhouette.joint].every(isFinite), JSON.stringify(em.silhouette, (_, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));

check('Embeddings: joint beats each single modality (designed complementarity)', em.silhouette.joint > em.silhouette.rna && em.silhouette.joint > em.silhouette.atac);

const ra = regulonActivity(ds);
const spi1 = ra.tfs.indexOf('SPI1'), myIdx = ds.cellTypes.findIndex((c) => c.id === 'Myeloid');
check('GRN: SPI1 activity highest in myeloid', ra.matrix[spi1].every((v, i) => i === myIdx || v < ra.matrix[spi1][myIdx]));

const cc = communication(ds, 'all');
const top = topInteractions(cc, ds, 1)[0];
check('CCC: top interaction computed', !!top, `${top.pair}: ${top.sender} -> ${top.receiver}`);


// ---- genome pages ------------------------------------------------------------------------------
// Fixture in the shape of an Ensembl /lookup/symbol?expand=1 response. Values are test data, not real coordinates.
const fx = { id: 'ENSGTEST', display_name: 'TESTG', description: 'test gene [Source:HGNC Symbol;Acc:HGNC:1]', seq_region_name: '7', start: 1000, end: 5000, strand: -1, biotype: 'protein_coding', assembly_name: 'GRCh38',
  Transcript: [
    { id: 'T2', display_name: 'TESTG-202', is_canonical: 0, biotype: 'retained_intron', start: 1000, end: 3000, strand: -1, Exon: [{ start: 2500, end: 3000 }, { start: 1000, end: 1200 }] },
    { id: 'T1', display_name: 'TESTG-201', is_canonical: 1, biotype: 'protein_coding', start: 1000, end: 5000, strand: -1, Exon: [{ start: 4500, end: 5000 }, { start: 1000, end: 1400 }, { start: 2000, end: 2300 }], Translation: { start: 1200, end: 4700 } },
  ] };
const gm = parseGene(fx);
check('Genome: Ensembl record parsed (coordinates, strand, source suffix stripped)', gm.chr === '7' && gm.start === 1000 && gm.strand === -1 && gm.description === 'test gene');
check('Genome: canonical transcript sorted first, exons sorted by position', gm.transcripts[0].id === 'T1' && gm.transcripts[0].exons.map((e) => e.start).join() === '1000,2000,4500' && !!gm.transcripts[0].cds);
let threw = false; try { parseGene({ id: 'X', seq_region_name: '1', start: 'nope' }); } catch { threw = true; }
check('Genome: malformed record rejected rather than drawn', threw);
const chrFx = { name: '7', length: 10000, bands: [{ name: 'p11', start: 1, end: 3000, stain: 'gneg' }, { name: 'q11', start: 3001, end: 10000, stain: 'gpos50' }] };
check('Genome: cytoband lookup', bandAt(chrFx, 3000) === '7p11' && bandAt(chrFx, 3001) === '7q11' && bandAt(chrFx, 20000) === null);

const profs = PANEL.map((gn) => ({ gn, p: geneProfile(ds, gn) }));
let planted = 0, recovered = 0, nullTests = 0, falsePos = 0;
for (const { gn, p } of profs) for (const r of p.rows) {
  if (!r.testable) continue;
  const eff = PROGRAMS[gn].disease?.[ds.cellTypes[r.typeIdx].id];
  if (eff !== undefined) { planted++; if (r.padj < 0.05 && r.log2fc > 0) recovered++; } else { nullTests++; if (r.padj < 0.05) falsePos++; }
}
check('Gene stats: planted disease effects recovered with correct sign (most of them)', recovered / planted >= 0.6, `${recovered}/${planted}`);
check('Gene stats: false-positive rate among unprogrammed tests stays low', falsePos / nullTests < 0.06, `${falsePos}/${nullTests}`);
const tauOf = (g: string) => profs.find((x) => x.gn === g)!.p.tau;
check('Gene stats: tau specific marker > broad marker (CD8A > PTPRC)', tauOf('CD8A') > 0.8 && tauOf('PTPRC') < tauOf('CD8A'), `CD8A ${tauOf('CD8A').toFixed(2)}, PTPRC ${tauOf('PTPRC').toFixed(2)}`);
check('Gene stats: top cell type follows design (CD8A in CD8 T, KDR in endothelial)', ds.cellTypes[profs.find((x) => x.gn === 'CD8A')!.p.topType].id === 'CD8T' && ds.cellTypes[profs.find((x) => x.gn === 'KDR')!.p.topType].id === 'Endo');

const ifng = profs.find((x) => x.gn === 'IFNG')!.p.rows.find((r) => ds.cellTypes[r.typeIdx].id === 'CD8T')!;
check('Gene stats: t sign matches direction (IFNG up in disease CD8 T -> t > 0, log2 ratio > 0)', ifng.t > 0 && ifng.log2fc > 0, `t = ${ifng.t.toFixed(2)}`);

const rc = recolor(ds, 'okabe', 'dark');
check('Palette: colour-vision view recolours types only, shares data arrays, is memoised', rc !== ds && rc.landscape === ds.landscape && rc.cellTypes[0].color !== ds.cellTypes[0].color && recolor(ds, 'okabe', 'dark') === rc && recolor(ds, 'default', 'dark') === ds);
check('Palette: colour-vision view has 9 distinct colours', new Set(rc.cellTypes.map((c) => c.color)).size === 9);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
