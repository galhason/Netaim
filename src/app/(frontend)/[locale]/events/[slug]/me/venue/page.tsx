import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { LOUNGE_UI, getAttendeeExperience } from '@/features/attendee';
import { findPortalEvent, getEventOpeningDraft } from '@/features/events';

/*
 * Map & venue inside the Lounge: where the conference lives, in the
 * conference's own light — the place, the story of the place, and one
 * door out to the maps app.
 */
interface VenuePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const VenuePage = async ({ params }: VenuePageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const content = await getAttendeeExperience(slug, locale);
  if (!content) {
    redirect(`/${locale}/events/${slug}/register`);
  }

  const [portal, draft] = await Promise.all([
    findPortalEvent(slug, locale).catch(() => null),
    getEventOpeningDraft(slug, locale).catch(() => null),
  ]);

  const venueName = draft?.venue.name ?? portal?.location ?? '';
  const narrative = draft?.venue.narrative ?? '';
  const location = portal?.location ?? '';
  const image = content.myEvent.image?.url;
  const mapsQuery = encodeURIComponent(
    [venueName, location].filter(Boolean).join(', '),
  );

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] pb-16 font-body text-[var(--l-ink)]"
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--l-navy)]">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-60"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[rgba(14,27,46,0.6)] via-[rgba(14,27,46,0.3)] to-[var(--l-bg)]"
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-6 text-white">
          <div className="flex items-center justify-between text-sm text-white/85">
            <Link
              href={`/${locale}/me`}
              className="transition-opacity hover:opacity-75"
            >
              ← {LOUNGE_UI.myExperience[locale]}
            </Link>
            <span className="font-display font-semibold tracking-[0.3em]">
              {content.brandName.toUpperCase()}
            </span>
          </div>
          <p className="mt-10 text-xs font-medium tracking-[0.18em] text-[var(--l-bronze-soft,#d8b98a)]">
            {LOUNGE_UI.venueTitle[locale]}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            {venueName || content.brandName}
          </h1>
          {location && venueName && location !== venueName ? (
            <p className="mt-2 text-sm text-white/85">{location}</p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto -mt-6 flex max-w-3xl flex-col gap-5 px-6">
        <div className="lounge-rise rounded-3xl bg-white p-7 shadow-[0_14px_44px_rgba(35,40,47,0.08)]">
          {narrative ? (
            <p className="text-[15px] leading-relaxed text-[var(--l-ink)]">
              {narrative}
            </p>
          ) : (
            <p className="text-sm text-[var(--l-soft)]">
              {locale === 'he'
                ? 'פרטי המקום יתמלאו לקראת הכנס.'
                : 'Venue details fill in as the conference nears.'}
            </p>
          )}
          {mapsQuery ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
            >
              {LOUNGE_UI.openInMaps[locale]}
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default VenuePage;
