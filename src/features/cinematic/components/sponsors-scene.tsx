import Image from 'next/image';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';
import type { SponsorLogo } from '../types/cinematic';
import { Reveal, RevealText } from '@/shared';

interface SponsorsSceneProps {
  sponsors: SponsorLogo[];
  locale: Locale;
  /*
   * 'community' layout (Experience Engine v3): the quiet strip becomes
   * social proof — a floating band asking "who is already on the way?"
   */
  community?: boolean;
}

/*
 * Partners on the road — a quiet strip of the organizations standing
 * behind the conference. Logos rest muted and wake on hover; a partner
 * without a logo is named in type. No partners, no scene.
 */
const SponsorsScene = ({ sponsors, locale, community }: SponsorsSceneProps) => {
  if (sponsors.length === 0) {
    return null;
  }
  if (community) {
    return (
      <section className="py-16 md:py-24">
        <Reveal className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="cine-card cine-glow rounded-3xl px-8 py-12 text-center md:px-12">
            <RevealText
              as="h2"
              text={CINEMATIC_UI.communityTitle[locale]}
              className="mx-auto block font-display text-2xl font-bold tracking-tight md:text-4xl"
            />
            <p className="mt-3 text-sm text-text-secondary">
              {CINEMATIC_UI.communitySub[locale]}
            </p>
            <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
              {sponsors.map((sponsor) => (
                <li
                  key={sponsor.name}
                  className="opacity-70 transition-opacity duration-500 hover:opacity-100"
                >
                  {sponsor.logoUrl ? (
                    <span className="relative block h-9 w-24 md:h-10 md:w-28">
                      <Image
                        src={sponsor.logoUrl}
                        alt={sponsor.name}
                        fill
                        sizes="7rem"
                        className="object-contain"
                      />
                    </span>
                  ) : (
                    <span className="font-display text-lg font-semibold tracking-wide text-text-secondary">
                      {sponsor.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>
    );
  }
  return (
    <section className="py-16 md:py-24">
      <Reveal className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="text-center text-xs font-medium tracking-[0.3em] text-accent md:text-sm">
          {CINEMATIC_UI.sponsorsEyebrow[locale]}
        </p>
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {sponsors.map((sponsor) => {
            const mark = sponsor.logoUrl ? (
              <span className="relative block h-10 w-28 md:h-12 md:w-32">
                <Image
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  fill
                  sizes="8rem"
                  className="object-contain"
                />
              </span>
            ) : (
              <span className="font-display text-lg font-semibold tracking-wide text-text-secondary">
                {sponsor.name}
              </span>
            );
            return (
              <li
                key={sponsor.name}
                className="opacity-60 transition-opacity duration-500 hover:opacity-100"
              >
                {sponsor.website ? (
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={sponsor.name}
                  >
                    {mark}
                  </a>
                ) : (
                  mark
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
};

export default SponsorsScene;
