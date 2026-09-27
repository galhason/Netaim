import { notFound } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { wordpressHref } from '@/config/wordpress';
import {
  findEvent,
  getEventOpeningDraft,
  listMedia,
  reviewLaunch,
} from '@/features/events';
import type { EventOpeningDraft } from '@/features/events/types/event-repository';
import { listAgenda } from '@/features/program';
import { getStudioLocale } from '@/features/studio';
import { CONTENT_EDITOR_UI, normalizeVenueFactIcon } from '@/features/studio/constants/conference-sections';
import { marketingRepository } from '@/infrastructure';
import ConferenceContentEditor, {
  type EditorValues,
  type PublishState,
} from './editor';

/*
 * The draft, read in both languages, laid out as the editor holds it:
 * one flat map of localized words per language, one map of what is
 * written once (pictures, a number, a URL), and the three lists.
 */
const flat = (draft: EventOpeningDraft): Record<string, string> => ({
  title: draft.title ?? '',
  teaser: draft.teaser ?? '',
  location: draft.location ?? '',
  arrivalEyebrow: draft.arrivalEyebrow ?? '',
  storyEyebrow: draft.story.eyebrow ?? '',
  storyTitle: draft.story.title ?? '',
  storyParagraph: draft.story.paragraph ?? '',
  quoteText: draft.quote.text ?? '',
  quoteAttribution: draft.quote.attribution ?? '',
  quoteRole: draft.quote.role ?? '',
  quoteStatLabel: draft.quote.statLabel ?? '',
  venueName: draft.venue.name ?? '',
  venueAddress: draft.venue.address ?? '',
  venueMapLabel: draft.venue.mapLabel ?? '',
  venueNarrative: draft.venue.narrative ?? '',
  venueAccessibility: draft.venue.accessibility ?? '',
  venueEmergency: draft.venue.emergency ?? '',
  closingLine: draft.closing.line ?? '',
});

const shared = (draft: EventOpeningDraft): Record<string, string> => ({
  quoteStatValue: draft.quote.statValue ?? '',
  venueMapUrl: draft.venue.mapUrl ?? '',
  heroImageId: draft.heroImageId ?? '',
  posterId: draft.posterId ?? '',
  heroVideoId: draft.heroVideoId ?? '',
  storyImageId: draft.story.imageId ?? '',
  quoteImageId: draft.quote.imageId ?? '',
  venueImageId: draft.venue.imageId ?? '',
  closingImageId: draft.closing.imageId ?? '',
});

const toValues = (he: EventOpeningDraft, en: EventOpeningDraft): EditorValues => {
  const facts = (he.venue.facts ?? []).map((fact, index) => ({
    icon: normalizeVenueFactIcon(fact.icon),
    he: { label: fact.label ?? '', description: fact.description ?? '' },
    en: {
      label: en.venue.facts?.[index]?.label ?? '',
      description: en.venue.facts?.[index]?.description ?? '',
    },
  }));
  const moments = he.moments
    .filter((moment) => moment.imageId)
    .map((moment, index) => ({
      imageId: moment.imageId!,
      he: moment.caption ?? '',
      en: en.moments[index]?.caption ?? '',
    }));
  const count = Math.max(he.programDays.length, en.programDays.length);
  const programDays = Array.from({ length: count }, (_, index) => ({
    he: { theme: he.programDays[index]?.theme ?? '', description: he.programDays[index]?.description ?? '' },
    en: { theme: en.programDays[index]?.theme ?? '', description: en.programDays[index]?.description ?? '' },
  }));
  return { he: flat(he), en: flat(en), shared: shared(he), facts, moments, programDays };
};

interface ContentPageProps {
  params: Promise<{ slug: string }>;
}

const ConferenceContentPage = async ({ params }: ContentPageProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const locale = await getStudioLocale();

  const [he, en, media, summary, review, agenda, published] = await Promise.all([
    getEventOpeningDraft(slug, 'he'),
    getEventOpeningDraft(slug, 'en'),
    listMedia().catch(() => []),
    findEvent(slug).catch(() => null),
    reviewLaunch(slug, locale).catch(() => null),
    listAgenda(slug, 'he').catch(() => []),
    marketingRepository.findPublishedIdentity(slug, 'he').catch(() => null),
  ]);
  if (!he || !en || !summary) {
    notFound();
  }

  const publishState: PublishState = summary.launched ? 'published' : published ? 'pending' : 'never';
  const dayKeys = new Set(agenda.map((session) => (session.startsAt ? session.startsAt.slice(0, 10) : '')));
  dayKeys.delete('');

  const siteLocale: Locale = locale;

  return (
    <div className="px-0">
      <div className="border-b border-[var(--c-line)] px-6 py-3">
        <h2 className="text-base font-semibold text-[var(--c-text)]">{CONTENT_EDITOR_UI.title[locale]}</h2>
        <p className="text-xs text-[var(--c-text-soft)]">{CONTENT_EDITOR_UI.subtitle[locale]}</p>
      </div>
      <ConferenceContentEditor
        slug={slug}
        locale={locale}
        initial={toValues(he, en)}
        media={media.map((item) => ({
          id: item.id,
          url: item.url,
          alt: item.alt,
          filename: item.filename,
          ...(item.mimeType ? { mimeType: item.mimeType } : {}),
          ...(item.posterUrl ? { posterUrl: item.posterUrl } : {}),
        }))}
        publishState={publishState}
        blockers={review?.health.blockers ?? 0}
        siteLinks={{
          hub: wordpressHref('conferences', siteLocale),
          info: wordpressHref('conferenceInfo', siteLocale),
        }}
        composition={he.composition.map((entry) => ({
          scene: entry.scene,
          hidden: entry.hidden,
          ...(entry.variant ? { variant: entry.variant } : {}),
          ...(entry.density ? { density: entry.density } : {}),
          ...(entry.emphasis ? { emphasis: entry.emphasis } : {}),
        }))}
        agendaDays={dayKeys.size}
      />
    </div>
  );
};

export const dynamic = 'force-dynamic';

export default ConferenceContentPage;
