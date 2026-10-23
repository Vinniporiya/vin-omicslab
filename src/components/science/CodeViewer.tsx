import { useState } from 'react';
import type { CodeArtifact } from '../../data/schema';
import { downloadText } from '../../lib/download';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { WORKFLOW_RULES } from '../../lib/codegen';

export function WorkflowDiagram({ rules = WORKFLOW_RULES }: { rules?: string[] }) {
  return (
    <ol className="workflow" aria-label="Workflow rules">
      {rules.map((r) => <li key={r}><code>{r}</code></li>)}
    </ol>
  );
}

export function CodeViewer({ artifacts, resultsCsv, resultsName = 'de_pseudobulk.csv' }: { artifacts: CodeArtifact[]; resultsCsv?: string; resultsName?: string }) {
  const [id, setId] = useState(artifacts[0].id);
  const [note, setNote] = useState('');
  const a = artifacts.find((x) => x.id === id) ?? artifacts[0];
  const save = (name: string, text: string) => setNote(downloadText(name, text) ? `Saved ${name}` : 'Your browser blocked the download. Copy the text instead.');
  const bundle = artifacts.map((x) => `# ===== ${x.filename} =====\n${x.content}`).join('\n\n');
  const copy = async () => { try { await navigator.clipboard.writeText(a.content); setNote(`Copied ${a.filename}`); } catch { setNote('Copy was blocked. Select the text and copy it manually.'); } };
  return (
    <div className="codeviewer">
      <div className="code-actions">
        <Tabs label="Code files" tabs={artifacts.map((x) => ({ id: x.id, label: x.filename }))} value={id} onChange={setId} />
        <div className="btn-row">
          <Button onClick={copy}>Copy</Button>
          <Button onClick={() => save(a.filename, a.content)}>Download file</Button>
          <Button onClick={() => save('vin-omicslab-analysis-bundle.txt', bundle)}>Download code bundle</Button>
          <Button disabled={!resultsCsv} onClick={() => resultsCsv && save(resultsName, resultsCsv)} title={resultsCsv ? '' : 'Run the analysis to produce results'}>Download results</Button>
        </div>
      </div>
      <div className="code-meta">
        <Badge tone={a.executed ? 'verified' : 'placeholder'}>{a.executed ? 'Executed' : 'Template, not executed'}</Badge>
        <span className="muted small">{a.language}</span>
        <span className="small" role="status">{note}</span>
      </div>
      <pre className="code" tabIndex={0}><code>{a.content}</code></pre>
    </div>
  );
}
