import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { BrandMark } from '@/shared';
import { CINEMATIC_UI } from '../constants/cinematic-content';

/*
 * The conference's last line: the brand, the door into the Studio, and
 * the signature. Quiet by design — the journey already ended at the
 * closing scene; only soft hairlines separate it.
 */
interface ConferenceFooterProps {
  locale: Locale;
  brand: string;
  /*
   * The logo for whatever this footer is standing on. The same footer
   * closes a dark cinematic page and a daylight participant page, so
   * the treatment is the layout's decision, not the footer's.
   */
  brandLogo?: string;
}

const ConferenceFooter = ({
  locale,
  brand,
  brandLogo,
}: ConferenceFooterProps) => (
  <footer className="border-t cine-hair">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 md:px-12">
      <BrandMark
        brand={brand}
        src={brandLogo}
        height={40}
        textClassName="font-display tracking-[0.3em]"
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Required by the Israeli service-accessibility regulations:
          * the statement is reachable from every page's footer. */}
        <Link
          href={`/${locale}/privacy`}
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {CINEMATIC_UI.privacyPolicy[locale]}
        </Link>
        <Link
          href={`/${locale}/terms`}
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {CINEMATIC_UI.termsOfUse[locale]}
        </Link>
        <Link
          href={`/${locale}/accessibility`}
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {CINEMATIC_UI.accessibilityStatement[locale]}
        </Link>
        {/* Contact came down from the navigation bar, where it was
          * spending width a visitor needed for the conference's own
          * pages. This is where a reader looks for it anyway. */}
        <Link
          href={`/${locale}/contact`}
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {CINEMATIC_UI.contact[locale]}
        </Link>
        <Link
          href="/studio"
          className="text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {CINEMATIC_UI.toStudio[locale]}
        </Link>
      </div>
    </div>
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t cine-hair py-5 text-center text-xs text-text-secondary/70">
      <span>{`© ${new Date().getFullYear()} ${brand}`}</span>
      <span aria-hidden="true">·</span>
      <span>
        {CINEMATIC_UI.builtBy[locale]}{' '}
        <a
          href="https://ghx.co.il"
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="font-medium text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
        >
          GHX.CO.IL
        </a>
      </span>
    </p>
  </footer>
);

export default ConferenceFooter;
