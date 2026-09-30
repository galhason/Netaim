/*
 * What a participant may send to the gallery.
 *
 * Photographs only, in the three formats every phone and browser writes
 * and every browser draws. SVG is refused on purpose — it is a document
 * that can carry script, not a picture — and so is anything the Studio
 * accepts beyond these. The ceiling is a generous phone photo; the
 * platform then re-encodes it at a bounded size, so the stored file is
 * smaller still.
 */
export const SUBMISSION_MAX_BYTES = 8 * 1024 * 1024;
export const SUBMISSION_MAX_MB = SUBMISSION_MAX_BYTES / (1024 * 1024);
export const SUBMISSION_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const SUBMISSION_ACCEPT = SUBMISSION_TYPES.join(',');
export const SUBMISSION_CAPTION_MAX = 280;
export const SUBMISSION_CREDIT_MAX = 80;
