import type { AnalysisPlan } from '../lib/agent/planner';
import { createStore } from './store';

export interface ApprovedPlan { plan: AnalysisPlan; approvedAt: string }
/** Hand-off between the Science Agent and Analysis Studio. Only an approved plan is ever placed here. */
export const planStore = createStore<ApprovedPlan | null>(null);
