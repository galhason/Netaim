import { notFound } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { phaseIsOffAir } from '@/event-engine';
import { findEvent, getActiveConferenceSlug, getStaffOnlyConferenceSlug, reviewLaunch } from '@/features/events';
import { EVENT_TIMEZONE_OPTIONS } from '@/features/events/constants/timezones';
import { getStudioLocale } from '@/features/studio';
import { marketingRepository } from '@/infrastructure';
import { toDateTimeInputValue } from '@/shared';
import {
  archiveFromSettingsAction,
  deleteFromSettingsAction,
  duplicateFromSettingsAction,
  makeActiveAction,
  publishFromSettingsAction,
  restoreFromSettingsAction,
  saveConferenceScheduleAction,
  setConferenceAudienceAction,
} from './actions';

const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  schedule: t('מועד ושעון', 'Schedule & clock'),
  scheduleSub: t('התאריכים מופיעים באתר ובכל הודעה; השעון קובע איך שעות התוכנית נקראות.', 'The dates appear on the site and in every notice; the clock decides how program times are read.'),
  startsAt: t('התחלה', 'Starts'),
  endsAt: t('סיום', 'Ends'),
  timezone: t('אזור זמן', 'Time zone'),
  save: t('שמירה', 'Save'),
  saved: t('נשמר.', 'Saved.'),
  publishing: t('פרסום', 'Publishing'),
  publishSub: t('הטיוטה עולה לאתר. וורדפרס מתעדכנת תוך עד 5 דקות.', 'The draft goes to the site. WordPress updates within 5 minutes.'),
  publish: t('פרסום הטיוטה', 'Publish the draft'),
  live: t('מפורסם ומעודכן', 'Published and up to date'),
  pending: t('יש שינויים שעדיין לא פורסמו', 'Changes not yet published'),
  never: t('הכנס עדיין לא פורסם', 'Not published yet'),
  blockers: t('חסמים לפרסום', 'Blockers'),
  blockersNone: t('אין חסמים.', 'No blockers.'),
  publishedNow: t('פורסם.', 'Published.'),
  publishBlocked: t('הפרסום נעצר בגלל חסמים.', 'Publishing stopped by blockers.'),
  publishRetired: t('כנס בארכיון לא מתפרסם — שחזרו אותו קודם.', 'An archived conference cannot be published — restore it first.'),
  audience: t('מי רואה את הכנס', 'Who sees the conference'),
  audienceSub: t(
    'כנס שפתוח לצוות בלבד מוצג במלואו לחברי צוות נטעים מחוברים, כדי לבדוק שהכול תקין. כל השאר רואים "הכנס בהכנה" וכפתור התחברות. השינוי חל מיד ואינו מפרסם את הטיוטה; באתר וורדפרס הוא מופיע תוך עד 5 דקות.',
    'A team-only conference is shown in full to signed-in Netaim team members, so they can check it. Everyone else sees "The conference is being prepared" and a sign-in button. The change is immediate and does not publish the draft; WordPress shows it within 5 minutes.',
  ),
  staffOnly: t('צוות בלבד', 'Team only'),
  staffOnlyState: t('רק צוות נטעים מחובר רואה את הכנס.', 'Only signed-in Netaim team members see the conference.'),
  everyoneState: t('הכנס פתוח לכולם.', 'The conference is open to everyone.'),
  openToEveryone: t('פתיחה לכולם', 'Open to everyone'),
  closeToStaff: t('פתיחה לצוות בלבד', 'Make it team only'),
  publishForTeam: t('כדי שהצוות יוכל לבדוק את הדף, צריך גם לפרסם את הטיוטה (למעלה).', 'For the team to check the page, the draft also needs to be published (above).'),
  audienceStaffNow: t('הכנס פתוח עכשיו לצוות בלבד.', 'The conference is now open to the team only.'),
  audienceEveryoneNow: t('הכנס פתוח עכשיו לכולם.', 'The conference is now open to everyone.'),
  audienceBusy: t('כנס אחר מפורסם ופתוח לצוות בלבד. פתחו אותו לכולם או הורידו אותו קודם.', 'Another published conference is team only. Open it to everyone or take it down first.'),
  active: t('הכנס הפעיל', 'Active conference'),
  activeSub: t('הכנס הפעיל הוא זה שוורדפרס מציגה ושאליו מובילים "התחברות" ו"הרשמה". פלטפורמה אחת — כנס פעיל אחד.', 'The active conference is the one WordPress shows and the one "Sign in" and "Register" lead to. One platform — one active conference.'),
  isActive: t('זה הכנס הפעיל.', 'This is the active conference.'),
  makeActive: t('הגדרה ככנס הפעיל', 'Make this the active conference'),
  lifecycle: t('מחזור חיים', 'Lifecycle'),
  phase: t('שלב', 'Phase'),
  duplicate: t('שכפול הכנס', 'Duplicate conference'),
  duplicateSub: t('עותק חדש עם כל התוכן, כטיוטה. נוח לכנס הבא.', 'A fresh copy with all the content, as a draft. Handy for next year.'),
  archive: t('העברה לארכיון', 'Archive'),
  archiveSub: t('יורד מהאתר ונשאר לעיון. אפשר לשחזר.', 'Comes off the site and stays for reference. Can be restored.'),
  restore: t('שחזור מהארכיון', 'Restore from archive'),
  danger: t('מחיקה לצמיתות', 'Delete permanently'),
  dangerSub: t('הכנס וכל מה שנולד בו — תוכנית, הרשמות, שיחות. אין דרך חזרה. הקלידו את ה-slug לאישור.', 'The conference and everything born in it — program, registrations, conversations. No way back. Type the slug to confirm.'),
  delete: t('מחיקה', 'Delete'),
  slug: t('מזהה (slug)', 'Identifier (slug)'),
  slugSub: t('חלק מהכתובת: /events/{slug}/… — לא ניתן לשינוי אחרי הפרסום.', 'Part of the address: /events/{slug}/… — fixed once published.'),
  refused: t('הפעולה לא בוצעה.', 'The action was refused.'),
};

const CARD = 'rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] p-5';
const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const BTN = 'inline-flex min-h-9 items-center rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)]';
const BTN_PRIMARY = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)]';
const BTN_DANGER = 'inline-flex min-h-9 items-center rounded-md bg-[var(--c-danger)] px-4 text-sm font-semibold text-[var(--c-on-danger)] hover:bg-[var(--c-danger-strong)]';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; publish?: string }>;
}

const ConferenceSettingsPage = async ({ params, searchParams }: SettingsPageProps) => {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const { saved, publish } = await searchParams;
  const locale = await getStudioLocale();
  const [summary, activeSlug, staffOnlySlug, review, published] = await Promise.all([
    findEvent(slug).catch(() => null),
    getActiveConferenceSlug(locale).catch(() => null),
    getStaffOnlyConferenceSlug().catch(() => null),
    reviewLaunch(slug, locale).catch(() => null),
    marketingRepository.findPublishedIdentity(slug, 'he').catch(() => null),
  ]);
  if (!summary) {
    notFound();
  }
  const offAir = phaseIsOffAir(summary.phase);
  const publishState = summary.launched ? 'live' : published ? 'pending' : 'never';
  const staffOnly = staffOnlySlug === slug;
  const notice =
    saved === 'audience-staff'
      ? UI.audienceStaffNow[locale]
      : saved === 'audience-everyone'
        ? UI.audienceEveryoneNow[locale]
        : saved === 'audience-busy'
          ? UI.audienceBusy[locale]
          : publish === 'live'
      ? UI.publishedNow[locale]
      : publish === 'blocked'
        ? UI.publishBlocked[locale]
        : publish === 'retired'
          ? UI.publishRetired[locale]
          : saved && saved.endsWith('refused')
            ? UI.refused[locale]
            : saved
              ? UI.saved[locale]
              : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-6 py-6">
      {notice ? (
        <p role="status" className="rounded-md border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-2 text-sm text-[var(--c-text)]">
          {notice}
        </p>
      ) : null}

      {/* schedule */}
      <form action={saveConferenceScheduleAction} className={CARD}>
        <input type="hidden" name="slug" value={slug} />
        <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.schedule[locale]}</h2>
        <p className="mb-4 mt-1 text-xs text-[var(--c-text-soft)]">{UI.scheduleSub[locale]}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={LABEL}>{UI.startsAt[locale]}</span>
            <input type="datetime-local" name="startsAt" defaultValue={toDateTimeInputValue(summary.startsAt)} className={INPUT} dir="ltr" />
          </label>
          <label className="block">
            <span className={LABEL}>{UI.endsAt[locale]}</span>
            <input type="datetime-local" name="endsAt" defaultValue={toDateTimeInputValue(summary.endsAt)} className={INPUT} dir="ltr" />
          </label>
          <label className="block">
            <span className={LABEL}>{UI.timezone[locale]}</span>
            <select name="timezone" defaultValue={summary.timezone ?? 'Asia/Jerusalem'} className={INPUT}>
              {EVENT_TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4">
          <button type="submit" className={BTN_PRIMARY}>{UI.save[locale]}</button>
        </div>
      </form>

      {/* publishing */}
      <section className={CARD}>
        <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.publishing[locale]}</h2>
        <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.publishSub[locale]}</p>
        <p className="mt-3 text-sm text-[var(--c-text)]">
          {publishState === 'live' ? UI.live[locale] : publishState === 'pending' ? UI.pending[locale] : UI.never[locale]}
        </p>
        <div className="mt-3">
          <p className={LABEL}>{UI.blockers[locale]}</p>
          {review && review.health.requiredActions.length > 0 ? (
            <ul className="list-disc ps-5 text-sm text-[var(--c-text-soft)]">
              {review.health.requiredActions.map((finding) => (
                <li key={finding.id}>{finding.message[locale]}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--c-text-soft)]">{UI.blockersNone[locale]}</p>
          )}
        </div>
        {!offAir ? (
          <form action={publishFromSettingsAction} className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className={BTN_PRIMARY} disabled={Boolean(review && !review.canLaunch)}>
              {UI.publish[locale]}
            </button>
          </form>
        ) : null}
      </section>

      {/* audience */}
      <section className={CARD}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.audience[locale]}</h2>
          {staffOnly ? (
            <span className="rounded-full bg-[rgba(245,158,11,0.15)] px-2 py-0.5 text-[11px] font-medium tracking-[0.06em] text-[var(--c-bronze)]">
              {UI.staffOnly[locale]}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.audienceSub[locale]}</p>
        <p className="mt-3 text-sm text-[var(--c-text)]">
          {staffOnly ? UI.staffOnlyState[locale] : UI.everyoneState[locale]}
        </p>
        {staffOnly && publishState === 'never' ? (
          <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.publishForTeam[locale]}</p>
        ) : null}
        <form action={setConferenceAudienceAction} className="mt-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="audience" value={staffOnly ? 'everyone' : 'staff'} />
          <button type="submit" className={staffOnly ? BTN_PRIMARY : BTN}>
            {staffOnly ? UI.openToEveryone[locale] : UI.closeToStaff[locale]}
          </button>
        </form>
      </section>

      {/* active */}
      <section className={CARD}>
        <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.active[locale]}</h2>
        <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.activeSub[locale]}</p>
        {activeSlug === slug ? (
          <p className="mt-3 text-sm text-[var(--c-live)]">{UI.isActive[locale]}</p>
        ) : (
          <form action={makeActiveAction} className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className={BTN}>{UI.makeActive[locale]}</button>
          </form>
        )}
      </section>

      {/* lifecycle */}
      <section className={CARD}>
        <h2 className="text-base font-semibold text-[var(--c-text)]">{UI.lifecycle[locale]}</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-[var(--c-text-soft)]">{UI.phase[locale]}</dt>
          <dd className="text-[var(--c-text)]">{summary.phase}</dd>
          <dt className="text-[var(--c-text-soft)]">{UI.slug[locale]}</dt>
          <dd className="text-[var(--c-text)]" dir="ltr">{slug}</dd>
        </dl>
        <p className="mt-1 text-[11px] text-[var(--c-text-faint)]">{UI.slugSub[locale]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={duplicateFromSettingsAction}>
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className={BTN} title={UI.duplicateSub[locale]}>{UI.duplicate[locale]}</button>
          </form>
          {offAir ? (
            <form action={restoreFromSettingsAction}>
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className={BTN}>{UI.restore[locale]}</button>
            </form>
          ) : (
            <form action={archiveFromSettingsAction}>
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className={BTN} title={UI.archiveSub[locale]}>{UI.archive[locale]}</button>
            </form>
          )}
        </div>
      </section>

      {/* danger */}
      <form action={deleteFromSettingsAction} className={`${CARD} border-[var(--c-danger)]/40`}>
        <input type="hidden" name="slug" value={slug} />
        <h2 className="text-base font-semibold text-[var(--c-danger-text)]">{UI.danger[locale]}</h2>
        <p className="mt-1 text-xs text-[var(--c-text-soft)]">{UI.dangerSub[locale]}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block min-w-60">
            <span className={LABEL}>{UI.slug[locale]}</span>
            <input name="confirm" className={INPUT} dir="ltr" autoComplete="off" placeholder={slug} />
          </label>
          <button type="submit" className={BTN_DANGER}>{UI.delete[locale]}</button>
        </div>
      </form>
    </div>
  );
};

export const dynamic = 'force-dynamic';

export default ConferenceSettingsPage;
