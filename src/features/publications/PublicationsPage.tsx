import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { ContentBadge } from '../../components/science/badges';
import { PUBLICATIONS, TEMPLATE_RECORD } from '../../data/content/publications';
import type { Publication } from '../../data/schema';

const ROWS: [string, (p: Publication) => string][] = [
  ['Research question', (p) => p.researchQuestion], ['Datasets', (p) => (p.datasetIds.length ? p.datasetIds.join(', ') : '[Dataset accessions]')],
  ['Computational contribution', (p) => p.computationalContribution], ['Figures', () => '[Figures with interactive versions]'],
  ['Code', (p) => p.codeUrl ?? '[Repository and release]'], ['Interactive analysis', () => '[Link to an Explorer view]'],
  ['Related projects', () => '[Projects on this site]'], ['Citation and DOI', (p) => p.doi ?? '[DOI]'],
];

export function PublicationsPage() {
  return (
    <>
      <PageHead title="Publications" lede="A publication here is an entry point into the science: the question, the data, the computational contribution, the figures, the code and an interactive analysis." />
      <Section>
        {PUBLICATIONS.length === 0 ? (
          <div className="empty-state">
            <h2>No publications have been added yet.</h2>
            <p>Records appear here only after Vinod Kumar supplies them with a DOI or preprint link. Nothing on this page is inferred or invented. Add records in <code>src/data/content/publications.ts</code>.</p>
          </div>
        ) : null}
        <h2 className="h-sm">How a record will read</h2>
        <article className="pub pub-template" aria-label="Publication record template">
          <header><h3>{TEMPLATE_RECORD.title}</h3><ContentBadge status="placeholder" /></header>
          <p className="muted">{TEMPLATE_RECORD.authors.join(', ')}. {TEMPLATE_RECORD.venue}.</p>
          <dl className="pub-grid">{ROWS.map(([k, f]) => <div key={k}><dt>{k}</dt><dd>{f(TEMPLATE_RECORD)}</dd></div>)}</dl>
        </article>
        {PUBLICATIONS.map((p) => (
          <article key={p.id} className="pub">
            <header><h3>{p.title}</h3><ContentBadge status={p.status} /></header>
            <p className="muted">{p.authors.join(', ')}. {p.venue}, {p.year}.</p>
            <dl className="pub-grid">{ROWS.map(([k, f]) => <div key={k}><dt>{k}</dt><dd>{f(p)}</dd></div>)}</dl>
          </article>
        ))}
        <p className="small muted">Related: <Link to="/research" className="link-strong">Research projects</Link>, <Link to="/methods" className="link-strong">Methods library</Link>.</p>
      </Section>
    </>
  );
}
