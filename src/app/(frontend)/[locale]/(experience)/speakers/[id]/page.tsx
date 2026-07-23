import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { getSpeaker, activitiesForSpeaker } from '@/features/speakers';
import { formatLongDate, formatTimeLabel } from '@/shared';
import {
  Avatar,
  FollowButton,
  GhostLink,
  SectionHeader,
  TypePill,
  surface,
} from '@/features/conference';
import type { SessionType } from '@/features/program';

interface SpeakerProfilePageProps {
  params: Promise<{ locale: string; id: string }>;
}

const TYPE_LABELS: Record<string, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

/*
 * A speaker's public page — their identity resolved live from their
 * account (or the conference's own external details), and every activity
 * they lead, drawn from the reverse of the session↔speaker relationship.
 * No links are authored by hand; the profile knows its sessions.
 */
const SpeakerProfilePage = async ({ params }: SpeakerProfilePageProps) => {
  const { locale, id } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const he = lang === 'he';

  const speaker = await getSpeaker(id, lang).catch(() => null);
  if (!speaker) {
    notFound();
  }
  const activities = await activitiesForSpeaker(id, lang).catch(() => []);
  const role = [speaker.jobTitle, speaker.company].filter(Boolean).join(' · ');

  return (
    <main className="experience min-h-dvh bg-[var(--x-bg)]">
      {/* Cover hero */}
      <div
        className="relative h-48 overflow-hidden md:h-56"
        style={{
          background:
            'radial-gradient(120% 160% at 100% 0%, rgba(86,84,214,0.45), transparent 55%), radial-gradient(90% 120% at 0% 100%, rgba(43,58,110,0.55), transparent 60%), linear-gradient(135deg, #1b2946, #0d1626)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 md:px-10 md:pt-28">
          <a
            href={`/${lang}/speakers`}
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            {he ? '→ כל הדוברים' : '← All speakers'}
          </a>
        </div>
      </div>

      <header className="relative border-b border-[var(--x-line)]">
        <div className="mx-auto max-w-4xl px-6 pb-8 pt-5 md:px-10">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-start">
            <span className="-mt-20 rounded-full ring-4 ring-[var(--x-surface)] sm:-mt-24">
              <Avatar name={speaker.name} url={speaker.photoUrl} size={124} ring={false} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--x-ink)] md:text-4xl">
                  {speaker.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-[var(--x-r-pill)] px-2.5 py-1 text-xs font-medium ${
                    speaker.isRegistered
                      ? 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]'
                      : 'bg-[#f0f1f4] text-[var(--x-soft)]'
                  }`}
                >
                  {speaker.isRegistered
                    ? he
                      ? 'משתמש רשום'
                      : 'Registered'
                    : he
                      ? 'דובר אורח'
                      : 'Guest speaker'}
                </span>
              </div>
              {role ? (
                <p className="mt-1.5 text-lg text-[var(--x-soft)]">{role}</p>
              ) : null}
              {speaker.socialLinks.length > 0 ? (
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {speaker.socialLinks.map((link, i) => (
                    <a
                      key={`${link.url}-${i}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[var(--x-r-pill)] border border-[var(--x-line)] bg-[var(--x-surface)] px-3.5 py-1.5 text-sm text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)]"
                    >
                      {link.label ?? new URL(link.url).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 flex justify-center sm:justify-start">
                <FollowButton speakerName={speaker.name} locale={lang} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        {speaker.bio ? (
          <section className={`${surface} border border-[var(--x-line)] p-6 md:p-8`}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--x-faint)]">
              {he ? 'אודות' : 'About'}
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--x-soft)]">
              {speaker.bio}
            </p>
          </section>
        ) : null}

        <section className="mt-8">
          <SectionHeader
            title={he ? `לוח הזמנים של ${speaker.name}` : `${speaker.name}’s schedule`}
            sub={
              activities.length === 0
                ? he
                  ? 'טרם שויכו פעילויות לדובר זה.'
                  : 'No activities assigned yet.'
                : he
                  ? 'כל הפעילויות שהדובר מוביל בכנס, לפי סדר הזמנים.'
                  : 'Every activity this speaker leads, in order.'
            }
          />
          {activities.length > 0 ? (
            <ol className="relative mt-6 flex flex-col gap-3">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-4 top-4 start-[54px] w-px bg-[var(--x-line-strong)] sm:start-[62px]"
              />
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className="relative grid grid-cols-[46px_18px_1fr] items-start gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3"
                >
                  <span className="pt-4 text-end text-sm font-semibold tabular-nums text-[var(--x-ink)]">
                    {formatTimeLabel(activity.startsAt, lang) || '—'}
                  </span>
                  <span className="relative flex justify-center pt-[22px]">
                    <span className="size-2.5 rounded-full bg-[var(--x-primary)] ring-4 ring-[var(--x-bg)]" />
                  </span>
                  <a
                    href={`/${lang}/program`}
                    className={`${surface} group flex items-center gap-4 border border-[var(--x-line)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--x-primary)]/25 hover:shadow-[var(--x-shadow-lift)]`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 block">
                        <TypePill
                          type={activity.sessionType as SessionType}
                          label={TYPE_LABELS[activity.sessionType]?.[lang] ?? activity.sessionType}
                        />
                      </span>
                      <span className="block truncate font-display text-lg font-bold text-[var(--x-ink)]">
                        {activity.title}
                      </span>
                      {activity.startsAt ? (
                        <span className="block text-sm text-[var(--x-faint)]">
                          {formatLongDate(activity.startsAt, lang)}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="flex-none text-[var(--x-faint)] transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      {he ? '←' : '→'}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <div className="mt-8">
          <GhostLink href={`/${lang}/program`}>
            {he ? 'לתוכנית הכנס המלאה' : 'View the full program'}
          </GhostLink>
        </div>
      </div>
    </main>
  );
};

export default SpeakerProfilePage;
