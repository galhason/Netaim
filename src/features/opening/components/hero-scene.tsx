import Image from 'next/image';
import type { Locale } from '@/config/locales';
import { RevealText } from '@/shared';
import { OPENING_UI } from '../constants/opening-content';
import type { OpeningHero } from '../types/opening';
import { IconScroll } from './icons';

interface HeroSceneProps {
  hero: OpeningHero;
  locale: Locale;
}

/*
 * The opening shot: an empty hall the moment before people arrive. The
 * photograph drifts almost imperceptibly, the page-level Guiding Light
 * carries the atmosphere, and the words arrive sentence by sentence
 * with room to breathe. Something important is about to happen.
 */
const HeroScene = ({ hero, locale }: HeroSceneProps) => (
  <section className="relative flex min-h-dvh flex-col overflow-hidden">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="cine-slow-zoom absolute inset-0">
        <Image
          src={hero.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="cine-image-scrim absolute inset-0" />
      <div className="cine-audience absolute inset-0" />
      <div className="cine-vignette absolute inset-0" />
    </div>
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 md:px-12">
      <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
        <RevealText
          trigger="mount"
          delay={0.6}
          text={hero.titleMain}
          className="block"
        />
        <RevealText
          trigger="mount"
          delay={1.7}
          text={hero.titleAccent}
          className="block text-accent"
        />
      </h1>
      <p className="cine-hero-line mt-7 max-w-md text-lg leading-relaxed text-text-secondary [animation-delay:2700ms] md:text-xl">
        {hero.subtitle}
      </p>
    </div>
    <a
      href="#events"
      className="cine-hero-line absolute inset-x-0 bottom-8 z-10 mx-auto flex w-fit flex-col items-center gap-2 text-text-secondary transition-colors [animation-delay:3400ms] hover:text-text-primary"
    >
      <span className="text-[0.65rem] tracking-[0.3em]">
        {OPENING_UI.scrollHint[locale]}
      </span>
      <IconScroll className="size-5" />
    </a>
  </section>
);

export default HeroScene;
