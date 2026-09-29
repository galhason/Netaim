import localFont from 'next/font/local';

/*
 * The one face on this site that is not a face.
 *
 * A flag emoji is two regional indicator letters, and Windows ships no
 * glyph for the pair — Chrome and Firefox there draw "IL" instead of a
 * flag, which looks like a bug rather than a fallback. macOS, iOS and
 * Android all have the glyphs; Windows, which is most of the guests
 * filling in this form, does not.
 *
 * So the flags are carried rather than borrowed. Twemoji Country Flags
 * is 78 KB and holds nothing but flags — no letters, no punctuation —
 * so it can never be what a word is set in: it is placed first in the
 * `.nt-flag` stack and every other character falls straight through it
 * to the body face. It is not preloaded; a flag arriving a moment
 * after the country's name is not worth a blocking request on every
 * page that has none.
 *
 * Twemoji Country Flags is MIT (TalkJS); the artwork is Twemoji,
 * CC-BY 4.0 (see TwemojiCountryFlags.LICENSE.md beside the file).
 */
export const flagFont = localFont({
  src: '../assets/fonts/TwemojiCountryFlags.woff2',
  display: 'swap',
  variable: '--font-flags',
  preload: false,
  fallback: ['sans-serif'],
});
