import { BRAND_NAME } from '@/config/brand';
import {
  OPENING_SCENE_TYPES,
  OpeningClosingScene,
  OpeningEventsScene,
  OpeningFeaturedHeroScene,
  OpeningFooter,
  OpeningHeroScene,
  OpeningMomentsScene,
  OpeningNav,
  OpeningWhyScene,
  fallbackOpeningContent,
} from '@/features/opening';
import type {
  FeaturedHero,
  OpeningClosing,
  OpeningEventsSection,
  OpeningHero,
  OpeningMoments,
  OpeningWhy,
  PortalPoster,
} from '@/features/opening';
import { registerScene } from '@/experience-runtime';
import type { SceneComponentProps } from '@/experience-runtime';

/*
 * The homepage Scene Packages (Phase 1 wrappers): each existing scene
 * component becomes a registered package behind the shared contract.
 * Editors, validators and migrations arrive with Phases 2–3.
 */
const defaults = fallbackOpeningContent('he');

interface OpeningChromeContent {
  brand: string;
}

interface OpeningNavContent extends OpeningChromeContent {
  meHref?: string | null;
}

const NavRenderer = ({
  content,
  locale,
}: SceneComponentProps<OpeningNavContent>) => (
  <OpeningNav locale={locale} brand={content.brand} meHref={content.meHref} />
);

const FooterRenderer = ({
  content,
  locale,
}: SceneComponentProps<OpeningChromeContent>) => (
  <OpeningFooter locale={locale} brand={content.brand} />
);

const FeaturedHeroRenderer = ({
  content,
  locale,
}: SceneComponentProps<FeaturedHero>) => (
  <OpeningFeaturedHeroScene featured={content} locale={locale} />
);

const HeroRenderer = ({ content, locale }: SceneComponentProps<OpeningHero>) => (
  <OpeningHeroScene hero={content} locale={locale} />
);

interface PortalWallContent {
  events: OpeningEventsSection;
  posters: PortalPoster[];
}

const PortalWallRenderer = ({
  content,
  locale,
}: SceneComponentProps<PortalWallContent>) => (
  <OpeningEventsScene
    events={content.events}
    posters={content.posters}
    locale={locale}
  />
);

const StoryRenderer = ({ content }: SceneComponentProps<OpeningWhy>) => (
  <OpeningWhyScene why={content} />
);

const MomentsRenderer = ({ content }: SceneComponentProps<OpeningMoments>) => (
  <OpeningMomentsScene moments={content} />
);

const ClosingRenderer = ({ content }: SceneComponentProps<OpeningClosing>) => (
  <OpeningClosingScene closing={content} />
);

registerScene({
  type: OPENING_SCENE_TYPES.nav,
  version: 1,
  placement: 'overlay',
  renderer: NavRenderer,
  defaultContent: { brand: BRAND_NAME, meHref: null },
});

registerScene({
  type: OPENING_SCENE_TYPES.footer,
  version: 1,
  placement: 'closing',
  renderer: FooterRenderer,
  defaultContent: { brand: BRAND_NAME },
});

registerScene({
    type: OPENING_SCENE_TYPES.featuredHero,
    version: 1,
    renderer: FeaturedHeroRenderer,
    defaultContent: {
      title: defaults.hero.titleMain,
      teaser: defaults.hero.subtitle,
      dateLabel: '',
      location: '',
      image: defaults.hero.image,
      href: '/',
      tone: 'bronze',
    },
  });

registerScene({
    type: OPENING_SCENE_TYPES.hero,
    version: 1,
    renderer: HeroRenderer,
    defaultContent: defaults.hero,
  });

registerScene({
    type: OPENING_SCENE_TYPES.portalWall,
    version: 1,
    renderer: PortalWallRenderer,
    defaultContent: { events: defaults.events, posters: defaults.posters },
  });

registerScene({
    type: OPENING_SCENE_TYPES.story,
    version: 1,
    renderer: StoryRenderer,
    defaultContent: defaults.why,
  });

registerScene({
    type: OPENING_SCENE_TYPES.moments,
    version: 1,
    renderer: MomentsRenderer,
    defaultContent: defaults.moments,
  });

registerScene({
    type: OPENING_SCENE_TYPES.closing,
    version: 1,
    renderer: ClosingRenderer,
    defaultContent: defaults.closing,
  });
