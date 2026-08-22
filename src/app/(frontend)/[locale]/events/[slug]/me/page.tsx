import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { LoungeView, getAttendeeExperience } from '@/features/attendee';
import { ConferenceSpotlight } from '@/features/notifications';
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
      <ConferenceSpotlight slug={slug} locale={locale} />
      <LoungeView
      content={content}
      locale={locale}
      connections={connections}
      pending={pending}
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
