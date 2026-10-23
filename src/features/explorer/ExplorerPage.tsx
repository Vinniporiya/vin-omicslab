import { Link } from '../../app/router';
import { PageHead } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { useDataset } from '../../data/useDataset';
import { VIEWS } from './registry';

export function ExplorerPage({ view, query }: { view?: string; query?: URLSearchParams }) {
  const ds = useDataset();
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  const { Component } = active;
  return (
    <>
      <PageHead title="Research Explorer" lede="Explore analyses on a demonstration dataset. Every figure carries its dataset, method, test, parameters, interpretation, limitations and evidence.">
        <div className="head-badges"><Badge tone="sim">All data simulated</Badge><span className="small muted">Datasets load through a provider so real data can replace the simulation without changing any view.</span></div>
      </PageHead>
      <div className="container explorer">
        <nav className="explorer-nav" aria-label="Explorer views">
          {VIEWS.map((v) => (
            <Link key={v.key} to={`/explore/${v.key}`} className={v.key === active.key ? 'is-current' : ''} aria-current={v.key === active.key ? 'page' : undefined}>
              <strong>{v.title}</strong><span>{v.sub}</span>
            </Link>
          ))}
          <Link to="/genes" className="explorer-atlas"><strong>Gene atlas</strong><span>Genome pages, 48 genes</span></Link>
        </nav>
        <div className="explorer-main">
          {ds ? <Component key={`${active.key}?${query?.toString() ?? ''}`} ds={ds} query={query} /> : <p className="empty" role="status">Loading the simulated dataset.</p>}
        </div>
      </div>
    </>
  );
}
