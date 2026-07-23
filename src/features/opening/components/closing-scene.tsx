import Link from 'next/link';
import { Reveal, RevealText } from '@/shared';
import type { OpeningClosing } from '../types/opening';
import { IconChevron } from './icons';

interface ClosingSceneProps {
  closing: OpeningClosing;
}

/*
 * Scene 05 — the final invitation. A closing frame, not a CTA block:
 * full screen, one line, one warm spotlight, one door — into the
 * featured conference when one exists, back to the portal wall when it
 * does not.
 */
const ClosingScene = ({ closing }: ClosingSceneProps) => {
  const action = closing.href ?? '#events';
  const inner = (
    <>
      {closing.cta}
      <IconChevron className="size-4 ltr:rotate-180" />
    </>
  );
  const cta = closing.href ? (
    <Link
      href={action}
      className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-brand px-10 font-medium text-brand-contrast transition-transform delay-75 hover:scale-[1.02]"
    >
      {inner}
    </Link>
  ) : (
    <a
      href={action}
      className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-full bg-brand px-10 font-medium text-brand-contrast transition-transform delay-75 hover:scale-[1.02]"
    >
      {inner}
    </a>
  );

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="cine-blue-band absolute inset-0 opacity-90" />
        <div className="cine-seam-top absolute inset-x-0 top-0 h-40" />
        <div className="cine-darkness-glow cine-breath absolute inset-0" />
      </div>
      <Reveal className="relative">
        <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center gap-8 px-6 py-28 text-center">
          <RevealText
            as="h2"
            text={closing.title}
            className="block font-display text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-7xl"
          />
          <p className="text-lg text-text-secondary md:text-xl">
            {closing.subtitle}
          </p>
          {cta}
        </div>
      </Reveal>
    </section>
  );
};

export default ClosingScene;
