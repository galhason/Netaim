import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';
import { DEFAULT_RETENTION_DAYS, retentionDays } from '@/features/privacy';

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * The privacy policy.
 *
 * Written against the implementation rather than from a template: every
 * category listed below is a field that actually exists in the schema,
 * every claim about who can see what is a rule enforced in a service,
 * and the retention period is read from the same constant the deletion
 * command obeys — so the page cannot drift from the code by a single
 * number. Where the platform does something unusual (no analytics at
 * all; contact details closed by default; a directory nobody enters
 * without asking), the policy says so plainly instead of hedging.
 *
 * Required by section 11 of the Israeli Privacy Protection Law, which
 * asks that a person be told, when their information is collected, why
 * it is being collected, to whom it may be given, and that they may see
 * and correct it.
 */
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL ||
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
  '';

const CONTACT_PHONE = '058-412-5390';
const CONTACT_NAME = { he: 'גל חסון', en: 'Gal Hason' };

const COPY = {
  eyebrow: { he: 'פרטיות', en: 'Privacy' },
  title: { he: 'מדיניות פרטיות', en: 'Privacy policy' },
  updated: { he: 'עודכן: אוגוסט 2026', en: 'Updated: August 2026' },
  intro: {
    he: 'המסמך הזה מתאר בדיוק איזה מידע המערכת אוספת עליכם, למה, מי יכול לראות אותו, כמה זמן הוא נשמר ומה אתם יכולים לעשות בנוגע אליו. הוא נכתב מול הקוד עצמו — כל סעיף כאן משקף התנהגות שקיימת במערכת בפועל.',
    en: 'This document describes exactly what information the platform collects about you, why, who can see it, how long it is kept, and what you can do about it. It was written against the implementation itself — every statement here reflects behaviour that actually exists in the system.',
  },

  operatorTitle: { he: 'מי מפעיל את המערכת', en: 'Who operates the platform' },
  operator: {
    he: 'המערכת מופעלת עבור כנס של עמותת נטעים, על שרת פרטי בניהולו של מפעיל המערכת. פרטי הקשר מופיעים בסוף המסמך.',
    en: 'The platform is operated for a conference of the Netaim association, on a private server managed by the platform operator. Contact details appear at the end of this document.',
  },

  collectTitle: { he: 'מה אנחנו אוספים', en: 'What we collect' },
  collectIntro: {
    he: 'רק מה שנדרש כדי להפעיל את הכנס. אין באתר מערכת פרסום, אין פרופיילינג ואין איסוף מידע שאינו משמש את הכנס עצמו.',
    en: 'Only what running the conference requires. There is no advertising system, no profiling, and no collection of information that does not serve the conference itself.',
  },
  groups: {
    he: [
      {
        head: 'בעת ההרשמה',
        body: 'שם מלא, כתובת דוא"ל, מספר טלפון, שם הארגון והתפקיד בו, העדפת תזונה ובקשות נגישות (אם מסרתם). כתובת הדוא"ל משמשת גם כשם המשתמש.',
      },
      {
        head: 'חשבון המשתמש',
        body: 'סיסמה — נשמרת מוצפנת בלבד (scrypt עם מלח ייחודי), לעולם לא כטקסט; אימות דו־שלבי אם הפעלתם אותו; שפת הממשק המועדפת עליכם.',
      },
      {
        head: 'הפרופיל האישי',
        body: 'משפט הצגה קצר, טקסט "עליי", עד שני קישורים ותמונת פרופיל — כולם רשות, וכולם נמסרים על ידכם.',
      },
      {
        head: 'העדפות הפרטיות שלכם',
        body: 'האם להופיע בספריית המשתתפים (כבוי כברירת מחדל), אילו ערוצי קשר להסכים לפתוח לאחר אישור התחברות, והאם אתם פתוחים לקבל הצעות פגישה.',
      },
      {
        head: 'השתתפות בכנס',
        body: 'ההרשמה לכנס, ההרשמות לסדנאות ולפעילויות, ורישום הגעה (צ׳ק־אין) אם בוצע.',
      },
      {
        head: 'הנטוורקינג',
        body: 'בקשות התחברות (כולל הודעת הפתיחה אם צירפתם), חיבורים שנוצרו, הודעות הצ׳אט ביניכם, פגישות שקבעתם, וכן חסימות ודיווחי בטיחות שהגשתם.',
      },
      {
        head: 'תפעול המערכת',
        body: 'רשומת הסשן שלכם (מזהה מוצפן בלבד ומועד תפוגה), ההתראות שנשלחו אליכם, ומונים אנונימיים למניעת ניצול לרעה — אלה שומרים תמצית מוצפנת (hash) של המזהה, לא את המזהה עצמו.',
      },
    ],
    en: [
      {
        head: 'At registration',
        body: 'Full name, email address, phone number, organisation and role, dietary preference and accessibility needs (if you provided them). The email address also serves as your username.',
      },
      {
        head: 'Your account',
        body: 'A password — stored only in hashed form (scrypt with a unique salt), never as text; two-factor authentication if you enabled it; your preferred interface language.',
      },
      {
        head: 'Your profile',
        body: 'A short headline, an "about" text, up to two links and a profile photo — all optional, and all supplied by you.',
      },
      {
        head: 'Your privacy choices',
        body: 'Whether to appear in the participants directory (off by default), which contact channels you agree to open once you approve a connection, and whether you are open to meeting proposals.',
      },
      {
        head: 'Conference participation',
        body: 'Your registration, your places in workshops and activities, and check-in if it took place.',
      },
      {
        head: 'Networking',
        body: 'Connection requests (including your opening message, if you wrote one), the connections formed, the chat messages between you, meetings you arranged, and any blocks or safety reports you filed.',
      },
      {
        head: 'Platform operation',
        body: 'Your session record (a hashed identifier and an expiry only), the notices sent to you, and anonymous abuse counters — these store a hash of the identifier, not the identifier itself.',
      },
    ],
  },

  notCollectedTitle: { he: 'מה איננו אוספים', en: 'What we do not collect' },
  notCollected: {
    he: [
      'אין באתר Google Analytics, פיקסלים פרסומיים, מפות חום או הקלטות מסך — אף לא אחד מהם.',
      'איננו שומרים את כתובת ה-IP שלכם.',
      'אין עוגיות מעקב ואין עוגיות צד שלישי. כל עוד לא נכנסתם לחשבון — האתר אינו כותב לדפדפן שלכם אף עוגייה. אחרי הכניסה נכתבות שלוש בלבד: עוגיית הזיהוי שלכם (חתומה, לא נגישה ל-JavaScript, תקפה 30 יום), עוגיית שפה, ועוגיית שפה נוספת לצוות הניהול. שלושתן חיוניות לתפקוד — ולכן אין באתר באנר עוגיות.',
      'מלבד זאת הדפדפן שלכם זוכר לעצמו כמה העדפות תצוגה: הגדרות הנגישות שבחרתם, פריטים שסימנתם במועדפים, והודעות מערכת שכבר סגרתם או קראתם. אלה נשמרים במכשיר שלכם בלבד (localStorage), אינם נשלחים אלינו, ואינם מזהים אתכם. ניקוי נתוני הגלישה מוחק אותם.',
      'איננו מוכרים, משכירים או מעבירים מידע לצדדים שלישיים לצורכי שיווק. אין לנו מערכת דיוור שיווקי כלל.',
    ],
    en: [
      'There is no Google Analytics, no advertising pixel, no heatmap and no session recording on this site — not one.',
      'We do not store your IP address.',
      'There are no tracking cookies and no third-party cookies. Until you sign in, the site writes no cookie to your browser at all. After signing in it sets three, and only three: your sign-in cookie (signed, not readable by JavaScript, valid 30 days), a language cookie, and a second language cookie for the management team. All three are strictly necessary — which is why the site carries no cookie banner.',
      'Separately, your browser remembers a few display preferences for itself: the accessibility settings you chose, items you marked as favourites, and announcements you have already read or dismissed. These stay on your device (localStorage), are never sent to us, and do not identify you. Clearing your browsing data removes them.',
      'We do not sell, rent or transfer information to third parties for marketing. There is no marketing mailing system at all.',
    ],
  },

  whyTitle: { he: 'למה אנחנו משתמשים במידע', en: 'Why we use it' },
  why: {
    he: [
      'לנהל את ההרשמה שלכם לכנס ולפעילויות, כולל מקומות פנויים ורשימת המתנה.',
      'לאפשר לכם להיכנס לחשבונכם ולשמור על אבטחתו.',
      'להפעיל את זירת הנטוורקינג — אך ורק בהתאם להעדפות שסימנתם (ראו הסעיף הבא).',
      'לשלוח לכם עדכונים תפעוליים על הכנס: אישור הרשמה, שינויים בתוכנית, בקשות התחברות והודעות שקיבלתם. אלה הודעות שירות, לא פרסום.',
      'לשמור על בטיחות הקהילה — חסימות ודיווחים.',
    ],
    en: [
      'To manage your registration for the conference and its activities, including capacity and the waiting list.',
      'To let you sign in to your account and to keep it secure.',
      'To operate the networking area — strictly according to the preferences you set (see the next section).',
      'To send you operational updates about the conference: registration confirmation, programme changes, connection requests and messages you received. These are service messages, not advertising.',
      'To keep the community safe — blocks and reports.',
    ],
  },

  networkingTitle: {
    he: 'הנטוורקינג — מי רואה אתכם',
    en: 'Networking — who can see you',
  },
  networking: {
    he: [
      'ספריית המשתתפים פועלת בהצטרפות מרצון בלבד. אינכם מופיעים בה אלא אם סימנתם "כן" בשאלה שנשאלתם בטופס ההרשמה. אפשר לשנות את הבחירה בכל רגע מהפרופיל האישי, והשינוי חל מיד.',
      'גם אם בחרתם להופיע — מוצגים שם, תפקיד וארגון בלבד. הטלפון והדוא"ל שלכם סגורים.',
      'הספרייה מוצגת רק למשתתפי אותו כנס, לא לציבור ולא למנועי חיפוש.',
      'הטלפון והדוא"ל נחשפים רק אחרי שבקשת התחברות אושרה — ואז הדדית, לשני הצדדים, כולל אפשרות להוריד כרטיס איש קשר. אפשר לסגור כל ערוץ (טלפון, דוא"ל, WhatsApp) מהפרופיל בכל רגע; ערוץ שסגרתם אינו מוצג לצד השני כלל — גם לא באפור.',
      'חסימה היא שקטה ודו־כיוונית: מי שחסמתם אינו רואה אתכם, אינו יכול לפנות אליכם — ואינו מקבל שום חיווי שנחסם.',
      'תוכן הודעות הצ׳אט גלוי לשני הצדדים בלבד. גם צוות הניהול אינו יכול לקרוא אותו; לוח הבקרה מציג מספר הודעות בלבד.',
    ],
    en: [
      'The participants directory is opt-in only. You do not appear in it unless you answered "yes" to the question on the registration form. You can change that choice at any moment from your profile, and it applies immediately.',
      'Even if you chose to appear — only your name, role and organisation are shown. Your phone and email stay closed.',
      'The directory is shown only to participants of the same conference; not to the public and not to search engines.',
      'Phone and email are revealed only once a connection request is accepted — and then mutually, to both sides, including a downloadable contact card. You can close any channel (phone, email, WhatsApp) from your profile at any moment; a channel you closed is not shown to the other side at all — not even greyed out.',
      'Blocking is silent and two-way: someone you blocked cannot see you, cannot reach you — and receives no indication that they were blocked.',
      'Chat content is visible to the two parties only. Even the management team cannot read it; the console shows a message count and nothing more.',
    ],
  },

  retentionTitle: { he: 'כמה זמן נשמר המידע', en: 'How long we keep it' },
  retentionBody: {
    he: (days: number) =>
      `המידע נאסף עבור הכנס, ונמחק ${days} ימים לאחר סיומו. המחיקה מבוצעת ידנית על ידי מפעיל המערכת, ובה נמחקים: הודעות הצ׳אט, החיבורים, הפגישות, ההתראות, ההרשמות לפעילויות וההרשמה לכנס. לאחר מכן כל חשבון שאינו רשום לכנס אחר נמחק לחלוטין, לרבות הסשנים, החסימות והדיווחים שלו. חשבונות של אנשי צוות המחזיקים הרשאת ניהול נשמרים, כדי שלא ינעלו מחוץ למערכת.`,
    en: (days: number) =>
      `Information is collected for the conference and erased ${days} days after it ends. The erasure is performed manually by the platform operator, and removes chat messages, connections, meetings, notices, activity places and the registration itself. Every account not registered to another conference is then deleted entirely, including its sessions, blocks and reports. Accounts belonging to staff who hold a management permission are kept, so the team is not locked out of its own platform.`,
  },

  rightsTitle: { he: 'הזכויות שלכם', en: 'Your rights' },
  rights: {
    he: [
      'עיון — לבקש לראות את המידע השמור עליכם.',
      'תיקון — לתקן מידע שגוי. את רוב הפרטים אפשר לערוך בעצמכם בעמוד הפרופיל, מיד.',
      'מחיקה — לבקש שהמידע שלכם יימחק לפני מועד המחיקה הקבוע.',
      'שינוי החלטות פרטיות — להופיע או להיעלם מהספרייה, לפתוח או לסגור ערוצי קשר, ולכבות קבלת הצעות פגישה. השינויים חלים מיד ונאכפים בשרת.',
    ],
    en: [
      'Access — to ask to see the information held about you.',
      'Correction — to correct inaccurate information. Most details you can edit yourself on the profile page, immediately.',
      'Deletion — to ask that your information be erased before the scheduled date.',
      'Changing your privacy choices — appear in or disappear from the directory, open or close contact channels, and switch off meeting proposals. Changes apply immediately and are enforced on the server.',
    ],
  },
  rightsHow: {
    he: 'לפנייה בנושא עיון, תיקון או מחיקה — השתמשו בפרטי הקשר שבסוף המסמך. נשיב בהקדם, ולא יאוחר מ־30 יום.',
    en: 'For access, correction or deletion requests, use the contact details at the end of this document. We will respond as soon as possible, and no later than 30 days.',
  },

  securityTitle: { he: 'אבטחת המידע', en: 'Security' },
  security: {
    he: [
      'התקשורת מוצפנת ב-HTTPS.',
      'סיסמאות נשמרות מוצפנות בלבד; עוגיית הזיהוי חתומה ואינה נגישה ל-JavaScript.',
      'קיימת הגבלת קצב על ניסיונות התחברות ועל פעולות שניתן לנצל לרעה.',
      'הרשאות הצוות מוגדרות לפי תפקיד, וכל פעולת ניהול נרשמת ביומן שאי אפשר לערוך או למחוק.',
      'מסד הנתונים אינו חשוף לאינטרנט.',
    ],
    en: [
      'Traffic is encrypted with HTTPS.',
      'Passwords are stored hashed only; the sign-in cookie is signed and not readable by JavaScript.',
      'Rate limiting protects sign-in attempts and actions that could be abused.',
      'Staff permissions are role-based, and every management action is written to a log that cannot be edited or deleted.',
      'The database is not exposed to the internet.',
    ],
  },

  locationTitle: { he: 'היכן המידע נשמר', en: 'Where the information is stored' },
  location: {
    he: 'המידע נשמר על שרת ייעודי באירופה, ושירות הגנה מפני תקיפות (CDN) מתווך את התעבורה. אלה ספקי תשתית בלבד — הם אינם עושים במידע שימוש משלהם.',
    en: 'Information is stored on a dedicated server in Europe, with a protection/CDN service mediating traffic. These are infrastructure providers only — they make no use of the information themselves.',
  },

  contactTitle: { he: 'יצירת קשר', en: 'Contact' },
  contactBody: {
    he: 'לכל שאלה או בקשה בנושא פרטיות:',
    en: 'For any privacy question or request:',
  },
  role: { he: 'מפעיל המערכת', en: 'Platform operator' },
  seeAlso: { he: 'ראו גם', en: 'See also' },
  terms: { he: 'תנאי שימוש', en: 'Terms of use' },
  accessibility: { he: 'הצהרת נגישות', en: 'Accessibility statement' },
} as const;

const pick = (lang: Locale, entry: { he: string; en: string }): string =>
  lang === 'he' ? entry.he : entry.en;

export const generateMetadata = async ({
  params,
}: PrivacyPageProps): Promise<Metadata> => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  return { title: pick(lang, COPY.title) };
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mt-10">
    <h2 className="font-display text-2xl font-semibold text-text-primary">
      {title}
    </h2>
    {children}
  </section>
);

const List = ({ items }: { items: readonly string[] }) => (
  <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 leading-relaxed text-text-secondary marker:text-accent">
    {items.map((item) => (
      <li key={item.slice(0, 30)}>{item}</li>
    ))}
  </ul>
);

const PrivacyPage = async ({ params }: PrivacyPageProps) => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  setRequestLocale(lang);
  const he = lang === 'he';
  /*
   * Read from the same source the deletion command obeys, so the number
   * a participant is promised here cannot drift from the number the
   * platform actually enforces.
   */
  const days = retentionDays() || DEFAULT_RETENTION_DAYS;

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
      <p className="mt-6 text-lg leading-relaxed text-text-secondary">
        {pick(lang, COPY.intro)}
      </p>

      <Section title={pick(lang, COPY.operatorTitle)}>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.operator)}
        </p>
      </Section>

      <Section title={pick(lang, COPY.collectTitle)}>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.collectIntro)}
        </p>
        <dl className="mt-4 flex flex-col gap-4">
          {(he ? COPY.groups.he : COPY.groups.en).map((group) => (
            <div key={group.head}>
              <dt className="font-medium text-text-primary">{group.head}</dt>
              <dd className="mt-1 leading-relaxed text-text-secondary">
                {group.body}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={pick(lang, COPY.notCollectedTitle)}>
        <List items={he ? COPY.notCollected.he : COPY.notCollected.en} />
      </Section>

      <Section title={pick(lang, COPY.whyTitle)}>
        <List items={he ? COPY.why.he : COPY.why.en} />
      </Section>

      <Section title={pick(lang, COPY.networkingTitle)}>
        <List items={he ? COPY.networking.he : COPY.networking.en} />
      </Section>

      <Section title={pick(lang, COPY.retentionTitle)}>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {he ? COPY.retentionBody.he(days) : COPY.retentionBody.en(days)}
        </p>
      </Section>

      <Section title={pick(lang, COPY.rightsTitle)}>
        <List items={he ? COPY.rights.he : COPY.rights.en} />
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.rightsHow)}
        </p>
      </Section>

      <Section title={pick(lang, COPY.securityTitle)}>
        <List items={he ? COPY.security.he : COPY.security.en} />
      </Section>

      <Section title={pick(lang, COPY.locationTitle)}>
        <p className="mt-3 leading-relaxed text-text-secondary">
          {pick(lang, COPY.location)}
        </p>
      </Section>

      <section className="cine-card cine-float mt-10 rounded-3xl p-8">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {pick(lang, COPY.contactTitle)}
        </h2>
        <p className="mt-2 leading-relaxed text-text-secondary">
          {pick(lang, COPY.contactBody)}
        </p>
        <p className="mt-4 text-lg font-semibold text-text-primary">
          {pick(lang, CONTACT_NAME)}
        </p>
        <p className="text-sm text-text-secondary">{pick(lang, COPY.role)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {CONTACT_EMAIL ? (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-11 items-center rounded-full border border-accent px-5 text-accent transition-colors hover:bg-brand hover:text-brand-contrast"
            >
              {CONTACT_EMAIL}
            </a>
          ) : null}
          <a
            href="tel:+972584125390"
            className="inline-flex min-h-11 items-center rounded-full border border-accent px-5 text-accent transition-colors hover:bg-brand hover:text-brand-contrast"
          >
            <span dir="ltr" className="tabular-nums">
              {CONTACT_PHONE}
            </span>
          </a>
        </div>
      </section>

      <p className="mt-8 text-sm text-text-secondary">
        {pick(lang, COPY.seeAlso)}:{' '}
        <Link
          href={`/${lang}/terms`}
          className="text-accent underline-offset-4 hover:underline"
        >
          {pick(lang, COPY.terms)}
        </Link>
        {' · '}
        <Link
          href={`/${lang}/accessibility`}
          className="text-accent underline-offset-4 hover:underline"
        >
          {pick(lang, COPY.accessibility)}
        </Link>
      </p>
    </main>
  );
};

export default PrivacyPage;
