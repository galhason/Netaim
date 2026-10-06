import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { SUPPORTED_LOCALES, isSupportedLocale, type Locale } from '@/config/locales';
import { SITE_ORIGIN, siteUrl } from '@/config/site';
import { findPortalEvent } from '@/features/events';
import { GALLERY_COPY, composeGallery, publishedGallery } from '@/features/gallery';
import { GalleryCta, GalleryExperience, GalleryHero } from '@/features/gallery/components';
import { currentParticipant } from '@/features/registration';
import { ConferencePreparing, PREPARING_COPY } from '@/features/conference';
import { closedConferencePage, mayEnterConference } from '@/features/conference/services/conference-door';
import { submitGalleryPhotoAction } from './actions';

interface GalleryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * The conference gallery — public, like the landing page and the
 * registration form: nobody signs in to look at photographs.
 *
 * It sits in the conference shell (the conference bar, the footer), so
 * the layout above has already answered 404 for a conference that is
 * not published. What is shown is what the Studio published, composed
 * on the server; the page only opens pictures. A signed-in participant
 * may send a photograph from the closing invitation — it goes to the
 * team for approval and is never shown by being sent.
 * If the gallery cannot be read, the page opens on its empty state
 * rather than on an error.
 */
const galleryPath = (locale: Locale, slug: string) =>
  `/${locale}/events/${encodeURIComponent(slug)}/gallery`;

export const generateMetadata = async ({ params }: GalleryPageProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  /* A conference kept to the team lends its name and pictures to nobody's preview card. */
  if (!(await mayEnterConference(slug))) {
    return { title: PREPARING_COPY.title[lang], robots: { index: false, follow: false } };
  }
  const [event, entries] = await Promise.all([
    findPortalEvent(slug, lang).catch(() => null),
    publishedGallery(slug, lang).catch(() => []),
  ]);
  const hero = composeGallery(entries).hero;
  const title = `${GALLERY_COPY.eyebrow[lang]}${event?.title ? ` · ${event.title}` : ''}`;
  const description = GALLERY_COPY.metaDescription[lang];
  /* Absolute only when the site knows its public address; never a local one. */
  const absolute = (path: string) => (SITE_ORIGIN ? siteUrl(path) : path);
  const heroUrl = hero ? absolute(hero.file.url) : undefined;
  return {
    title,
    description,
    alternates: {
      canonical: absolute(galleryPath(lang, slug)),
      languages: Object.fromEntries(
        SUPPORTED_LOCALES.map((other) => [other, absolute(galleryPath(other, slug))]),
      ),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: lang === 'he' ? 'he_IL' : 'en_US',
      ...(heroUrl ? { images: [{ url: heroUrl, alt: hero?.alt ?? '' }] } : {}),
    },
  };
};

const GalleryPage = async ({ params }: GalleryPageProps) => {
  const { locale, slug } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);

  /* A conference kept to the Netaim team shows everyone else that it is being prepared. */
  const closed = await closedConferencePage(slug, lang, '/gallery');
  if (closed) {
    return <ConferencePreparing {...closed} />;
  }

  const [entries, participant, event] = await Promise.all([
    publishedGallery(slug, lang).catch(() => []),
    currentParticipant().catch(() => null),
    findPortalEvent(slug, lang).catch(() => null),
  ]);
  const composition = composeGallery(entries);
  /* "רגעים מנטעים 2026" — the year is the conference's own. */
  const year = event?.startsAt?.match(/^\d{4}/)?.[0];

  return (
    <main
      id="main-content"
      className="experience experience--programme experience--gallery bg-[var(--x-bg)] text-[var(--x-ink)]"
    >
      <GalleryHero locale={lang} image={composition.hero} year={year} />
      <GalleryExperience locale={lang} composition={composition} />
      <GalleryCta
        locale={lang}
        slug={slug}
        signedIn={participant !== null}
        shareAction={submitGalleryPhotoAction}
      />
    </main>
  );
};

/*
 * The closing invitation answers for the visitor — sign in, or share —
 * so the page is rendered per request and never shared between them.
 */
export const dynamic = 'force-dynamic';

export default GalleryPage;
