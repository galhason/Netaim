import type {
  EventCapability,
  EventHealthInput,
  EventPhase,
  Finding,
  ReadinessInput,
} from '@/event-engine';
import type { SceneData } from '@/experience-engine';
import type { EventExperienceContent } from '../types/event-experience';

interface HeroLike {
  backgroundImage?: unknown;
}

interface AgendaLike {
  days?: {
    sessions?: { startTime: string; endTime: string; room?: string }[];
  }[];
}

interface SpeakersLike {
  speakers?: { photoUrl?: unknown }[];
}

interface VenueLike {
  details?: { id: string }[];
}

const contentOf = <T>(scene: SceneData | undefined): T | null =>
  scene && typeof scene.content === 'object' && scene.content !== null
    ? (scene.content as T)
    : null;

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
 * The application-layer adapter: extracts readiness facts from the
 * content contract so the Event Engine never depends on the Experience
 * Engine or the CMS (Objective 8 independence).
 */
export const toEventHealthInput = (
  content: EventExperienceContent,
  options: HealthInputOptions,
): EventHealthInput => {
  const scenes = content.scenes.filter((scene) => scene.enabled);
  const hero = scenes.find((scene) => scene.type === 'hero');
  const venue = contentOf<VenueLike>(
    scenes.find((scene) => scene.type === 'venue'),
  );
  const agenda = contentOf<AgendaLike>(
    scenes.find((scene) => scene.type === 'agenda'),
  );
  const speakers = contentOf<SpeakersLike>(
    scenes.find((scene) => scene.type === 'speaker-grid'),
  );

  const sessions = (agenda?.days ?? []).flatMap((day) =>
    (day.sessions ?? []).map((session) => ({
      start: session.startTime,
      end: session.endTime,
      room: session.room,
    })),
  );

  const readiness: ReadinessInput = {
    phase: options.phase,
    capabilities: options.capabilities,
    experience: {
      sceneCount: scenes.length,
      hasHero: Boolean(hero),
      heroHasImage: Boolean(contentOf<HeroLike>(hero)?.backgroundImage),
      hasJoin: scenes.some((scene) => scene.type === 'registration-cta'),
    },
    program: {
      sessions,
      speakersWithoutPhoto: (speakers?.speakers ?? []).filter(
        (speaker) => !speaker.photoUrl,
      ).length,
    },
    venue: {
      present: Boolean(venue),
      hasAccessibilityInfo: (venue?.details ?? []).some(
        (detail) => detail.id === 'access',
      ),
      hasEmergencyInfo: (venue?.details ?? []).some(
        (detail) => detail.id === 'emergency',
      ),
    },
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
