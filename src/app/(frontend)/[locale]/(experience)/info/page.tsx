import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { getConferenceExperience } from '@/features/cinematic';
import { Glyph } from '@/features/cinematic/components/icons';
import { getActiveConferenceSlug } from '@/features/events';
import { SectionHeader, EmptyState } from '@/features/conference';
import type { CinematicIcon } from '@/features/cinematic/types/cinematic';

interface InfoPageProps {
  params: Promise<{ locale: string }>;
}

/* A pin, drawn once for the hero and the directions panel. */
const PinIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.8" r="2.3" />
  </svg>
);

/* When the CMS gives a fact only a label, a sensible line completes it. */
const FACT_HINTS: Record<string, Record<Locale, string>> = {
  accessibility: {
    he: 'נגישות מלאה לכל אורך המתחם — מעליות, רמפות ושירותים מותאמים.',
    en: 'Step-free throughout — lifts, ramps and accessible facilities.',
  },
  transit: {
    he: 'תחנת הרכבת הקלה נמצאת מול הכניסה הראשית.',
    en: 'The light-rail stop is right across from the main entrance.',
  },
  parking: {
    he: 'חניון תת-קרקעי בתוך הבניין, פתוח משעות הבוקר.',
    en: 'Underground parking inside the building, open from early morning.',
  },
  hotel: {
    he: 'מבחר מלונות במרחק הליכה קצר מהמתחם.',
    en: 'A choice of hotels within a short walk of the venue.',
  },
};

const InfoPage = async ({ params }: InfoPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const he = lang === 'he';

  const slug = await getActiveConferenceSlug(lang).catch(() => null);
  const experience = slug
    ? await getConferenceExperience(slug, lang).catch(() => null)
    : null;
  const venue = experience?.venue;

  if (!venue) {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28 md:px-10 md:pt-32">
        <EmptyState
          icon={<PinIcon className="size-6" />}
          title={he ? 'פרטי ההגעה בדרך' : 'Arrival details on the way'}
          hint={
            he
              ? 'המקום, ההגעה והנגישות יתפרסמו כאן בקרוב.'
              : 'The place, directions and accessibility appear here soon.'
          }
        />
      </main>
    );
  }

  const facts = venue.facts.slice(0, 4);
  const subtitle = venue.subtitle?.trim();
  const query = encodeURIComponent(
    [venue.name, subtitle].filter(Boolean).join(', '),
  );
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const wazeHref = `https://waze.com/ul?q=${query}&navigate=yes`;
  const arrivalDate = experience?.arrival?.date;

  return (
    <main className="pb-24">
      {/* Photo hero — the place, as its own image */}
      <section className="relative">
        <div
          className="relative h-[54vh] min-h-[380px] w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${venue.image})` }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[rgba(9,16,28,0.94)] via-[rgba(9,16,28,0.38)] to-[rgba(9,16,28,0.12)]"
          />
          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-10 md:px-10 md:pb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
              {he ? 'המקום' : 'The place'}
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
              {venue.name}
            </h1>
            {subtitle ? (
              <p className="mt-3 inline-flex items-center gap-2 text-lg text-white/85">
                <PinIcon className="size-5 flex-none text-white/70" />
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Narrative */}
      <section className="mx-auto max-w-6xl px-6 pt-10 md:px-10 md:pt-12">
        <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-[var(--x-soft)] md:text-xl">
          {venue.narrative}
        </p>
        {arrivalDate ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary-wash)] px-3.5 py-1.5 text-sm font-medium text-[var(--x-primary)]">
            {arrivalDate}
          </p>
        ) : null}
      </section>

      {/* Getting here */}
      {facts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-6 pt-12 md:px-10">
          <SectionHeader
            eyebrow={he ? 'לפני שמגיעים' : 'Before you arrive'}
            title={he ? 'איך מגיעים' : 'Getting here'}
            sub={
              he
                ? 'כל מה שחשוב לדעת בדרך למתחם.'
                : 'Everything worth knowing on your way in.'
            }
          />
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {facts.map((fact) => (
              <li
                key={fact.label}
                className="flex flex-col rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] p-5 shadow-[var(--x-shadow)]"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
                  <Glyph icon={fact.icon as CinematicIcon} className="size-5" />
                </span>
                <p className="mt-4 font-display text-base font-bold text-[var(--x-ink)]">
                  {fact.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--x-soft)]">
                  {fact.description ??
                    FACT_HINTS[fact.icon]?.[lang] ??
                    ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Directions */}
      <section className="mx-auto max-w-6xl px-6 pt-12 md:px-10">
        <div
          className="relative overflow-hidden rounded-[var(--x-r-card)] p-7 md:p-9"
          style={{
            background:
              'radial-gradient(120% 160% at 100% 0%, rgba(110,86,207,0.4), transparent 55%), linear-gradient(135deg, #1b2946, #0d1626)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 flex-none place-items-center rounded-2xl bg-white/10 text-white">
                <PinIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  {he ? 'ניווט למתחם' : 'Navigate to the venue'}
                </p>
                <p className="mt-1 font-display text-xl font-bold text-white">
                  {venue.name}
                </p>
                {subtitle ? (
                  <p className="mt-0.5 text-sm text-white/70">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-none flex-wrap gap-3">
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-[#0d1626] transition-transform hover:-translate-y-0.5"
              >
                {he ? 'פתיחה ב-Google Maps' : 'Open in Google Maps'}
              </a>
              <a
                href={wazeHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {he ? 'ניווט ב-Waze' : 'Navigate with Waze'}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default InfoPage;
