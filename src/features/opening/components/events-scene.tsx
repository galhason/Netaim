import type { Locale } from '@/config/locales';
import { Reveal, RevealText } from '@/shared';
import { OPENING_UI, SCENE_BLEEDS } from '../constants/opening-content';
import type { OpeningEventsSection, PortalPoster } from '../types/opening';
import PortalCarousel from './portal-carousel';
import SceneBleed from './scene-bleed';

interface EventsSceneProps {
  events: OpeningEventsSection;
  posters: PortalPoster[];
  locale: Locale;
}

/*
 * Section 02 — the portal wall. Not an event list: a gallery of worlds,
 * each poster a doorway into one conference's opening experience.
 */
const EventsScene = ({ events, posters, locale }: EventsSceneProps) => (
  <section id="events" className="relative py-20 md:py-28">
    <SceneBleed tint={SCENE_BLEEDS.worlds} />
    <Reveal className="mx-auto max-w-4xl px-6 text-center md:px-12">
      <RevealText
        as="h2"
        text={events.title}
        className="block font-display text-3xl font-bold tracking-tight md:text-5xl"
      />
      <p className="mt-4 text-base text-text-secondary md:text-lg">
        {events.subtitle}
      </p>
    </Reveal>
    <div className="mt-12 md:mt-16">
      <PortalCarousel
        posters={posters}
        cta={OPENING_UI.enterEvent[locale]}
        prevLabel={OPENING_UI.carouselPrev[locale]}
        nextLabel={OPENING_UI.carouselNext[locale]}
      />
    </div>
  </section>
);

export default EventsScene;
