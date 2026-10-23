import { Link } from './router';
import { PageHead, Section } from '../components/ui/Section';

export function NotFound({ path }: { path: string }) {
  return (
    <>
      <PageHead title="Page not found" lede={`Nothing lives at ${path}.`} />
      <Section>
        <p>Try the <Link to="/research" className="link-strong">research index</Link>, the <Link to="/explore" className="link-strong">Explorer</Link>, the <Link to="/genes" className="link-strong">gene atlas</Link> or the <Link to="/methods" className="link-strong">methods library</Link>.</p>
      </Section>
    </>
  );
}
