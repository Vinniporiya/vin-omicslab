import type { ReactNode } from 'react';

export function Section({ children, id, tone }: { children: ReactNode; id?: string; tone?: 'raised' }) {
  return <section id={id} className={`section${tone ? ` section-${tone}` : ''}`}><div className="container">{children}</div></section>;
}
export function SectionHead({ title, lede, aside }: { title: string; lede?: string; aside?: ReactNode }) {
  return (
    <header className="section-head">
      <div><h2>{title}</h2>{lede && <p className="lede">{lede}</p>}</div>
      {aside && <div className="section-aside">{aside}</div>}
    </header>
  );
}
/** Banner backgrounds: generated scientific illustrations (scripts/backgrounds). Decorative, so hidden from assistive tech. */
export type HeadBg = 'tissue' | 'visium' | 'hic' | 'tracks';
export function PageHead({ title, lede, children, bg }: { title: string; lede?: string; children?: ReactNode; bg?: HeadBg }) {
  return (
    <div className={`page-head${bg ? ` has-bg bg-${bg}` : ''}`}><div className="container">
      <h1>{title}</h1>{lede && <p className="lede">{lede}</p>}{children}
    </div></div>
  );
}
export function Figure({ children, n, caption }: { children: ReactNode; n?: number; caption: ReactNode }) {
  return (
    <figure className="figure">
      {children}
      <figcaption>{n !== undefined && <strong>Figure {n} | </strong>}{caption}</figcaption>
    </figure>
  );
}
