import { checkInByToken } from '@/features/registration';
import {
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
  requireCapability,
} from '@/features/studio';
import CheckinScan from './checkin-scan';

/*
 * The door (conference day): scan a ticket QR — or type its code — and
 * the engine answers. A re-scan is reported, never blocked; the person
 * at the door decides. Guarded by checkin:operate, checked per request.
 */
interface CheckinPageProps {
  searchParams: Promise<{ token?: string }>;
}

const TEXT = {
  title: { he: 'צ׳ק-אין בדלת', en: 'Door check-in' },
  sub: {
    he: 'סרקו את כרטיס המשתתף — או הדביקו את הקוד ידנית.',
    en: 'Scan the guest ticket — or paste its code manually.',
  },
  starting: { he: 'פותח מצלמה…', en: 'Opening camera…' },
  unavailable: {
    he: 'המצלמה לא זמינה בדפדפן הזה — השתמשו בשדה הידני.',
    en: 'Camera unavailable in this browser — use the manual field.',
  },
  manual: { he: 'קוד כרטיס', en: 'Ticket code' },
  check: { he: 'בדיקה', en: 'Check' },
  welcome: { he: 'ברוך/ה הבא/ה!', en: 'Welcome!' },
  again: { he: 'הכרטיס הזה כבר נסרק.', en: 'This ticket was already scanned.' },
  notEligible: {
    he: 'הכרטיס אינו במצב שמאפשר כניסה.',
    en: 'This ticket is not in an admissible state.',
  },
  invalid: { he: 'קוד לא תקין.', en: 'Invalid code.' },
  noAccess: {
    he: 'אין לחשבון הזה הרשאת צ׳ק-אין.',
    en: 'This account has no check-in permission.',
  },
} as const;

const CheckinPage = async ({ searchParams }: CheckinPageProps) => {
  const { token } = await searchParams;
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();
  const access = await requireCapability('checkin:operate');

  const result =
    access && token ? await checkInByToken(token).catch(() => null) : null;
  const attempted = Boolean(access && token);

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {TEXT.title[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-xl flex-col gap-5 overflow-y-auto px-6 py-8">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {TEXT.title[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {TEXT.sub[locale]}
          </p>
        </header>

        {!access ? (
          <p className="rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-3 text-sm text-[#E39A8B]">
            {TEXT.noAccess[locale]}
          </p>
        ) : (
          <>
            {attempted ? (
              result?.attended ? (
                <div className="rounded-xl border border-[var(--c-live)]/40 bg-[var(--c-live)]/10 px-5 py-4">
                  <p className="font-display text-2xl font-semibold text-[var(--c-live)]">
                    {TEXT.welcome[locale]}
                  </p>
                  <p className="mt-1 text-sm text-[var(--c-text)]">
                    {result.registration.participant.name}
                  </p>
                </div>
              ) : result ? (
                <div className="rounded-xl border border-[var(--c-bronze)]/40 bg-[var(--c-bronze)]/10 px-5 py-4">
                  <p className="font-medium text-[var(--c-bronze)]">
                    {result.registration.status === 'attended'
                      ? TEXT.again[locale]
                      : TEXT.notEligible[locale]}
                  </p>
                  <p className="mt-1 text-sm text-[var(--c-text-soft)]">
                    {result.registration.participant.name}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl border border-[#B0442F]/40 bg-[#B0442F]/10 px-4 py-3 text-sm text-[#E39A8B]">
                  {TEXT.invalid[locale]}
                </p>
              )
            ) : null}

            <CheckinScan
              startingLabel={TEXT.starting[locale]}
              unavailableLabel={TEXT.unavailable[locale]}
            />

            <form method="get" className="flex items-end gap-2">
              <label className="flex-1">
                <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
                  {TEXT.manual[locale]}
                </span>
                <input
                  name="token"
                  defaultValue=""
                  className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2.5 text-sm text-[var(--c-text)] focus:border-[var(--c-bronze)]/60 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-[var(--c-bronze)] px-6 text-sm font-medium text-[#161006]"
              >
                {TEXT.check[locale]}
              </button>
            </form>
          </>
        )}
      </div>
    </ConsoleShell>
  );
};

export default CheckinPage;
