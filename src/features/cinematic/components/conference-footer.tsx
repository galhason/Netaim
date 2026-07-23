import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { CINEMATIC_UI } from '../constants/cinematic-content';

/*
 * The conference's last line: the brand, the door into the Studio, and
 * the signature. Quiet by design — the journey already ended at the
 * closing scene; only soft hairlines separate it.
 */
interface ConferenceFooterProps {
  locale: Locale;
  brand: string;
}

const ConferenceFooter = ({ locale, brand }: ConferenceFooterProps) => (
  <footer className="border-t cine-hair">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 md:px-12">
      <span className="font-display tracking-[0.3em]">{brand}</span>
      <Link
        href="/studio"
        className="text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        {CINEMATIC_UI.toStudio[locale]}
      </Link>
    </div>
    <p className="border-t cine-hair py-5 text-center text-xs text-text-secondary/70">
      {`© ${new Date().getFullYear()} ${brand}`}
    </p>
  </footer>
);

export default ConferenceFooter;
