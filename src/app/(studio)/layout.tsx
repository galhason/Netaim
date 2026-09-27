import type { ReactNode } from 'react';
import { M_PLUS_Rounded_1c, Open_Sans } from 'next/font/google';
import { getTextDirection } from '@/config/locales';
import { getStudioLocale } from '@/features/studio';
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

interface StudioRootLayoutProps {
  children: ReactNode;
}

const StudioRootLayout = async ({ children }: StudioRootLayoutProps) => {
  const locale = await getStudioLocale();

  return (
    <html
      lang={locale}
      dir={getTextDirection(locale)}
      className={`${bodyFont.variable} ${displayFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
};

/*
 * This layout resolves who is looking, so every page beneath it depends
 * on the visitor and none may be prerendered or shared. Declared rather
 * than left to Next to infer: an inferred guard disappears the moment a
 * refactor moves the read behind a helper.
 */
export const dynamic = 'force-dynamic';

export default StudioRootLayout;
