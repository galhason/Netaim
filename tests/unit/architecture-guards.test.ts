import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Constitution v2 enforcement (Phase 2 DoD): the render layer composes
 * through the Registry alone. No public surface imports a scene
 * component directly, and no render-layer file branches on an
 * experience type. These guards fail the suite the moment either law
 * is broken.
 */
const FRONTEND_DIR = 'src/app/(frontend)';

const RENDER_LAYER_DIRS = [
  'src/experience-runtime',
  'src/scenes',
  FRONTEND_DIR,
  'src/features/opening/components',
  'src/features/cinematic/components',
];

/*
 * Reaching past a feature's boundary into one of its component files.
 * The trailing slash matters and is deliberate: a feature may publish a
 * client-safe entry at `@/features/x/components`, which a client
 * component must use when the feature's main barrel re-exports services
 * that reach the database. Importing `.../components/session-cover`
 * remains a violation; importing `.../components` does not.
 */
const COMPONENT_IMPORT = /from\s+'@\/features\/[^']+\/components\//;

/*
 * The law is that the render layer composes through the Registry and
 * never branches on a *scene or experience* type. The first version of
 * this pattern was a bare `.type ===`, which also caught an agenda
 * screen filtering its own sessions by `talk | workshop | break` —
 * domain data, not a composition decision.
 *
 * Two patterns replace it. The first catches a branch on something
 * named like a scene; the second catches a branch on a scene-type
 * literal however the variable is spelled, since `s.type !== 'nav'`
 * is the same violation as `scene.type !== 'nav'`.
 */
const SCENE_SUBJECT =
  /\b(?:scene|experience|descriptor|composition|instance|definition)\w*\.type\s*(?:===|!==)/i;

/* The registered catalog. Session types (talk, workshop, break…) are
 * deliberately absent: they are data an agenda is entitled to filter. */
const SCENE_TYPE_LITERALS = [
  'hero', 'story', 'content', 'agenda', 'session-list', 'speaker-grid',
  'venue', 'sponsor-grid', 'faq', 'registration-cta', 'nav', 'footer',
  'arrival', 'quote', 'moments', 'featuredSessions', 'countdown', 'facts',
  'sponsors', 'actIntro', 'speakers', 'program', 'closing', 'featuredHero',
  'portalWall',
];

const SCENE_LITERAL = new RegExp(
  `\\.type\\s*(?:===|!==)\\s*['"](?:${SCENE_TYPE_LITERALS.join('|')})['"]`,
);

const branchesOnSceneType = (source: string): boolean =>
  SCENE_SUBJECT.test(source) || SCENE_LITERAL.test(source);

const walk = (dir: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(?:ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
};

describe('constitution guards', () => {
  it('keeps public surfaces free of direct scene-component imports', () => {
    const offenders = walk(FRONTEND_DIR).filter((file) =>
      COMPONENT_IMPORT.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps scene components owned by their feature and the catalog', () => {
    const offenders = walk('src')
      .filter(
        (file) =>
          !file.startsWith('src/features/') && !file.startsWith('src/scenes/'),
      )
      .filter((file) => COMPONENT_IMPORT.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps the render layer free of experience-type conditions', () => {
    const offenders = RENDER_LAYER_DIRS.flatMap((dir) => walk(dir)).filter(
      (file) => branchesOnSceneType(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  /*
   * A guard that was narrowed to stop a false positive has to prove it
   * still bites, or narrowing it is just a way of switching it off.
   */
  it('still catches the branching the constitution forbids', () => {
    const forbidden = [
      "if (scene.type === 'hero') {",
      "scenes.filter((s) => s.type !== 'nav')",
      "experience.type === 'conference'",
      'descriptor.type === HOMEPAGE',
      "sceneInstance.type === 'venue'",
    ];
    for (const line of forbidden) {
      expect(branchesOnSceneType(line), `missed: ${line}`).toBe(true);
    }
  });

  it('leaves domain data alone', () => {
    /* An agenda filtering its own sessions is not a composition choice. */
    const allowed = [
      "activities.filter((a) => a.type === filter)",
      "a.type !== 'break'",
      "candidate.type !== 'break'",
      "registration.type === 'workshop'",
    ];
    for (const line of allowed) {
      expect(branchesOnSceneType(line), `false positive: ${line}`).toBe(false);
    }
  });
});
