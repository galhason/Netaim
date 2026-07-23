import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale } from '@/config/locales';
import { LOUNGE_UI, getAttendeeExperience } from '@/features/attendee';
import { listSpeakersPublic } from '@/features/events';

/*
 * The speakers wall inside the Lounge: the same faces that light the
 * public site, seen from the guest's own room.
 */
interface SpeakersPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const SpeakersPage = async ({ params }: SpeakersPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const content = await getAttendeeExperience(slug, locale);
  if (!content) {
    redirect(`/${locale}/events/${slug}/register`);
  }

  const speakers = await listSpeakersPublic().catch(() => []);

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] pb-16 font-body text-[var(--l-ink)]"
    >
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--l-navy)]">
          <span
            aria-hidden="true"
            className="absolute -top-24 left-1/2 h-[22rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,169,110,0.35),transparent_70%)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[var(--l-bg)]"
          />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-6 text-white">
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
          <h1 className="mt-8 font-display text-3xl font-semibold md:text-4xl">
            {LOUNGE_UI.speakersTitle[locale]}
          </h1>
        </div>
      </section>

      <div className="mx-auto -mt-6 max-w-5xl px-6">
        {speakers.length === 0 ? (
          <p className="lounge-rise rounded-3xl bg-white p-6 text-center text-sm text-[var(--l-soft)] shadow-[0_14px_44px_rgba(35,40,47,0.08)]">
            {LOUNGE_UI.noSpeakers[locale]}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {speakers.map((speaker, index) => (
              <li key={speaker.id}>
                <article
                  className={`lounge-rise flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_14px_44px_rgba(35,40,47,0.08)] ${
                    ['', '[animation-delay:60ms]', '[animation-delay:120ms]', '[animation-delay:180ms]'][index % 4]
                  }`}
                >
                  <span className="relative block aspect-[4/5] bg-[var(--l-navy)]">
                    {speaker.portraitUrl ? (
                      <Image
                        src={speaker.portraitUrl}
                        alt={speaker.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center font-display text-4xl text-white/85">
                        {speaker.name.slice(0, 1)}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="block truncate font-display text-lg font-semibold">
                      {speaker.name}
                    </span>
                    {speaker.role ? (
                      <span className="mt-0.5 block text-sm text-[var(--l-soft)]">
                        {speaker.role}
                      </span>
                    ) : null}
                  </span>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default SpeakersPage;
