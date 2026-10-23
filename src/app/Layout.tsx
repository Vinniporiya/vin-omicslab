import { useState, type ReactNode } from 'react';
import { NAV, SITE } from '../data/content/site';
import { Link } from './router';
import { useThemeColorMeta } from './theme';
import { DisplayMenu } from '../components/ui/DisplayMenu';

function Mark() {
  // five cells settling into a cluster: the mark reads as a tiny embedding
  const pts: [number, number, number, string][] = [[6, 9, 2.6, '#E0607E'], [13, 6, 2.2, '#4C9BE8'], [12, 14, 2.4, '#2FB5A5'], [19, 10, 1.9, '#E8A23A'], [8, 16, 1.6, '#9B7FD1']];
  return <svg width="26" height="22" viewBox="0 0 24 22" aria-hidden="true">{pts.map(([x, y, r, c], i) => <circle key={i} cx={x} cy={y} r={r} fill={c} />)}</svg>;
}

export function Header({ path }: { path: string }) {
  useThemeColorMeta();
  const [open, setOpen] = useState(false);
  const on = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  return (
    <header className="site-header">
      <div className="container header-in">
        <Link to="/" className="wordmark" aria-label="Vin-OmicsLab home"><Mark /><span>Vin-OmicsLab</span></Link>
        <nav className={`nav${open ? ' is-open' : ''}`} aria-label="Primary">
          {NAV.map((n) => <Link key={n.href} to={n.href} className={on(n.href) ? 'is-current' : ''} aria-current={on(n.href) ? 'page' : undefined} onClick={() => setOpen(false)}>{n.label}</Link>)}
        </nav>
        <div className="header-tools">
          <DisplayMenu />
          <button className="icon-btn nav-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">Menu</button>
        </div>
      </div>
    </header>
  );
}

export function DemoBar() {
  return (
    <div className="demo-bar" role="note">
      <div className="container">Demonstration build. Every dataset, figure and statistic on this site is simulated. Nothing shown is a real result.</div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-in">
        <div>
          <div className="wordmark"><Mark /><span>Vin-OmicsLab</span></div>
          <p className="small muted">{SITE.tagline}<br />Founded by {SITE.founder}.</p>
        </div>
        <nav aria-label="Footer" className="footer-nav">{NAV.map((n) => <Link key={n.href} to={n.href}>{n.label}</Link>)}<Link to="/genes">Gene atlas</Link></nav>
        <p className="small muted footer-note">Demonstration datasets are simulated by a seeded generator and are labelled wherever they appear. Publications, affiliations, clients and results are listed only when supplied and verified.</p>
      </div>
    </footer>
  );
}

export function Shell({ path, children }: { path: string; children: ReactNode }) {
  return (<><a className="skip" href="#main" onClick={(e) => { e.preventDefault(); const m = document.getElementById('main'); if (m) { m.setAttribute('tabindex', '-1'); m.focus(); } }}>Skip to content</a><DemoBar /><Header path={path} /><main id="main">{children}</main><Footer /></>);
}
