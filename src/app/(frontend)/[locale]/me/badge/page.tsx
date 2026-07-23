import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { getMyAccount } from '@/features/account';
import {
  getMyDetails,
  myConnectBadgeToken,
} from '@/features/registration';
import BadgeQr from './badge-qr';

/*
 * The digital badge (Conference QR Connect): the participant's public
 * face and a QR that carries only a signed identifier. Scanning it —
 * with the platform or any phone camera — opens the connect flow.
 * Nothing personal lives in the code itself.
 */
interface BadgePageProps {
  params: Promise<{ locale: string }>;
}

const TEXT = {
  title: { he: 'התג הדיגיטלי שלי', en: 'My digital badge' },
  hint: {
    he: 'תנו לסרוק את התג — והחיבור יוצא לדרך. שום פרט אישי לא נמצא בקוד.',
    en: 'Let them scan the badge — the connection begins. No personal data lives in the code.',
  },
  share: { he: 'שתפו את הכרטיס שלי', en: 'Share my card' },
  copied: { he: 'הקישור הועתק', en: 'Link copied' },
  back: { he: 'לאזור האישי', en: 'My space' },
  scan: { he: 'סריקת משתתף', en: 'Scan a participant' },
} as const;

const baseUrl = async (): Promise<string> => {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const incoming = await headers();
  const host = incoming.get('host') ?? 'localhost:3000';
  const proto = incoming.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
};

const BadgePage = async ({ params }: BadgePageProps) => {
  const { locale: rawLocale } = await params;
  if (!isSupportedLocale(rawLocale)) {
    notFound();
  }
  const locale: Locale = rawLocale;
  setRequestLocale(locale);

  const token = await myConnectBadgeToken();
  if (!token) {
    redirect(`/${locale}/me`);
  }
  const [details, account, origin] = await Promise.all([
    getMyDetails(),
    getMyAccount(locale),
    baseUrl(),
  ]);
  const connectUrl = `${origin}/${locale}/connect/${encodeURIComponent(token)}`;
  const conference = account?.joined[0]?.title;
  const code = token.split('.')[0] ?? '';

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
            href={`/${locale}/me/scan`}
            className="font-medium text-[var(--l-bronze)]"
          >
            {TEXT.scan[locale]}
          </Link>
        </div>

        <section className="lounge-rise overflow-hidden rounded-3xl bg-[var(--l-navy)] p-7 text-center text-white shadow-[0_24px_70px_rgba(20,30,45,0.45)]">
          {details?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
            <img
              src={details.photoUrl}
              alt=""
              className="mx-auto size-20 rounded-full object-cover ring-2 ring-[#C9A96E]/60"
            />
          ) : (
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-white/10 font-display text-2xl text-[#C9A96E]">
              {(details?.name ?? '?').slice(0, 1)}
            </span>
          )}
          <h1 className="mt-3 font-display text-2xl font-semibold">
            {details?.name ?? ''}
          </h1>
          {details?.role || details?.organization ? (
            <p className="mt-1 text-sm text-white/70">
              {[details?.role, details?.organization].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          {conference ? (
            <p className="mt-3 inline-flex rounded-full bg-[#C9A96E]/20 px-4 py-1 text-xs font-medium text-[#E3CC9C]">
              {conference}
            </p>
          ) : null}

          <div className="mt-6">
            <BadgeQr
              value={connectUrl}
              shareLabel={TEXT.share[locale]}
              copiedLabel={TEXT.copied[locale]}
            />
          </div>
          <p className="mt-4 text-xs tracking-[0.24em] text-white/50">
            #{code}
          </p>
        </section>

        <p className="text-center text-xs leading-relaxed text-[var(--l-faint)]">
          {TEXT.hint[locale]}
        </p>
      </div>
    </main>
  );
};

export default BadgePage;
