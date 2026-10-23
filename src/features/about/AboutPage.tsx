import { PageHead, Section } from '../../components/ui/Section';
import { ContentBadge } from '../../components/science/badges';
import { PROFILE } from '../../data/content/profile';
import { SITE } from '../../data/content/site';

export function AboutPage() {
  return (
    <>
      <PageHead title={PROFILE.name} lede={`${PROFILE.role}. ${PROFILE.founderNote}`} />
      <Section>
        <p className="notice">This profile is a structure, not a biography. It asserts no affiliation, position, publication, award or collaboration. Each section stays empty until {SITE.founder} supplies verified content.</p>
        <div className="profile">
          {PROFILE.sections.map((s) => (
            <section key={s.id} className="pfield" aria-labelledby={`p-${s.id}`}>
              <header><h2 id={`p-${s.id}`}>{s.title}</h2><ContentBadge status={s.status} /></header>
              {s.text ? <p>{s.text}</p> : <p className="pf-empty">{s.prompt}</p>}
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
