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
  `img-src 'self' blob: data: https://i.pravatar.cc https://picsum.photos${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self'${mediaOrigin ? ` ${mediaOrigin}` : ''}${isProduction ? '' : ' ws: wss:'}`,
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

/*
 * The camera is needed by the QR scanners (participant badge scan and
 * the Studio check-in desk); every other powerful feature is denied.
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
  { key: 'X-Frame-Options', value: 'DENY' },
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
  images: {
    formats: ['image/avif', 'image/webp'],
    /*
     * Configured media storage, plus the demo fixture hosts that five
     * services still fall back to when CMS content carries no photograph
     * (cinematic-service, opening-service, platform-lounge and the two
     * demo constant files). Removing these hosts requires deciding what
     * a portrait without a photograph should render instead — a product
     * decision, tracked separately. Until then they are the reason a
     * real event can still show a fabricated face.
     */
    remotePatterns: [
      ...(mediaOrigin
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(mediaOrigin).hostname,
            },
          ]
        : []),
      { protocol: 'https' as const, hostname: 'i.pravatar.cc' },
      { protocol: 'https' as const, hostname: 'picsum.photos' },
    ],
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
