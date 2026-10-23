import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { ContentBadge } from '../../components/science/badges';
import { Badge } from '../../components/ui/Badge';
import { DOMAINS } from '../../data/content/domains';
import { METHODS } from '../../data/content/methods';
import { PROJECT_FIELDS, PROJECTS } from '../../data/content/projects';
import { VIEWS } from '../explorer/registry';

export function ProjectPage({ slug }: { slug: string }) {
  const p = PROJECTS.find((x) => x.slug === slug);
  if (!p) return <PageHead title="Project not found" lede="This project does not exist. Return to the research index." />;
  const view = VIEWS.find((v) => v.key === p.explorerView);
  const methods = p.methodSlugs.map((s) => METHODS.find((m) => m.slug === s)).filter((m): m is NonNullable<typeof m> => !!m);
  return (
    <>
      <PageHead title={p.title} lede={p.oneLine}>
        <p className="crumb"><Link to="/research">Research</Link> / {p.domainIds.map((id) => DOMAINS.find((d) => d.id === id)?.title).join(', ')}</p>
        <div className="head-badges"><Badge tone="placeholder">Awaiting author input</Badge><span className="small muted">Text marked draft is a neutral framing of the question. It contains no result. Every other section stays empty until Vinod Kumar supplies verified content.</span></div>
      </PageHead>
      <Section>
        <div className="project">
          <div className="project-fields">
            {PROJECT_FIELDS.map((f, i) => {
              const v = p[f.key];
              return (
                <section key={f.key} className="pfield" aria-labelledby={`f-${f.key}`}>
                  <header><h2 id={`f-${f.key}`}><span className="pf-n">{i + 1}</span>{f.label}</h2><ContentBadge status={v.status} /></header>
                  {v.text ? <p>{v.text}</p> : <p className="pf-empty">{f.prompt}</p>}
                </section>
              );
            })}
          </div>
          <aside className="project-side">
            {view && (
              <div className="side-block">
                <h3>Related interactive analysis</h3>
                <p className="small">The {view.title.toLowerCase()} view shows this kind of analysis on a simulated dataset. It is not this project's data.</p>
                <Link to={`/explore/${view.key}`} className="link-strong">Open {view.title}</Link>
              </div>
            )}
            {methods.length > 0 && (
              <div className="side-block">
                <h3>Related methods</h3>
                <ul className="plain">{methods.map((m) => <li key={m.slug}><Link to={`/methods/${m.slug}`} className="link-strong">{m.title}</Link></li>)}</ul>
              </div>
            )}
            <div className="side-block"><h3>Reproducibility</h3><p className="small">No computational record is attached to this project yet, so nothing here is described as reproducible.</p></div>
          </aside>
        </div>
      </Section>
    </>
  );
}
