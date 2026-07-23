import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Single composition point for all cross-cutting providers.
 * Future providers (query cache, analytics consent, event theme)
 * are added here so layouts never accumulate provider nesting.
 */
export const AppProviders = ({ children }: AppProvidersProps) => (
  <NextIntlClientProvider>{children}</NextIntlClientProvider>
);
