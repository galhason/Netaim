import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { LoungeView, getAttendeeExperience } from '@/features/attendee';
import { ConferenceBar } from '@/features/conference';
import { conferenceBarViewer } from '@/features/conference/services/conference-bar-viewer';
import { getSiteBrand } from '@/features/events';
import { myConnections } from '@/features/networking';

/*
 * The Personal Lounge: after registration the guest does not enter an
 * account — they continue the same experience, from their own point of
 * view. Assembled from the real engines, addressed by name.
 */
interface AttendeePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const AttendeePage = async ({ params }: AttendeePageProps) => {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const content = await getAttendeeExperience(slug, locale);

  if (!content) {
    redirect(`/${locale}/events/${slug}/register`);
  }

  const siteLogo = await getSiteBrand();
  const barViewer = await conferenceBarViewer();
  const links = await myConnections(slug).catch(() => []);
  const connections = links.filter(
    (connection) => connection.status === 'accepted',
  ).length;
  const pending = links.filter(
    (connection) =>
      connection.status === 'pending' && connection.direction === 'incoming',
  ).length;

  return (
    <>
      <LoungeView
        content={content}
        locale={locale}
        connections={connections}
        pending={pending}
        homeHref={`/${locale}/me`}
        profileHref={`/${locale}/me/profile`}
        /*
         * The site's one navigation bar, here as on /me — language,
         * notifications, the name, and the way out all live in it, so
         * the Lounge itself carries none of them twice.
         */
        siteNav={
          <ConferenceBar
            locale={locale as Locale}
            slug={slug}
            viewer={barViewer}
            brand={brandFor(locale as Locale)}
            brandLogo={siteLogo.onLight}
          />
        }
      />
    </>
  );
};

/*
 * The guest's own session decides what this page shows — the banner and
 * pop-up announcements addressed to them, and their sign-in state. It is
 * rendered per request; a build-time snapshot would freeze both.
 */
export const dynamic = 'force-dynamic';

export default AttendeePage;
