import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { METHODS } from '../../data/content/methods';
import { VIEWS } from '../explorer/registry';

export function MethodPage({ slug }: { slug: string }) {
  const m = METHODS.find((x) => x.slug === slug);
  if (!m) return <PageHead title="Method not found" lede="This method does not exist. Return to the methods library." />;
  const view = VIEWS.find((v) => v.key === m.explorerView);
  const List = ({ items }: { items: string[] }) => <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
  return (
    <>
      <PageHead bg="tracks" title={m.title} lede={m.problem}><p className="crumb"><Link to="/methods">Methods</Link> / {m.tags.join(', ')}</p></PageHead>
      <Section>
        <div className="method-page">
          <article>
            <section><h2>What problem does it solve?</h2><p>{m.problem}</p></section>
            <section><h2>When should it be used?</h2><List items={m.when} /></section>
            <section><h2>What does it assume?</h2><List items={m.assumptions} /></section>
            <section><h2>Common failure modes</h2><List items={m.failures} /></section>
            <section><h2>Example workflow</h2><ol>{m.workflow.map((s) => <li key={s}>{s}</li>)}</ol></section>
            <section><h2>Example visualization</h2><p>{m.visualNote}</p>{view && <p><Link to={`/explore/${view.key}`} className="link-strong">Open {view.title} in the Explorer</Link></p>}</section>
            <section>
              <h2>Reproducible implementation</h2>
              <p className="small muted">Illustrative snippet, {m.code.language}. Package versions and arguments change; check them before use.</p>
              <pre className="code" tabIndex={0}><code>{m.code.source}</code></pre>
            </section>
            <section>
              <h2>Relevant literature <Badge tone="unverified" title="Listed from general knowledge without DOIs; not yet checked against the sources.">Unverified</Badge></h2>
              <ul>{m.references.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="small muted">References are listed from general knowledge, without DOIs. Confirm each before citing.</p>
            </section>
          </article>
        </div>
      </Section>
    </>
  );
}
