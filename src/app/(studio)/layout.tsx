import type { ReactNode } from 'react';
import { Heebo } from 'next/font/google';
import { getTextDirection } from '@/config/locales';
import { getStudioLocale } from '@/features/studio';
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

interface StudioRootLayoutProps {
  children: ReactNode;
}

const StudioRootLayout = async ({ children }: StudioRootLayoutProps) => {
  const locale = await getStudioLocale();

  return (
    <html
      lang={locale}
      dir={getTextDirection(locale)}
      className={brandFont.variable}
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
