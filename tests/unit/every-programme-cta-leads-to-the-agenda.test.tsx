import { readFileSync, readdirSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';

/*
 * Every "go to the programme" on the platform leads to the agenda.
 *
 * The conference's own sections -- the arrival, the featured sessions and
 * their "view all", the programme scene, the closing invitation -- each
 * carry a way to the full programme. They are handed that address once,
 * by the descriptor, which is the only place that knows the conference.
 * This renders the sections, in both languages, and reads every
 * programme link off the markup: none may lead to the old platform
 * address, which the edge gives to WordPress, or to the WordPress listing,
 * where nobody can register for anything.
 *
 * What this cannot reach, and does not pretend to: the WordPress pages
 * draw their own copy of the bar and of the "taste of the conference"
 * band, in the child theme. Those links are set there.
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string | { pathname?: string };
    children: ReactNode;
  }) => (
    <a href={typeof href === 'string' ? href : (href.pathname ?? '')} {...rest}>
      {children}
    </a>
  ),
}));

/*
 * next/image as a plain <img>. Its own props (`fill`, `priority`) are not
 * HTML attributes; passed through, React warns about each one and drops
 * it, so they are left out here instead.
 */
const NEXT_IMAGE_ONLY = new Set(['alt', 'fill', 'priority']);
vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const rest = Object.fromEntries(Object.entries(props).filter(([key]) => !NEXT_IMAGE_ONLY.has(key)));
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt ?? ''} {...rest} />;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined, refresh: () => undefined }),
  usePathname: () => '/he',
}));

import '@/scenes';
import { ExperienceStage } from '@/experience-runtime';
import { buildConferenceDescriptor, fallbackConference } from '@/features/cinematic';

const SLUG = 'ntaym-2026';

const render = (locale: 'he' | 'en') => {
  const descriptor = buildConferenceDescriptor(
    { ...fallbackConference(locale), slug: SLUG },
    locale,
  );
  const markup = renderToString(
    <ExperienceStage experience={descriptor} locale={locale} viewer={null} />,
  );
  return { descriptor, markup };
};

/* Every href on the page. */
const hrefs = (markup: string): string[] =>
  [...markup.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? '');

/* The programme's own addresses, whichever form they take. */
const programmeLinks = (markup: string): string[] =>
  hrefs(markup).filter((href) => /\/agenda\b|\/program\b|events\/program/.test(href));

/* Every scene's own programme destination, as the descriptor hands it out. */
const programHrefs = (descriptor: ReturnType<typeof render>['descriptor']): string[] =>
  descriptor.scenes
    .map((scene) => (scene.content as { programHref?: string } | undefined)?.programHref)
    .filter((href): href is string => typeof href === 'string');

describe('the conference sections lead to the agenda', () => {
  for (const locale of ['he', 'en'] as const) {
    it(`hands every section the ${locale === 'he' ? 'Hebrew' : 'English'} agenda`, () => {
      const { descriptor } = render(locale);
      const sections = programHrefs(descriptor);
      /* The arrival, the featured sessions, the programme and the closing. */
      expect(sections.length).toBeGreaterThanOrEqual(4);
      for (const href of sections) {
        expect(href).toBe(`/${locale}/events/${SLUG}/agenda`);
      }
    });

    it(`draws only agenda links for the programme, in ${locale === 'he' ? 'Hebrew' : 'English'}`, () => {
      const links = programmeLinks(render(locale).markup);
      expect(links.length, 'the sections carried no programme link at all').toBeGreaterThan(0);
      for (const href of links) {
        /* The agenda itself, or one activity opened inside it. */
        expect(href, href).toMatch(new RegExp(`^/${locale}/events/${SLUG}/agenda(\\?activity=[^"]+)?$`));
      }
    });

    it(`never sends a ${locale === 'he' ? 'Hebrew' : 'English'} reader to the old address or to WordPress`, () => {
      const all = hrefs(render(locale).markup);
      expect(all.filter((href) => /\/events\/[^/]+\/program\b/.test(href))).toEqual([]);
      expect(all.filter((href) => href.includes('/events/program/'))).toEqual([]);
      expect(all.filter((href) => href.includes('%D7%AA%D7%95%D7%9B%D7%A0%D7%99%D7%AA'))).toEqual([]);
    });
  }
});

/*
 * The repository-wide half. A link is a string before it is markup, so
 * the source is searched as well: no participant-facing file may build
 * the old platform address or name the WordPress listing.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = posix.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const read = (path: string): string => readFileSync(path, 'utf8');

/* The Studio is a different tree under /studio, which the edge does not claim. */
const PARTICIPANT_SOURCE = walk('src').filter(
  (file) => !file.startsWith('src/app/(studio)/') && !file.startsWith('src/features/studio/'),
);

describe('no participant-facing source names a programme it should not', () => {
  it('builds no /events/{slug}/program address', () => {
    const offenders = PARTICIPANT_SOURCE.filter((file) =>
      /\/events\/(\$\{[^}]+\}|[a-z0-9-]+)\/program\b/.test(read(file)),
    );
    expect(offenders).toEqual([]);
  });

  it('writes the WordPress listing only in the one table of WordPress addresses', () => {
    const offenders = PARTICIPANT_SOURCE.filter(
      (file) => file !== 'src/config/wordpress.ts' && read(file).includes('/events/program/'),
    );
    expect(offenders).toEqual([]);
  });
});

describe('what is not the participant’s programme stays where it is', () => {
  it('keeps the WordPress listing recorded as WordPress’s', () => {
    const table = read('src/config/wordpress.ts');
    expect(table).toContain("en: '/events/program/'");
    expect(table).toContain("he: '/he/כנסים/תוכנית/'");
  });

  it('keeps the Studio’s own programme editor at its own address', () => {
    expect(read('src/features/studio/constants/workspace.ts')).toContain(
      "{ id: 'program', segment: 'program'",
    );
    expect(statSync('src/app/(studio)/studio/(classic)/events/[slug]/program').isDirectory()).toBe(true);
  });

  it('keeps the public programme API at its own address', () => {
    expect(
      statSync('src/app/(frontend)/api/public/conferences/[slug]/program/route.ts').isFile(),
    ).toBe(true);
  });
});
