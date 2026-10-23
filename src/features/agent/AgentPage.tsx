import { useState } from 'react';
import { planStore } from '../../app/planStore';
import { navigate } from '../../app/router';
import { PageHead, Section } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AGENT_STAGES, approve, canExecute, initialAgentState, modify, stageOf, withPlan, type AgentState } from '../../lib/agent/machine';
import { buildPlan, EXAMPLE_QUESTIONS, type PlanSection, type SectionKey } from '../../lib/agent/planner';

export function AgentPage() {
  const [state, setState] = useState<AgentState>(initialAgentState);
  const [text, setText] = useState('');
  const [clarify, setClarify] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlanSection[]>([]);
  const [asking, setAsking] = useState(false);
  const [askKey, setAskKey] = useState<SectionKey>('statistics');
  const [qText, setQText] = useState('');
  const [questions, setQuestions] = useState<{ key: SectionKey; q: string }[]>([]);
  const stage = stageOf(state);
  const plan = state.plan;

  const submit = () => {
    const out = buildPlan(text);
    if (out.kind === 'plan') { setState(withPlan(state, text.trim(), out.plan)); setClarify(null); setEditing(false); setAsking(false); setQuestions([]); }
    else setClarify(out.prompts);
  };
  const startEdit = () => { setDraft(plan!.sections.map((s) => ({ ...s, items: [...s.items] }))); setEditing(true); };
  const saveEdit = () => { setState(modify(state, draft)); setEditing(false); };
  const send = () => { if (plan && state.approvedAt && canExecute(state)) { planStore.set({ plan, approvedAt: state.approvedAt }); navigate('/analyze'); } };

  const stateOf = (id: string) => (id === 'question' ? (state.question ? 'done' : 'current') : id === 'plan' ? (plan ? 'done' : state.question ? 'current' : 'todo') : id === 'review' ? (state.approvedAt ? 'done' : plan ? 'current' : 'todo') : 'locked');

  return (
    <>
      <PageHead title="Science Agent" lede="A computational biology research assistant that turns a biological question into a reviewable analysis plan. It plans first. Nothing runs until you approve.">
        <div className="head-badges"><Badge tone="draft">Prototype</Badge><span className="small muted">The planner is rule-based: it routes your question to reviewed plan templates. There is no language model, and it never produces results.</span></div>
      </PageHead>
      <Section>
        <div className="agent">
          <div className="agent-main">
            <form className="ask" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <label htmlFor="q" className="ask-q">What biological question are you trying to answer?</label>
              <textarea id="q" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: I want to identify cell-type-specific pathways altered by disease." />
              <div className="btn-row"><Button type="submit" variant="primary">Build analysis plan</Button></div>
              <div className="chips" aria-label="Example questions">{EXAMPLE_QUESTIONS.map((q) => <button key={q} type="button" className="chip" onClick={() => setText(q)}>{q}</button>)}</div>
            </form>

            {clarify && (
              <div className="notice" role="status">
                <strong>The question needs more detail before a plan can be drafted.</strong>
                <ul>{clarify.map((c) => <li key={c}>{c}</li>)}</ul>
                <span className="small">The prototype supports questions about differential expression and pathways, abundance, spatial immune architecture, immune repertoires, regulatory programs, biomarkers and splicing.</span>
              </div>
            )}

            {plan && (
              <article className="plan" aria-label="Analysis plan">
                <header className="plan-head">
                  <div><h2>{plan.intentLabel}</h2><p className="small muted">Plan {plan.id}{plan.modified ? ', modified by you' : ''}</p></div>
                  <Badge tone={state.approvedAt ? 'verified' : 'placeholder'}>{state.approvedAt ? 'Approved' : 'Awaiting your review'}</Badge>
                </header>
                {(editing ? draft : plan.sections).map((s, i) => (
                  <section key={s.key} className="plan-sec">
                    <h3>{s.title}{s.edited && !editing && <Badge tone="draft">Edited</Badge>}</h3>
                    {editing
                      ? <textarea rows={Math.max(3, s.items.length + 1)} value={s.items.join('\n')} aria-label={`Edit ${s.title}, one item per line`} onChange={(e) => setDraft(draft.map((d, k) => (k === i ? { ...d, items: e.target.value.split('\n') } : d)))} />
                      : <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>}
                    {!editing && <details><summary>Why this section</summary><p className="small">{s.why}</p></details>}
                  </section>
                ))}

                {questions.length > 0 && <div className="qlog"><h3 className="h-sm">Your questions, recorded for review</h3><ul>{questions.map((q, i) => <li key={i}><span className="muted">{q.key}:</span> {q.q}</li>)}</ul></div>}
                {asking && (
                  <div className="ask-box">
                    <label className="field"><span>About which section?</span><select value={askKey} onChange={(e) => setAskKey(e.target.value as SectionKey)}>{plan.sections.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</select></label>
                    <p className="small">{plan.sections.find((s) => s.key === askKey)?.why}</p>
                    <label className="field"><span>Your question</span><input value={qText} onChange={(e) => setQText(e.target.value)} /></label>
                    <p className="small muted">The prototype answers with the stored rationale above. It does not generate free-form answers. Your question is recorded so it stays part of the review.</p>
                    <div className="btn-row"><Button disabled={!qText.trim()} onClick={() => { setQuestions([...questions, { key: askKey, q: qText.trim() }]); setQText(''); }}>Record question</Button><Button variant="quiet" onClick={() => setAsking(false)}>Close</Button></div>
                  </div>
                )}

                <footer className="plan-actions">
                  {editing ? (<><Button variant="primary" onClick={saveEdit}>Save changes</Button><Button onClick={() => setEditing(false)}>Cancel</Button></>) : (<>
                    <Button variant="primary" disabled={!!state.approvedAt} onClick={() => setState(approve(state))}>{state.approvedAt ? 'Approved' : 'Approve'}</Button>
                    <Button onClick={startEdit}>Modify</Button>
                    <Button onClick={() => setAsking(!asking)}>Ask question</Button>
                  </>)}
                </footer>
                {state.approvedAt && (
                  <div className="approved" role="status">
                    <p><strong>Plan approved.</strong> Execution is now permitted. Any edit revokes approval.</p>
                    {!plan.executableInDemo && <p className="small">The demo can execute only pseudobulk differential expression and abundance analyses. Analysis Studio will record this plan and run the demo analysis instead.</p>}
                    <Button variant="primary" onClick={send}>Send to Analysis Studio</Button>
                  </div>
                )}
              </article>
            )}
          </div>

          <aside className="agent-side" aria-label="Agent pipeline">
            <h2 className="h-sm">Pipeline</h2>
            <ol className="pipeline">
              {AGENT_STAGES.map((s) => {
                const st = s.id === 'execution' ? (canExecute(state) ? 'ready' : 'locked') : stateOf(s.id);
                return <li key={s.id} className={`pl pl-${st}`}><strong>{s.label}</strong><span>{st === 'ready' ? 'Permitted in Analysis Studio (simulated).' : st === 'locked' && s.id !== 'execution' ? `${s.note} Not built yet.` : s.note}</span></li>;
              })}
            </ol>
            <p className="small muted">Stage: {stage}. The agent never goes from question straight to an answer.</p>
          </aside>
        </div>
      </Section>
    </>
  );
}
