import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { IconArrow } from '@/features/conference';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GallerySubmissionState } from '../types/gallery';
import GalleryShare from './gallery-share';
import { OliveBranch } from './olive-branch';

/*
 * The last word: "יש לכם רגע שראוי להישמר?" on the organisation's
 * cream, with a branch in its corner, and the two ways on — share a
 * photograph (it goes to the team for approval; signing in first when
 * the visitor is not), and back to the conference's agenda (the
 * platform's programme, never the retired /program).
 */
interface GalleryCtaProps {
  locale: Locale;
  slug: string;
  /* Whether a participant is signed in — only they may send a photo. */
  signedIn: boolean;
  shareAction: (state: GallerySubmissionState, formData: FormData) => Promise<GallerySubmissionState>;
}

const GalleryCta = ({ locale, slug, signedIn, shareAction }: GalleryCtaProps) => {
  const words = GALLERY_COPY.cta;
  const base = `/${locale}/events/${encodeURIComponent(slug)}`;
  return (
    <section
      aria-labelledby="gallery-cta-title"
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--x-bg)_0%,var(--x-bg-deep)_100%)]"
    >
      <OliveBranch className="pointer-events-none absolute -bottom-12 -start-12 -z-10 size-64 text-[var(--x-primary)] opacity-[0.18] md:size-80" />
      <OliveBranch className="pointer-events-none absolute -end-16 -top-16 -z-10 hidden size-56 rotate-180 text-[var(--x-accent)] opacity-[0.22] md:block" />
      <div className="mx-auto max-w-3xl px-5 py-14 text-center md:py-16">
        <h2 id="gallery-cta-title" className="font-display text-3xl font-bold leading-tight text-[var(--x-ink)] md:text-4xl">
          {words.title[locale]}
        </h2>
        <p className="mt-3 text-base text-[var(--x-soft)] md:text-lg">{words.lede[locale]}</p>
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          {signedIn ? (
            <GalleryShare locale={locale} slug={slug} action={shareAction} />
          ) : (
            <Link
              href={`/${locale}/me`}
              data-nt-dest="enter"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-7 text-sm font-bold text-[var(--x-primary-ink)] shadow-[var(--x-shadow)] transition-colors hover:bg-[var(--x-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
            >
              {GALLERY_COPY.share.signIn[locale]}
            </Link>
          )}
          <Link
            href={`${base}/agenda`}
            data-nt-dest="agenda"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--x-r-pill)] border border-[var(--x-primary)] bg-transparent px-7 text-sm font-bold text-[var(--x-primary)] transition-colors hover:bg-[var(--x-primary-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--x-primary)]"
          >
            {words.agenda[locale]}
            <IconArrow className="size-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GalleryCta;
