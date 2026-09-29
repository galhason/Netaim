import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { M_PLUS_Rounded_1c, Open_Sans } from 'next/font/google';
import { getTextDirection, isSupportedLocale, type Locale } from '@/config/locales';
import { AccessibilityWidget } from '@/features/accessibility';
import { SiteSpotlight } from '@/features/notifications';
import { routing } from '@/i18n/routing';
import { flagFont } from '@/styles/flags';
import { AppProviders } from '@/providers';
import '@/styles/globals.css';

/*
 * The organisation's own faces, the ones its WordPress site is set in:
 * Open Sans for text, in both scripts, and M PLUS Rounded 1c for the
 * large headings. The rounded face carries no Hebrew, so a Hebrew
 * heading falls to Open Sans — the same fallback the site's stacks
 * give it — and a page here and a page there read as one site.
 */
const bodyFont = Open_Sans({
  subsets: ['hebrew', 'latin'],
  variable: '--font-body',
});

const displayFont = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-display-face',
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
    /*
      * The two faces the site is set in, and beside them the flag font
      * — not a third face: it holds only flag glyphs, and only the
      * `.nt-flag` stack asks for it. See src/styles/flags.ts.
      */
    <html
      lang={locale}
      dir={getTextDirection(locale)}
      className={`${bodyFont.variable} ${displayFont.variable} ${flagFont.variable}`}
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
