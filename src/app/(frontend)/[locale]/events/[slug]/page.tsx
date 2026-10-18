import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import {
  buildConferenceDescriptor,
  getConferenceExperience,
} from '@/features/cinematic';
import { getSiteBrand } from '@/features/events';
import { conferenceBarViewer } from '@/features/conference/services/conference-bar-viewer';
import { myAreaHref, requireParticipant } from '@/features/registration';
import '@/scenes';
import { ConferencePreparing } from '@/features/conference';
import { closedConferencePage } from '@/features/conference/services/conference-door';

interface EventPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const EventPage = async ({ params }: EventPageProps) => {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  /* A conference kept to the Netaim team shows everyone else that it is being prepared. */
  const closed = await closedConferencePage(slug, locale, '');
  if (closed) {
    return <ConferencePreparing {...closed} />;
  }

  /*
   * Read by people who registered: a visitor is sent to sign in, and
   * brought back here. Resolved per request and handed to the stage as
   * render context; it never enters the descriptor, which is cached and
   * shared.
   */
  const me = await requireParticipant(locale, `/${locale}/events/${slug}`);
  const experience = await getConferenceExperience(slug, locale);
  const logo = await getSiteBrand();
  const barViewer = await conferenceBarViewer();
  /*
   * Resolved beside the name, for the same reason: a guest who has not
   * joined this conference must not be pointed at its lounge.
   */
  const meHref = await myAreaHref(locale, slug).catch(() => `/${locale}/me`);

  if (!experience) {
    notFound();
  }

  return (
    <>
      <ExperienceStage
        experience={buildConferenceDescriptor(
          experience,
          locale,
          logo.onDark,
          `/${locale}/events/${slug}/my-activities`,
          logo.onLight,
        )}
        locale={locale}
        viewer={{
          name: barViewer?.name ?? (me.name || me.email),
          href: meHref,
          ...(barViewer?.photoUrl ? { photoUrl: barViewer.photoUrl } : {}),
          ...(barViewer?.studio ? { studio: true } : {}),
        }}
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

export default EventPage;
