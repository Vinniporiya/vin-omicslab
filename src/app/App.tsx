import { useEffect, useRef } from 'react';
import { Shell } from './Layout';
import { useRoute } from './router';
import { HomePage } from '../features/home/HomePage';
import { ResearchIndex } from '../features/research/ResearchIndex';
import { ProjectPage } from '../features/research/ProjectPage';
import { ExplorerPage } from '../features/explorer/ExplorerPage';
import { StudioPage } from '../features/studio/StudioPage';
import { AgentPage } from '../features/agent/AgentPage';
import { PublicationsPage } from '../features/publications/PublicationsPage';
import { MethodsIndex } from '../features/methods/MethodsIndex';
import { MethodPage } from '../features/methods/MethodPage';
import { AboutPage } from '../features/about/AboutPage';
import { ContactPage } from '../features/contact/ContactPage';
import { GeneIndex } from '../features/genes/GeneIndex';
import { GenePage } from '../features/genes/GenePage';
import { NotFound } from './NotFound';

const TITLES: Record<string, string> = { research: 'Research', explore: 'Explore', analyze: 'Analyze', agent: 'Science Agent', publications: 'Publications', methods: 'Methods', about: 'About', contact: 'Contact', genes: 'Gene atlas' };

export function App() {
  const r = useRoute();
  const [a, b] = r.segments;
  const first = useRef(true);
  // On in-app navigation, move focus to the new page's main content so keyboard and screen-reader users start there.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const m = document.getElementById('main');
    if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
  }, [r.path]);
  useEffect(() => { window.scrollTo(0, 0); document.title = `${a === 'genes' && b ? b.toUpperCase() + ' | ' : ''}${TITLES[a] ? TITLES[a] + ' | ' : ''}Vin-OmicsLab`; }, [r.path, a]);
  let page;
  switch (a) {
    case 'research': page = b ? <ProjectPage slug={b} /> : <ResearchIndex domain={r.query.get('domain')} />; break;
    case 'explore': page = <ExplorerPage view={b} query={r.query} />; break;
    case 'genes': page = b ? <GenePage symbol={decodeURIComponent(b)} /> : <GeneIndex />; break;
    case 'analyze': page = <StudioPage />; break;
    case 'agent': page = <AgentPage />; break;
    case 'publications': page = <PublicationsPage />; break;
    case 'methods': page = b ? <MethodPage slug={b} /> : <MethodsIndex />; break;
    case 'about': page = <AboutPage />; break;
    case 'contact': page = <ContactPage />; break;
    case undefined: page = <HomePage />; break;
    default: page = <NotFound path={r.path} />;
  }
  return <Shell path={r.path}>{page}</Shell>;
}
