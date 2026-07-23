/*
 * Demo content is a development fixture only. The double guard keeps a
 * misconfigured DEMO_CONTENT flag from ever serving fixtures in production.
 */
export const isDemoContentEnabled = (): boolean =>
  process.env.NODE_ENV === 'development' &&
  process.env.DEMO_CONTENT === 'true';
