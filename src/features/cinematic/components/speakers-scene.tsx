'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { SpeakerItem } from '../types/cinematic';
import { RevealText } from '@/shared';

/*
 * Optional, CMS-ready extras. Declared optional so the speaker data
 * contract can adopt them later without any layout change — a badge and a
 * short biography revealed on hover. A real authored badge always wins;
 * otherwise the showcase derives one by position so the section reads
 * like the editorial mockup.
 */
interface Speaker extends SpeakerItem {
  badge?: string;
  bio?: string;
}

interface SpeakersSceneProps {
  speakers: SpeakerItem[];
  locale: Locale;
  showcase?: boolean;
  variant?: string;
  density?: string;
  emphasis?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const INTRO: Record<Locale, string> = {
  he: 'מיטב המומחים, המנהיגים ואנשי המקצוע שישתפו את הידע והניסיון שלהם במהלך הכנס.',
  en: 'Leading experts, innovators and decision-makers sharing the knowledge that shapes the future of the field.',
};

const VIEW_ALL: Record<Locale, string> = {
  he: 'לכל הדוברים בכנס',
  en: 'View all speakers',
};

const VIEW_PROFILE: Record<Locale, string> = {
  he: 'צפה בפרופיל',
  en: 'View profile',
};

const DERIVED_BADGES = ['Panelist', 'Guest Speaker', 'Workshop'];

/*
 * Every portrait is cropped identically — a fixed 4:5 frame with the
 * focal point held in the upper third — so faces line up across the grid
 * no matter how the source photos were shot.
 */
const IMG_POS = 'object-[center_22%]';

const BadgeIcon = ({ badge }: { badge: string }) => {
  const common = {
    viewBox: '0 0 24 24',
    className: 'size-3.5',
    'aria-hidden': true as const,
  };
  if (/keynote/i.test(badge)) {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12 3l2.5 5.2 5.7.8-4.1 4 1 5.7L12 21l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
      </svg>
    );
  }
  if (/guest/i.test(badge)) {
    return (
      <svg
        {...common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="21" />
      </svg>
    );
  }
  if (/workshop/i.test(badge)) {
    return (
      <svg
        {...common}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M12 16v4M8 20h8" />
      </svg>
    );
  }
  return (
    <svg
      {...common}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.87M16.5 5.13A3 3 0 0 1 16.5 11" />
    </svg>
  );
};

const SpeakerCard = ({
  speaker,
  locale,
  hero = false,
  badge,
}: {
  speaker: Speaker;
  locale: Locale;
  hero?: boolean;
  badge?: string;
}) => (
  <Link
    href={speaker.id ? `/${locale}/speakers/${speaker.id}` : `/${locale}/speakers`}
    aria-label={
      speaker.role ? `${speaker.name} — ${speaker.role}` : speaker.name
    }
    className="group relative block h-full overflow-hidden rounded-[22px] shadow-[0_20px_54px_-26px_rgba(0,0,0,0.78)] ring-1 ring-accent/15 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] hover:ring-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    {/* Portrait — fills the card; identical 4:5 crop, hero fills its column */}
    <div
      className={
        hero
          ? 'relative aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[30rem]'
          : 'relative aspect-[4/5]'
      }
    >
      {speaker.photo ? (
        <Image
          src={speaker.photo}
          alt={speaker.name}
          fill
          loading="lazy"
          sizes={
            hero
              ? '(max-width: 1024px) 100vw, 38vw'
              : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw'
          }
          className={`object-cover ${IMG_POS} transition-transform duration-300 ease-out group-hover:scale-[1.04]`}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2740] via-surface to-[#0e1826]" />
      )}

      {/* Reading gradient — deepens on hover */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent transition-colors duration-300 group-hover:from-surface group-hover:via-surface/55"
      />

      {/* Badge — upper corner, over the portrait */}
      {badge ? (
        <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-surface/70 px-3 py-1 text-xs font-medium text-accent shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <BadgeIcon badge={badge} />
          {badge}
        </span>
      ) : null}

      {/* Identity — inside the image, never below it */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
        <h3
          className={`font-display font-bold leading-tight tracking-tight text-white ${
            hero ? 'text-3xl md:text-4xl' : 'text-lg md:text-xl'
          }`}
        >
          {speaker.name}
        </h3>
        {speaker.role ? (
          <p
            className={`mt-1 text-text-secondary ${
              hero ? 'text-base md:text-lg' : 'text-sm'
            }`}
          >
            {speaker.role}
          </p>
        ) : null}
        {speaker.topic ? (
          <p className="text-sm text-accent/85">{speaker.topic}</p>
        ) : null}

        {/* Biography — revealed on hover only when authored */}
        {speaker.bio ? (
          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover:mt-2 group-hover:grid-rows-[1fr] group-hover:opacity-100">
            <p className="overflow-hidden line-clamp-2 text-sm leading-relaxed text-white/70">
              {speaker.bio}
            </p>
          </div>
        ) : null}

        {/* Profile door — always visible */}
        <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors duration-300 group-hover:text-text-primary">
          {VIEW_PROFILE[locale]}
          <span aria-hidden="true">←</span>
        </span>
      </div>
    </div>
  </Link>
);

/*
 * The featured speakers, staged as an editorial showcase, not a directory.
 * One headliner holds a dominant frame on the physical left; the rest form
 * a calm grid to its right — equal heights via a flex split so the feature
 * always reads about twice the weight of the others. Mobile keeps the same
 * hierarchy: headliner on top, then the supporting grid.
 */
const SpeakersScene = ({
  speakers,
  locale,
  showcase = true,
}: SpeakersSceneProps) => {
  const reduce = useReducedMotion();
  const list = speakers as Speaker[];
  if (list.length === 0) {
    return null;
  }

  const heroMode = showcase && list.length >= 5;

  const uniformGrid = (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={container}
      className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:gap-6"
    >
      {list.map((speaker, index) => (
        <motion.div key={speaker.name} variants={item}>
          <SpeakerCard
            speaker={speaker}
            locale={locale}
            badge={
              showcase
                ? speaker.badge ?? DERIVED_BADGES[index % DERIVED_BADGES.length]
                : speaker.badge
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );

  let content = uniformGrid;
  if (heroMode) {
    const headliner = list[0]!;
    const rest = list.slice(1);
    content = (
      <motion.div
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={container}
        className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-8"
      >
        {/* Supporting grid — physical right in he */}
        <div className="lg:order-first lg:w-[64%]">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:gap-6">
            {rest.map((speaker, i) => (
              <motion.div key={speaker.name} variants={item}>
                <SpeakerCard
                  speaker={speaker}
                  locale={locale}
                  badge={
                    speaker.badge ?? DERIVED_BADGES[i % DERIVED_BADGES.length]
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Headliner — dominant, physical left in he */}
        <motion.div variants={item} className="lg:order-last lg:w-[36%]">
          <SpeakerCard
            speaker={headliner}
            locale={locale}
            hero
            badge={headliner.badge ?? 'Keynote'}
          />
        </motion.div>
      </motion.div>
    );
  }

  if (!showcase) {
    return uniformGrid;
  }

  return (
    <section
      id="speakers"
      className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28"
    >
      {/* Soft golden radial lighting, continuing the hero/about language */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[560px] max-w-[1100px] bg-[radial-gradient(50%_50%_at_50%_28%,color-mix(in_srgb,var(--color-accent)_9%,transparent),transparent_72%)] blur-2xl"
      />

      <div className="relative mx-auto max-w-[1440px] px-6 md:px-12">
        {/* Header */}
        <div className="mx-auto mb-14 max-w-[700px] text-center md:mb-20">
          <p className="text-xs font-medium uppercase tracking-[0.34em] text-accent md:text-sm">
            {CINEMATIC_UI.speakersEyebrow[locale]}
          </p>
          <RevealText
            as="h2"
            text={CINEMATIC_UI.speakersTitle[locale]}
            className="mx-auto mt-5 block font-display text-4xl font-extrabold tracking-tight md:text-6xl"
          />
          <p className="mx-auto mt-5 text-base leading-relaxed text-text-secondary md:text-lg">
            {INTRO[locale]}
          </p>
        </div>

        {content}

        {/* Door to the full cast */}
        <div className="mt-16 flex justify-center">
          <Link
            href={`/${locale}/speakers`}
            className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-accent/40 px-10 text-base text-accent transition-all duration-300 hover:bg-accent/10"
          >
            {VIEW_ALL[locale]}
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              ←
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpeakersScene;
