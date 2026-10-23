import { useMemo, useState } from 'react';
import { Link } from '../../app/router';
import { PageHead, Section, SectionHead } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DemoStamp } from '../../components/science/badges';
import { Karyogram } from '../../components/genome/Karyogram';
import { GENE_GROUPS, LR_PAIRS, PANEL, PROGRAMS, REGULONS } from '../../data/demo/genes';
import { useDataset } from '../../data/useDataset';
import { geneProfile } from '../../lib/analysis/geneStats';
import { geneSummaries } from '../../lib/analysis/summary';
import { fmtNum, fmtP } from '../../lib/format';
import { fetchKaryotype, fetchLocations } from '../../lib/genome/ensembl';
import { useAsync } from '../../lib/useAsync';

const rolesOf = (g: string): string[] => {
  const r: string[] = [];
  if (REGULONS.some((x) => x.tf === g)) r.push('TF');
  if (REGULONS.some((x) => x.targets.some((t) => t.gene === g))) r.push('target');
  if (LR_PAIRS.some((p) => p.ligand === g)) r.push('ligand');
  if (LR_PAIRS.some((p) => p.receptor === g)) r.push('receptor');
  return r;
};

function GenomeMap() {
  const kary = useAsync('karyotype', () => fetchKaryotype());
  const locs = useAsync('panel-locations', () => fetchLocations(PANEL));
  if (kary.status === 'error' || locs.status === 'error') {
    const err = kary.status === 'error' ? kary.error : locs.status === 'error' ? locs.error : null;
    return <div className="notice" role="status"><strong>The genome map needs Ensembl.</strong> {err?.message} Gene coordinates are never stored in this site, so nothing is drawn without them.<div className="btn-row"><Button onClick={() => { kary.retry(); locs.retry(); }}>Try again</Button></div></div>;
  }
  if (kary.status !== 'ok' || locs.status !== 'ok') return <p className="empty" role="status">Loading chromosome sizes and gene positions from Ensembl.</p>;
  const missing = PANEL.filter((g) => !locs.data.data.some((l) => l.symbol === g));
  return (
    <>
      <Karyogram chroms={kary.data.data} genes={locs.data.data} groupOf={(s) => PROGRAMS[s]?.group ?? 'marker'} />
      <p className="source-line small"><Badge tone="verified">Live annotation</Badge> Ensembl REST API, GRCh38. {locs.data.data.length} of {PANEL.length} genes placed{missing.length ? `; not found: ${missing.join(', ')}` : ''}. Retrieved {new Date(locs.data.retrievedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{locs.data.cached ? ' (cached)' : ''}.</p>
    </>
  );
}

export function GeneIndex() {
  const ds = useDataset();
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState('');
  const [sort, setSort] = useState<'name' | 'tau' | 'p'>('name');
  const rows = useMemo(() => {
    if (!ds) return [];
    const S = geneSummaries(ds);
    return PANEL.map((g) => {
      const prof = geneProfile(ds, g);
      const tested = prof.rows.filter((r) => r.testable).sort((a, b) => a.p - b.p);
      return { g, group: PROGRAMS[g].group, top: ds.cellTypes[prof.topType], topMean: S[g].mean.all[prof.topType], tau: prof.tau, best: tested[0], roles: rolesOf(g) };
    });
  }, [ds]);
  const needle = q.trim().toUpperCase();
  const list = rows
    .filter((r) => (!grp || r.group === grp) && (!needle || r.g.includes(needle) || r.top.label.toUpperCase().includes(needle) || r.roles.some((x) => x.toUpperCase() === needle)))
    .sort((a, b) => (sort === 'tau' ? b.tau - a.tau : sort === 'p' ? (a.best?.padj ?? 2) - (b.best?.padj ?? 2) : a.g.localeCompare(b.g)));
  return (
    <>
      <PageHead bg="hic" title="Gene atlas" lede={`${PANEL.length} genes used across the platform's analyses. Each has a genome page with live Ensembl annotation and its expression in the demonstration dataset.`}>
        <div className="head-badges"><Badge tone="verified">Genome: live Ensembl</Badge><DemoStamp label="Expression: simulated" /><span className="small muted">The 400 synthetic genes used for differential expression (SIM0001 onward) have no genomic location and are not listed.</span></div>
      </PageHead>
      <Section>
        <SectionHead title="Panel genes on the genome" lede="Positions on GRCh38. Select a gene to open its page." />
        <GenomeMap />
      </Section>
      <Section tone="raised">
        <SectionHead title="All panel genes" />
        <div className="method-tools">
          <label className="field grow"><span>Search genes, cell types or roles</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: CD8, Myeloid, TF, ligand" /></label>
          <label className="field"><span>Sort by</span><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="name">Name</option><option value="tau">Cell-type specificity</option><option value="p">Strongest condition difference</option></select></label>
        </div>
        <div className="chips" role="group" aria-label="Filter by gene group">
          <button type="button" className={`chip${!grp ? ' is-active' : ''}`} aria-pressed={!grp} onClick={() => setGrp('')}>All</button>
          {GENE_GROUPS.map((x) => <button key={x.id} type="button" className={`chip${grp === x.id ? ' is-active' : ''}`} aria-pressed={grp === x.id} onClick={() => setGrp(grp === x.id ? '' : x.id)}>{x.label}</button>)}
        </div>
        <p className="small muted" role="status">{list.length} of {PANEL.length} genes</p>
        {!ds ? <p className="empty">Loading the simulated dataset.</p> : list.length === 0 ? <p className="empty">No gene matches. Clear the search or the filter.</p> : (
          <div className="table-wrap">
            <table className="table gene-table">
              <thead><tr><th>Gene</th><th>Group</th><th>Highest in</th><th>Specificity (tau)</th><th className="num">Strongest condition difference</th><th>Roles</th></tr></thead>
              <tbody>{list.map((r) => (
                <tr key={r.g}>
                  <td><Link to={`/genes/${r.g}`} className="gene-link">{r.g}</Link></td>
                  <td className="small">{GENE_GROUPS.find((x) => x.id === r.group)?.label}</td>
                  <td><span className="swatch" style={{ background: r.top.color }} />{r.top.short} <span className="muted small">{fmtNum(r.topMean)}</span></td>
                  <td><span className="tau"><span style={{ width: `${r.tau * 100}%` }} /></span><span className="small">{fmtNum(r.tau)}</span></td>
                  <td className="num">{r.best ? <>{ds.cellTypes[r.best.typeIdx].short} <span className={r.best.padj < 0.05 ? '' : 'muted'}>{fmtP(r.best.padj)}</span></> : <span className="muted">n/t</span>}</td>
                  <td>{r.roles.map((x) => <span key={x} className="tag">{x}</span>)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <p className="small muted">Specificity and condition differences are computed on simulated expression. Adjusted P is per gene across cell types; with {PANEL.length} genes, expect some false positives.</p>
      </Section>
    </>
  );
}
