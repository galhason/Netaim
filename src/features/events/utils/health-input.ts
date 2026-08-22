import type {
  EventCapability,
  EventHealthInput,
  EventPhase,
  Finding,
  ReadinessInput,
} from '@/event-engine';
import type { JourneyReadinessFacts } from './journey-facts';

interface HealthInputOptions {
  phase: EventPhase;
  publishStatus: 'draft' | 'published';
  capabilities: readonly EventCapability[];
  eventStartsAt?: string;
  registrationClosesAt?: string;
  registrationConfigured?: boolean;
  registrationRequiresCapacity?: boolean;
  registrationCapacitySet?: boolean;
  registrationHasConfirmation?: boolean;
  missingTranslations: number;
  translationCompleteness: number;
  mediaCompleteness: number;
  experienceFindings: readonly Finding[];
}

/*
 * The application-layer adapter: assembles the readiness question from
 * facts already extracted from the journey, so the Event Engine never
 * depends on a scene model, a renderer or the CMS (Objective 8
 * independence). Reading the journey is `journeyReadinessFacts`; this
 * only surrounds it with the event's own state.
 */
export const toEventHealthInput = (
  facts: JourneyReadinessFacts,
  options: HealthInputOptions,
): EventHealthInput => {
  const readiness: ReadinessInput = {
    phase: options.phase,
    capabilities: options.capabilities,
    experience: facts.experience,
    program: facts.program,
    venue: facts.venue,
    localization: {
      enabledLocales: ['he', 'en'],
      missingTranslations: options.missingTranslations,
    },
    registration: {
      closesAt: options.registrationClosesAt,
      eventStartsAt: options.eventStartsAt,
      configured: options.registrationConfigured,
      requiresCapacity: options.registrationRequiresCapacity,
      capacitySet: options.registrationCapacitySet,
      hasConfirmationMessage: options.registrationHasConfirmation,
    },
  };

  return {
    phase: options.phase,
    publishStatus: options.publishStatus,
    declaredCapabilities: options.capabilities,
    readiness,
    experienceFindings: options.experienceFindings,
    translationCompleteness: options.translationCompleteness,
    mediaCompleteness: options.mediaCompleteness,
  };
};
