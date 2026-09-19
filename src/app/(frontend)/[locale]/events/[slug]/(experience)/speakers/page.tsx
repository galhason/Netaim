import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import {
  listConferenceSpeakers,
  activitiesForSpeaker,
} from '@/features/speakers';
import { getActiveConferenceSlug } from '@/features/events';
import { EmptyState } from '@/features/conference';
import { requireParticipant } from '@/features/registration';
import SpeakersDirectory, {
  type DirectorySpeaker,
} from './speakers-directory';

interface SpeakersPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * The full cast of the active conference — every voice on the stage, in the
 * Experience design language. Each card is resolved live (a linked account
 * lends its identity; overrides win) and links to the speaker's own page,
 * closing the discovery loop the landing and Program drawers open.
 */
const SpeakersPage = async ({ params }: SpeakersPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  await requireParticipant(lang);
  const he = lang === 'he';

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const roster = slug
    ? await listConferenceSpeakers(slug, lang).catch(() => [])
    : [];

  const speakers: DirectorySpeaker[] = await Promise.all(
    roster.map(async (speaker) => {
      const sessions = await activitiesForSpeaker(speaker.id, lang).catch(
        () => [],
      );
      return {
        id: speaker.id,
        name: speaker.name,
        jobTitle: speaker.jobTitle,
        company: speaker.company,
        photoUrl: speaker.photoUrl,
        isRegistered: speaker.isRegistered,
        sessionCount: sessions.length,
      };
    }),
  );

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <header className="mb-8 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--x-primary)]">
          {he ? 'הדוברים' : 'Speakers'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--x-ink)] md:text-6xl">
          {he ? 'מובילים מחשבה. מניעים שינוי.' : 'Leading minds. Driving change.'}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--x-soft)]">
          {he
            ? 'הכירו את האנשים שמאחורי התוכנית — מרצים, מומחים ומובילי דעה. בחרו דובר כדי לראות את לוח הזמנים שלו.'
            : 'Meet the people behind the program — speakers, experts and thought leaders. Pick a speaker to see their schedule.'}
        </p>
      </header>

      {speakers.length > 0 ? (
        <SpeakersDirectory speakers={speakers} locale={lang} />
      ) : (
        <EmptyState
          title={he ? 'רשימת הדוברים בדרך' : 'The lineup is on its way'}
          hint={
            he
              ? 'הדוברים יתפרסמו כאן ברגע שהתוכנית תיסגר.'
              : 'Speakers appear here the moment the program is set.'
          }
        />
      )}
    </main>
  );
};


/*
 * Rendered per request, and never prerendered.
 *
 * The page asks who is reading before it draws anything, and a page
 * that can be built once at build time has no reader to ask. Without
 * this line Next prerendered the programme as a signed-out visitor and
 * served that HTML to everyone — the guard above ran once, at build,
 * and never again.
 */
export const dynamic = 'force-dynamic';

export default SpeakersPage;
