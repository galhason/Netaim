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

/*
 * A film belongs wherever a photograph does.
 *
 * The first pass put video in the hero and nowhere else, because each
 * section drew a photograph and only a photograph. Adding a second
 * field beside every image would have meant a new column, a new picker
 * and a new decision per section; instead one field takes either kind
 * and the library says which it got. These cases hold that seam: the
 * adapter must report both, and the shared frame must draw both.
 */
describe('every section takes either kind of file', () => {
  it('reports the kind from one field', () => {
    const helper = readFileSync(
      'src/infrastructure/payload/payload-media.ts',
      'utf8',
    );
    expect(helper.includes('export const sceneMedia')).toBe(true);
    expect(
      helper.includes("media.mimeType?.startsWith('video/')"),
      'the field cannot know; the library does',
    ).toBe(true);
  });

  it('uses that seam in every conference section', () => {
    const adapter = readFileSync(
      'src/infrastructure/payload/payload-public-events.ts',
      'utf8',
    );
    for (const section of ['story', 'quote', 'venue', 'closing']) {
      expect(
        adapter.includes(`...sceneMedia(opening?.${section}?.image)`),
        `${section} still reads the still only`,
      ).toBe(true);
    }
    expect(adapter.includes('...sceneMedia(moment.image)')).toBe(true);
  });

  it('draws a film in the frame the sections share', () => {
    const frame = readFileSync(
      'src/shared/components/parallax-image.tsx',
      'utf8',
    );
    expect(frame.includes('BackgroundVideo')).toBe(true);
    expect(
      frame.includes('{src ? ('),
      'a film without a poster has no still to draw',
    ).toBe(true);
  });

  it('keeps a moment aligned with its caption', () => {
    const adapter = readFileSync(
      'src/infrastructure/payload/payload-opening-page.ts',
      'utf8',
    );
    expect(
      adapter.includes('.filter((media) => media.imageUrl || media.videoUrl)'),
      'filtering on the still alone drops a poster-less film and shifts every caption',
    ).toBe(true);
  });
});

describe('a file can be added from the field that needs it', () => {
  const picker = readFileSync(
    'src/features/studio/components/console/console-fields.tsx',
    'utf8',
  );

  it('uploads without leaving the page', () => {
    expect(picker.includes("fetch('/studio/media/upload'")).toBe(true);
  });

  it('uploads through a route handler, not a Server Action', () => {
    expect(
      picker.includes('uploadToLibraryAction'),
      'an action refreshes the route, which remounts the picker and drops the selection',
    ).toBe(false);
  });

  it('selects what was just uploaded', () => {
    expect(picker.includes('setChosen(outcome.media.id)')).toBe(true);
  });

  it('offers only what the field can hold', () => {
    expect(picker.includes("ACCEPT[kind ?? 'either']")).toBe(true);
  });

  it('says why a file was refused', () => {
    expect(picker.includes('setRefusal(')).toBe(true);
  });
});
