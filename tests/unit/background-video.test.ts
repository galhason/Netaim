import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The rules a background film has to keep.
 *
 * Each of these is a way a hero video goes wrong on somebody else's
 * machine rather than on the one it was built on, and none of them is
 * visible in a screenshot: sound on arrival, iOS taking the video
 * fullscreen over the whole site, a black rectangle while the file
 * downloads, and motion shown to a person who asked their system for
 * less of it.
 */
const source = readFileSync(
  'src/shared/components/background-video.tsx',
  'utf8',
);

describe('the hero film', () => {
  it('never makes a sound', () => {
    expect(source.includes('muted')).toBe(true);
  });

  it('stays inside the page on iOS', () => {
    expect(source.includes('playsInline')).toBe(true);
  });

  it('loops rather than ending on a frozen frame', () => {
    expect(source.includes('loop')).toBe(true);
  });

  it('is absent entirely under reduced motion, not merely paused', () => {
    expect(source.includes('useReducedMotion')).toBe(true);
    expect(
      /if \(reduceMotion\) \{\s*return null;/.test(source),
      'reduced motion must render no video at all',
    ).toBe(true);
  });

  it('survives a browser that refuses to autoplay', () => {
    expect(
      source.includes('.catch('),
      'play() rejects on data savers and battery modes; the still must stay',
    ).toBe(true);
  });

  it('is decorative, so assistive technology skips it', () => {
    expect(source.includes('aria-hidden="true"')).toBe(true);
  });
});

/*
 * The three ceilings that decide whether an upload arrives: the action's
 * own check, the Server Action body limit, and Nginx. The smallest wins,
 * so they are kept equal — and a mismatch is invisible until someone
 * uploads a film and the page simply reloads.
 */
describe('the upload ceiling is one number', () => {
  it('matches between the action and the Server Action body limit', () => {
    const action = readFileSync(
      'src/app/(studio)/studio/(console)/actions.ts',
      'utf8',
    );
    const config = readFileSync('next.config.ts', 'utf8');
    expect(action.includes('const MAX_VIDEO_BYTES = 200 * 1024 * 1024')).toBe(
      true,
    );
    expect(config.includes("bodySizeLimit: '200mb'")).toBe(true);
  });

  it('tells the operator why a file was refused', () => {
    const action = readFileSync(
      'src/app/(studio)/studio/(console)/actions.ts',
      'utf8',
    );
    for (const reason of ['upload=missing', 'upload=type', 'upload=size']) {
      expect(action.includes(reason), `${reason} is not reported`).toBe(true);
    }
  });
});
