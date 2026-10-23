import type { AnalysisPlan, PlanSection } from './planner';

/**
 * Agent lifecycle: QUESTION -> PLAN -> USER REVIEW -> EXECUTION -> VALIDATION -> RESULTS -> INTERPRETATION -> EVIDENCE.
 * Execution is unreachable until the person approves the current plan; any edit revokes approval.
 */
export type AgentStage = 'question' | 'plan' | 'review' | 'approved' | 'execution' | 'validation' | 'results' | 'interpretation' | 'evidence';
export interface StageDef { id: AgentStage; label: string; note: string; inPrototype: boolean }
export const AGENT_STAGES: StageDef[] = [
  { id: 'question', label: 'Question', note: 'You state the biological question.', inPrototype: true },
  { id: 'plan', label: 'Plan', note: 'The agent drafts a structured analysis plan.', inPrototype: true },
  { id: 'review', label: 'Your review', note: 'You approve, modify or question the plan.', inPrototype: true },
  { id: 'execution', label: 'Execution', note: 'Locked until you approve. Demo execution runs in Analysis Studio.', inPrototype: false },
  { id: 'validation', label: 'Validation', note: 'Independent analytical review of design, model and QC.', inPrototype: false },
  { id: 'results', label: 'Results', note: 'Tables and figures tied to the run.', inPrototype: false },
  { id: 'interpretation', label: 'Interpretation', note: 'Observed, statistical, inferred and hypothesised claims kept apart.', inPrototype: false },
  { id: 'evidence', label: 'Evidence', note: 'Claims linked to verified literature and to the run.', inPrototype: false },
];

export interface AgentState { question: string; plan: AnalysisPlan | null; approvedAt: string | null; planVersion: number }
export const initialAgentState: AgentState = { question: '', plan: null, approvedAt: null, planVersion: 0 };

export const stageOf = (s: AgentState): AgentStage => (!s.question ? 'question' : !s.plan ? 'plan' : !s.approvedAt ? 'review' : 'approved');
export const canExecute = (s: AgentState): boolean => !!s.plan && !!s.approvedAt;

export const withPlan = (s: AgentState, question: string, plan: AnalysisPlan): AgentState => ({ question, plan, approvedAt: null, planVersion: s.planVersion + 1 });
export const approve = (s: AgentState, now: Date = new Date()): AgentState => (s.plan ? { ...s, approvedAt: now.toISOString() } : s);
export function modify(s: AgentState, sections: PlanSection[]): AgentState {
  if (!s.plan) return s;
  const edited = sections.map((sec, i) => ({ ...sec, edited: sec.items.join('\n') !== s.plan!.sections[i].items.join('\n') }));
  return { ...s, plan: { ...s.plan, sections: edited, modified: edited.some((e) => e.edited) }, approvedAt: null, planVersion: s.planVersion + 1 };
}
