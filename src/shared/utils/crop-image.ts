/*
 * The arithmetic of a crop, kept apart from the screen that drives it.
 *
 * A picture is shown inside a frame; the person slides it about and
 * zooms it, and what the frame shows is what is kept. Everything here
 * is in two coordinate spaces — the frame's pixels and the picture's
 * own — and the one question that matters is: which rectangle of the
 * picture is under the frame right now? Pure, so a test can ask it
 * without a browser.
 */

export interface Size {
  width: number;
  height: number;
}

/* Where the picture sits in the frame: its scale, and its top-left corner in frame pixels. */
export interface Placement {
  scale: number;
  x: number;
  y: number;
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/* The smallest scale at which the picture still covers the whole frame. */
export const coverScale = (image: Size, frame: Size): number =>
  Math.max(frame.width / image.width, frame.height / image.height);

/* The picture centred in the frame at a scale. */
export const centred = (image: Size, frame: Size, scale: number): Placement => ({
  scale,
  x: (frame.width - image.width * scale) / 2,
  y: (frame.height - image.height * scale) / 2,
});

/*
 * A placement that leaves no gap: the picture may not be dragged so far
 * that the frame shows the void beyond its edge, and may not shrink
 * below covering it.
 */
export const clamp = (image: Size, frame: Size, place: Placement): Placement => {
  const scale = Math.max(place.scale, coverScale(image, frame));
  const w = image.width * scale;
  const h = image.height * scale;
  return {
    scale,
    x: Math.min(0, Math.max(frame.width - w, place.x)),
    y: Math.min(0, Math.max(frame.height - h, place.y)),
  };
};

/*
 * Zoom about a point of the frame — the cursor, or its centre — so the
 * spot under the finger stays under the finger.
 */
export const zoomAbout = (
  image: Size,
  frame: Size,
  place: Placement,
  scale: number,
  at: { x: number; y: number } = { x: frame.width / 2, y: frame.height / 2 },
): Placement => {
  const next = Math.max(scale, coverScale(image, frame));
  const ratio = next / place.scale;
  return clamp(image, frame, {
    scale: next,
    x: at.x - (at.x - place.x) * ratio,
    y: at.y - (at.y - place.y) * ratio,
  });
};

/* The rectangle of the picture the frame shows, in the picture's own pixels. */
export const sourceRect = (frame: Size, place: Placement): SourceRect => ({
  sx: -place.x / place.scale,
  sy: -place.y / place.scale,
  sw: frame.width / place.scale,
  sh: frame.height / place.scale,
});

/*
 * The size of the file that is kept: the frame's shape, no larger than
 * `longest` on its long side, and never larger than the pixels the
 * picture actually has under the frame — enlarging a small picture
 * adds nothing but bytes.
 */
export const outputSize = (frame: Size, source: SourceRect, longest: number): Size => {
  const ratio = frame.width / frame.height;
  const cap = Math.min(longest, Math.round(Math.max(source.sw, source.sh)));
  return ratio >= 1
    ? { width: cap, height: Math.round(cap / ratio) }
    : { width: Math.round(cap * ratio), height: cap };
};

/* Whether a file is a picture the crop can draw — not a vector, not a video. */
export const isCroppable = (file: File): boolean =>
  /^image\/(jpeg|png|webp|avif|gif|bmp|heic|heif)$/.test(file.type);
