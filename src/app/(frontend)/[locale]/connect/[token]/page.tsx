import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { connectPreview } from '@/features/networking';
import { qrConnectAction } from './actions';

/*
 * The scanned-badge landing (Conference QR Connect): the public card of
 * the person just met, one context choice, one optional line — and a
 * connection request. No personal information appears at this stage;
 * everything else waits for their approval.
 */
interface ConnectPageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ result?: string }>;
}

const TEXT = {
  title: { he: 'התחברות', en: 'Connect' },
  metAt: { he: 'איפה נפגשתם?', en: 'Where did you meet?' },
  note: { he: 'כמה מילים (רשות)', en: 'A few words (optional)' },
  send: { he: 'שליחת בקשת התחברות', en: 'Send connection request' },
  sent: {
    he: 'הבקשה נשלחה. ההתחברות תושלם כשהצד השני יאשר.',
    en: 'Request sent. The connection completes once they approve.',
  },
  self: {
    he: 'זה התג שלך — תנו לאחרים לסרוק אותו.',
    en: 'This is your own badge — let others scan it.',
  },
  noShared: {
    he: 'אין עדיין כנס משותף. הצטרפו לאותו כנס כדי להתחבר.',
    en: 'No shared conference yet. Join the same conference to connect.',
  },
  signedOut: {
    he: 'כדי לשלוח בקשת התחברות, היכנסו לחשבון ואז סרקו שוב.',
    en: 'To send a connection request, sign in and scan again.',
  },
  toAccount: { he: 'כניסה לחשבון', en: 'Sign in' },
  toLounge: { he: 'לאזור האישי', en: 'To my space' },
  privacy: {
    he: 'שום פרט אישי לא נחשף בשלב הזה. ערוצי הקשר נפתחים רק לפי מה שהצד השני אישר.',
    en: 'Nothing personal is shared at this stage. Channels open only as the other side allowed.',
  },
} as const;

const CONTEXTS = [
  { he: 'נפגשנו במליאה', en: 'Met at the plenary' },
  { he: 'נפגשנו בהפסקת קפה', en: 'Met at the coffee break' },
  { he: 'נפגשנו בסדנה', en: 'Met at a workshop' },
  { he: 'נפגשנו בלאונג׳ הנטוורקינג', en: 'Met at the networking lounge' },
  { he: 'נפגשנו ליד דוכן', en: 'Met at a booth' },
] as const;

const ConnectPage = async ({ params, searchParams }: ConnectPageProps) => {
  const { locale: rawLocale, token: rawToken } = await params;
  const { result } = await searchParams;
  if (!isSupportedLocale(rawLocale)) {
    notFound();
  }
  const locale: Locale = rawLocale;
  setRequestLocale(locale);
  const token = decodeURIComponent(rawToken);

  const preview = await connectPreview(token).catch(() => null);
  if (!preview) {
    notFound();
  }

  const banner =
    result === 'sent'
      ? { tone: 'good', text: TEXT.sent[locale] }
      : result === 'noShared'
        ? { tone: 'note', text: TEXT.noShared[locale] }
        : result === 'self' || preview.self
          ? { tone: 'note', text: TEXT.self[locale] }
          : null;

  const canSend = preview.signedIn && !preview.self && result !== 'sent';

  return (
    <main
      id="main-content"
      className="lounge min-h-dvh bg-[var(--l-bg)] font-body text-[var(--l-ink)]"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
        <p className="text-center font-display text-sm font-semibold tracking-[0.3em] text-[var(--l-soft)]">
          נטעים
        </p>

        <section className="lounge-rise rounded-3xl bg-white p-6 text-center shadow-[0_18px_60px_rgba(35,40,47,0.12)]">
          {preview.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
            <img
              src={preview.photoUrl}
              alt=""
              className="mx-auto size-24 rounded-full object-cover ring-2 ring-[var(--l-bronze)]/40"
            />
          ) : (
            <span className="mx-auto grid size-24 place-items-center rounded-full bg-[var(--l-bronze)]/15 font-display text-3xl text-[var(--l-bronze)]">
              {preview.name.slice(0, 1)}
            </span>
          )}
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {preview.name}
          </h1>
          {preview.roleTitle || preview.orgName ? (
            <p className="mt-1 text-sm text-[var(--l-soft)]">
              {[preview.roleTitle, preview.orgName]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}

          {banner ? (
            <p
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                banner.tone === 'good'
                  ? 'bg-[#EAF4EC] text-[#2F5D3A]'
                  : 'bg-[var(--l-bronze)]/10 text-[var(--l-ink)]'
              }`}
            >
              {banner.text}
            </p>
          ) : null}

          {!preview.signedIn ? (
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-sm text-[var(--l-soft)]">
                {TEXT.signedOut[locale]}
              </p>
              <Link
                href={`/${locale}/me`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white"
              >
                {TEXT.toAccount[locale]}
              </Link>
            </div>
          ) : null}

          {canSend ? (
            <form action={qrConnectAction} className="mt-6 flex flex-col gap-4 text-start">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="token" value={token} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-widest text-[var(--l-soft)]">
                  {TEXT.metAt[locale]}
                </span>
                <select
                  name="context"
                  className="min-h-11 rounded-xl border border-[var(--l-hair)] bg-white px-3 text-sm"
                >
                  <option value="">—</option>
                  {CONTEXTS.map((context) => (
                    <option key={context.he} value={context[locale]}>
                      {context[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-widest text-[var(--l-soft)]">
                  {TEXT.note[locale]}
                </span>
                <textarea
                  name="message"
                  rows={2}
                  maxLength={300}
                  className="rounded-xl border border-[var(--l-hair)] bg-white p-3 text-sm"
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[#16263c]"
              >
                {TEXT.send[locale]}
              </button>
            </form>
          ) : null}

          {result === 'sent' || preview.self ? (
            <Link
              href={`/${locale}/me`}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--l-hair)] px-6 text-sm font-medium"
            >
              {TEXT.toLounge[locale]}
            </Link>
          ) : null}
        </section>

        <p className="text-center text-xs leading-relaxed text-[var(--l-faint)]">
          {TEXT.privacy[locale]}
        </p>
      </div>
    </main>
  );
};

export default ConnectPage;
