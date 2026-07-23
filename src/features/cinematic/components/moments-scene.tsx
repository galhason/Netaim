import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { MomentItem } from '../types/cinematic';
import { ParallaxImage, Reveal, RevealText } from '@/shared';

interface MomentsSceneProps {
  moments: MomentItem[];
  locale: Locale;
  /*
   * Presentation axes (Experience Engine v3): the strip (default) or a
   * calm two-column grid; density trades card size and gap for pace.
   */
  grid?: boolean;
  density?: string;
}

/*
 * Scene 04 — Experience preview. Not an agenda: moments. Edge-to-edge
 * photography scrolling past like scenes from a documentary, each frame
 * floating on its shadow with a single whispered caption. The visitor
 * should place themselves inside the frame.
 */
const MomentsScene = ({ moments, locale, grid, density }: MomentsSceneProps) => (
  <section>
    <Reveal className="mx-auto max-w-6xl px-6 pb-12 pt-4 md:px-12 md:pb-16">
      <p className="text-xs font-medium tracking-[0.3em] text-accent md:text-sm">
        {CINEMATIC_UI.momentsEyebrow[locale]}
      </p>
      <RevealText
        as="h2"
        text={CINEMATIC_UI.momentsTitle[locale]}
        className="mt-5 block font-display text-3xl font-bold tracking-tight md:text-5xl"
      />
    </Reveal>
    {grid ? (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 md:grid-cols-2 md:px-12">
        {moments.map((moment) => (
          <figure
            key={moment.caption}
            className="cine-float relative overflow-hidden rounded-2xl"
          >
            <ParallaxImage
              src={moment.image}
              sizes="(max-width: 768px) 100vw, 44vw"
              className="aspect-[16/10] w-full"
            />
            <div className="cine-image-scrim pointer-events-none absolute inset-0" />
            <figcaption className="absolute bottom-5 start-0 z-10 max-w-lg px-5">
              <span className="font-display text-base font-medium leading-snug md:text-lg">
                {moment.caption}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    ) : (
      <div
        className={`scrollbar-none mx-auto flex max-w-7xl snap-x snap-mandatory overflow-x-auto px-6 pb-4 md:px-12 ${
          density === 'tight' ? 'gap-3' : density === 'airy' ? 'gap-7' : 'gap-5'
        }`}
      >
        {moments.map((moment) => (
          <figure
            key={moment.caption}
            className={`group cine-float relative flex-none snap-start overflow-hidden rounded-2xl ${
              density === 'tight' ? 'w-60 md:w-64' : 'w-72 md:w-80'
            }`}
          >
            <ParallaxImage
              src={moment.image}
              sizes="20rem"
              className="aspect-[4/3] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            <div className="cine-image-scrim pointer-events-none absolute inset-0" />
            <figcaption className="absolute bottom-4 start-0 z-10 px-4">
              <span className="font-display text-sm font-medium leading-snug md:text-base">
                {moment.caption}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    )}
  </section>
);

export default MomentsScene;
