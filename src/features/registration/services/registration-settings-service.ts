import type { Locale } from '@/config/locales';
import { registrationSettingsRepository } from '@/infrastructure';
import type { RegistrationSettingsDTO } from '../types/registration';

export const getRegistrationSettings = (
  slug: string,
  locale: Locale,
): Promise<RegistrationSettingsDTO | null> =>
  registrationSettingsRepository.getByEvent(slug, locale);

export const saveRegistrationSettings = (
  slug: string,
  locale: Locale,
  settings: RegistrationSettingsDTO,
): Promise<RegistrationSettingsDTO> =>
  registrationSettingsRepository.upsertByEvent(slug, locale, settings);
