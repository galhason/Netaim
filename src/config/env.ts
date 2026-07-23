import { z } from 'zod';

/**
 * Server environment is validated at startup so configuration errors
 * fail fast instead of surfacing at request time.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PAYLOAD_SECRET: z.string().min(32),
  NEXT_PUBLIC_SERVER_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const getServerEnv = (): ServerEnv => serverEnvSchema.parse(process.env);
