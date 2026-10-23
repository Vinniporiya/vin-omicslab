import { useRef, type ReactNode } from 'react';
import { FigureTools } from './FigureTools';
import { Link } from '../../app/router';
import type { ClaimStack } from '../../lib/evidence';
import { DemoStamp } from './badges';
import { EvidenceStack } from './EvidenceStack';

export interface MethodRecordData {
  dataset: string; method: string; test: string; parameters: [string, string][]; interpretation: string; limitations: string[];
}

export function MethodRecord({ r }: { r: MethodRecordData }) {
  return (
    <dl className="record">
      <dt>Dataset</dt><dd>{r.dataset}</dd>
      <dt>Method</dt><dd>{r.method}</dd>
      <dt>Statistical test</dt><dd>{r.test}</dd>
      <dt>Parameters</dt>
      <dd><ul className="plain">{r.parameters.map(([k, v]) => <li key={k}><span className="muted">{k}</span> {v}</li>)}</ul></dd>
      <dt>Interpretation</dt><dd>{r.interpretation}</dd>
      <dt>Limitations</dt><dd><ul>{r.limitations.map((l) => <li key={l}>{l}</li>)}</ul></dd>
    </dl>
  );
}

interface Props {
  title: string; embedded?: boolean; controls?: ReactNode; figure: ReactNode; caption: ReactNode;
  record: MethodRecordData; claims?: ClaimStack[]; viewKey: string;
}
/**
 * Every visualization is wrapped so that dataset, method, test, parameters, interpretation, limitations and evidence
 * are always shown together with the figure. `embedded` renders only the figure for use on other pages.
 */
export function VizPanel({ title, embedded, controls, figure, caption, record, claims, viewKey }: Props) {
  const figRef = useRef<HTMLElement>(null);
  if (embedded) {
    return (
      <div className="viz viz-embedded">
        {controls && <div className="controls">{controls}</div>}
        <figure className="figure">{figure}<figcaption>{caption}</figcaption></figure>
        <div className="viz-open"><Link to={`/explore/${viewKey}`} className="link-strong">Open with method record and evidence</Link></div>
      </div>
    );
  }
  return (
    <div className="viz">
      <div className="viz-main">
        <div className="viz-title"><h2>{title}</h2><DemoStamp /></div>
        {controls && <div className="controls">{controls}</div>}
        <figure className="figure" ref={figRef}>{figure}<figcaption>{caption}</figcaption></figure>
        <FigureTools target={figRef} name={`vin-omicslab-${viewKey}`} footer={`Vin-OmicsLab · ${title} · SIMULATED DATA, not a real result`} />
      </div>
      <aside className="viz-record" aria-label="Method record"><h3>Method record</h3><MethodRecord r={record} /></aside>
      {claims && claims.length > 0 && (
        <div className="viz-evidence">
          <h3>Evidence</h3>
          <p className="muted small">Each level is kept separate. Empty levels stay empty.</p>
          <div className="evidence-list">{claims.map((c) => <EvidenceStack key={c.statement} claim={c} />)}</div>
        </div>
      )}
    </div>
  );
}
