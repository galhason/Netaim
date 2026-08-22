import { getSystemPayload } from './payload-context';

/*
 * The cheapest read that proves the connection pool is alive and the
 * schema is present. `limit: 0` asks Postgres for the count alone, so a
 * monitor polling every few seconds costs almost nothing.
 */
export const checkDatabase = async (): Promise<void> => {
  const payload = await getSystemPayload();
  await payload.count({
    collection: 'organizations',
    overrideAccess: true,
  });
};
