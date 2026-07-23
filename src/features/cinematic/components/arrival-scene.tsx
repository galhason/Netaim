import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { ArrivalScene as ArrivalSceneData } from '../types/cinematic';
import HeroCountdownBadge from './hero-countdown-badge';
import { IconCalendar, IconPin } from './icons';

interface ArrivalSceneProps {
  arrival: ArrivalSceneData;
  registerHref: string;
  locale: Locale;
  variant?: string;
  density?: string;
  emphasis?: string;
}

const HERO_STAT_LIMIT = 4;

const yearOf = (arrival: ArrivalSceneData): string | null => {
  const source = arrival.startsAt ?? arrival.date ?? '';
  const match = source.match(/\b(20\d{2})\b/);
  return match?.[1] ?? null;
};

/*
 * Scene 01 — The invitation, staged as the cover of a premium conference
 * brochure. The photograph is not a card and has no edge: it fills the
 * entire frame and dissolves, in one long ramp, into the deep midnight
 * navy behind the words — so the image and the text read as one surface,
 * exactly like the printed cover. A live countdown, the conference at a
 * glance in a floating glass card, and the two calls to act. Everything
 * is drawn from the CMS.
 */
const ArrivalScene = ({ arrival, registerHref, locale }: ArrivalSceneProps) => {
  const stats = (arrival.facts ?? []).slice(0, HERO_STAT_LIMIT);
  const programHref = `/${locale}/program`;
  const year = yearOf(arrival);

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-surface">
      {/* Cinematic photograph — full-bleed, no edge, dissolving into navy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {arrival.image ? (
          <div className="cine-slow-zoom absolute inset-0">
            <Image
              src={arrival.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[78%_center]"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#16233a] via-surface to-[#0d1626]" />
        )}
        {/*
         * One long horizontal ramp is what removes the seam: solid navy
         * for the reading half, then a gradual fade to clear across the
         * middle, leaving only the outer third as open photograph.
         */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-surface)_0%,var(--color-surface)_32%,color-mix(in_srgb,var(--color-surface)_55%,transparent)_52%,transparent_80%)]" />
        {/* seat the picture into the dark at top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-transparent to-surface" />
        {/* a deeper base fade, so the figures below read cleanly with no card */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        <div className="cine-vignette absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[1560px] items-center gap-8 px-6 pb-16 pt-[88px] md:px-12 lg:grid-cols-2">
        <div aria-hidden="true" className="order-first hidden lg:block" />

        <div>
          {arrival.eyebrow ? (
            <p className="cine-hero-line text-sm font-medium uppercase tracking-[0.34em] text-accent">
              {arrival.eyebrow}
            </p>
          ) : null}
          <h1 className="cine-hero-line mt-6 font-display text-6xl font-extrabold leading-[0.9] tracking-tight md:text-7xl lg:text-8xl">
            <span className="text-text-primary">{arrival.title}</span>
            {year ? <span className="text-accent"> {year}</span> : null}
          </h1>
          {arrival.tagline ? (
            <p className="cine-hero-line mt-7 max-w-lg text-xl leading-relaxed text-text-secondary [animation-delay:500ms] md:text-2xl">
              {arrival.tagline}
            </p>
          ) : null}

          <div className="cine-hero-line mt-8 [animation-delay:700ms]">
            <HeroCountdownBadge startsAt={arrival.startsAt} locale={locale} />
          </div>

          <ul className="cine-hero-line mt-7 flex flex-wrap items-center gap-x-10 gap-y-4 [animation-delay:850ms]">
            {arrival.date ? (
              <li className="flex items-center gap-3">
                <span className="grid size-11 flex-none place-items-center rounded-xl bg-accent/12 text-accent">
                  <IconCalendar className="size-5" />
                </span>
                <span className="text-base text-text-secondary md:text-lg">
                  {arrival.date}
                </span>
              </li>
            ) : null}
            {arrival.location ? (
              <li className="flex items-center gap-3">
                <span className="grid size-11 flex-none place-items-center rounded-xl bg-accent/12 text-accent">
                  <IconPin className="size-5" />
                </span>
                <span className="text-base text-text-secondary md:text-lg">
                  {arrival.location}
                </span>
              </li>
            ) : null}
          </ul>

          <div className="cine-hero-line mt-10 flex flex-wrap items-center gap-4 [animation-delay:1000ms]">
            <Link
              href={registerHref}
              className="inline-flex min-h-14 items-center rounded-2xl bg-brand px-10 text-base font-medium text-brand-contrast shadow-[0_20px_60px_-14px_rgba(201,161,93,0.6)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_26px_72px_-12px_rgba(201,161,93,0.78)]"
            >
              {CINEMATIC_UI.register[locale]}
            </Link>
            <Link
              href={programHref}
              className="group inline-flex min-h-14 items-center gap-2.5 rounded-2xl border border-accent/45 px-8 text-base text-accent transition-all duration-300 hover:bg-accent/10"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-1">
                ←
              </span>
              {CINEMATIC_UI.heroAllSessions[locale]}
            </Link>
          </div>
        </div>
      </div>

      {/*
       * The conference at a glance — not a card, but a quiet row of
       * figures resting on the darkened base of the photograph, parted by
       * hairline rules. The gold numerals carry the eye; the labels stay
       * hushed. Elegant, editorial, weightless.
       */}
      {stats.length > 0 ? (
        <div className="cine-hero-line absolute inset-x-6 bottom-9 z-10 [animation-delay:1300ms] md:inset-x-12 lg:inset-x-auto lg:bottom-14 lg:right-12 lg:w-[52%]">
          <div className="flex items-stretch justify-between">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex flex-1 flex-col items-center gap-2 px-3 text-center md:px-6 ${
                  index > 0 ? 'border-s border-white/12' : ''
                }`}
              >
                <span className="font-display text-4xl font-bold leading-none tracking-tight text-accent md:text-5xl">
                  {stat.value}
                </span>
                <span className="text-xs leading-snug text-text-secondary md:text-sm">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArrivalScene;
