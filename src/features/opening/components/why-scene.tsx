import { ParallaxImage, Reveal, RevealText } from '@/shared';
import { SCENE_BLEEDS } from '../constants/opening-content';
import type { OpeningWhy } from '../types/opening';
import SceneBleed from './scene-bleed';

interface WhySceneProps {
  why: OpeningWhy;
}

/*
 * The human story, told as a magazine spread: photography bleeding past
 * the frame on the end side, one quotable line, two sentences — nothing
 * corporate. The seam above lets the portal wall dissolve into it.
 */
const WhyScene = ({ why }: WhySceneProps) => (
  <Reveal id="why" className="relative pb-24 pt-10 md:pb-36 md:pt-14">
    <SceneBleed tint={SCENE_BLEEDS.story} />
    <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-12">
      <div className="md:col-span-6 md:col-start-7">
        <ParallaxImage
          src={why.image}
          sizes="(max-width: 768px) 100vw, 52vw"
          className="aspect-[16/11] w-full md:h-[64vh]"
        />
      </div>
      <div className="px-6 md:col-span-5 md:col-start-1 md:row-start-1 md:ps-12">
        <p className="text-xs font-medium tracking-[0.3em] text-accent md:text-sm">
          {why.eyebrow}
        </p>
        <RevealText
          as="h2"
          text={why.title}
          className="mt-6 block font-display text-3xl font-bold leading-[1.12] tracking-tight md:text-5xl"
        />
        <p className="mt-8 max-w-sm text-base leading-relaxed text-text-secondary md:text-lg">
          {why.paragraph}
        </p>
      </div>
    </div>
  </Reveal>
);

export default WhyScene;
