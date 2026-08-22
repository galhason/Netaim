import { checkDatabase } from '@/infrastructure';
import { createLogger } from '@/shared';

const log = createLogger('health');

export interface PlatformHealth {
  ok: boolean;
  /* Never returned to the caller — only written to the log. */
  detail?: string;
}

/*
 * Liveness that means something: the database is reachable and answers.
 * The reason for a failure goes to the log, not to the response, so a
 * public probe cannot be used to learn how the platform is put together.
 */
export const platformHealth = async (): Promise<PlatformHealth> => {
  const started = Date.now();
  try {
    await checkDatabase();
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    log.error('unhealthy', { detail, elapsedMs: Date.now() - started });
    return { ok: false, detail };
  }
};
