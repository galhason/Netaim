import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { OPENING_UI } from '../constants/opening-content';

/*
 * The opening's quiet last line: brand, tagline, rights and the one
 * door into the Studio.
 */
interface OpeningFooterProps {
  locale: Locale;
  brand: string;
}

const OpeningFooter = ({ locale, brand }: OpeningFooterProps) => (
  <footer>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 md:px-12">
      <p>
        <span className="block font-display tracking-[0.3em]">{brand}</span>
        <span className="mt-1 block text-[0.65rem] tracking-[0.24em] text-text-secondary">
          {OPENING_UI.footerTagline[locale]}
        </span>
      </p>
      <p className="flex items-center gap-6">
        <span className="text-xs text-text-secondary">
          © {new Date().getFullYear()} {brand} · {OPENING_UI.rights[locale]}
        </span>
        <Link
          href="/studio"
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {OPENING_UI.toStudio[locale]}
        </Link>
      </p>
    </div>
  </footer>
);

export default OpeningFooter;
