/*
 * The narrative structure of a conference (Experience Engine v2): the
 * journey told in five Acts over the same scene packages. Acts are
 * organizational containers for the editor — the Runtime renders the
 * flat composed scene list and knows nothing of them
 * (docs/Experience-Engine-V2.md). Each Act after the first opens with an
 * optional chapter intro, born hidden until an editor invites it in.
 */
export interface ConferenceAct {
  id: string;
  scenes: readonly string[];
}

export const CONFERENCE_ACTS: readonly ConferenceAct[] = [
  { id: 'invitation', scenes: ['arrival', 'countdown', 'facts'] },
  {
    id: 'story',
    scenes: ['intro-story', 'story', 'quote', 'moments', 'featured-sessions'],
  },
  { id: 'people', scenes: ['intro-people', 'speakers', 'sponsors'] },
  { id: 'experience', scenes: ['intro-experience', 'program', 'venue'] },
  { id: 'join', scenes: ['intro-join', 'closing'] },
];

export const actOfScene = (sceneId: string): string | null =>
  CONFERENCE_ACTS.find((act) => act.scenes.includes(sceneId))?.id ?? null;

/*
 * The public voice of each Act — what a chapter intro announces to the
 * visitor. The Studio keeps its own editor vocabulary in its constants.
 */
export const CONFERENCE_ACT_TITLES: Record<
  string,
  Record<'he' | 'en', string>
> = {
  invitation: { he: 'ההזמנה', en: 'The Invitation' },
  story: { he: 'הסיפור', en: 'The Story' },
  people: { he: 'האנשים', en: 'The People' },
  experience: { he: 'החוויה', en: 'The Experience' },
  join: { he: 'ההצטרפות', en: 'Join' },
};

export const ACT_INTRO_SCENES: Record<string, string> = {
  'intro-story': 'story',
  'intro-people': 'people',
  'intro-experience': 'experience',
  'intro-join': 'join',
};
