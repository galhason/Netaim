import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { BackgroundVideo } from '@/shared';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { ArrivalScene as ArrivalSceneData } from '../types/cinematic';
import HeroCountdownBadge from './hero-countdown-badge';
import { IconCalendar, IconPin } from './icons';

interface ArrivalSceneProps {
  arrival: ArrivalSceneData;
  /* Registration is offered by the navigation bar; the hero leads to the programme. */
  registerHref?: string;
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
 * Scene 01 - The invitation, staged as the cover of a premium conference
 * brochure. The photograph is not a card and has no edge: it fills the
 * entire frame and dissolves, in one long ramp, into the deep midnight
 * navy behind the words - so the image and the text read as one surface,
 * exactly like the printed cover. A live countdown, the conference at a
 * glance, and one call to act. Everything is drawn from the CMS.
 *
 * The whole scene sits in the flow of a single column: the words are
 * centred in the space that is left, the figures rest beneath them. On a
 * short or wide screen the scene simply grows past the fold instead of
 * letting the rows overlap.
 */
const ArrivalScene = ({ arrival, locale }: ArrivalSceneProps) => {
  const stats = (arrival.facts ?? []).slice(0, HERO_STAT_LIMIT);
  const programHref = `/${locale}/program`;
  const year = yearOf(arrival);

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-surface">
      {/* Cinematic photograph - full-bleed, no edge, dissolving into navy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {arrival.image ? (
          <div className="cine-slow-zoom absolute inset-0">
            <Image
              src={arrival.image}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[22%_center] rtl:object-[78%_center]"
            />
            {arrival.video ? (
              <BackgroundVideo
                src={arrival.video}
                poster={arrival.image}
                className="absolute inset-0 size-full object-cover object-[22%_center] rtl:object-[78%_center]"
              />
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--nt-dark-raise)] via-surface to-[var(--nt-dark)]" />
        )}
        {/*
         * One long horizontal ramp is what removes the seam: solid navy
         * for the reading half, then a gradual fade to clear across the
         * middle, leaving only the outer third as open photograph.
         */}
        <div className="absolute inset-0 bg-[linear-gradient(to_left,var(--color-surface)_0%,var(--color-surface)_32%,color-mix(in_srgb,var(--color-surface)_55%,transparent)_52%,transparent_80%)] rtl:bg-[linear-gradient(to_right,var(--color-surface)_0%,var(--color-surface)_32%,color-mix(in_srgb,var(--color-surface)_55%,transparent)_52%,transparent_80%)]" />
        {/* seat the picture into the dark at top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-transparent to-surface" />
        {/* a deeper base fade, so the figures below read cleanly with no card */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        <div className="cine-vignette absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-6 pb-10 pt-[104px] md:px-12 md:pb-14">
        <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
          <div aria-hidden="true" className="order-first hidden lg:block" />

          <div>
            {arrival.eyebrow ? (
              <p className="cine-hero-line text-sm font-medium uppercase tracking-[0.34em] text-accent">
                {arrival.eyebrow}
              </p>
            ) : null}
            <h1 className="cine-hero-line mt-6 font-display text-6xl font-extrabold leading-[0.9] tracking-tight lg:text-7xl xl:text-8xl">
              <span className="text-text-primary">{arrival.title}</span>
              {year ? <span className="text-accent"> {year}</span> : null}
            </h1>
            {arrival.tagline ? (
              <p className="cine-hero-line mt-7 max-w-lg text-xl leading-relaxed text-text-secondary [animation-delay:500ms] xl:text-2xl">
                {arrival.tagline}
              </p>
            ) : null}

            <div className="cine-hero-line mt-8 [animation-delay:700ms]">
              <HeroCountdownBadge
                startsAt={arrival.startsAt}
                endsAt={arrival.endsAt}
                locale={locale}
              />
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

            {/*
             * One call to act. Registration is offered by the navigation
             * bar; the hero sends the reader straight into the programme.
             */}
            <div className="cine-hero-line mt-10 flex flex-wrap items-center gap-4 [animation-delay:1000ms]">
              <Link
                href={programHref}
                className="group inline-flex min-h-14 items-center gap-3 rounded-2xl bg-brand px-10 text-base font-medium text-brand-contrast shadow-[0_20px_60px_-14px_rgba(249,161,27,0.6)] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_26px_72px_-12px_rgba(249,161,27,0.78)]"
              >
                {CINEMATIC_UI.heroAllSessions[locale]}
                <span
                  aria-hidden="true"
                  className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/*
         * The conference at a glance - not a card, but a quiet row of
         * figures resting on the darkened base of the photograph, parted
         * by hairline rules. It sits in the flow, beneath the words, so it
         * can never collide with them on a short screen.
         */}
        {stats.length > 0 ? (
          <div className="cine-hero-line mt-10 w-full [animation-delay:1300ms] lg:ms-auto lg:w-[52%]">
            <div className="flex items-stretch justify-between">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`flex flex-1 flex-col items-center gap-2 px-3 text-center md:px-6 ${
                    index > 0 ? 'border-s border-white/12' : ''
                  }`}
                >
                  <span className="font-display text-4xl font-bold leading-none tracking-tight text-accent xl:text-5xl">
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
      </div>
    </section>
  );
};

export default ArrivalScene;
