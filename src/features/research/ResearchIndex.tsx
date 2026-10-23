import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { DOMAINS } from '../../data/content/domains';
import { PROJECTS } from '../../data/content/projects';

export function ResearchIndex({ domain }: { domain: string | null }) {
  const active = DOMAINS.find((d) => d.id === domain);
  const list = active ? PROJECTS.filter((p) => p.domainIds.includes(active.id)) : PROJECTS;
  return (
    <>
      <PageHead bg="tissue" title="Research" lede="The work is organised by biological question, then computational method, then discovery, then evidence. Each project below follows the same twelve-part structure.">
        <div className="chips" role="group" aria-label="Filter by domain">
          <Link to="/research" className={`chip${!active ? ' is-active' : ''}`}>All domains</Link>
          {DOMAINS.map((d) => <Link key={d.id} to={`/research?domain=${d.id}`} className={`chip${active?.id === d.id ? ' is-active' : ''}`}>{d.title}</Link>)}
        </div>
      </PageHead>
      <Section>
        {active && <p className="lede narrow">{active.blurb}</p>}
        {list.length === 0 ? <p className="empty">No research has been added to this domain yet.</p> : (
          <ol className="feature-list">
            {list.map((p) => (
              <li key={p.slug}>
                <Link to={`/research/${p.slug}`} className="feature-row">
                  <div><h3>{p.title}</h3><p>{p.oneLine}</p><p className="feature-q"><span className="muted">Question, draft:</span> {p.question.text}</p></div>
                  <div className="feature-meta">{p.domainIds.map((id) => <span key={id} className="tag">{DOMAINS.find((d) => d.id === id)?.title}</span>)}<Badge tone="placeholder">Results awaiting author input</Badge></div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
