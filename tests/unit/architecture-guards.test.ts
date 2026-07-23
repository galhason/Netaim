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

const COMPONENT_IMPORT = /from\s+'@\/features\/[^']+\/components\//;
const TYPE_CONDITION = /\.type\s*(?:===|!==)/;

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
      (file) => TYPE_CONDITION.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
