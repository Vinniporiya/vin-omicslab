import { EVIDENCE_LEVELS, validateClaim, type ClaimStack } from '../../lib/evidence';
import type { EvidenceLevel } from '../../data/schema';
import { DemoStamp } from './badges';

const EMPTY: Record<EvidenceLevel, string> = {
  observed: 'No observation recorded.',
  statistical: 'No test attached. A statistical claim needs a named test, an adjusted P value and a run ID.',
  literature: 'No verified reference linked. Literature evidence is attached only from a cited source with a DOI or PMID.',
  inference: 'No inference recorded.',
  hypothesis: 'No hypothesis recorded.',
};

/** Always renders all five levels in fixed order. An empty level is shown as empty; it is never filled automatically. */
export function EvidenceStack({ claim }: { claim: ClaimStack }) {
  const issues = validateClaim(claim);
  return (
    <div className="evidence" role="group" aria-label={`Evidence for: ${claim.statement}`}>
      <div className="evidence-head"><strong>{claim.statement}</strong>{claim.simulated && <DemoStamp />}</div>
      {EVIDENCE_LEVELS.map((l) => {
        const layer = claim.layers[l.level];
        return (
          <div key={l.level} className={`ev-row ev-${l.level}${layer ? '' : ' is-empty'}`}>
            <div className="ev-label" title={l.definition}><span className="ev-mark" aria-hidden="true" />{l.label}</div>
            <div className="ev-body">{layer ? layer.text : EMPTY[l.level]}</div>
          </div>
        );
      })}
      {issues.length > 0 && <ul className="ev-issues" role="alert">{issues.map((s) => <li key={s}>{s}</li>)}</ul>}
    </div>
  );
}

export function EvidenceLegend() {
  return (
    <dl className="ev-legend">
      {EVIDENCE_LEVELS.map((l) => (
        <div key={l.level} className={`ev-row ev-${l.level}`}>
          <dt className="ev-label"><span className="ev-mark" aria-hidden="true" />{l.label}</dt>
          <dd className="ev-body">{l.definition} <span className="muted">Requires: {l.requires}</span></dd>
        </div>
      ))}
    </dl>
  );
}
