import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import {
  IconArrow,
  IconBell,
  IconBulb,
  IconCalendar,
  IconMic,
  IconPin,
  IconUsers,
} from '@/features/conference';
import { PageLeaves } from './botanical';
import { t } from './copy';

interface Props {
  locale: Locale;
  /* Where signing in happens: the conference's own entrance. */
  enterHref: string;
  signInHref: string;
}

/*
 * The example day. Static on purpose, and labelled as such: this is a
 * picture of what the feature does, not anyone's data. The four rows are
 * the four kinds of thing a day here is made of, in the order a day
 * usually runs.
 */
const PREVIEW: {
  time: string;
  type: Record<Locale, string>;
  title: Record<Locale, string>;
  place: Record<Locale, string>;
  icon: (cls: string) => ReactNode;
  tone: string;
}[] = [
  {
    time: '09:00',
    type: { he: 'אירוע', en: 'Event' },
    title: { he: 'פתיחת הכנס', en: 'Opening session' },
    place: { he: 'אולם ראשי', en: 'Main hall' },
    icon: (cls) => <IconCalendar className={cls} />,
    tone: 'bg-[var(--x-ok-wash)] text-[#1f7a45]',
  },
  {
    time: '10:00',
    type: { he: 'הרצאה', en: 'Lecture' },
    title: { he: 'בניית קהילה בעולם משתנה', en: 'Building community in a changing world' },
    place: { he: 'אולם 4 · קומה 2', en: 'Hall 4 · Floor 2' },
    icon: (cls) => <IconMic className={cls} />,
    tone: 'bg-[var(--x-primary-wash)] text-[var(--x-primary-strong)]',
  },
  {
    time: '11:15',
    type: { he: 'סדנה', en: 'Workshop' },
    title: { he: 'כלים ליצירת חיבורים חדשים', en: 'Tools for new connections' },
    place: { he: 'חדר סדנאות 3', en: 'Workshop room 3' },
    icon: (cls) => <IconBulb className={cls} />,
    tone: 'bg-[var(--x-warn-wash)] text-[#9a5b06]',
  },
  {
    time: '13:30',
    type: { he: 'Networking', en: 'Networking' },
    title: { he: 'מפגש Networking', en: 'Networking meetup' },
    place: { he: 'אזור ה-Networking', en: 'Networking area' },
    icon: (cls) => <IconUsers className={cls} />,
    tone: 'bg-[#e7f1fb] text-[#2b6aa3]',
  },
];

/*
 * The door.
 *
 * A gate that says only "sign in" tells a person nothing about what is
 * behind it. This one shows them: the promise in one line, an example of
 * the day they will get, and the three things it does for them — so the
 * button at the top is a choice rather than an obstacle.
 */
const SignInPreview = ({ locale, enterHref, signInHref }: Props) => {
  const benefits: { icon: ReactNode; text: string }[] = [
    { icon: <IconCalendar className="size-6" />, text: t(locale, 'benefitFocus') },
    { icon: <IconBell className="size-6" />, text: t(locale, 'benefitAlert') },
    { icon: <IconPin className="size-6" />, text: t(locale, 'benefitWhere') },
  ];

  return (
    <main
      id="main-content"
      className="relative mx-auto max-w-6xl overflow-hidden px-5 pb-20 pt-10 md:px-10 md:pt-14"
    >
      <PageLeaves />

      <div className="relative mx-auto max-w-2xl text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.22em] rtl:tracking-normal text-[var(--x-primary)]">
          {t(locale, 'signInEyebrow')}
        </p>
        <h1 className="mt-3 font-display text-[2.1rem] font-extrabold leading-[1.1] tracking-tight text-[var(--x-ink)] sm:text-[2.6rem] md:text-[3rem]">
          {t(locale, 'signInTitle')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-[var(--x-soft)]">
          {t(locale, 'signInBody')}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={enterHref}
            className="inline-flex min-h-12 items-center gap-2 rounded-[var(--x-r-pill)] bg-[var(--x-primary)] px-7 text-[15px] font-semibold text-[var(--x-primary-ink)] shadow-[0_10px_30px_rgba(110,86,207,0.28)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[var(--x-primary-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)] motion-reduce:transition-none"
          >
            {t(locale, 'signInCta')}
            <IconArrow className="size-4 rtl:rotate-180" />
          </a>
          <a
            href={signInHref}
            className="inline-flex min-h-12 items-center rounded-[var(--x-r-pill)] px-4 text-[14px] font-medium text-[var(--x-primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
          >
            {t(locale, 'signInAlready')}
          </a>
        </div>
      </div>

      {/* The example day. */}
      <section
        aria-labelledby="preview-title"
        className="relative mx-auto mt-12 max-w-2xl rounded-[calc(var(--x-r-card)+4px)] border border-[var(--x-line)] bg-[var(--x-surface)] p-5 shadow-[var(--x-shadow)] sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="preview-title"
            className="font-display text-lg font-bold tracking-tight text-[var(--x-ink)]"
          >
            {t(locale, 'previewTitle')}
          </h2>
          <span className="rounded-[var(--x-r-pill)] border border-dashed border-[var(--x-line-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] rtl:tracking-normal text-[var(--x-faint)]">
            {t(locale, 'previewTag')}
          </span>
        </div>

        <ol className="relative mt-5 flex flex-col gap-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 top-4 start-[52px] w-px bg-[var(--x-line-strong)] sm:start-[60px]"
          />
          {PREVIEW.map((row) => (
            <li
              key={row.time}
              className="grid grid-cols-[44px_16px_1fr] items-center gap-2 sm:grid-cols-[52px_16px_1fr] sm:gap-3"
            >
              <span className="text-end text-[13px] font-semibold tabular-nums text-[var(--x-soft)]">
                {row.time}
              </span>
              <span className="relative flex justify-center">
                <span className="size-2.5 rounded-full bg-[var(--x-primary)] ring-4 ring-[var(--x-surface)]" />
              </span>
              <div className="flex items-center gap-3 rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] px-3.5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[var(--x-ink)]">
                    {row.title[locale]}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--x-soft)]">
                    <IconPin className="size-3.5 text-[var(--x-faint)]" />
                    {row.place[locale]}
                  </span>
                </span>
                <span className={`hidden shrink-0 rounded-[var(--x-r-pill)] px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${row.tone}`}>
                  {row.type[locale]}
                </span>
                <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] ${row.tone}`}>
                  {row.icon('size-5')}
                </span>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-center font-display text-[15px] italic text-[var(--x-primary)]">
          {t(locale, 'previewFoot')}
        </p>
      </section>

      <ul className="relative mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-3 sm:gap-4">
        {benefits.map((benefit) => (
          <li key={benefit.text} className="flex flex-col items-center gap-2.5 px-2">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--x-primary-wash)] text-[var(--x-primary)]">
              {benefit.icon}
            </span>
            <span className="text-[14px] leading-snug text-[var(--x-ink)]">{benefit.text}</span>
          </li>
        ))}
      </ul>

    </main>
  );
};

export default SignInPreview;
