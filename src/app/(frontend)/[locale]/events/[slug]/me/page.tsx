import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { brandFor } from '@/config/brand';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { LoungeView, getAttendeeExperience } from '@/features/attendee';
import { CinematicNav } from '@/features/cinematic';
import { getSiteBrand } from '@/features/events';
import { myConnections } from '@/features/networking';
import { currentParticipant } from '@/features/registration';

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

  const me = await currentParticipant().catch(() => null);
  const siteLogo = await getSiteBrand();
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
          <div className="cinematic">
            <CinematicNav
              locale={locale as Locale}
              registerHref={`/${locale}/events/${slug}/register`}
              meHref={`/${locale}/me`}
              brand={brandFor(locale as Locale)}
              brandLogo={siteLogo.onDark}
              {...(me
                ? { scheduleHref: `/${locale}/events/${slug}/my-activities` }
                : {})}
              viewer={me ? { name: me.name || me.email } : null}
              immediate
            />
          </div>
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
