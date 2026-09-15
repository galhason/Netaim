import type { Locale } from '@/config/locales';
import type {
  HomepageComposition,
  HomepageContent,
  HomepageContentInput,
} from '@/features/opening/types/homepage-content';
import { actorContext, getSystemPayload } from './payload-context';
import { mediaId, mediaUrl, toMediaRelation } from './payload-media';

/*
 * The homepage global. Reads use system access (the visitor is
 * anonymous); writes come only from the Studio and run under the acting
 * creator with access control enforced. Empty strings clear a field so
 * the cinematic fallback returns.
 */
/*
 * Two readings of the same page, and the difference matters.
 *
 * A visitor gets the fallback: an English page with no English text
 * shows the Hebrew rather than nothing. An editor must not, because the
 * inspector pre-fills from what it reads — so the Hebrew arrived in the
 * English form, and the first save wrote it into English for good.
 * `asStored` asks for this locale alone, leaving untouched fields empty,
 * and empty is what keeps the fallback alive.
 */
const readHomepage = async (
  locale: Locale,
  asStored: boolean,
): Promise<HomepageContent | null> => {
  const payload = await getSystemPayload();
  const page = await payload
    .findGlobal({
      slug: 'opening-page',
      locale,
      ...(asStored ? { fallbackLocale: 'null' as const } : {}),
      depth: 1,
    })
    .catch(() => null);
  if (!page) {
    return null;
  }
  return {
    composition: (page.composition ?? []).map((row) => ({
      scene: row.scene,
      hidden: row.hidden === true,
    })),
    hero: {
      titleMain: page.hero?.titleMain ?? undefined,
      titleAccent: page.hero?.titleAccent ?? undefined,
      subtitle: page.hero?.subtitle ?? undefined,
      imageUrl: mediaUrl(page.hero?.image),
      imageId: mediaId(page.hero?.image),
      videoUrl: mediaUrl(page.hero?.video),
      videoId: mediaId(page.hero?.video),
    },
    events: {
      title: page.events?.title ?? undefined,
      subtitle: page.events?.subtitle ?? undefined,
    },
    story: {
      eyebrow: page.story?.eyebrow ?? undefined,
      title: page.story?.title ?? undefined,
      paragraph: page.story?.paragraph ?? undefined,
      imageUrl: mediaUrl(page.story?.image),
      imageId: mediaId(page.story?.image),
    },
    moments: {
      title: page.moments?.title ?? undefined,
      imageUrls: (page.moments?.items ?? [])
        .map((item) => mediaUrl(item.image))
        .filter((url): url is string => Boolean(url)),
      imageIds: (page.moments?.items ?? [])
        .map((item) => mediaId(item.image))
        .filter((id): id is string => Boolean(id)),
    },
    closing: {
      title: page.closing?.title ?? undefined,
      subtitle: page.closing?.subtitle ?? undefined,
      cta: page.closing?.cta ?? undefined,
    },
  };
};

export const payloadHomepageContent = (
  locale: Locale,
): Promise<HomepageContent | null> => readHomepage(locale, false);

/* The editor's reading: this language, and nothing inherited. */
export const payloadHomepageDraft = (
  locale: Locale,
): Promise<HomepageContent | null> => readHomepage(locale, true);

const text = (value: string | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const payloadSaveHomepageContent = async (
  locale: Locale,
  input: HomepageContentInput,
): Promise<void> => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  await context.payload.updateGlobal({
    slug: 'opening-page',
    locale,
    overrideAccess: false,
    user: context.user,
    data: {
      hero: {
        titleMain: text(input.heroTitleMain),
        titleAccent: text(input.heroTitleAccent),
        subtitle: text(input.heroSubtitle),
        image: toMediaRelation(input.heroImageId),
        video: toMediaRelation(input.heroVideoId),
      },
      events: {
        title: text(input.eventsTitle),
        subtitle: text(input.eventsSubtitle),
      },
      story: {
        eyebrow: text(input.storyEyebrow),
        title: text(input.storyTitle),
        paragraph: text(input.storyParagraph),
        image: toMediaRelation(input.storyImageId),
      },
      moments: {
        title: text(input.momentsTitle),
        ...(input.momentsImageIds
          ? {
              items: input.momentsImageIds
                .filter((id) => id !== '')
                .map((id) => ({ image: toMediaRelation(id) ?? null })),
            }
          : {}),
      },
      closing: {
        title: text(input.closingTitle),
        subtitle: text(input.closingSubtitle),
        cta: text(input.closingCta),
      },
    },
  });
};

export const payloadSaveHomepageComposition = async (
  entries: HomepageComposition[],
): Promise<void> => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  await context.payload.updateGlobal({
    slug: 'opening-page',
    overrideAccess: false,
    user: context.user,
    data: {
      composition: entries.map((entry) => ({
        scene: entry.scene,
        hidden: entry.hidden,
      })),
    },
  });
};
