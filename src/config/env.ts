import { z } from 'zod';

/**
 * Server environment is validated at startup so configuration errors
 * fail fast instead of surfacing at request time — or, worse, not
 * surfacing at all. An absent signing secret used to fall back to an
 * empty string, which silently made every session cookie and every
 * entrance QR forgeable; that is now a boot failure.
 */
const secret = (label: string) =>
  z
    .string()
    .min(32, `${label} must be at least 32 characters — generate one with \`openssl rand -base64 32\`.`);

const optionalSecret = (label: string) =>
  z
    .union([secret(label), z.literal('')])
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().url('DATABASE_URL must be a Postgres connection URL.'),
    PAYLOAD_SECRET: secret('PAYLOAD_SECRET'),
    NEXT_PUBLIC_SERVER_URL: z
      .string()
      .url('NEXT_PUBLIC_SERVER_URL must be the full deployed URL, including https://.'),

    /* Optional, but when present must be strong enough to sign with. */
    REGISTRATION_LINK_SECRET: optionalSecret('REGISTRATION_LINK_SECRET'),
    PREVIEW_SECRET: optionalSecret('PREVIEW_SECRET'),

    /* Media storage: all four are required together or not at all. */
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional().or(z.literal('')),

    /* Monday.com: both are required together or the integration is off. */
    MONDAY_API_TOKEN: z.string().optional(),
    MONDAY_BOARD_ID: z.string().optional(),

    /*
     * Email over SMTP. A host and a from-address are the minimum that
     * can actually send; everything else has a sane default. Absent, the
     * platform records messages without delivering them, which is the
     * right behaviour for local development.
     */
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_SECURE: z.enum(['true', 'false']).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z
      .string()
      .email('SMTP_FROM must be an address, e.g. "Netaim <no-reply@example.org>" is not valid here — use the bare address.')
      .optional(),
    SMTP_REPLY_TO: z.string().email().optional(),

    /* Protects the retry endpoint; without it the route stays closed. */
    DISPATCH_SECRET: optionalSecret('DISPATCH_SECRET'),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PAYLOAD_DB_PUSH: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const s3 = [
      env.S3_BUCKET,
      env.S3_ACCESS_KEY_ID,
      env.S3_SECRET_ACCESS_KEY,
    ].filter((value) => Boolean(value));
    if (s3.length > 0 && s3.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'S3 storage is half-configured: set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY together, or leave all three empty to store media on local disk.',
      });
    }

    const monday = [env.MONDAY_API_TOKEN, env.MONDAY_BOARD_ID].filter((value) =>
      Boolean(value),
    );
    if (monday.length === 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Monday.com is half-configured: set MONDAY_API_TOKEN and MONDAY_BOARD_ID together, or leave both empty to disable the integration.',
      });
    }

    /*
     * A host without a from-address, or the reverse, is a relay that
     * will refuse every message — better to refuse to start than to
     * discover it when the first guest does not get their link.
     */
    const smtp = [env.SMTP_HOST, env.SMTP_FROM].filter(Boolean);
    if (smtp.length === 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'SMTP is half-configured: set SMTP_HOST and SMTP_FROM together, or leave both empty to record mail without sending it.',
      });
    }

    /*
     * A relay that needs a username needs a password with it.
     */
    if (env.SMTP_USER && !env.SMTP_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SMTP_USER is set without SMTP_PASSWORD.',
      });
    }

    /*
     * Mail configured but no dispatch secret means a failed delivery is
     * recorded and never retried, because the retry route stays closed.
     */
    if (env.SMTP_HOST && !env.DISPATCH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'SMTP is configured but DISPATCH_SECRET is not, so failed deliveries would never be retried. Generate one with `openssl rand -base64 32`.',
      });
    }

    /*
     * Schema push is a development convenience. Leaving it on in
     * production lets a deploy reshape live tables without a migration.
     */
    if (env.NODE_ENV === 'production' && env.PAYLOAD_DB_PUSH === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'PAYLOAD_DB_PUSH must not be true in production — run `npm run migrate` instead so schema changes are reviewable and reversible.',
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/*
 * Called once from instrumentation at boot. Reports every problem at
 * once rather than one per restart, and refuses to start rather than
 * serving requests on a broken configuration.
 */
export const assertServerEnv = (): void => {
  const result = serverEnvSchema.safeParse(process.env);
  if (result.success) {
    return;
  }
  const problems = result.error.issues
    .map((issue) => {
      const key = issue.path.join('.');
      return key ? `  · ${key}: ${issue.message}` : `  · ${issue.message}`;
    })
    .join('\n');
  throw new Error(
    `Netaim cannot start — the server environment is invalid:\n${problems}\n\nSee .env.production.example for the full list of keys.`,
  );
};
