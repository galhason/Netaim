'use server';

import { revalidatePath } from 'next/cache';
import type { Locale } from '@/config/locales';
import { audit } from '@/features/access';
import {
  launchExperience,
  saveEventComposition,
  saveEventOpening,
} from '@/features/events';
import type { EventOpeningInput } from '@/features/events/types/event-repository';
import { CONFERENCE_SECTIONS, normalizeVenueFactIcon } from '@/features/studio/constants/conference-sections';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent } from '@/shared/cache/publish';

/*
 * What the editor sends when a section changes: the section's own
 * fields, in both languages, plus the values that are written once
 * (pictures, a number, a URL). Nothing outside the section is touched —
 * the write is built from the section table, so a field the section
 * does not declare cannot be sent by accident.
 */
export interface SectionSaveInput {
  slug: string;
  section: string;
  he: Record<string, string>;
  en: Record<string, string>;
  shared: Record<string, string>;
  facts?: { icon: string; he: { label: string; description: string }; en: { label: string; description: string } }[];
  moments?: { imageId: string; he: string; en: string }[];
  programDays?: { he: { theme: string; description: string }; en: { theme: string; description: string } }[];
}

export type SectionSaveOutcome =
  | { ok: true; savedAt: string }
  | { ok: false; reason: 'forbidden' | 'unknown-section' | 'failed' };

const LOCALES: Locale[] = ['he', 'en'];

/* Only keys the section declares; each into the input field of the same name. */
const pick = (
  allowed: Set<string>,
  values: Record<string, string>,
): Partial<Record<keyof EventOpeningInput, string>> =>
  Object.fromEntries(
    Object.entries(values).filter(([key]) => allowed.has(key)),
  ) as Partial<Record<keyof EventOpeningInput, string>>;

export const saveConferenceSectionAction = async (
  input: SectionSaveInput,
): Promise<SectionSaveOutcome> => {
  const slug = String(input.slug ?? '').trim();
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return { ok: false, reason: 'forbidden' };
  }
  const section = CONFERENCE_SECTIONS.find((entry) => entry.id === input.section);
  if (!section) {
    return { ok: false, reason: 'unknown-section' };
  }

  const localizedKeys = new Set(
    section.fields.filter((field) => field.localized).map((field) => field.key),
  );
  const sharedKeys = new Set([
    ...section.fields.filter((field) => !field.localized).map((field) => field.key),
    ...section.media.map((media) => media.key),
  ]);

  try {
    for (const locale of LOCALES) {
      const perLocale = pick(localizedKeys, locale === 'he' ? input.he : input.en);
      const once = locale === 'he' ? pick(sharedKeys, input.shared) : {};
      const write: EventOpeningInput = { ...perLocale, ...once } as EventOpeningInput;

      /* A picture is a relation: '' means "none", and null clears it. */
      for (const media of section.media) {
        if (locale === 'he' && media.key in input.shared) {
          (write as Record<string, unknown>)[media.key] = input.shared[media.key] || null;
        }
      }

      if (section.special === 'facts' && input.facts) {
        /*
         * One list, two languages: a row exists when it has a Hebrew
         * label, and the English pass writes the same rows with their
         * English words — so the array stays one array.
         */
        write.venueFacts = input.facts
          .filter((fact) => fact.he.label.trim() !== '')
          .map((fact) => ({
            icon: normalizeVenueFactIcon(fact.icon),
            label: (locale === 'he' ? fact.he.label : fact.en.label).trim(),
            description: (locale === 'he' ? fact.he.description : fact.en.description).trim(),
          }));
      }
      if (section.special === 'moments' && input.moments) {
        write.moments = input.moments
          .filter((moment) => moment.imageId)
          .map((moment) => ({
            imageId: moment.imageId,
            caption: locale === 'he' ? moment.he : moment.en,
          }));
      }
      if (section.special === 'programDays' && input.programDays) {
        write.programDays = input.programDays.map((day) => ({
          theme: locale === 'he' ? day.he.theme : day.en.theme,
          description: locale === 'he' ? day.he.description : day.en.description,
        }));
      }

      if (Object.keys(write).length === 0) {
        continue;
      }
      await saveEventOpening(slug, locale, write);
    }
  } catch {
    return { ok: false, reason: 'failed' };
  }

  await audit(actor, 'content.openingSaved', slug, { section: section.id });
  publishedEvent(slug);
  revalidatePath(`/studio/conference/${slug}`, 'layout');
  return { ok: true, savedAt: new Date().toISOString() };
};

export type PublishOutcome =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'blocked' | 'retired'; blockers?: number };

/*
 * The draft goes live. Launching and publishing are one act on the
 * platform (a published version is what the marketing API serves), so
 * a conference already on air simply gets its newer words.
 */
export const publishConferenceAction = async (
  slug: string,
): Promise<PublishOutcome> => {
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return { ok: false, reason: 'forbidden' };
  }
  const outcome = await launchExperience(slug, 'he');
  await audit(
    actor,
    'event.launched',
    slug,
    outcome.ok
      ? { outcome: 'live' }
      : outcome.retired
        ? { outcome: 'retired' }
        : { outcome: 'blocked', blockers: outcome.blockers },
  );
  publishedEvent(slug);
  revalidatePath(`/studio/conference/${slug}`, 'layout');
  revalidatePath('/studio', 'layout');
  if (outcome.ok) {
    return { ok: true };
  }
  return outcome.retired
    ? { ok: false, reason: 'retired', blockers: outcome.blockers }
    : { ok: false, reason: 'blocked', blockers: outcome.blockers };
};

/* Show or hide one scene on the platform's own conference page. */
export const setSectionVisibilityAction = async (input: {
  slug: string;
  composition: { scene: string; hidden: boolean; variant?: string; density?: string; emphasis?: string }[];
}): Promise<{ ok: boolean }> => {
  const actor = input.slug ? await actorFor('events:manage', input.slug) : null;
  if (!actor) {
    return { ok: false };
  }
  await saveEventComposition(input.slug, input.composition);
  publishedEvent(input.slug);
  revalidatePath(`/studio/conference/${input.slug}`, 'layout');
  return { ok: true };
};
