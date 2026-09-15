import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isProduction = process.env.NODE_ENV === 'production';

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
     */
    serverActions: { bodySizeLimit: '200mb' },
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
