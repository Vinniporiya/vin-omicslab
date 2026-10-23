import { useState } from 'react';
import { QUESTIONS } from '../../data/content/questions';
import { VIEWS } from '../explorer/registry';
import { useDataset } from '../../data/useDataset';

export function QuestionExplorer() {
  const ds = useDataset();
  const [id, setId] = useState(QUESTIONS[0].id);
  const q = QUESTIONS.find((x) => x.id === id)!;
  const view = VIEWS.find((v) => v.key === q.view)!;
  const V = view.Component;
  return (
    <div className="qx">
      <ul className="qx-list">
        {QUESTIONS.map((x) => (
          <li key={x.id}><button type="button" className={x.id === id ? 'is-active' : ''} aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.question}</button></li>
        ))}
      </ul>
      <div className="qx-panel" aria-live="polite">
        <p className="qx-approach"><strong>Approach.</strong> {q.approach}</p>
        {ds ? <V ds={ds} embedded /> : <p className="empty">Loading the simulated dataset.</p>}
        <p className="qx-caution"><strong>Before believing it.</strong> {q.caution}</p>
      </div>
    </div>
  );
}
