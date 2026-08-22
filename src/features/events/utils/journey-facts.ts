import type { Finding, ReadinessInput } from '@/event-engine';
import type { JourneyNote, JourneyScene } from '@/features/cinematic';
import type { EventOpeningDraft } from '../types/event-repository';

export interface ProgramSessionTime {
  start: string;
  end: string;
  room?: string;
}

export type JourneyReadinessFacts = Pick<
  ReadinessInput,
  'experience' | 'program' | 'venue'
>;

/*
 * The scene ids the readiness rules ask about by name. They are the
 * authored ids of the conference journey, not scene types: a conference
 * has exactly one arrival, one venue and one closing door, and the
 * composition may move or hide them but never renames them.
 */
const ARRIVAL_SCENE = 'arrival';
const VENUE_SCENE = 'venue';
const CLOSING_SCENE = 'closing';

/*
 * Readiness facts read off the journey the visitor is actually served:
 * the composed Runtime scene list, plus the opening record behind it.
 *
 * This deliberately does not consult the legacy scene documents. The
 * public conference has rendered from the Runtime descriptor since
 * Experience Engine v2, while readiness still graded the old scene
 * graph — so the launch gate could block a finished conference over a
 * document nobody reads, or pass one whose real experience is empty.
 */
export const journeyReadinessFacts = (
  scenes: readonly JourneyScene[],
  draft: EventOpeningDraft,
  sessions: readonly ProgramSessionTime[],
): JourneyReadinessFacts => {
  const visible = scenes.filter((scene) => scene.hidden !== true);
  const shows = (id: string): boolean =>
    visible.some((scene) => scene.id === id);
  const written = (value: string | undefined): boolean =>
    typeof value === 'string' && value.trim().length > 0;

  return {
    experience: {
      sceneCount: visible.length,
      hasHero: shows(ARRIVAL_SCENE),
      heroHasImage: Boolean(draft.heroImageId),
      hasJoin: shows(CLOSING_SCENE),
    },
    program: {
      sessions: [...sessions],
      /*
       * A speaker linked to an account carries that account's portrait;
       * a manually entered one carries its own. Either counts as having
       * a face, so only a speaker with neither is missing one.
       */
      speakersWithoutPhoto: draft.speakers.filter(
        (speaker) => !speaker.photoUrl && !speaker.accountPhotoUrl,
      ).length,
    },
    venue: {
      present:
        shows(VENUE_SCENE) &&
        (written(draft.venue.name) || written(draft.venue.narrative)),
      hasAccessibilityInfo: written(draft.venue.accessibility),
      hasEmergencyInfo: written(draft.venue.emergency),
    },
  };
};

/*
 * The Rhythm Assistant speaks in suggestions by design — every note is
 * guidance, never a block. Severity is decided here, at the seam, so the
 * same note reads the same way in the Studio and in the launch gate, and
 * so no editorial rule can ever become a reason a conference cannot go
 * live.
 */
export const notesAsFindings = (notes: readonly JourneyNote[]): Finding[] =>
  notes.map((note) => ({
    id: note.id,
    severity: 'advice',
    category: 'experience',
    message: note.message,
    action: note.hint,
  }));
