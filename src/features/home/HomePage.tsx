import { useMemo } from 'react';
import { Link } from '../../app/router';
import { Button } from '../../components/ui/Button';
import { Section, SectionHead } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { EvidenceLegend, EvidenceStack } from '../../components/science/EvidenceStack';
import { DOMAINS } from '../../data/content/domains';
import { PROJECTS } from '../../data/content/projects';
import { NORTH_STAR, PRINCIPLES, SITE } from '../../data/content/site';
import { useDataset } from '../../data/useDataset';
import { differentialAbundance } from '../../lib/analysis/composition';
import { fmtNum, fmtP, pct } from '../../lib/format';
import type { ClaimStack } from '../../lib/evidence';
import { DomainGlyph } from './DomainGlyph';
import { HeroFigure } from './HeroFigure';
import { QuestionExplorer } from './QuestionExplorer';

const SCALES = [
  { k: 'Tissue', img: 'tissue', title: 'Spatial architecture', text: 'Which cells sit together, and where immune cells meet the tumour.', cta: 'Open the spatial map', href: '/explore/spatial', alt: 'Illustration of a tissue section in the style of multiplex immunofluorescence' },
  { k: 'Spots', img: 'visium', title: 'Spatial transcriptomics', text: 'Expression measured in place, then read against the tissue it came from.', cta: 'Spatial research', href: '/research?domain=spatial', alt: 'Illustration of spatial transcriptomics capture spots over an H&E-stained section' },
  { k: 'Genome', img: 'hic', title: 'Genes and regulation', text: 'Where each gene lies, its transcripts and neighbours, and the programs that control it.', cta: 'Open the gene atlas', href: '/genes', alt: 'Illustration of a Hi-C chromatin contact map' },
];

export function HomePage() {
  const ds = useDataset();
  const claim = useMemo<ClaimStack | null>(() => {
    if (!ds) return null;
    const top = [...differentialAbundance(ds)].sort((a, b) => a.p - b.p)[0];
    return {
      statement: `${top.label} proportion differs between conditions`, simulated: true,
      layers: {
        observed: { text: `Mean proportion of ${top.label}: ${pct(top.meanControl)} in control donors and ${pct(top.meanDisease)} in disease donors.` },
        statistical: { text: `Welch t-test on logit proportions: t = ${fmtNum(top.t)}, adjusted P = ${fmtP(top.padj)} (Benjamini-Hochberg over 9 cell types).`, test: 'Welch t-test on logit proportions, BH', adjP: top.padj, runId: `home-example@${ds.meta.fingerprint}` },
        inference: { text: 'If this were real data, the change would suggest altered tissue composition.' },
        hypothesis: { text: 'Altered abundance contributes to the modelled phenotype; imaging or flow cytometry in independent samples could test it.' },
      },
    };
  }, [ds]);

  return (
    <>
      <section className="hero">
        <div className="container hero-in">
          <div className="hero-copy">
            <p className="hero-name">Vin-OmicsLab</p>
            <h1>Computational Biology. From Data to Discovery.</h1>
            <p className="hero-lede">{SITE.statement}</p>
            <div className="btn-row">
              <Button to="/research" variant="primary">Explore Research</Button>
              <Button to="/agent">Ask the Science Agent</Button>
              <Button to="/explore">Explore Analyses</Button>
            </div>
            <p className="small muted hero-founder">Founded by {SITE.founder}.</p>
            <p className="hero-credit">Background: a generated tissue illustration, styled as fluorescence or H&amp;E to match the theme. Not microscopy data.</p>
          </div>
          <HeroFigure />
        </div>
      </section>

      <Section>
        <SectionHead title="From tissue to genome" lede="The work spans scales: how cells are arranged in tissue, what each spot of tissue expresses, and how the genome folds and is regulated." />
        <ul className="scales">
          {SCALES.map((s) => (
            <li key={s.title}>
              <Link to={s.href} className="scale-tile">
                <div className={`scale-img scale-${s.img}`} role="img" aria-label={s.alt} />
                <div className="scale-body"><span className="scale-k">{s.k}</span><h3>{s.title}</h3><p>{s.text}</p><span className="link-strong small">{s.cta}</span></div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="small muted">Images are generated illustrations in the style of each assay. They are not data.</p>
      </Section>

      <Section tone="raised">
        <SectionHead title="Every analysis begins with a biological question." lede="Select a question. The figure beside it shows the kind of analysis that would begin to answer it, on simulated data, followed by the reason not to over-read it." />
        <QuestionExplorer />
      </Section>

      <Section>
        <SectionHead title="Research domains" lede="Each domain leads to a collection of research questions and the methods used to answer them." />
        <ul className="domain-grid">
          {DOMAINS.map((d) => (
            <li key={d.id}>
              <Link to={`/research?domain=${d.id}`} className="domain-tile">
                <DomainGlyph kind={d.glyph} />
                <h3>{d.title}</h3>
                <p>{d.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="raised">
        <SectionHead title="Featured research" lede="From biological question to computational method to evidence." aside={<Button to="/research" variant="quiet">All research</Button>} />
        <ol className="feature-list">
          {PROJECTS.map((p) => (
            <li key={p.slug}>
              <Link to={`/research/${p.slug}`} className="feature-row">
                <div><h3>{p.title}</h3><p>{p.oneLine}</p></div>
                <div className="feature-meta">{p.domainIds.map((id) => <span key={id} className="tag">{DOMAINS.find((d) => d.id === id)?.title}</span>)}<Badge tone="placeholder">Results awaiting author input</Badge></div>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="two-col">
          <div>
            <SectionHead title="Evidence is graded, never blended." lede="Every result on this platform separates what was observed, what a test supports, what published work says, what a model infers and what remains a hypothesis." />
            <EvidenceLegend />
          </div>
          <div>
            <p className="small muted">A live example from the simulated dataset. The literature level stays empty because nothing verified is linked; the platform will not fill it.</p>
            {claim ? <EvidenceStack claim={claim} /> : <p className="empty">Loading.</p>}
          </div>
        </div>
      </Section>

      <Section tone="raised">
        <SectionHead title="From question to reproducible analysis" />
        <ol className="north">
          {NORTH_STAR.map((s) => (
            <li key={s.verb}><Link to={s.href}><strong>{s.verb}</strong><span>{s.text}</span></Link></li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="two-col">
          <div>
            <h2>About the platform</h2>
            <p>Vin-OmicsLab develops computational approaches for complex biological questions. It is founded by {SITE.founder}, and this first version is a research platform in its early phase. It lists no clients, partners or publications that have not been supplied and verified.</p>
            <p>It grows in stages: research portfolio, interactive analyses, then a reproducible analysis workspace. <Link to="/about" className="link-strong">About the founder</Link> and <Link to="/methods" className="link-strong">the methods library</Link>.</p>
          </div>
          <div>
            <h3 className="h-sm">Principles</h3>
            <ul className="plain principles">{PRINCIPLES.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      </Section>
    </>
  );
}
