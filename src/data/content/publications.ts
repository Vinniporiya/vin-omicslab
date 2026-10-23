import type { Publication } from '../schema';

/**
 * TODO(content): add real, verified publication records here. No publication is listed until the author supplies it.
 * Each record links to a research question, datasets, the computational contribution, figures, code and an interactive view.
 */
export const PUBLICATIONS: Publication[] = [];

/** Shown only as a labelled template so visitors can see how a record will read. */
export const TEMPLATE_RECORD: Publication = {
  id: 'template', title: '[Title to be supplied]', authors: ['[Authors to be supplied]'], venue: '[Journal or preprint server]', year: 0,
  researchQuestion: '[The biological question this paper addresses]', datasetIds: [], computationalContribution: '[What was computationally new: a method, a pipeline, an atlas]',
  figureIds: [], relatedProjectSlugs: [], status: 'placeholder',
};
