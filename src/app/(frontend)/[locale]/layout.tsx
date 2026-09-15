import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Frank_Ruhl_Libre, Heebo, Rubik } from 'next/font/google';
import { getTextDirection, isSupportedLocale, type Locale } from '@/config/locales';
import { AccessibilityWidget } from '@/features/accessibility';
import { SiteSpotlight } from '@/features/notifications';
import { routing } from '@/i18n/routing';
import { AppProviders } from '@/providers';
import '@/styles/globals.css';

const displayFont = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['500', '700'],
  variable: '--font-display',
});

const bodyFont = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
});

const cineFont = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cine',
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
      className={`${displayFont.variable} ${bodyFont.variable} ${cineFont.variable}`}
    >
      <body>
        {/*
          * The first tab stop on every page (IS 5568 / WCAG 2.4.1):
          * invisible until focused, then a clear bar that jumps a
          * keyboard or screen-reader user straight past the chrome.
          */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#172033] focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
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
