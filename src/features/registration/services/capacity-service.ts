import type { Locale } from '@/config/locales';
import {
  computeCapacity,
  deriveRegistrationState,
  type CapacityView,
  type PublicRegistrationState,
} from '@/registration-engine';
import {
  registrationRepository,
  registrationSettingsRepository,
} from '@/infrastructure';
import type {
  RegistrationCounts,
  RegistrationSettingsDTO,
} from '../types/registration';

export interface RegistrationSituation {
  settings: RegistrationSettingsDTO | null;
  counts: RegistrationCounts;
  capacity: CapacityView;
  state: PublicRegistrationState;
}

/*
 * The one place capacity and public state are derived for a surface. It
 * composes settings + live counts through the engine; no surface counts
 * or bands on its own (Registration-Architecture §4–§5).
 */
export const getRegistrationSituation = async (
  slug: string,
  locale: Locale,
  options?: { published?: boolean; now?: number },
): Promise<RegistrationSituation> => {
  const [settings, counts] = await Promise.all([
    registrationSettingsRepository.getByEvent(slug, locale),
    registrationRepository.countsByEvent(slug),
  ]);

  const capacity = computeCapacity({
    limit: settings?.capacity ?? null,
    confirmed: counts.confirmed,
    pending: counts.pending,
    waitlisted: counts.waitlisted,
  });

  const state = deriveRegistrationState({
    published: options?.published ?? true,
    opensAt: settings?.opensAt,
    closesAt: settings?.closesAt,
    waitlistEnabled: settings?.waitlistEnabled ?? false,
    capacity,
    now: options?.now ?? Date.now(),
  });

  return { settings, counts, capacity, state };
};
