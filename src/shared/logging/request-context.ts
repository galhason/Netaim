import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

/*
 * A correlation id per request, carried implicitly so that every log
 * line written while serving it can be tied back together. Without one,
 * a production incident is a pile of unrelated lines and there is no way
 * to ask "what else happened during the request that failed".
 */
interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const withRequestId = <T>(requestId: string, run: () => T): T =>
  storage.run({ requestId }, run);

export const currentRequestId = (): string | null =>
  storage.getStore()?.requestId ?? null;

export const newRequestId = (): string => randomUUID();
