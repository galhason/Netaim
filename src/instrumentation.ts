/*
 * Next.js runs this once when the server starts, before the first
 * request is served. Configuration is proved here so a misconfigured
 * deploy fails loudly at boot instead of signing sessions with an empty
 * secret or pushing schema over a live database.
 *
 * The imports sit inside `=== 'nodejs'` rather than after an early
 * return. Next replaces `process.env.NEXT_RUNTIME` with a literal per
 * bundle, so in the edge bundle the condition is statically false and
 * the whole branch — with everything it reaches, `fs`, `async_hooks`,
 * Postgres — is dropped. An early return leaves the imports at the top
 * level of the module graph, and webpack then tries to resolve Node
 * built-ins for a runtime that has none.
 */
export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertServerEnv } = await import('@/config/env');
    assertServerEnv();

    /*
     * Logs go to disk from here on. The transport was swappable from
     * the start and nothing was ever installed in it, so every line the
     * platform wrote lived only as long as the process did.
     */
    const { installFileLogging } = await import('@/shared/logging/install');
    installFileLogging();
  }
};
