import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The nav says who is looking. That makes it the one scene whose output
 * depends on the visitor, and the experience descriptor it is built
 * from is cached and shared across everyone — so a name placed on the
 * descriptor would be handed to the next person to load the page.
 *
 * The viewer is therefore resolved inside the render, per request. These
 * cases fail if that ever changes.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : /\.tsx?$/.test(entry)
        ? [full]
        : [];
  });

const read = (file: string): string => readFileSync(file, 'utf8');

describe('the nav viewer never enters cached content', () => {
  it('keeps the viewer off the scene content types', () => {
    /*
     * `ConferenceNavContent` is what the descriptor carries. A viewer,
     * name or account field on it means the identity is being cached.
     */
    const scenes = read('src/scenes/conference-scenes.tsx');
    const contentType = scenes.match(
      /interface ConferenceNavContent \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(contentType, 'ConferenceNavContent not found').toBeDefined();
    for (const forbidden of ['viewer', 'account', 'participant', 'signedIn']) {
      expect(
        contentType?.includes(forbidden),
        `ConferenceNavContent carries "${forbidden}" — that would be cached`,
      ).toBe(false);
    }
  });

  it('takes the viewer as render context, beside locale', () => {
    const scenes = read('src/scenes/conference-scenes.tsx');
    expect(scenes).toMatch(/const NavRenderer = \(\{[\s\S]*?viewer,/);
  });

  it('keeps scene renderers synchronous', () => {
    /*
     * Making one scene async couples the whole scene system to an async
     * renderer — the locked snapshots use `renderToString`, which
     * cannot render a component that suspends, and they caught exactly
     * this the first time the viewer was read inside the scene.
     */
    const scenes = read('src/scenes/conference-scenes.tsx');
    expect(scenes).not.toMatch(/const \w+Renderer = async/);
    expect(scenes).not.toContain('currentParticipant');
  });

  it('every stage renders with a viewer decided by the page', () => {
    const stages = walk('src/app').filter((file) =>
      /<ExperienceStage/.test(read(file)),
    );
    expect(stages.length).toBeGreaterThanOrEqual(3);
    const missing = stages
      .filter((file) => !/viewer=\{/.test(read(file)))
      /* The Studio preview renders as the creator, not as a guest. */
      .filter((file) => !file.includes('preview'));
    expect(missing).toEqual([]);
  });

  it('never puts the viewer into a cached descriptor builder', () => {
    /*
     * The descriptor builders compose what gets cached. None of them
     * may resolve the visitor.
     */
    const builders = walk('src').filter((file) =>
      /descriptor|composition/i.test(path.basename(file)),
    );
    expect(builders.length).toBeGreaterThan(0);

    const offenders = builders.filter((file) =>
      /currentParticipant|getMyAccount|viewer\s*[:=]/.test(read(file)),
    );
    expect(
      offenders,
      'a descriptor builder resolves the visitor — its output is cached',
    ).toEqual([]);
  });

  it('shows one state or the other, never both', () => {
    /*
     * A signed-in guest must not still be asked to register, and a
     * stranger must not see a name. The nav branches once on `viewer`.
     */
    const nav = read('src/features/cinematic/components/cinematic-nav.tsx');
    expect(nav).toMatch(/\{viewer \?/);
    expect(nav).toContain('CINEMATIC_UI.signIn[locale]');
    expect(nav).toContain('CINEMATIC_UI.registerShort[locale]');
  });

  it('every place that renders the nav decides the viewer', () => {
    /*
     * A call site that omits `viewer` silently shows "signed out" to a
     * signed-in guest — which is precisely the bug this replaced.
     */
    const callSites = walk('src').filter(
      (file) =>
        /<CinematicNav\b/.test(read(file)) &&
        !file.endsWith('cinematic-nav.tsx'),
    );
    expect(callSites.length).toBeGreaterThanOrEqual(3);

    const missing = callSites.filter((file) => !/viewer=\{/.test(read(file)));
    expect(missing, 'these render the nav without deciding the viewer').toEqual(
      [],
    );
  });
});
