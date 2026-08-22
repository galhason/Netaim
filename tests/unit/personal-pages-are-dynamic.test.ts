import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * A page whose answer depends on who is asking must never be
 * prerendered or shared between visitors. Next will usually infer this
 * from a `cookies()` call, but inference is a poor guard for a privacy
 * property: it disappears the moment a refactor moves the read behind a
 * helper, or a cached wrapper swallows it, and the failure mode is one
 * guest being served another guest's page with nothing announcing it.
 *
 * So the declaration is required, and this test is what requires it.
 */
const APP = 'src/app';

/*
 * Functions whose result depends on the visitor. A page that calls one
 * of these is personal, whatever else it does.
 */
const VISITOR_FUNCTIONS = [
  'currentParticipant',
  'getMyAccount',
  'getMyDetails',
  'getMyRegistration',
  'getStudioAccess',
  'getStudioCreator',
  'getStudioLocale',
  'requireCapability',
  'getAttendeeExperience',
  'myConnections',
  'myUnreadByConnection',
  'myConnectBadgeToken',
  'listMyAnnouncements',
  'myActivities',
  'myMeetings',
  'myWorkshops',
  'listMyWorkshops',
  'myEntrancePass',
  'myLocalePreference',
];

/*
 * Layouts count. A layout that resolves the visitor makes every page
 * beneath it personal, and this check originally walked only pages —
 * which is how the site layout came to read the visitor over routes
 * that were still being served with a one-hour revalidate.
 */
const walk = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        return statSync(full).isDirectory()
          ? walk(full)
          : /^(page|route|layout)\.tsx?$/.test(entry)
            ? [full]
            : [];
      })
    : [];

const declaresDynamic = (source: string): boolean =>
  /export const dynamic\s*=\s*'force-dynamic'/.test(source);

/* Which visitor functions this file both imports and calls. */
const visitorReasons = (source: string): string[] => {
  const reasons: string[] = [];
  if (/\bcookies\(\)/.test(source)) {
    reasons.push('cookies()');
  }
  const imported = new Set(
    [...source.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from/g)].flatMap(
      (match) => {
        const names = match[1];
        return names === undefined
          ? []
          : names
              .split(',')
              .map((name) => name.trim().split(/\s+as\s+/).pop() ?? '')
              .filter(Boolean);
      },
    ),
  );
  for (const fn of VISITOR_FUNCTIONS) {
    if (imported.has(fn) && new RegExp(`\\b${fn}\\s*\\(`).test(source)) {
      reasons.push(`${fn}()`);
    }
  }
  return reasons;
};

describe('personal pages are never prerendered', () => {
  const pages = walk(APP);

  it('finds the routes to check', () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it('includes layouts, not only pages', () => {
    expect(pages.some((file) => file.endsWith('layout.tsx'))).toBe(true);
  });

  it('requires force-dynamic wherever the answer depends on the visitor', () => {
    const offenders = pages
      .map((file) => ({ file, reasons: visitorReasons(readFileSync(file, 'utf8')) }))
      .filter(({ reasons }) => reasons.length > 0)
      .filter(({ file }) => !declaresDynamic(readFileSync(file, 'utf8')))
      .map(({ file, reasons }) => `${file} — reads ${reasons.join(', ')}`);

    expect(
      offenders,
      'these pages depend on who is asking but do not declare `export const dynamic = "force-dynamic"`',
    ).toEqual([]);
  });

  it('has a meaningful number of personal pages, so the check is not vacuous', () => {
    /*
     * If this ever drops to nothing, the detector has stopped matching
     * rather than the platform having stopped being personal.
     */
    const personal = pages.filter(
      (file) => visitorReasons(readFileSync(file, 'utf8')).length > 0,
    );
    expect(personal.length).toBeGreaterThan(30);
  });

  /*
   * The declaration is a promise; this is the receipt.
   *
   * Report 16 claimed the build would list these routes as `ƒ`. On
   * 2026-08-20 it listed them as `●`, and the only thing standing
   * between that observation and a privacy incident was someone
   * remembering that the marker describes `generateStaticParams` rather
   * than a cached response. Reasoning is not a safeguard, so the
   * artifact is checked instead.
   *
   * **What counts as evidence, and what does not.** The first version of
   * this check failed on `/he` and `/en`, because it treated a key in
   * `prerender-manifest.json` as a prerendered page. It is not: that
   * build emitted *zero* response bodies — no `.html` and no `.rsc`
   * anywhere under `.next/server/app` — and the manifest entry for `/he`
   * was the empty object `{}`, carrying no `dataRoute` and no
   * `initialRevalidateSeconds`. It is the enumeration `generateStaticParams`
   * produced for the locale segment, nothing more.
   *
   * So the test asks the question that actually matters: is there a
   * stored body a second visitor could be served, or a manifest entry
   * that describes a cached one. A bare enumerated path is neither.
   */
  it('stores no shared response for any personal route', () => {
    const NEXT = '.next';
    const manifestPath = path.join(NEXT, 'prerender-manifest.json');
    const appDir = path.join(NEXT, 'server', 'app');
    if (!existsSync(manifestPath) && !existsSync(appDir)) {
      /*
       * The unit suite runs before `build` in `npm run gates`, so on a
       * clean tree there is nothing to inspect yet. The check is real on
       * the second run and in CI, where a build always precedes it.
       */
      return;
    }

    const routeOf = (file: string): string =>
      file
        .replace(/\\/g, '/')
        .replace(/^src\/app/, '')
        .replace(/\/(page|route)\.tsx?$/, '')
        .replace(/\/\([^/]+\)/g, '') || '/';

    /* `/he/me` and `/[locale]/me` are the same route, named twice. */
    const normalize = (route: string): string =>
      route.replace(/^\/(he|en)(?=\/|$)/, '/[locale]');

    const personal = new Set(
      pages
        .filter((file) => visitorReasons(readFileSync(file, 'utf8')).length > 0)
        .filter((file) => !file.endsWith('layout.tsx'))
        .map(routeOf),
    );

    expect(
      personal.size,
      'the detector found no personal routes, so this check would pass over an empty set',
    ).toBeGreaterThan(0);

    const shared: string[] = [];

    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        routes?: Record<string, Record<string, unknown>>;
      };
      /*
       * An entry describes a cached response only when it says where the
       * response lives or how long it lives for. `{}` is an enumerated
       * path and carries nothing.
       */
      shared.push(
        ...Object.entries(manifest.routes ?? {})
          .filter(
            ([, entry]) =>
              entry?.dataRoute != null ||
              entry?.initialRevalidateSeconds != null,
          )
          .map(([route]) => route),
      );
    }

    /* A body on disk is the unambiguous case: a file, served to whoever asks. */
    if (existsSync(appDir)) {
      const base = appDir.replace(/\\/g, '/');
      const bodies = (dir: string): string[] =>
        readdirSync(dir).flatMap((entry) => {
          const full = path.join(dir, entry);
          return statSync(full).isDirectory()
            ? bodies(full)
            : /\.(html|rsc)$/.test(entry)
              ? [
                  full
                    .replace(/\\/g, '/')
                    .replace(base, '')
                    .replace(/\.(html|rsc)$/, ''),
                ]
              : [];
        });
      shared.push(...bodies(appDir));
    }

    const offenders = [
      ...new Set(shared.filter((route) => personal.has(normalize(route)))),
    ];

    expect(
      offenders,
      'these routes depend on who is asking but a single response was stored for all of them',
    ).toEqual([]);
  });

  it('does not cache anything that reads the visitor', () => {
    /*
     * The other half of the same property: `cachedContent` shares one
     * result across everyone, so a cached reader that resolves the
     * visitor would hand one person's data to the next.
     */
    const walkAll = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        return statSync(full).isDirectory()
          ? walkAll(full)
          : /\.tsx?$/.test(entry)
            ? [full]
            : [];
      });

    const offenders = walkAll('src')
      .map((file) => ({ file, text: readFileSync(file, 'utf8') }))
      .filter(({ text }) => text.includes('cachedContent('))
      .filter(({ text }) =>
        /cookies\(\)|currentParticipant|requireActor|getActorContext/.test(text),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
