import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Heebo } from 'next/font/google';
import { getTextDirection, isSupportedLocale, type Locale } from '@/config/locales';
import { AccessibilityWidget } from '@/features/accessibility';
import { SiteSpotlight } from '@/features/notifications';
import { routing } from '@/i18n/routing';
import { AppProviders } from '@/providers';
import '@/styles/globals.css';

/*
 * One typeface, in both scripts.
 *
 * The product used to set headings in a serif (Frank Ruhl Libre) and the
 * landing in a third face (Rubik), which read as three products. Heebo
 * is the organization's own, it carries Hebrew and Latin with the same
 * voice, and it is loaded as a variable font so a heading can be 800
 * and a label 600 without a second download.
 */
const brandFont = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-body',
});

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={getTextDirection(locale)}
      className={brandFont.variable}
    >
      <body>
        {/*
          * The first tab stop on every page (IS 5568 / WCAG 2.4.1):
          * invisible until focused, then a clear bar that jumps a
          * keyboard or screen-reader user straight past the chrome.
          */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--nt-ink)] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
        >
          {locale === 'he' ? 'דילוג לתוכן הראשי' : 'Skip to main content'}
        </a>
        <AppProviders>
          {/*
            * The live channels (PRD §4.1) — the urgent banner above
            * every page and the pop-up that waits for a click. Streamed
            * in beside the page rather than ahead of it, so a slow
            * outbox never delays the content.
            */}
          <Suspense fallback={null}>
            <SiteSpotlight locale={locale as Locale} />
          </Suspense>
          {children}
          {/* The accessibility button — on every page, above everything. */}
          <AccessibilityWidget locale={locale as Locale} />
        </AppProviders>
      </body>
    </html>
  );
};

export default LocaleLayout;
