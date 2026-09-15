import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { ExperienceStage } from '@/experience-runtime';
import {
  buildConferenceDescriptor,
  getConferenceExperience,
} from '@/features/cinematic';
import { currentParticipant, myAreaHref } from '@/features/registration';
import '@/scenes';

interface EventPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const EventPage = async ({ params }: EventPageProps) => {
  const { locale, slug } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const experience = await getConferenceExperience(slug, locale);

  /*
   * Resolved per request and handed to the stage as render context. It
   * never enters the descriptor, which is cached and shared.
   */
  const me = await currentParticipant().catch(() => null);
  /*
   * Resolved beside the name, for the same reason: a guest who has not
   * joined this conference must not be pointed at its lounge.
   */
  const meHref = me
    ? await myAreaHref(locale, slug).catch(() => `/${locale}/me`)
    : null;

  if (!experience) {
    notFound();
  }

  return (
    <>
      <ExperienceStage
        experience={buildConferenceDescriptor(experience, locale)}
        locale={locale}
        viewer={
          me ? { name: me.name || me.email, ...(meHref ? { href: meHref } : {}) } : null
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

export default EventPage;
