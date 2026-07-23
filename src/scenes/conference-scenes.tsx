import { BRAND_NAME } from '@/config/brand';
import {
  CONFERENCE_SCENE_TYPES,
  CinematicNav,
  ConferenceActIntroScene,
  ConferenceArrivalScene,
  ConferenceClosingScene,
  ConferenceCountdownScene,
  ConferenceFactsScene,
  ConferenceFeaturedSessionsScene,
  ConferenceFooter,
  ConferenceMomentsScene,
  ConferenceProgramScene,
  ConferenceQuoteScene,
  ConferenceSpeakersScene,
  ConferenceSponsorsScene,
  ConferenceStoryScene,
  ConferenceVenueScene,
  fallbackConference,
} from '@/features/cinematic';
import type {
  ArrivalSceneData,
  ClosingSceneData,
  CountdownSceneData,
  FeaturedSessionItem,
  MomentItem,
  NavSection,
  ProgramDay,
  QuoteSceneData,
  SpeakerItem,
  SponsorLogo,
  StorySceneData,
  VenueSceneData,
  WhyStatistic,
} from '@/features/cinematic';
import { registerScene } from '@/experience-runtime';
import type { SceneComponentProps } from '@/experience-runtime';

/*
 * The conference Scene Packages (Phase 1 wrappers): the cinematic scenes
 * registered behind the shared contract.
 *
 * Art Direction V5 — every chapter is wrapped in its own ambient tone
 * (`cine-atmos`), so the background evolves Act by Act and one chapter
 * dissolves into the next. The tone is declared here, per scene type —
 * the editor never configures lighting; it happens automatically.
 */
const defaults = fallbackConference('he');

const ATMOS = {
  gold: 'cine-atmos [--atmos:rgb(201_161_93_/_0.15)]',
  warm: 'cine-atmos [--atmos:rgb(201_161_93_/_0.10)] [--atmos-x:68%]',
  neutral: 'cine-atmos [--atmos:rgb(122_142_170_/_0.05)]',
  spotlight: 'cine-atmos [--atmos:rgb(201_161_93_/_0.13)] [--atmos-strength:0.8]',
  sand: 'cine-atmos [--atmos:rgb(196_158_108_/_0.12)]',
} as const;

interface ConferenceNavContent {
  brand: string;
  registerHref: string;
  meHref: string;
  sections?: NavSection[];
}

interface ConferenceFooterContent {
  brand: string;
}

const NavRenderer = ({
  content,
  locale,
}: SceneComponentProps<ConferenceNavContent>) => (
  <CinematicNav
    locale={locale}
    registerHref={content.registerHref}
    meHref={content.meHref}
    brand={content.brand}
    sections={content.sections}
  />
);

const FooterRenderer = ({
  content,
  locale,
}: SceneComponentProps<ConferenceFooterContent>) => (
  <ConferenceFooter locale={locale} brand={content.brand} />
);

interface ArrivalContent {
  arrival: ArrivalSceneData;
  registerHref: string;
}

interface ClosingContent {
  closing: ClosingSceneData;
  registerHref: string;
  facts: WhyStatistic[];
}

const ArrivalRenderer = ({
  content,
  locale,
  variant,
  density,
  emphasis,
}: SceneComponentProps<ArrivalContent>) => (
  <ConferenceArrivalScene
    arrival={content.arrival}
    registerHref={content.registerHref}
    locale={locale}
    variant={variant}
    density={density}
    emphasis={emphasis}
  />
);

const StoryRenderer = ({
  content,
  variant,
}: SceneComponentProps<StorySceneData>) => (
  <div className={ATMOS.neutral}>
    <ConferenceStoryScene story={content} mirrored={variant === 'mirrored'} />
  </div>
);

const QuoteRenderer = ({
  content,
  variant,
}: SceneComponentProps<QuoteSceneData>) => (
  <div className={ATMOS.spotlight}>
    <ConferenceQuoteScene why={content} minimal={variant === 'minimal'} />
  </div>
);

const MomentsRenderer = ({
  content,
  locale,
  variant,
  density,
}: SceneComponentProps<MomentItem[]>) => (
  <div className={ATMOS.neutral}>
    <ConferenceMomentsScene
      moments={content}
      locale={locale}
      grid={variant === 'grid'}
      density={density}
    />
  </div>
);

const FeaturedSessionsRenderer = ({
  content,
  locale,
}: SceneComponentProps<FeaturedSessionItem[]>) => (
  <div className={ATMOS.warm}>
    <ConferenceFeaturedSessionsScene sessions={content} locale={locale} />
  </div>
);

const CountdownRenderer = ({
  content,
  locale,
}: SceneComponentProps<CountdownSceneData>) => (
  <div className={ATMOS.warm}>
    <ConferenceCountdownScene startsAt={content.startsAt} locale={locale} />
  </div>
);

const FactsRenderer = ({
  content,
}: SceneComponentProps<WhyStatistic[]>) => (
  <div className={ATMOS.warm}>
    <ConferenceFactsScene facts={content} />
  </div>
);

const SponsorsRenderer = ({
  content,
  locale,
  variant,
}: SceneComponentProps<SponsorLogo[]>) => (
  <div className={ATMOS.neutral}>
    <ConferenceSponsorsScene
      sponsors={content}
      locale={locale}
      community={variant === 'community'}
    />
  </div>
);

interface ActIntroContent {
  number: string;
  title: Record<'he' | 'en', string>;
}

const ActIntroRenderer = ({
  content,
  locale,
}: SceneComponentProps<ActIntroContent>) => (
  <div className={ATMOS.neutral}>
    <ConferenceActIntroScene
      number={content.number}
      title={content.title[locale]}
    />
  </div>
);

const SpeakersRenderer = ({
  content,
  locale,
  variant,
  density,
  emphasis,
}: SceneComponentProps<SpeakerItem[]>) => (
  <div className={ATMOS.warm}>
    <ConferenceSpeakersScene
      speakers={content}
      locale={locale}
      variant={variant}
      density={density}
      emphasis={emphasis}
    />
  </div>
);

const ProgramRenderer = ({
  content,
  locale,
}: SceneComponentProps<ProgramDay[]>) => (
  <div className={ATMOS.neutral}>
    <ConferenceProgramScene program={content} locale={locale} />
  </div>
);

const VenueRenderer = ({
  content,
  locale,
}: SceneComponentProps<VenueSceneData>) => (
  <div className={ATMOS.sand}>
    <ConferenceVenueScene venue={content} locale={locale} />
  </div>
);

const ClosingRenderer = ({
  content,
  locale,
}: SceneComponentProps<ClosingContent>) => (
  <div className={ATMOS.neutral}>
    <ConferenceClosingScene
      closing={content.closing}
      registerHref={content.registerHref}
      facts={content.facts}
      locale={locale}
    />
  </div>
);

registerScene({
  type: CONFERENCE_SCENE_TYPES.nav,
  version: 1,
  placement: 'overlay',
  renderer: NavRenderer,
  defaultContent: { brand: BRAND_NAME, registerHref: '/', meHref: '/' },
});

registerScene({
  type: CONFERENCE_SCENE_TYPES.footer,
  version: 1,
  placement: 'closing',
  renderer: FooterRenderer,
  defaultContent: { brand: BRAND_NAME },
});

registerScene({
    type: CONFERENCE_SCENE_TYPES.arrival,
    version: 1,
    variants: ['split', 'minimal'],
    densities: ['compact'],
    emphases: ['cinematic'],
    renderer: ArrivalRenderer,
    defaultContent: { arrival: defaults.arrival, registerHref: '/' },
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.story,
    version: 1,
    variants: ['mirrored'],
    renderer: StoryRenderer,
    defaultContent: defaults.story,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.quote,
    version: 1,
    variants: ['minimal'],
    renderer: QuoteRenderer,
    defaultContent: defaults.why,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.moments,
    version: 1,
    variants: ['grid'],
    densities: ['tight', 'airy'],
    renderer: MomentsRenderer,
    defaultContent: defaults.moments,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.featuredSessions,
    version: 1,
    renderer: FeaturedSessionsRenderer,
    defaultContent: defaults.featuredSessions,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.countdown,
    version: 1,
    renderer: CountdownRenderer,
    defaultContent: defaults.countdown,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.facts,
    version: 1,
    renderer: FactsRenderer,
    defaultContent: defaults.facts,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.sponsors,
    version: 1,
    variants: ['community'],
    renderer: SponsorsRenderer,
    defaultContent: defaults.sponsors,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.actIntro,
    version: 1,
    renderer: ActIntroRenderer,
    defaultContent: { number: 'ACT', title: { he: '', en: '' } },
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.speakers,
    version: 1,
    variants: ['editorial'],
    densities: ['tight', 'airy'],
    emphases: ['featured'],
    renderer: SpeakersRenderer,
    defaultContent: defaults.speakers,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.program,
    version: 1,
    renderer: ProgramRenderer,
    defaultContent: defaults.program,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.venue,
    version: 1,
    renderer: VenueRenderer,
    defaultContent: defaults.venue,
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.closing,
    version: 1,
    renderer: ClosingRenderer,
    defaultContent: {
      closing: defaults.closing,
      registerHref: '/',
      facts: defaults.facts,
    },
  });
