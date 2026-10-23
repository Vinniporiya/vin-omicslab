import { useState } from 'react';
import { PageHead, Section } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { SITE } from '../../data/content/site';

const KINDS = ['Research collaboration', 'Data analysis', 'Scientific consulting', 'Question about a method', 'Something else'];

export function ContactPage() {
  const [kind, setKind] = useState(KINDS[0]);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const body = `Enquiry type: ${kind}\nName: ${name}\nReply to: ${from}\n\n${msg}`;
  const mailto = SITE.contactEmail ? `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(`Vin-OmicsLab: ${kind}`)}&body=${encodeURIComponent(body)}` : '';
  const copy = async () => { try { await navigator.clipboard.writeText(body); setNote('Draft copied.'); } catch { setNote('Copy was blocked. Select the text in the draft box and copy it manually.'); } };
  return (
    <>
      <PageHead title="Contact" lede="Tell us the biological question. We reply to collaboration and analysis enquiries with the questions we would need answered before proposing a plan." />
      <Section>
        <div className="two-col">
          <div className="form">
            <label className="field"><span>What is this about?</span><select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="field"><span>Your name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="field"><span>Your email</span><input type="email" value={from} onChange={(e) => setFrom(e.target.value)} autoComplete="email" /></label>
            <label className="field"><span>Biological question and data available</span><textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="For example: 8 donors, snRNA-seq, disease versus control, interested in cell-type-specific pathways." /></label>
            <div className="btn-row">
              {mailto ? <a className="btn btn-primary" href={mailto}>Open in your email app</a> : <Button variant="primary" disabled title="A contact address has not been set">Send</Button>}
              <Button onClick={copy}>Copy draft</Button>
            </div>
            <p className="small" role="status">{note}</p>
          </div>
          <div>
            {!SITE.contactEmail && <p className="notice">A contact address has not been set for this build, so the form cannot send. Copy the draft and send it yourself. Set the address in <code>src/data/content/site.ts</code>.</p>}
            <h2 className="h-sm">Draft</h2>
            <pre className="code" aria-label="Message draft"><code>{body}</code></pre>
          </div>
        </div>
      </Section>
    </>
  );
}
