import { computeEventHealth, type EventHealth } from '@/event-engine';
import type { Locale } from '@/config/locales';
import { applyComposition } from '@/experience-runtime';
import {
  CONFERENCE_SCENE_SEQUENCE,
  completeComposition,
  inspectJourney,
} from '@/features/cinematic';
import { eventRepository } from '@/infrastructure';
import { listAgenda } from '@/features/program/services/program-service';
import { getRegistrationSettings } from '@/features/registration/services/registration-settings-service';
import { toEventHealthInput } from '../utils/health-input';
import { journeyReadinessFacts, notesAsFindings } from '../utils/journey-facts';
import { isLaunchable } from '../utils/launch';
import type { EventSummary } from '../types/event-repository';

export { isLaunchable } from '../utils/launch';

export interface LaunchReview {
  event: EventSummary;
  health: EventHealth;
  canLaunch: boolean;
}

/*
 * The journey exactly as the Runtime will compose it for a visitor: the
 * authored sequence, reordered and hidden by the stored composition.
 * Readiness reads this and nothing else, so what the gate judges and
 * what the public page renders cannot drift apart.
 */
const composedJourney = (composition: Parameters<typeof completeComposition>[0]) =>
  applyComposition(
    CONFERENCE_SCENE_SEQUENCE.map((scene) => ({
      id: scene.id,
      type: scene.type,
      hidden: scene.hidden,
      content: {},
    })),
    completeComposition(composition),
  );

export const reviewLaunch = async (
  slug: string,
  locale: Locale,
): Promise<LaunchReview | null> => {
  const event = await eventRepository.findEvent(slug);
  if (!event) {
    return null;
  }
  const draft = await eventRepository.getOpeningDraft(slug, locale);
  if (!draft) {
    return null;
  }
  const [registrationSettings, sessions] = await Promise.all([
    getRegistrationSettings(slug, locale),
    listAgenda(slug, locale).catch(() => []),
  ]);

  const scenes = composedJourney(draft.composition);
  /*
   * The only rule that reads sessions looks for two of them overlapping
   * in one room. A session missing either end cannot overlap anything,
   * and substituting a placeholder time would invent a clash or hide
   * one, so it is dropped from the question rather than guessed at.
   */
  const scheduled = sessions.flatMap((session) =>
    session.startsAt && session.endsAt
      ? [
          {
            start: session.startsAt,
            end: session.endsAt,
            ...(session.room ? { room: session.room } : {}),
          },
        ]
      : [],
  );
  const facts = journeyReadinessFacts(scenes, draft, scheduled);

  const health = computeEventHealth(
    toEventHealthInput(facts, {
      phase: event.phase,
      publishStatus: event.launched ? 'published' : 'draft',
      capabilities: event.capabilities,
      eventStartsAt: event.startsAt,
      registrationClosesAt: registrationSettings?.closesAt,
      registrationConfigured: registrationSettings ? true : undefined,
      registrationRequiresCapacity: registrationSettings
        ? registrationSettings.mode !== 'invitation'
        : undefined,
      registrationCapacitySet: registrationSettings
        ? registrationSettings.capacity !== null
        : undefined,
      registrationHasConfirmation: registrationSettings
        ? Boolean(registrationSettings.confirmationMessage)
        : undefined,
      missingTranslations: 0,
      translationCompleteness: 100,
      mediaCompleteness: 100,
      experienceFindings: notesAsFindings(inspectJourney(scenes)),
    }),
  );
  return { event, health, canLaunch: isLaunchable(health) };
};

export type LaunchOutcome =
  | { ok: true; event: EventSummary }
  | { ok: false; blockers: number };

/*
 * Launching is the emotional conclusion of composing: the experience is
 * reviewed through EventHealth, and only a blocker-free experience goes
 * live. Guidance, then one confident action.
 */
export const launchExperience = async (
  slug: string,
  locale: Locale,
): Promise<LaunchOutcome> => {
  const review = await reviewLaunch(slug, locale);
  if (!review) {
    throw new Error('Event not found');
  }
  if (!review.canLaunch) {
    return { ok: false, blockers: review.health.blockers };
  }
  const event = await eventRepository.launchEvent(slug);
  return { ok: true, event };
};
