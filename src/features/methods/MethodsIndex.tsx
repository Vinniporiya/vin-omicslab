import { useState } from 'react';
import { Link } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { METHODS } from '../../data/content/methods';

export function MethodsIndex() {
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const tags = [...new Set(METHODS.flatMap((m) => m.tags))].sort();
  const needle = q.trim().toLowerCase();
  const list = METHODS.filter((m) => (!tag || m.tags.includes(tag)) && (!needle || `${m.title} ${m.problem} ${m.tags.join(' ')} ${m.failures.join(' ')}`.toLowerCase().includes(needle)));
  return (
    <>
      <PageHead bg="tracks" title="Methods" lede="A searchable library of computational biology methods: the problem each solves, when to use it, what it assumes, how it fails, and a workflow with code.">
        <div className="method-tools">
          <label className="field grow"><span>Search methods</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: pseudoreplication, doublets, permutation" /></label>
          <div className="chips" role="group" aria-label="Filter by topic">
            <button type="button" className={`chip${!tag ? ' is-active' : ''}`} aria-pressed={!tag} onClick={() => setTag('')}>All</button>
            {tags.map((t) => <button key={t} type="button" className={`chip${tag === t ? ' is-active' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>{t}</button>)}
          </div>
        </div>
      </PageHead>
      <Section>
        <p className="small muted" role="status">{list.length} of {METHODS.length} methods</p>
        {list.length === 0 ? <p className="empty">No method matches. Clear the search or the topic filter.</p> : (
          <ul className="method-list">
            {list.map((m) => (
              <li key={m.slug}><Link to={`/methods/${m.slug}`} className="method-row"><div><h3>{m.title}</h3><p>{m.problem}</p></div><div className="feature-meta">{m.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></Link></li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
