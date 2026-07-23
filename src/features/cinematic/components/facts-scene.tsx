import type { WhyStatistic } from '../types/cinematic';
import { Reveal } from '@/shared';

interface FactsSceneProps {
  facts: WhyStatistic[];
}

/*
 * The conference at a glance — a calm band of numbers under the
 * invitation, held between two hairlines rather than a hard rule. Values
 * lead in the accent voice; labels whisper. Nothing to say means nothing
 * rendered.
 */
const FactsScene = ({ facts }: FactsSceneProps) => {
  if (facts.length === 0) {
    return null;
  }
  return (
    <section className="border-y cine-hair py-10 md:py-12">
      <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-14 gap-y-8 px-6 md:px-12">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col items-center gap-1.5">
            <span className="font-display text-3xl font-bold tracking-tight text-accent md:text-4xl">
              {fact.value}
            </span>
            <span className="text-sm text-text-secondary">{fact.label}</span>
          </div>
        ))}
      </Reveal>
    </section>
  );
};

export default FactsScene;
