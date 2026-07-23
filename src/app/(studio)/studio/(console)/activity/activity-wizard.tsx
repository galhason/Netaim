'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import type { SessionType } from '@/features/program';
import type { ResolvedSpeaker, SpeakerCandidate } from '@/features/speakers';
import { saveActivityAction } from './actions';
import SpeakerPicker from './speaker-picker';

export interface WizardInitial {
  sessionId?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  sessionType?: SessionType;
  speakers?: ResolvedSpeaker[];
  startsAt?: string;
  endsAt?: string;
  floor?: string;
  track?: string;
  language?: string;
  capacity?: string;
  waitlistEnabled?: boolean;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  allowCancellation?: boolean;
  cancellationDeadline?: string;
  featured?: boolean;
}

interface Props {
  locale: Locale;
  slug: string;
  candidates: SpeakerCandidate[];
  initial?: WizardInitial;
}

const SESSION_TYPES: SessionType[] = [
  'talk',
  'workshop',
  'keynote',
  'tour',
  'break',
];

const TYPE_LABELS: Record<SessionType, Record<Locale, string>> = {
  talk: { he: 'הרצאה', en: 'Lecture' },
  workshop: { he: 'סדנה', en: 'Workshop' },
  keynote: { he: 'מליאה', en: 'Keynote' },
  tour: { he: 'סיור', en: 'Tour' },
  break: { he: 'הפסקה', en: 'Break' },
};

/* Registration is meaningful only for types that fill seats. */
const REGISTRABLE: Record<SessionType, boolean> = {
  talk: true,
  workshop: true,
  keynote: true,
  tour: true,
  break: false,
};

const T = (locale: Locale) => ({
  newTitle: locale === 'he' ? 'פעילות חדשה' : 'New activity',
  editTitle: locale === 'he' ? 'עריכת פעילות' : 'Edit activity',
  newSub:
    locale === 'he'
      ? 'חמישה צעדים קצרים — מהיסודות ועד לפרסום.'
      : 'Five short steps — from the essentials to publishing.',
  back: locale === 'he' ? 'חזרה' : 'Back',
  cancel: locale === 'he' ? 'ביטול' : 'Cancel',
  next: locale === 'he' ? 'הבא' : 'Next',
  save: locale === 'he' ? 'שמירה ופרסום' : 'Save & publish',
  saveEdit: locale === 'he' ? 'שמירת השינויים' : 'Save changes',

  steps: [
    { he: 'יסודות', en: 'Basics' },
    { he: 'לוח זמנים', en: 'Schedule' },
    { he: 'דובר', en: 'Speaker' },
    { he: 'הרשמה', en: 'Registration' },
    { he: 'פרסום', en: 'Publish' },
  ] as { he: string; en: string }[],

  fTitle: locale === 'he' ? 'שם הפעילות' : 'Activity title',
  fTitlePh: locale === 'he' ? 'לדוגמה: עתיד הבינה המלאכותית בשירות הציבורי' : 'e.g. The future of AI in public service',
  fType: locale === 'he' ? 'סוג הפעילות' : 'Activity type',
  fSubtitle: locale === 'he' ? 'כותרת משנה' : 'Subtitle',
  fSubtitlePh: locale === 'he' ? 'משפט קצר שמלווה את הכותרת' : 'A short line beside the title',
  fDesc: locale === 'he' ? 'תיאור' : 'Description',
  fDescPh: locale === 'he' ? 'על מה הפעילות, למי היא מיועדת ומה ייקחו ממנה המשתתפים.' : 'What it covers, who it is for and what participants take away.',
  fFeatured: locale === 'he' ? 'הצגה בפעילויות הנבחרות בעמוד הבית' : 'Feature on the landing page',

  fStarts: locale === 'he' ? 'תחילת הפעילות' : 'Starts at',
  fEnds: locale === 'he' ? 'סיום הפעילות' : 'Ends at',
  fFloor: locale === 'he' ? 'קומה / אזור' : 'Floor / area',
  fFloorPh: locale === 'he' ? 'לדוגמה: קומה 2, אולם הכחול' : 'e.g. Floor 2, Blue Hall',
  fTrack: locale === 'he' ? 'מסלול' : 'Track',
  fTrackPh: locale === 'he' ? 'לדוגמה: מדיניות, טכנולוגיה' : 'e.g. Policy, Technology',
  fLang: locale === 'he' ? 'שפת הפעילות' : 'Language',
  fLangPh: locale === 'he' ? 'לדוגמה: עברית' : 'e.g. Hebrew',

  speakerLead:
    locale === 'he'
      ? 'בחרו את הדובר שמוביל את הפעילות. אפשר להשאיר ריק ולשייך מאוחר יותר.'
      : 'Choose the speaker leading this activity. You can leave it empty and assign later.',
  fSpeaker: locale === 'he' ? 'דובר מוביל' : 'Leading speaker',
  noSpeaker: locale === 'he' ? 'ללא דובר משויך' : 'No speaker assigned',
  speakersEmpty:
    locale === 'he'
      ? 'עדיין אין דוברים בכנס. הוסיפו דוברים דרך עורך הכנס ותוכלו לשייך אותם כאן.'
      : 'No speakers yet. Add speakers from the conference editor to assign them here.',

  regLead:
    locale === 'he'
      ? 'הגדירו כמה מקומות יש, ומה קורה כשהם נגמרים.'
      : 'Set how many seats there are, and what happens when they run out.',
  fCapacity: locale === 'he' ? 'קיבולת (מספר מקומות)' : 'Capacity (seats)',
  fCapacityPh: locale === 'he' ? 'ריק = ללא הגבלה' : 'Empty = unlimited',
  fCapacityHint:
    locale === 'he'
      ? 'השאירו ריק לפעילות ללא הגבלת מקומות.'
      : 'Leave empty for an activity with no seat limit.',
  fWaitlist: locale === 'he' ? 'פתיחת רשימת המתנה כשמתמלא' : 'Open a waiting list when full',
  fRegOpens: locale === 'he' ? 'פתיחת ההרשמה' : 'Registration opens',
  fRegCloses: locale === 'he' ? 'סגירת ההרשמה' : 'Registration closes',
  regBreakNote:
    locale === 'he'
      ? 'הפסקות אינן דורשות הרשמה — אפשר לדלג על הצעד הזה.'
      : 'Breaks need no registration — you can skip this step.',

  pubLead:
    locale === 'he'
      ? 'הגדרות אחרונות לפני הפרסום, וסקירה מהירה של הפעילות.'
      : 'A last few settings before publishing, and a quick review.',
  fAllowCancel: locale === 'he' ? 'לאפשר למשתתפים לבטל הרשמה' : 'Let participants cancel',
  fCancelDeadline: locale === 'he' ? 'מועד אחרון לביטול' : 'Cancellation deadline',
  reviewTitle: locale === 'he' ? 'סקירה' : 'Review',
  none: locale === 'he' ? '—' : '—',
  unlimited: locale === 'he' ? 'ללא הגבלה' : 'Unlimited',
  yes: locale === 'he' ? 'כן' : 'Yes',
  no: locale === 'he' ? 'לא' : 'No',
  titleRequired: locale === 'he' ? 'יש להזין שם לפעילות.' : 'Please enter an activity title.',
});

const label = 'mb-1.5 block text-sm font-medium text-[var(--c-text)]';
const field =
  'w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] px-3 py-2.5 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)] outline-none transition-colors focus:border-[var(--c-bronze)]';
const hint = 'mt-1.5 text-xs text-[var(--c-text-faint)]';

const Check = ({
  name,
  defaultChecked,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  children: ReactNode;
}) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3 text-sm text-[var(--c-text)]">
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      className="size-4 accent-[var(--c-bronze)]"
    />
    {children}
  </label>
);

const ActivityWizard = ({ locale, slug, candidates, initial }: Props) => {
  const t = T(locale);
  const editing = Boolean(initial?.sessionId);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<SessionType>(initial?.sessionType ?? 'talk');
  const [capacity, setCapacity] = useState(initial?.capacity ?? '');
  const [speakerCount, setSpeakerCount] = useState(
    initial?.speakers?.length ?? 0,
  );
  const [touched, setTouched] = useState(false);

  const last = t.steps.length - 1;
  const registrable = REGISTRABLE[type];

  const titleOk = title.trim() !== '';
  const canAdvance = step !== 0 || titleOk;

  const goNext = () => {
    if (step === 0 && !titleOk) {
      setTouched(true);
      return;
    }
    setStep((s) => Math.min(last, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--c-text-faint)]">
          {editing ? t.editTitle : t.newTitle}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium text-[var(--c-text)]">
          {title.trim() || (editing ? t.editTitle : t.newTitle)}
        </h1>
        <p className="mt-1 text-sm text-[var(--c-text-soft)]">{t.newSub}</p>
      </header>

      {/* Step rail */}
      <ol className="flex items-center gap-1.5">
        {t.steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.en} className="flex flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (i <= step || titleOk) setStep(i);
                }}
                className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-start"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid size-6 flex-none place-items-center rounded-full text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[var(--c-bronze)] text-[#161006]'
                        : done
                          ? 'bg-[var(--c-bronze)]/25 text-[var(--c-bronze)]'
                          : 'bg-[rgba(255,255,255,0.06)] text-[var(--c-text-faint)]'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span
                    className={`hidden truncate text-xs sm:block ${
                      active ? 'text-[var(--c-text)]' : 'text-[var(--c-text-faint)]'
                    }`}
                  >
                    {s[locale]}
                  </span>
                </span>
                <span
                  className={`h-0.5 w-full rounded-full transition-colors ${
                    active || done
                      ? 'bg-[var(--c-bronze)]/60'
                      : 'bg-[rgba(255,255,255,0.07)]'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>

      <form action={saveActivityAction} className="flex flex-col gap-6">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="contentLocale" value={locale} />
        {initial?.sessionId ? (
          <input type="hidden" name="sessionId" value={initial.sessionId} />
        ) : null}
        {/* controlled values mirrored into the form */}
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="sessionType" value={type} />
        <input type="hidden" name="capacity" value={capacity} />

        <div className="rounded-2xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.015)] p-6">
          {/* STEP 0 — Basics */}
          <section className={step === 0 ? 'flex flex-col gap-5' : 'hidden'}>
            <div>
              <label className={label} htmlFor="w-title">
                {t.fTitle}
              </label>
              <input
                id="w-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t.fTitlePh}
                className={field}
              />
              {touched && !titleOk ? (
                <p className="mt-1.5 text-xs text-rose-300">{t.titleRequired}</p>
              ) : null}
            </div>
            <div>
              <span className={label}>{t.fType}</span>
              <div className="flex flex-wrap gap-2">
                {SESSION_TYPES.map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => setType(ty)}
                    className={`rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                      type === ty
                        ? 'border-[var(--c-bronze)] bg-[var(--c-bronze)]/12 text-[var(--c-text)]'
                        : 'border-[var(--c-line)] text-[var(--c-text-soft)] hover:text-[var(--c-text)]'
                    }`}
                  >
                    {TYPE_LABELS[ty][locale]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label} htmlFor="w-subtitle">
                {t.fSubtitle}
              </label>
              <input
                id="w-subtitle"
                name="subtitle"
                defaultValue={initial?.subtitle ?? ''}
                placeholder={t.fSubtitlePh}
                className={field}
              />
            </div>
            <div>
              <label className={label} htmlFor="w-desc">
                {t.fDesc}
              </label>
              <textarea
                id="w-desc"
                name="description"
                rows={4}
                defaultValue={initial?.description ?? ''}
                placeholder={t.fDescPh}
                className={`${field} resize-y`}
              />
            </div>
            <Check name="featured" defaultChecked={initial?.featured}>
              {t.fFeatured}
            </Check>
          </section>

          {/* STEP 1 — Schedule */}
          <section className={step === 1 ? 'flex flex-col gap-5' : 'hidden'}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="w-starts">
                  {t.fStarts}
                </label>
                <input
                  id="w-starts"
                  type="datetime-local"
                  name="startsAt"
                  defaultValue={initial?.startsAt ?? ''}
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="w-ends">
                  {t.fEnds}
                </label>
                <input
                  id="w-ends"
                  type="datetime-local"
                  name="endsAt"
                  defaultValue={initial?.endsAt ?? ''}
                  className={field}
                />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="w-floor">
                {t.fFloor}
              </label>
              <input
                id="w-floor"
                name="floor"
                defaultValue={initial?.floor ?? ''}
                placeholder={t.fFloorPh}
                className={field}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="w-track">
                  {t.fTrack}
                </label>
                <input
                  id="w-track"
                  name="track"
                  defaultValue={initial?.track ?? ''}
                  placeholder={t.fTrackPh}
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="w-lang">
                  {t.fLang}
                </label>
                <input
                  id="w-lang"
                  name="language"
                  defaultValue={initial?.language ?? ''}
                  placeholder={t.fLangPh}
                  className={field}
                />
              </div>
            </div>
          </section>

          {/* STEP 2 — Speakers */}
          <section className={step === 2 ? 'flex flex-col gap-5' : 'hidden'}>
            <SpeakerPicker
              slug={slug}
              locale={locale}
              candidates={candidates}
              initial={initial?.speakers}
              onCountChange={setSpeakerCount}
            />
          </section>

          {/* STEP 3 — Registration */}
          <section className={step === 3 ? 'flex flex-col gap-5' : 'hidden'}>
            <p className="text-sm text-[var(--c-text-soft)]">
              {registrable ? t.regLead : t.regBreakNote}
            </p>
            <div>
              <label className={label} htmlFor="w-capacity">
                {t.fCapacity}
              </label>
              <input
                id="w-capacity"
                type="number"
                min={0}
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={t.fCapacityPh}
                className={field}
              />
              <p className={hint}>{t.fCapacityHint}</p>
            </div>
            <Check name="waitlistEnabled" defaultChecked={initial?.waitlistEnabled}>
              {t.fWaitlist}
            </Check>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="w-regopens">
                  {t.fRegOpens}
                </label>
                <input
                  id="w-regopens"
                  type="datetime-local"
                  name="registrationOpensAt"
                  defaultValue={initial?.registrationOpensAt ?? ''}
                  className={field}
                />
              </div>
              <div>
                <label className={label} htmlFor="w-regcloses">
                  {t.fRegCloses}
                </label>
                <input
                  id="w-regcloses"
                  type="datetime-local"
                  name="registrationClosesAt"
                  defaultValue={initial?.registrationClosesAt ?? ''}
                  className={field}
                />
              </div>
            </div>
          </section>

          {/* STEP 4 — Publish */}
          <section className={step === 4 ? 'flex flex-col gap-5' : 'hidden'}>
            <p className="text-sm text-[var(--c-text-soft)]">{t.pubLead}</p>
            <Check
              name="allowCancellation"
              defaultChecked={initial?.allowCancellation ?? true}
            >
              {t.fAllowCancel}
            </Check>
            <div>
              <label className={label} htmlFor="w-canceldeadline">
                {t.fCancelDeadline}
              </label>
              <input
                id="w-canceldeadline"
                type="datetime-local"
                name="cancellationDeadline"
                defaultValue={initial?.cancellationDeadline ?? ''}
                className={field}
              />
            </div>

            <div className="rounded-xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--c-text-faint)]">
                {t.reviewTitle}
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                <Row k={t.fTitle} v={title.trim() || t.none} />
                <Row k={t.fType} v={TYPE_LABELS[type][locale]} />
                <Row
                  k={t.fSpeaker}
                  v={
                    speakerCount > 0 ? String(speakerCount) : t.none
                  }
                />
                <Row
                  k={t.fCapacity}
                  v={capacity.trim() ? capacity.trim() : t.unlimited}
                />
              </dl>
            </div>
          </section>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-3">
          {step === 0 ? (
            <Link
              href="/studio/activity"
              className="rounded-lg border border-[var(--c-line)] px-4 py-2 text-sm text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
            >
              {t.cancel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-[var(--c-line)] px-4 py-2 text-sm text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
            >
              {t.back}
            </button>
          )}

          {step < last ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="rounded-lg bg-[var(--c-bronze)] px-6 py-2 text-sm font-medium text-[#161006] disabled:opacity-40"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="submit"
              className="rounded-lg bg-[var(--c-bronze)] px-6 py-2 text-sm font-medium text-[#161006]"
            >
              {editing ? t.saveEdit : t.save}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt className="text-[var(--c-text-faint)]">{k}</dt>
    <dd className="truncate text-[var(--c-text)]">{v}</dd>
  </>
);

export default ActivityWizard;
