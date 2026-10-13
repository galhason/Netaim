import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  centred,
  clamp,
  coverScale,
  isCroppable,
  outputSize,
  sourceRect,
  zoomAbout,
} from '@/shared/utils/crop-image';

/*
 * A photo someone sends is rarely the photo the page needs. Before a
 * portrait is kept — a participant's own, a speaker's in the Studio —
 * it is shown in a square frame, slid and zoomed, and only what the
 * frame holds is kept. The arithmetic is pure, so it is tested here
 * without a browser.
 */
const landscape = { width: 3000, height: 2000 };
const frame = { width: 320, height: 320 };

describe('a photo cut to the frame', () => {
  it('starts covering the frame, centred, and never shows the void beyond an edge', () => {
    expect(coverScale(landscape, frame)).toBeCloseTo(0.16);
    const start = centred(landscape, frame, coverScale(landscape, frame));
    expect(start.x).toBeCloseTo((320 - 480) / 2);
    expect(start.y).toBeCloseTo(0);
    /* Dragged too far right, it stops at the edge; shrunk below cover, it stays at cover. */
    const dragged = clamp(landscape, frame, { ...start, x: 50, scale: 0.1 });
    expect(dragged.scale).toBeCloseTo(0.16);
    expect(dragged.x).toBe(0);
    expect(clamp(landscape, frame, { ...start, x: -1000 }).x).toBeCloseTo(320 - 480);
  });

  it('zooms about the point under the finger', () => {
    const start = centred(landscape, frame, coverScale(landscape, frame));
    const at = { x: 100, y: 200 };
    const before = { x: (at.x - start.x) / start.scale, y: (at.y - start.y) / start.scale };
    const after = zoomAbout(landscape, frame, start, start.scale * 2, at);
    expect((at.x - after.x) / after.scale).toBeCloseTo(before.x);
    expect((at.y - after.y) / after.scale).toBeCloseTo(before.y);
  });

  it('keeps the frame’s rectangle of the picture, scaled to what a screen will show', () => {
    const start = centred(landscape, frame, coverScale(landscape, frame));
    const source = sourceRect(frame, start);
    expect(source.sx).toBeCloseTo(500);
    expect(source.sy).toBeCloseTo(0);
    expect(source.sw).toBeCloseTo(2000);
    expect(source.sh).toBeCloseTo(2000);
    expect(outputSize(frame, source, 1200)).toEqual({ width: 1200, height: 1200 });
    /* A small picture is not enlarged. */
    expect(outputSize(frame, { sx: 0, sy: 0, sw: 500, sh: 500 }, 1200)).toEqual({ width: 500, height: 500 });
    /* A wide frame keeps its shape. */
    expect(outputSize({ width: 320, height: 180 }, source, 1200)).toEqual({ width: 1200, height: 675 });
  });

  it('offers the crop for pictures a browser can draw, and lets a vector through untouched', () => {
    expect(isCroppable(new File([''], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isCroppable(new File([''], 'a.svg', { type: 'image/svg+xml' }))).toBe(false);
    expect(isCroppable(new File([''], 'a.mp4', { type: 'video/mp4' }))).toBe(false);
  });

  it('stands before the photo in the profile and before a speaker’s photo in the Studio', () => {
    const profile = readFileSync('src/app/(frontend)/[locale]/me/profile/photo-form.tsx', 'utf8');
    expect(profile).toContain('<ImageCropper');
    expect(profile).toContain('aspect={1}');
    expect(readFileSync('src/app/(frontend)/[locale]/me/profile/page.tsx', 'utf8')).toContain('<ProfilePhotoForm');
    const speakers = readFileSync('src/app/(studio)/studio/(console)/conference/[slug]/speakers/page.tsx', 'utf8');
    expect(speakers.match(/crop=\{1\}/g)).toHaveLength(2);
    /* The dialog is drawn at the body, where no animated card can cut it off. */
    expect(readFileSync('src/shared/components/image-cropper.tsx', 'utf8')).toContain('document.body');
  });
});
