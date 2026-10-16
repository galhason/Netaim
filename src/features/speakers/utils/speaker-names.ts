/*
 * When are two speaker names the same person?
 *
 * Two answers, kept apart on purpose. `sameSpeakerName` is certain:
 * spacing, punctuation and pointing set aside, the letters are the same
 * ("אבי דיקשטיין." and "אבי דיקשטיין") — certain enough to reuse a card
 * instead of making a second one. `likelySameSpeaker` only suspects: it
 * also sets aside a title and anything in brackets ("ד״ר דמיטרי מריאסיס"
 * and "דמיטרי מריאסיס") — enough to ask a person, never enough to fold
 * two cards on its own. The migration that folded the first duplicates
 * applies the first rule, written out in its own file.
 */

const POINTING = /[֑-ׇ]/g;
const PUNCTUATION = /["'`״׳.,;:!?()[\]{}\-–—_/\\]/g;

export const sameSpeakerName = (name: string): string =>
  name
    .normalize('NFKC')
    .replace(POINTING, '')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/* Titles a name may carry or drop between two conferences, in both languages. */
const LEADING_TITLES =
  /^(?:(?:ד["״׳']?ר|דוקטור|פרופ(?:סור)?['׳]?|הרב(?:נית)?|עו["״׳']?ד|רו["״׳']?ח|מר|גב['׳]?|dr\.?|prof\.?|professor|rabbi|mr\.?|mrs\.?|ms\.?|adv\.?)\s+)+/iu;

export const likelySameSpeaker = (name: string): string =>
  sameSpeakerName(
    name
      .normalize('NFKC')
      .replace(POINTING, '')
      .replace(/\([^)]*\)/g, ' ')
      .trim()
      .replace(LEADING_TITLES, ''),
  );
