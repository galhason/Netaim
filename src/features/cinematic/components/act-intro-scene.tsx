import { Reveal, RevealText } from '@/shared';

interface ActIntroSceneProps {
  number: string;
  title: string;
}

/*
 * A chapter intro (Experience Engine v2): the journey pauses to
 * announce its next act — a numbered whisper and a title in generous
 * silence. Pure typography; the pacing is the point.
 */
const ActIntroScene = ({ number, title }: ActIntroSceneProps) => (
  <section className="py-24 md:py-36">
    <Reveal className="mx-auto max-w-6xl px-6 text-center md:px-12">
      <p className="text-xs font-medium tracking-[0.42em] text-accent md:text-sm">
        {number}
      </p>
      <RevealText
        as="h2"
        text={title}
        className="mt-5 block font-display text-3xl font-bold tracking-tight md:text-5xl"
      />
    </Reveal>
  </section>
);

export default ActIntroScene;
