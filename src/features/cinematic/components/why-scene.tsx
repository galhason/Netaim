import type { WhyScene as WhySceneData } from '../types/cinematic';
import { ParallaxImage, Reveal, RevealText } from '@/shared';

interface WhySceneProps {
  why: WhySceneData;
  /*
   * Presentation variant 'minimal': the quote carries the scene alone —
   * no statistic, even when the content holds one.
   */
  minimal?: boolean;
}

/*
 * Scene 03 — Why it matters. A breathing moment: one human face on a
 * floating frame, one large quote opened by a bronze mark, at most one
 * number — and the number is typography, never a widget.
 */
const WhyScene = ({ why, minimal }: WhySceneProps) => (
  <Reveal className="py-20 md:py-28">
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-12 md:px-12">
      <div className="md:col-span-5 md:col-start-1">
        <div className="cine-float overflow-hidden rounded-3xl">
          <ParallaxImage
            src={why.image}
            sizes="(max-width: 768px) 100vw, 38vw"
            className="aspect-[3/4] w-full md:h-[56vh]"
          />
        </div>
      </div>
      <figure className="md:col-span-6 md:col-start-7">
        <span
          aria-hidden="true"
          className="block font-display text-7xl leading-[0.6] text-accent/45"
        >
          &ldquo;
        </span>
        <blockquote className="mt-2">
          <RevealText
            as="p"
            text={why.quote}
            className="block font-display text-2xl font-bold leading-snug tracking-tight md:text-3xl lg:text-[2.6rem] lg:leading-[1.15]"
          />
        </blockquote>
        <figcaption className="mt-6 text-sm text-text-secondary md:text-base">
          <span className="font-medium text-text-primary">
            {why.attribution}
          </span>
          <span className="mx-3 text-accent" aria-hidden="true">
            ·
          </span>
          {why.role}
        </figcaption>
        {why.statistic && !minimal ? (
          <p className="mt-10">
            <span className="block font-display text-4xl font-extrabold leading-none tracking-tight text-accent md:text-5xl">
              {why.statistic.value}
            </span>
            <span className="mt-3 block text-xs tracking-[0.24em] text-text-secondary md:text-sm">
              {why.statistic.label}
            </span>
          </p>
        ) : null}
      </figure>
    </div>
  </Reveal>
);

export default WhyScene;
