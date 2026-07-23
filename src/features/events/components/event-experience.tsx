'use client';

import { ExperienceRenderer, type SceneData } from '@/experience-engine';
import type { Locale } from '@/config/locales';
import { registerExperienceScenes } from '@/features/experience';

registerExperienceScenes();

interface EventExperienceProps {
  scenes: SceneData[];
  locale: Locale;
  eventSlug: string;
}

export const EventExperience = ({
  scenes,
  locale,
  eventSlug,
}: EventExperienceProps) => (
  <ExperienceRenderer scenes={scenes} context={{ locale, eventSlug }} />
);
