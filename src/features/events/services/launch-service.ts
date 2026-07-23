import { computeEventHealth, type EventHealth } from '@/event-engine';
import { inspectExperience } from '@/experience-engine';
import type { Locale } from '@/config/locales';
import { eventRepository } from '@/infrastructure';
import { getRegistrationSettings } from '@/features/registration/services/registration-settings-service';
import { getEventExperience } from './event-experience-service';
import { toEventHealthInput } from '../utils/health-input';
import { isLaunchable } from '../utils/launch';
import type { EventSummary } from '../types/event-repository';

export { isLaunchable } from '../utils/launch';

export interface LaunchReview {
  event: EventSummary;
  health: EventHealth;
  canLaunch: boolean;
}

export const reviewLaunch = async (
  slug: string,
  locale: Locale,
): Promise<LaunchReview | null> => {
  const event = await eventRepository.findEvent(slug);
  if (!event) {
    return null;
  }
  const content = await getEventExperience(slug, locale, { draft: true });
  if (!content) {
    return null;
  }
  const registrationSettings = await getRegistrationSettings(slug, locale);

  /*
   * The cinematic conference always plays a venue scene and a closing
   * door (the Runtime's own sequence) — the readiness inspector, born
   * with the legacy scene model, cannot see them. Synthesize what the
   * public page truly renders, respecting the composition's hidden
   * flags, so launch judges the real experience.
   */
  const draft = await eventRepository
    .getOpeningDraft(slug, locale)
    .catch(() => null);
  const hiddenScenes = new Set(
    (draft?.composition ?? [])
      .filter((entry) => entry.hidden)
      .map((entry) => entry.scene),
  );
  const scenes = [...content.scenes];
  if (
    !scenes.some((scene) => scene.type === 'venue' && scene.enabled) &&
    !hiddenScenes.has('venue')
  ) {
    scenes.push({
      id: 'cinematic-venue',
      type: 'venue',
      title: 'Venue',
      enabled: true,
      content: {
        details: [
          ...(draft?.venue.accessibility ? [{ id: 'access' }] : []),
          ...(draft?.venue.emergency ? [{ id: 'emergency' }] : []),
        ],
      },
    });
  }
  if (
    !scenes.some(
      (scene) => scene.type === 'registration-cta' && scene.enabled,
    ) &&
    !hiddenScenes.has('closing')
  ) {
    scenes.push({
      id: 'cinematic-join',
      type: 'registration-cta',
      title: 'Join',
      enabled: true,
      content: {},
    });
  }
  const inspected = { ...content, scenes };

  const health = computeEventHealth(
    toEventHealthInput(inspected, {
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
      experienceFindings: inspectExperience(inspected.scenes),
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
