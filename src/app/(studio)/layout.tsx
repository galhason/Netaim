import type { ReactNode } from 'react';
import { Frank_Ruhl_Libre, Heebo } from 'next/font/google';
import { getTextDirection } from '@/config/locales';
import { getStudioLocale } from '@/features/studio';
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

interface StudioRootLayoutProps {
  children: ReactNode;
}

const StudioRootLayout = async ({ children }: StudioRootLayoutProps) => {
  const locale = await getStudioLocale();

  return (
    <html
      lang={locale}
      dir={getTextDirection(locale)}
      className={`${displayFont.variable} ${bodyFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
};

export default StudioRootLayout;
