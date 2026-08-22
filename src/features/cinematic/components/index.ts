/*
 * The client-safe surface of this feature.
 *
 * `@/features/cinematic` is the server surface: it re-exports services
 * that reach the database and, through them, `next/headers`. A client
 * component importing from it drags all of that into the browser bundle
 * and the build fails. These pieces are pure presentation, so they get
 * their own entry — a client component imports from here, and still
 * never reaches past a feature's boundary into an individual file.
 */
export { Glyph } from './icons';
export { default as SessionCover } from './session-cover';
