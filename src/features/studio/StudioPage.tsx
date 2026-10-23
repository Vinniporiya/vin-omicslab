import { useMemo, useState } from 'react';
import { planStore } from '../../app/planStore';
import { Link } from '../../app/router';
import { useStore } from '../../app/store';
import { PageHead, Section } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Controls';
import { CodeViewer, WorkflowDiagram } from '../../components/science/CodeViewer';
import { EvidenceStack } from '../../components/science/EvidenceStack';
import { DemoStamp, StatusPill } from '../../components/science/badges';
import { useDataset } from '../../data/useDataset';
import { buildPlan, EXAMPLE_QUESTIONS } from '../../lib/agent/planner';
import { buildCode } from '../../lib/codegen';
import { downloadText, toCsv } from '../../lib/download';
import { fmtNum, fmtP, thousands } from '../../lib/format';
import { worst } from '../../lib/qc';
import { buildReport } from '../../lib/report';
import { assessReproducibility, verifyRerun } from '../../lib/reproducibility';
import { DEFAULT_RUN_PARAMS, runDemoAnalysis, type RunParams, type RunResult } from '../../lib/run';
import type { TypeId } from '../../data/demo/genes';

type Stage = 'question' | 'dataset' | 'plan' | 'workflow' | 'execution' | 'qc' | 'results' | 'interpretation' | 'report' | 'reproducibility';
const STAGES: { id: Stage; label: string; needsRun?: boolean }[] = [
  { id: 'question', label: 'Question' }, { id: 'dataset', label: 'Dataset' }, { id: 'plan', label: 'Analysis plan' }, { id: 'workflow', label: 'Workflow' },
  { id: 'execution', label: 'Execution' }, { id: 'qc', label: 'Quality control', needsRun: true }, { id: 'results', label: 'Results', needsRun: true },
  { id: 'interpretation', label: 'Interpretation', needsRun: true }, { id: 'report', label: 'Report', needsRun: true }, { id: 'reproducibility', label: 'Reproducibility', needsRun: true },
];

export function StudioPage() {
  const ds = useDataset();
  const approved = useStore(planStore);
  const [params, setParams] = useState<RunParams>(DEFAULT_RUN_PARAMS);
  const [run, setRun] = useState<RunResult | null>(null);
  const [stage, setStage] = useState<Stage>('question');
  const [repro, setRepro] = useState<{ matched: boolean; hash: string } | null>(null);
  const [saved, setSaved] = useState('');
  const defaultPlan = useMemo(() => { const o = buildPlan(EXAMPLE_QUESTIONS[0]); return o.kind === 'plan' ? o.plan : null; }, []);
  const plan = approved?.plan ?? defaultPlan;
  const set = (p: Partial<RunParams>) => { setParams({ ...params, ...p }); setRun(null); setRepro(null); };
  const label = ds?.cellTypes.find((c) => c.id === params.typeId)?.label ?? '';
  const artifacts = useMemo(() => buildCode({ typeLabel: label, minCells: params.minCells, fdr: params.fdr, lfc: params.lfc }), [label, params]);

  if (!ds) return <><PageHead title="Analysis Studio" /><Section><p className="empty" role="status">Loading the simulated dataset.</p></Section></>;

  const execute = () => { setRun(runDemoAnalysis(ds, params)); setRepro(null); };
  const sig = run ? run.de.rows.filter((r) => r.padj < params.fdr && Math.abs(r.log2fc) >= params.lfc) : [];
  const csv = run ? toCsv(run.de.rows, ['gene', 'log2fc', 'meanExpr', 't', 'df', 'p', 'padj']) : undefined;
  const assess = run ? assessReproducibility(run.provenance) : null;

  const panel = (() => {
    switch (stage) {
      case 'question':
        return (<>
          <h2>Question</h2>
          <blockquote className="quote">{plan?.userQuestion}</blockquote>
          <p className="small muted">{approved ? 'From your approved Science Agent plan.' : 'Default demonstration question. Use the Science Agent to approve your own plan first.'}</p>
          {approved && !plan?.executableInDemo && <p className="notice">Your approved plan ({plan?.intentLabel}) is not executable in the demo. The plan is recorded, but the demo runs pseudobulk differential expression on simulated data.</p>}
        </>);
      case 'dataset':
        return (<>
          <h2>Dataset</h2>
          <dl className="record">
            <dt>Title</dt><dd>{ds.meta.title} <DemoStamp /></dd><dt>Identifier</dt><dd>{ds.meta.id}</dd>
            <dt>Cells and donors</dt><dd>{thousands(ds.meta.nCells ?? 0)} cells, {ds.donors.length} donors (4 control, 4 disease)</dd>
            <dt>Modalities</dt><dd>{ds.meta.modality.join('; ')}</dd><dt>Generator</dt><dd>version {ds.meta.generatorVersion}, seed {ds.meta.seed}</dd>
            <dt>Fingerprint</dt><dd><code>{ds.meta.fingerprint}</code></dd>
          </dl>
          <p className="small muted">Datasets are loaded through a provider. A real dataset registers a provider and every stage below is unchanged.</p>
        </>);
      case 'plan':
        return (<>
          <h2>Analysis plan</h2>
          <p className="small muted">{approved ? `Approved plan: ${plan?.intentLabel}.` : 'Default demonstration plan. Nothing has been approved.'} The demo executes the pseudobulk step with the parameters below.</p>
          <div className="controls">
            <Select label="Cell type" value={params.typeId} onChange={(v) => set({ typeId: v as TypeId })} options={ds.cellTypes.map((c) => ({ value: c.id, label: c.label }))} />
            <Select label="Minimum cells per donor" value={String(params.minCells)} onChange={(v) => set({ minCells: Number(v) })} options={[{ value: '5', label: '5' }, { value: '10', label: '10' }, { value: '20', label: '20' }, { value: '40', label: '40' }]} />
            <Select label="Adjusted P below" value={String(params.fdr)} onChange={(v) => set({ fdr: Number(v) })} options={[{ value: '0.05', label: '0.05' }, { value: '0.1', label: '0.1' }, { value: '0.25', label: '0.25' }]} />
            <Select label="|log2FC| at least" value={String(params.lfc)} onChange={(v) => set({ lfc: Number(v) })} options={[{ value: '0', label: '0' }, { value: '0.5', label: '0.5' }, { value: '1', label: '1' }]} />
          </div>
          {plan?.sections.map((s) => <details key={s.key} className="plan-sum"><summary>{s.title}</summary><ul>{s.items.map((i) => <li key={i}>{i}</li>)}</ul></details>)}
        </>);
      case 'workflow':
        return (<>
          <h2>Workflow</h2>
          <p>The workflow a real run would execute. Rule bodies are templates and are not run by the demo.</p>
          <WorkflowDiagram />
          <p className="small muted">Engine for this demo: <code>in-browser-demo</code>. Production engine: Snakemake or Nextflow with pinned containers.</p>
        </>);
      case 'execution':
        return (<>
          <h2>Execution</h2>
          <p className="notice">Simulated execution. It runs real statistics in this browser on simulated data. There is no cloud compute, container, R or Python process.</p>
          <div className="btn-row"><Button variant="primary" onClick={() => execute()}>{run ? 'Run again' : 'Run simulated analysis'}</Button>{run && <Button onClick={() => setStage('qc')}>Continue to quality control</Button>}</div>
          {run ? <pre className="log" tabIndex={0} aria-label="Run log"><code>{run.logs.join('\n')}</code></pre> : <p className="empty">Not run yet. Changing a parameter clears the previous run.</p>}
        </>);
      case 'qc':
        return run && (<>
          <h2>Quality control review</h2>
          <p>Overall: <StatusPill status={worst(run.qc)} /></p>
          <table className="table"><thead><tr><th>Check</th><th>Measured</th><th>Rule</th><th>Status</th></tr></thead>
            <tbody>{run.qc.map((c) => <tr key={c.id}><td>{c.label}</td><td>{c.value}</td><td className="small muted">{c.rule}</td><td><StatusPill status={c.status} /></td></tr>)}</tbody></table>
          <p className="small muted">Checks the demo cannot perform are reported as REQUIRES REVIEW. They are never shown as passed, and no quality metric is invented.</p>
        </>);
      case 'results':
        return run && (<>
          <h2>Results</h2>
          <p>{sig.length} of {run.de.genesTested} genes pass adjusted P below {params.fdr} and |log2FC| of at least {params.lfc} in {label}. <Link to="/explore/differential" className="link-strong">Open the volcano plot</Link>.</p>
          <table className="table"><thead><tr><th>Gene</th><th className="num">log2FC</th><th className="num">P</th><th className="num">Adjusted P</th></tr></thead>
            <tbody>{run.de.rows.slice(0, 10).map((r) => <tr key={r.gene}><td>{r.gene}</td><td className="num">{fmtNum(r.log2fc)}</td><td className="num">{fmtP(r.p)}</td><td className="num">{fmtP(r.padj)}</td></tr>)}</tbody></table>
          <h3 className="h-sm">Gene sets among up-regulated genes</h3>
          <table className="table"><thead><tr><th>Gene set</th><th className="num">Overlap</th><th className="num">Adjusted P</th></tr></thead>
            <tbody>{run.up.slice(0, 4).map((r) => <tr key={r.id}><td>{r.name}</td><td className="num">{r.overlap} of {r.setSize}</td><td className="num">{fmtP(r.padj)}</td></tr>)}</tbody></table>
        </>);
      case 'interpretation':
        return run && (<>
          <h2>Interpretation</h2>
          <p className="small muted">Each claim keeps observation, statistics, literature, inference and hypothesis apart. No literature is linked to a simulated result.</p>
          <div className="evidence-list">{run.claims.map((c) => <EvidenceStack key={c.statement} claim={c} />)}</div>
        </>);
      case 'report': {
        if (!run) return null;
        const md = buildReport(ds, run, plan);
        return (<>
          <h2>Report</h2>
          <div className="btn-row"><Button onClick={() => setSaved(downloadText('analysis-report.md', md, 'text/markdown') ? 'Saved analysis-report.md' : 'Download blocked by the browser.')}>Download report</Button><span className="small" role="status">{saved}</span></div>
          <pre className="code report" tabIndex={0}><code>{md}</code></pre>
        </>);
      }
      case 'reproducibility':
        return run && assess && (<>
          <h2>Reproducibility</h2>
          <p>Status: <Badge tone={assess.status === 'complete' ? 'verified' : 'placeholder'}>{assess.status === 'complete' ? 'Reproducible' : assess.status === 'partial' ? 'Not reproducible: record incomplete' : 'No record'}</Badge></p>
          <ul className="checklist">{assess.items.map((i) => <li key={i.id} className={i.present ? 'ok' : 'miss'}><strong>{i.present ? 'Present' : 'Missing'}: {i.label}</strong><span className="small muted">{i.note}</span></li>)}</ul>
          <p className="small muted">The platform calls a result reproducible only when every item above exists. Until then it reports what is missing.</p>
          <div className="btn-row">
            <Button onClick={() => setRepro(verifyRerun(ds, run))}>Reproduce analysis (in-browser check)</Button>
            {repro && <span role="status" className={repro.matched ? 'ok-text' : 'bad-text'}>{repro.matched ? `Re-run matched. Result hash ${repro.hash}. This checks the in-browser engine only, not the R or Python templates.` : `Re-run differed: ${repro.hash} against ${run.resultHash}.`}</span>}
          </div>
          <h3 className="h-sm">Code, workflow and results</h3>
          <CodeViewer artifacts={artifacts} resultsCsv={csv} />
        </>);
    }
  })();

  return (
    <>
      <PageHead title="Analysis Studio" lede="From a question to a reproducible record: dataset, plan, workflow, execution, quality control, results, interpretation, report and reproducibility.">
        <div className="head-badges"><Badge tone="sim">Simulated execution, simulated data</Badge>{approved ? <Badge tone="verified">Approved plan loaded</Badge> : <span className="small muted">No approved plan yet. <Link to="/agent" className="link-strong">Ask the Science Agent</Link></span>}</div>
      </PageHead>
      <Section>
        <div className="studio">
          <ol className="stepper" aria-label="Analysis stages">
            {STAGES.map((s, i) => {
              const locked = !!s.needsRun && !run;
              return (
                <li key={s.id}><button type="button" className={`step${stage === s.id ? ' is-current' : ''}`} disabled={locked} aria-current={stage === s.id ? 'step' : undefined} onClick={() => setStage(s.id)}>
                  <span className="step-n">{i + 1}</span><span>{s.label}</span>{locked && <span className="step-lock">Run first</span>}
                </button></li>
              );
            })}
          </ol>
          <div className="studio-panel">{panel}</div>
        </div>
      </Section>
    </>
  );
}
