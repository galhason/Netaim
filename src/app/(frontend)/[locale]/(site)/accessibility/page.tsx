import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';

interface AccessibilityPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * The accessibility statement (הצהרת נגישות).
 *
 * Required by the Israeli service-accessibility regulations (תקנות
 * שוויון זכויות לאנשים עם מוגבלות — התאמות נגישות לשירות, התשע"ג-2013)
 * and aligned with the European Accessibility Act (EN 301 549). The
 * page names the standards the site follows (IS 5568 ↔ WCAG 2.1 AA),
 * what has actually been done, what is still limited, and — the part
 * the law is most specific about — a named accessibility coordinator
 * with a direct phone number, and a promise about response time.
 *
 * Static content by design: the statement is the same for every
 * visitor, in the visitor's language.
 */
const COPY = {
  eyebrow: { he: 'נגישות', en: 'Accessibility' },
  title: { he: 'הצהרת נגישות', en: 'Accessibility statement' },
  updated: {
    he: 'עודכן לאחרונה: אוגוסט 2026',
    en: 'Last updated: August 2026',
  },
  intro: {
    he: 'אנחנו רואים בנגישות חלק מהשירות עצמו, לא תוספת לו. האתר נבנה כך שכל אדם — כולל אנשים עם מוגבלות — יוכל להירשם לכנס, לעיין בתוכנית, לקבל עדכונים ולהשתתף בקהילת הנטוורקינג באופן עצמאי ושוויוני.',
    en: 'We treat accessibility as part of the service itself, not an add-on. The site is built so that every person — including people with disabilities — can register, browse the program, receive updates and take part in the networking community independently and equally.',
  },
  standardsTitle: { he: 'התקנים שאנחנו עומדים בהם', en: 'The standards we follow' },
  standards: {
    he: 'האתר הונגש בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולתקן הישראלי ת"י 5568 — המאמץ את הנחיות WCAG 2.1 של ארגון ה-W3C ברמה AA. בנוסף, האתר מיושר עם חוק הנגישות האירופאי (European Accessibility Act) באמצעות התקן האירופאי EN 301 549, המבוסס אף הוא על WCAG 2.1 AA — כך שהאתר עומד בדרישות הנגישות גם עבור משתתפים בינלאומיים מהאיחוד האירופאי.',
    en: 'The site conforms to the Israeli Equal Rights for Persons with Disabilities regulations (Service Accessibility Adjustments, 2013) and to Israeli Standard IS 5568, which adopts the W3C WCAG 2.1 guidelines at level AA. It is additionally aligned with the European Accessibility Act through EN 301 549, which is likewise based on WCAG 2.1 AA — so the site meets accessibility requirements for international participants from the EU as well.',
  },
  featuresTitle: { he: 'מה הונגש באתר', en: 'What has been made accessible' },
  features: {
    he: [
      'ניווט מלא במקלדת: כל כפתור, קישור וטופס ניתנים להפעלה ללא עכבר, עם סימון פוקוס ברור וקישור "דילוג לתוכן הראשי" בראש כל עמוד.',
      'תאימות לקוראי מסך: מבנה כותרות תקין, תוויות (aria-labels) לכל כפתורי הפעולה, טקסט חלופי לתמונות, ותוויות מקושרות לכל שדות הטפסים.',
      'שטחי מגע נוחים: כל פקד אינטראקטיבי בגודל 44 פיקסלים לפחות, לשימוש נוח בטלפון וביד אחת.',
      'ניגודיות צבעים העומדת ברמה AA, ומידע שאינו נמסר בצבע בלבד — כל סטטוס מלווה גם בטקסט.',
      'תמיכה בהעדפת "הפחתת תנועה" (prefers-reduced-motion): אנימציות ווידאו הרקע כבים אוטומטית למי שביקש זאת במערכת ההפעלה.',
      'האתר פועל גם ללא JavaScript: הרשמה, חיפוש, סינון והפעולות המרכזיות עובדות בטפסים רגילים.',
      'דו־לשוניות מלאה עברית/אנגלית עם כיווניות נכונה (RTL/LTR) וטקסט הניתן להגדלה עד 200% ללא אובדן תוכן.',
      'טפסים עם שדות מסומנים בבירור, הודעות שגיאה מפורשות, ואיסוף צורכי נגישות אישיים כבר בעת ההרשמה לכנס.',
    ],
    en: [
      'Full keyboard navigation: every button, link and form can be operated without a mouse, with a clear focus indicator and a "skip to main content" link at the top of every page.',
      'Screen-reader compatibility: a sound heading structure, aria-labels on all action buttons, alternative text for images, and labels attached to every form field.',
      'Comfortable touch targets: every interactive control is at least 44 pixels, for one-handed phone use.',
      'Color contrast meeting level AA, and information never conveyed by color alone — every status is accompanied by text.',
      'Respect for the reduced-motion preference: animations and the background video switch off automatically for anyone who asked for it in their operating system.',
      'The site works without JavaScript: registration, search, filtering and the core actions run on ordinary forms.',
      'Full Hebrew/English bilinguality with correct directionality (RTL/LTR), and text that scales to 200% without loss of content.',
      'Forms with clearly marked fields, explicit error messages, and personal accessibility needs collected at conference registration.',
    ],
  },
  limitsTitle: { he: 'מגבלות ידועות', en: 'Known limitations' },
  limits: {
    he: 'למרות מאמצינו להנגיש את כלל העמודים, ייתכן שיימצאו חלקים שטרם הונגשו במלואם — למשל תכנים שמעלים משתמשים אחרים (תמונות פרופיל, הודעות). אם נתקלתם בקושי כלשהו, נשמח שתפנו אלינו ונטפל בהקדם.',
    en: 'Despite our efforts to make every page accessible, some parts may not yet be fully covered — for example content uploaded by other users (profile photos, messages). If you encounter any difficulty, please contact us and we will address it promptly.',
  },
  officerTitle: { he: 'רכז הנגישות', en: 'Accessibility coordinator' },
  officerIntro: {
    he: 'לכל שאלה, תקלה או בקשה בענייני נגישות — באתר או באירוע עצמו — אפשר לפנות ישירות לרכז הנגישות שלנו:',
    en: 'For any question, issue or request regarding accessibility — on the site or at the event itself — you can contact our accessibility coordinator directly:',
  },
  officerName: { he: 'גל חסון', en: 'Gal Hason' },
  officerRole: { he: 'רכז נגישות', en: 'Accessibility coordinator' },
  phoneLabel: { he: 'טלפון', en: 'Phone' },
  response: {
    he: 'פניות בנושא נגישות מטופלות בעדיפות: נשיב בהקדם, ולא יאוחר מ־14 ימי עבודה. תיאום התאמות נגישות לאירוע עצמו (הושבה, הנגשת במה, שירותי תרגום) מומלץ לבצע מראש דרך רכז הנגישות או בשדה הנגישות שבטופס ההרשמה.',
    en: 'Accessibility inquiries are handled with priority: we will respond as soon as possible, and no later than 14 business days. Arrangements for the event itself (seating, stage access, interpretation services) are best coordinated in advance through the coordinator or via the accessibility field on the registration form.',
  },
  venueTitle: { he: 'נגישות המתחם', en: 'Venue accessibility' },
  venue: {
    he: 'פרטי הנגישות הפיזית של מתחם הכנס — חניות נכים, גישה לכיסאות גלגלים, שירותים נגישים ומידע חירום — מפורטים בעמוד "מידע למשתתפים" של הכנס הפעיל.',
    en: 'The physical accessibility of the conference venue — accessible parking, wheelchair access, accessible restrooms and emergency information — is detailed on the active conference’s "Information" page.',
  },
} as const;

const pick = (lang: Locale, entry: { he: string; en: string }): string =>
  lang === 'he' ? entry.he : entry.en;

export const generateMetadata = async ({
  params,
}: AccessibilityPageProps): Promise<Metadata> => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  return { title: pick(lang, COPY.title) };
};

const AccessibilityPage = async ({ params }: AccessibilityPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const he = lang === 'he';

  return (
    <main
      id="main-content"
      className="mx-auto flex max-w-3xl flex-col px-6 pb-28 pt-32 md:px-10"
    >
      <p className="text-xs font-medium uppercase tracking-[0.34em] text-accent">
        {pick(lang, COPY.eyebrow)}
      </p>
      <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-6xl">
        {pick(lang, COPY.title)}
      </h1>
      <p className="mt-3 text-sm text-text-secondary/80">
        {pick(lang, COPY.updated)}
      </p>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
        {pick(lang, COPY.intro)}
      </p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.standardsTitle)}
        </h2>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.standards)}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.featuresTitle)}
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 leading-relaxed text-text-secondary marker:text-accent">
          {(he ? COPY.features.he : COPY.features.en).map((feature) => (
            <li key={feature.slice(0, 24)}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.limitsTitle)}
        </h2>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.limits)}
        </p>
      </section>

      {/* The named coordinator — the regulation's most concrete demand. */}
      <section className="cine-card cine-float mt-10 rounded-3xl p-8">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.officerTitle)}
        </h2>
        <p className="mt-2 leading-relaxed text-text-secondary">
          {pick(lang, COPY.officerIntro)}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {pick(lang, COPY.officerName)}
            </p>
            <p className="text-sm text-text-secondary">
              {pick(lang, COPY.officerRole)}
            </p>
          </div>
          <a
            href="tel:+972584125390"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent px-5 text-accent transition-colors hover:bg-brand hover:text-brand-contrast"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            </svg>
            <span dir="ltr" className="tabular-nums">
              058-412-5390
            </span>
            <span className="sr-only">{pick(lang, COPY.phoneLabel)}</span>
          </a>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-text-secondary">
          {pick(lang, COPY.response)}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.venueTitle)}
        </h2>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.venue)}
        </p>
      </section>
    </main>
  );
};

export default AccessibilityPage;
