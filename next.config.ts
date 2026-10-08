import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isProduction = process.env.NODE_ENV === 'production';

/*
 * The base path is read off NEXT_PUBLIC_SERVER_URL rather than set on
 * its own, so there is exactly one place the site's address lives (see
 * src/config/site.ts). Deployed at the root of a domain it is empty and
 * Next behaves exactly as before; under the local shared-domain
 * rehearsal (http://localhost/netaim, Apache in front) it is /netaim,
 * and Next prefixes its own links, chunks and metadata routes with it.
 */
const siteUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? '');
  } catch {
    return null;
  }
})();

const basePath = siteUrl ? siteUrl.pathname.replace(/\/+$/, '') : '';

/*
 * The browser-facing hosts a Server Action may be posted from. The
 * public site's own host comes off NEXT_PUBLIC_SERVER_URL, so moving
 * the site to a new domain is an env change and a rebuild, not a code
 * edit; the earlier addresses stay named so a window where both serve
 * still takes every form. This list once held only the staging domain,
 * and every form posted from the new public domain was refused.
 */
const actionOrigins = [
  ...new Set(
    [siteUrl?.host ?? '', 'netaimolami.org', 'www.netaimolami.org', 'netaim26.org', 'netaimtest.info'].filter(
      Boolean,
    ),
  ),
];

/*
 * Media may be served from an S3-compatible bucket when one is
 * configured; the connect/image sources must allow it, and nothing else.
 */
const mediaOrigin = process.env.S3_ENDPOINT ?? '';

/*
 * Content Security Policy. `unsafe-inline` on scripts is required by
 * Next's hydration bootstrap and by the Payload admin bundle; the rest
 * is closed. `unsafe-eval` is allowed in development only (React Refresh
 * needs it) and never in production.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self'${mediaOrigin ? ` ${mediaOrigin}` : ''}${isProduction ? '' : ' ws: wss:'}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  /*
   * 'self', not 'none': the Studio's canvas is an iframe of this very
   * site — the live Runtime, framed, rather than a screenshot or a
   * second implementation of it. 'none' forbids that too, so the canvas
   * came up blank and the workspace lost the thing it is built around.
   * 'self' still refuses every other origin, which is the whole point
   * of the header; nothing outside this site can frame a page.
   */
  "frame-ancestors 'self'",
  "worker-src 'self' blob:",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

/*
 * Every powerful feature is denied. The camera stays at 'self' for a
 * future capture surface; the QR scanning it was opened for has been
 * withdrawn.
 */
const permissionsPolicy = [
  'camera=(self)',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  /* The same rule for browsers that predate frame-ancestors. */
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: permissionsPolicy },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    /*
     * A Server Action's body defaults to one megabyte, which is smaller
     * than most photographs and far smaller than any film. The Studio
     * uploads through actions, so this is the real ceiling — it is kept
     * equal to MAX_VIDEO_BYTES in the upload action and to Nginx's
     * client_max_body_size, because the smallest of the three is what
     * an operator actually meets.
     *
     * Behind the Cloudflare Worker/Tunnel the request reaches Next with
     * `x-forwarded-host` set to the subdomain the tunnel serves while the
     * browser's `origin` is the public site itself. Next compares the
     * two and refuses every Server Action ("Invalid Server Actions
     * request.") unless the origin is named here. Host only, no scheme.
     */
    serverActions: {
      bodySizeLimit: '200mb',
      allowedOrigins: actionOrigins,
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    /*
     * Configured media storage only. The stock-photo fixture hosts were
     * removed in the production compliance pass: scenery now falls back
     * to a local frame and a portrait without a photograph renders no
     * portrait at all, so no real name can appear beside an invented
     * face and no page reaches a third-party image host.
     */
    remotePatterns: mediaOrigin
      ? [
          {
            protocol: 'https' as const,
            hostname: new URL(mediaOrigin).hostname,
          },
        ]
      : [],
  },
  headers: () =>
    Promise.resolve([
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]),
};

export default withPayload(withNextIntl(nextConfig));
