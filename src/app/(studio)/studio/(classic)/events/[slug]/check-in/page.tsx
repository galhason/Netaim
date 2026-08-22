import { getStudioLocale } from '@/features/studio';
import CheckInForm from './check-in-form';

const COPY = {
  heading: { he: 'קבלה', en: 'Check-in' },
  intro: {
    he: 'סרקו את קוד הכניסה מהכרטיס, או הדביקו אותו כאן. המערכת תאמת ותסמן נוכחות.',
    en: 'Scan the entrance code from the ticket, or paste it here. The system verifies it and records attendance.',
  },
  placeholder: { he: 'קוד הכניסה', en: 'Entrance code' },
  button: { he: 'קבלה', en: 'Check in' },
  scanning: { he: 'בודק…', en: 'Checking…' },
  checkedin: { he: 'נכנס/ה', en: 'Checked in' },
  already: { he: 'כבר נכנס/ה קודם', en: 'Already checked in' },
  blocked: {
    he: 'לא ניתן לקבל — ההרשמה אינה מאושרת',
    en: 'Cannot check in — registration is not confirmed',
  },
  invalid: { he: 'קוד לא תקין', en: 'Invalid code' },
} as const;

const CheckInPage = async () => {
  const locale = await getStudioLocale();

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium">
          {COPY.heading[locale]}
        </h2>
        <p className="text-sm text-text-secondary">{COPY.intro[locale]}</p>
      </div>

      <CheckInForm
        labels={{
          placeholder: COPY.placeholder[locale],
          button: COPY.button[locale],
          scanning: COPY.scanning[locale],
          checkedin: COPY.checkedin[locale],
          already: COPY.already[locale],
          blocked: COPY.blocked[locale],
          invalid: COPY.invalid[locale],
        }}
      />
    </div>
  );
};

/*
 * The response depends on who is asking, so it is rendered per request
 * and never prerendered or shared. Declared rather than left to Next to
 * infer from a cookie read: an inferred guard disappears the moment a
 * refactor moves that read behind a helper, and the failure would be a
 * privacy leak that nothing announces.
 */
export const dynamic = 'force-dynamic';

export default CheckInPage;
