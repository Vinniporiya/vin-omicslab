import type { ContentStatus } from '../schema';

export interface ProfileSection { id: string; title: string; status: ContentStatus; text?: string; prompt: string }

/**
 * TODO(content): Vinod Kumar to supply every fact on this page. Nothing here asserts an affiliation, employment,
 * publication, award, collaboration or client. Sections marked "draft" are wording proposals to be confirmed or replaced.
 */
export const PROFILE = {
  name: 'Vinod Kumar, PhD',
  role: 'Computational Biology Scientist',
  founderNote: 'Founder of Vin-OmicsLab.',
  sections: [
    { id: 'bio', title: 'Summary', status: 'draft', prompt: 'A two to four sentence biography in your own words.',
      text: 'Vinod Kumar is a computational biologist working at the intersection of genomics, single-cell biology, spatial biology, multi-omics and machine learning.' },
    { id: 'interests', title: 'Research interests', status: 'placeholder', prompt: 'The questions you work on, in order of priority.' },
    { id: 'expertise', title: 'Scientific expertise', status: 'placeholder', prompt: 'Assays, data types and analytical methods you are expert in.' },
    { id: 'trajectory', title: 'Research trajectory', status: 'placeholder', prompt: 'How your work has developed, as a short narrative rather than a CV.' },
    { id: 'publications', title: 'Selected publications', status: 'placeholder', prompt: 'Three to six papers with DOIs. These also appear on the Publications page.' },
    { id: 'philosophy', title: 'Research philosophy', status: 'placeholder', prompt: 'How you decide what counts as evidence, and how you work with collaborators.' },
    { id: 'collaborations', title: 'Collaborations', status: 'placeholder', prompt: 'Named collaborations you have permission to list.' },
    { id: 'technology', title: 'Technology development', status: 'placeholder', prompt: 'Open-source tools, pipelines and platforms you have built, with links.' },
  ] as ProfileSection[],
};
