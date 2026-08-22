import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from '@/config/locales';
import {
  AccountGrants,
  AccountSessions,
  AuditLog,
  Events,
  Experiences,
  Media,
  NetworkingConnections,
  NetworkingChatMessages,
  NetworkingMeetings,
  NetworkingProfiles,
  Notifications,
  Organizations,
  ParticipantSessions,
  RateLimits,
  Participants,
  OpeningPage,
  PlatformSettings,
  Site,
  RegistrationSettings,
  Registrations,
  Rooms,
  Scenes,
  SessionRegistrations,
  Sessions,
  Speakers,
  Sponsors,
  Users,
} from '@/cms';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Production media lives in object storage (S3-compatible: AWS,
 * Cloudflare R2, Backblaze…). The plugin joins only when the env is
 * set, so development keeps writing to the local disk untouched.
 */
const s3Configured = Boolean(
  process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY,
);

const storagePlugins = s3Configured
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET ?? '',
        config: {
          region: process.env.S3_REGION ?? 'auto',
          ...(process.env.S3_ENDPOINT
            ? { endpoint: process.env.S3_ENDPOINT }
            : {}),
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
          },
        },
      }),
    ]
  : [];

export default buildConfig({
  plugins: storagePlugins,
  secret: process.env.PAYLOAD_SECRET ?? '',
  db: postgresAdapter({
    /*
     * Schema changes come from migrations, and only from migrations.
     *
     * This was written as a spread that added `push: true` when
     * PAYLOAD_DB_PUSH was set and added nothing otherwise — which left
     * the adapter's own default in charge, and that default is *on*
     * outside production. So every `npm run dev` quietly reshaped the
     * database while the environment variable read as off. That is how
     * the schema stayed ahead of a migration history that did not exist:
     * nobody chose it, and nothing said it was happening.
     *
     * Stating it explicitly closes that. Setting PAYLOAD_DB_PUSH=true is
     * now the only way to sync a schema, it is a deliberate act, and
     * `src/config/env.ts` already refuses to boot with it under
     * NODE_ENV=production.
     */
    push: process.env.PAYLOAD_DB_PUSH === 'true',
    pool: {
      connectionString: process.env.DATABASE_URL ?? '',
    },
  }),
  editor: lexicalEditor(),
  collections: [
    Organizations,
    Users,
    Media,
    Events,
    Experiences,
    Scenes,
    Speakers,
    Sponsors,
    Participants,
    AccountGrants,
    Registrations,
    RegistrationSettings,
    ParticipantSessions,
    AccountSessions,
    Notifications,
    RateLimits,
    AuditLog,
    Rooms,
    Sessions,
    SessionRegistrations,
    NetworkingProfiles,
    NetworkingConnections,
    NetworkingChatMessages,
    NetworkingMeetings,
  ],
  globals: [PlatformSettings, OpeningPage, Site],
  localization: {
    locales: [...SUPPORTED_LOCALES],
    defaultLocale: FALLBACK_LOCALE,
    fallback: true,
  },
  admin: {
    user: Users.slug,
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
