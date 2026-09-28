import { BRAND_NAME } from '@/config/brand';
import { ConferenceBar } from '@/features/conference';
import {
  CONFERENCE_SCENE_TYPES,
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
  SiteNavLink,
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
  gold: 'cine-atmos [--atmos:rgb(249_161_27_/_0.15)]',
  warm: 'cine-atmos [--atmos:rgb(249_161_27_/_0.10)] [--atmos-x:68%]',
  neutral: 'cine-atmos [--atmos:rgb(42_144_200_/_0.05)]',
  spotlight: 'cine-atmos [--atmos:rgb(249_161_27_/_0.13)] [--atmos-strength:0.8]',
  sand: 'cine-atmos [--atmos:rgb(255_210_28_/_0.12)]',
} as const;

interface ConferenceNavContent {
  brand: string;
  /* The conference the bar belongs to; null on the site's front. */
  slug?: string | null;
  /* The logo for the bar's light ground; `brandLogo` is the dark chrome's. */
  brandLogoLight?: string;
  /*
   * The logo travels on the scene's content, like the name it stands
   * beside: the renderer must stay synchronous, so it cannot go and
   * ask the Studio what the site's logo is.
   */
  brandLogo?: string;
  /*
   * The participant's own day. Carried on the content like the name and
   * the logo, and drawn only for a viewer the runtime can see — the
   * descriptor is cached and shared, so who is looking is never on it.
   */
  scheduleHref?: string;
  /*
   * The site navigation, resolved against this conference. A slug is not
   * an identity, so unlike the viewer it is safe on cached content.
   */
  links: SiteNavLink[];
  registerHref: string;
  meHref: string;
  sections?: NavSection[];
}

/*
 * The list scenes carry the address of the page that shows the whole
 * list. Resolved in the descriptor, where the conference is known — a
 * scene is handed a locale and never a conference.
 */
interface FeaturedSessionsContent {
  sessions: FeaturedSessionItem[];
  programHref: string;
}

interface SpeakersContent {
  speakers: SpeakerItem[];
  speakersHref: string;
}

interface ProgramContent {
  program: ProgramDay[];
  programHref: string;
}

interface ConferenceFooterContent {
  brand: string;
  brandLogo?: string;
}

/*
 * The one scene that depends on who is asking. The viewer arrives as
 * render context beside `locale` — never on `content`, which comes from
 * the cached descriptor and would therefore be shared with the next
 * visitor. The renderer stays synchronous: making one scene async would
 * couple the whole scene system to an async renderer, which is what the
 * locked snapshots caught the first time this was tried.
 * `tests/unit/nav-viewer.test.ts` holds both properties.
 */
const NavRenderer = ({
  content,
  locale,
  viewer,
}: SceneComponentProps<ConferenceNavContent>) => (
  /*
   * The conference bar — the same bar the organisation's site and every
   * platform page wear. The viewer (name, picture) is render context and
   * never on the cached content; the conference is.
   */
  <ConferenceBar
    locale={locale}
    slug={content.slug ?? null}
    viewer={
      viewer
        ? {
            name: viewer.name,
            ...(viewer.photoUrl ? { photoUrl: viewer.photoUrl } : {}),
            ...(viewer.studio ? { studio: true } : {}),
          }
        : null
    }
    brand={content.brand}
    brandLogo={content.brandLogoLight ?? content.brandLogo}
  />
);

const FooterRenderer = ({
  content,
  locale,
}: SceneComponentProps<ConferenceFooterContent>) => (
  <ConferenceFooter
    locale={locale}
    brand={content.brand}
    brandLogo={content.brandLogo}
  />
);

interface ArrivalContent {
  arrival: ArrivalSceneData;
  registerHref: string;
  programHref: string;
}

interface ClosingContent {
  closing: ClosingSceneData;
  registerHref: string;
  programHref: string;
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
    programHref={content.programHref}
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
}: SceneComponentProps<FeaturedSessionsContent>) => (
  <div className={ATMOS.warm}>
    <ConferenceFeaturedSessionsScene
      sessions={content.sessions}
      programHref={content.programHref}
      locale={locale}
    />
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
}: SceneComponentProps<SpeakersContent>) => (
  <div className={ATMOS.warm}>
    <ConferenceSpeakersScene
      speakers={content.speakers}
      speakersHref={content.speakersHref}
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
}: SceneComponentProps<ProgramContent>) => (
  <div className={ATMOS.neutral}>
    <ConferenceProgramScene
      program={content.program}
      programHref={content.programHref}
      locale={locale}
    />
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
      programHref={content.programHref}
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
  defaultContent: {
    brand: BRAND_NAME,
    /* No conference, so no conference pages to offer. */
    links: [],
    registerHref: '/',
    meHref: '/',
  },
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
    defaultContent: { arrival: defaults.arrival, registerHref: '/', programHref: '/' },
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
    defaultContent: { sessions: defaults.featuredSessions, programHref: '/' },
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
    defaultContent: { speakers: defaults.speakers, speakersHref: '/' },
  });

registerScene({
    type: CONFERENCE_SCENE_TYPES.program,
    version: 1,
    renderer: ProgramRenderer,
    defaultContent: { program: defaults.program, programHref: '/' },
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
      programHref: '/',
      facts: defaults.facts,
    },
  });
