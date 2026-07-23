import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from '@/config/locales';
import {
  AccountGrants,
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
     * On a fresh test server there are no migrations yet, so allow the
     * adapter to sync the schema on boot when PAYLOAD_DB_PUSH=true. Real
     * production later swaps this for a generated migration workflow.
     */
    ...(process.env.PAYLOAD_DB_PUSH === 'true' ? { push: true } : {}),
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
    Notifications,
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
