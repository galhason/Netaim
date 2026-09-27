/*
 * Where this site lives, as the browser sees it — one value, read in
 * one place, and every absolute address or root-relative path the
 * application writes is derived from it.
 *
 *   NEXT_PUBLIC_SERVER_URL
 *
 *   production   https://netaimolami.org        → origin only, base path ''
 *   local dev    http://localhost/netaim        → origin http://localhost,
 *                                                 base path /netaim
 *
 * The base path is the shared-domain arrangement rehearsed locally:
 * WordPress owns http://localhost/netaim, Apache forwards the platform's
 * path families to the Next.js process on :3000, and the browser never
 * sees that port. Next itself is told the same base path (next.config
 * reads this URL too), so its links, chunks and metadata routes carry
 * it — but a plain <img>, an <iframe>, a fetch() from the client, a
 * cookie path or a Location header does not, and those go through
 * withBasePath() below. In production the base path is empty and every
 * one of these is a no-op.
 *
 * NEXT_PUBLIC_ so the same value is inlined into client bundles: the
 * browser and the server must agree on it.
 */
const configured = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').trim();

const parse = (): { origin: string; basePath: string } => {
  try {
    const url = new URL(configured);
    return {
      origin: url.origin,
      basePath: url.pathname.replace(/\/+$/, ''),
    };
  } catch {
    return { origin: '', basePath: '' };
  }
};

const parsed = parse();

/** `http://localhost` locally, `https://netaimolami.org` deployed; '' when unset. */
export const SITE_ORIGIN: string = parsed.origin;

/** '' in production; `/netaim` under the local shared-domain rehearsal. */
export const SITE_BASE_PATH: string = parsed.basePath;

/**
 * A root-relative path as the browser must request it. Absolute URLs,
 * protocol-relative URLs and paths already under the base are returned
 * as they are, so it is safe to apply twice.
 */
export const withBasePath = (path: string): string => {
  if (!SITE_BASE_PATH || !path.startsWith('/') || path.startsWith('//')) {
    return path;
  }
  if (path === SITE_BASE_PATH || path.startsWith(`${SITE_BASE_PATH}/`)) {
    return path;
  }
  return `${SITE_BASE_PATH}${path}`;
};

/**
 * The full public address of a root-relative path — for a Location
 * header, an email, anything that leaves the site and cannot resolve a
 * relative path. '' + path when no address is configured, which callers
 * treat as "do not emit an absolute link".
 */
export const siteUrl = (path: string): string =>
  `${SITE_ORIGIN}${withBasePath(path)}`;
