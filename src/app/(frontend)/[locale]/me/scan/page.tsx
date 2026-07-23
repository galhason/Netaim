import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { currentParticipant } from '@/features/registration';
import ScanClient from './scan-client';

/*
 * Scan a participant (Conference QR Connect): one tap from anywhere,
 * camera first, manual code as the accessible fallback. The complete
 * flow — scan, approve, keep talking — should take seconds.
 */
interface ScanPageProps {
  params: Promise<{ locale: string }>;
}

const TEXT = {
  title: { he: 'סריקת משתתף', en: 'Scan a participant' },
  back: { he: 'לאזור האישי', en: 'My space' },
  myBadge: { he: 'התג שלי', en: 'My badge' },
  starting: { he: 'פותח מצלמה…', en: 'Opening camera…' },
  unavailable: {
    he: 'המצלמה לא זמינה בדפדפן הזה. אפשר לסרוק את התג עם מצלמת הטלפון הרגילה, או להדביק קישור/קוד למטה.',
    en: 'Camera is unavailable in this browser. Scan the badge with your phone camera, or paste a link/code below.',
  },
  manualLabel: { he: 'קישור או קוד משתתף', en: 'Link or participant code' },
  manualGo: { he: 'פתיחה', en: 'Open' },
  hint: {
    he: 'סריקה יוצרת בקשת התחברות בלבד — שום פרט אישי לא מוחלף עד שהצד השני מאשר.',
    en: 'Scanning only creates a connection request — nothing personal moves until they approve.',
  },
} as const;

const ScanPage = async ({ params }: ScanPageProps) => {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) {
    notFound();
  }
  const locale: Locale = rawLocale;
  setRequestLocale(locale);

  const me = await currentParticipant().catch(() => null);
  if (!me) {
    redirect(`/${locale}/me`);
  }

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-6 py-12">
        <div className="flex items-center justify-between text-sm">
          <Link
            href={`/${locale}/me`}
            className="text-[var(--l-soft)] transition-opacity hover:opacity-75"
          >
            ← {TEXT.back[locale]}
          </Link>
          <Link
            href={`/${locale}/me/badge`}
            className="font-medium text-[var(--l-bronze)]"
          >
            {TEXT.myBadge[locale]}
          </Link>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {TEXT.title[locale]}
        </h1>
        <ScanClient
          locale={locale}
          labels={{
            starting: TEXT.starting[locale],
            unavailable: TEXT.unavailable[locale],
            manualLabel: TEXT.manualLabel[locale],
            manualGo: TEXT.manualGo[locale],
            hint: TEXT.hint[locale],
          }}
        />
      </div>
    </main>
  );
};

export default ScanPage;
