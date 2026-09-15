import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { isSupportedLocale, type Locale } from '@/config/locales';

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * Terms of use.
 *
 * A conference platform where people write to each other needs house
 * rules — not because the law demands a wall of text, but because the
 * platform already has a block button, a report queue and the power to
 * suspend an account, and using those powers without having stated them
 * is worse than not having them.
 *
 * Deliberately short and readable. Every rule here corresponds to
 * something the system actually does: the blocking is real, the
 * reporting reaches a real queue, the suspension is a real capability
 * in the Studio, and the deletion schedule is the one the privacy
 * policy states and the retention command enforces.
 */
const COPY = {
  eyebrow: { he: 'תנאים', en: 'Terms' },
  title: { he: 'תנאי שימוש', en: 'Terms of use' },
  updated: { he: 'עודכן: אוגוסט 2026', en: 'Updated: August 2026' },
  intro: {
    he: 'התנאים האלה חלים על השימוש באתר הכנס ובאזור האישי שבו. השימוש באתר מהווה הסכמה להם. כתבנו אותם קצר ובשפה ברורה — הם לא נועדו להסתיר משהו.',
    en: 'These terms apply to the use of the conference site and the personal area within it. Using the site means accepting them. We kept them short and plain — they are not meant to hide anything.',
  },

  sections: {
    he: [
      {
        head: 'מה השירות',
        body: 'האתר משמש להרשמה לכנס ולפעילויות שבו, לצפייה בתוכנית ובמידע, וליצירת קשר מקצועי בין משתתפי הכנס. השירות ניתן ללא תשלום.',
      },
      {
        head: 'החשבון שלכם',
        body: 'החשבון אישי. אתם אחראים לשמור על הסיסמה ולא לשתף אותה. הפרטים שאתם מוסרים צריכים להיות נכונים — במיוחד השם והארגון, שמשתתפים אחרים עשויים לראות. אם נודע לכם על שימוש לא מורשה בחשבונכם, יש להודיע לנו.',
      },
      {
        head: 'התוכן שאתם כותבים',
        body: 'משפט ההצגה, טקסט האודות, הקישורים, תמונת הפרופיל וההודעות שאתם שולחים — שלכם, ובאחריותכם. אתם מצהירים שיש לכם זכות לפרסם אותם ושאינם מפרים זכויות של אחרים.',
      },
      {
        head: 'התנהגות בקהילה',
        body: 'זירת הנטוורקינג נועדה להיכרות מקצועית. אסורים: הטרדה, איומים, גזענות או הסתה, תוכן מיני, התחזות לאדם או לארגון, שליחת ספאם או פרסום מסחרי, איסוף פרטי משתתפים לשימוש חיצוני, וניסיון לעקוף הגדרות פרטיות של אחרים.',
      },
      {
        head: 'חסימה ודיווח',
        body: 'אתם יכולים לחסום כל משתתף בכל רגע — החסימה שקטה, דו־כיוונית ומיידית, והצד השני אינו מקבל על כך חיווי. אתם יכולים גם לדווח על התנהגות פוגענית; דיווח מגיע לצוות הכנס ומטופל על ידי אדם.',
      },
      {
        head: 'סמכות הצוות',
        body: 'צוות הכנס רשאי להסיר תוכן פוגעני, להשעות או לסגור חשבון שמפר את התנאים, ולהוציא משתתף מהכנס — בעיקר במקרים של פגיעה במשתתפים אחרים.',
      },
      {
        head: 'פרטיות',
        body: 'איזה מידע נאסף, מי רואה אותו וכמה זמן הוא נשמר — מפורט במדיניות הפרטיות, והיא חלק בלתי נפרד מהתנאים האלה.',
      },
      {
        head: 'זמינות השירות',
        body: 'האתר עשוי להיות לא זמין לפרקי זמן קצרים בשל תחזוקה או תקלה. השירות ניתן כפי שהוא, ואיננו מתחייבים לזמינות רציפה.',
      },
      {
        head: 'קניין רוחני',
        body: 'עיצוב האתר, הקוד והתוכן שהפיק הכנס שייכים למפעילי הכנס. התוכן שאתם כתבתם נשאר שלכם.',
      },
      {
        head: 'שינוי התנאים',
        body: 'אם נעדכן את התנאים, התאריך בראש העמוד ישתנה. שינוי מהותי יובא לידיעת המשתתפים.',
      },
      {
        head: 'דין וסמכות שיפוט',
        body: 'על תנאים אלה חלים דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.',
      },
    ],
    en: [
      {
        head: 'What the service is',
        body: 'The site is used to register for the conference and its activities, to view the programme and information, and to make professional contact with other participants. The service is free of charge.',
      },
      {
        head: 'Your account',
        body: 'The account is personal. You are responsible for keeping your password safe and not sharing it. The details you provide should be accurate — particularly your name and organisation, which other participants may see. If you learn of unauthorised use of your account, tell us.',
      },
      {
        head: 'The content you write',
        body: 'Your headline, about text, links, profile photo and the messages you send are yours, and your responsibility. You confirm that you have the right to publish them and that they infringe nobody else’s rights.',
      },
      {
        head: 'Community conduct',
        body: 'The networking area is for professional acquaintance. Not allowed: harassment, threats, racism or incitement, sexual content, impersonating a person or organisation, spam or commercial advertising, harvesting participant details for outside use, and attempting to bypass another person’s privacy settings.',
      },
      {
        head: 'Blocking and reporting',
        body: 'You can block any participant at any moment — the block is silent, two-way and immediate, and the other side receives no indication of it. You can also report abusive behaviour; a report reaches the conference team and is handled by a person.',
      },
      {
        head: 'The team’s authority',
        body: 'The conference team may remove abusive content, suspend or close an account that breaches these terms, and remove a participant from the conference — primarily in cases of harm to other participants.',
      },
      {
        head: 'Privacy',
        body: 'What is collected, who can see it and how long it is kept are set out in the privacy policy, which forms an inseparable part of these terms.',
      },
      {
        head: 'Availability',
        body: 'The site may be unavailable for short periods due to maintenance or failure. The service is provided as is, and we do not guarantee uninterrupted availability.',
      },
      {
        head: 'Intellectual property',
        body: 'The site’s design, code and the content produced by the conference belong to the conference operators. Content you wrote remains yours.',
      },
      {
        head: 'Changes to these terms',
        body: 'If we update these terms, the date at the top of this page changes. A material change will be brought to participants’ attention.',
      },
      {
        head: 'Governing law',
        body: 'These terms are governed by the laws of the State of Israel, and the competent courts in Israel have exclusive jurisdiction.',
      },
    ],
  },

  seeAlso: { he: 'ראו גם', en: 'See also' },
  privacy: { he: 'מדיניות פרטיות', en: 'Privacy policy' },
  accessibility: { he: 'הצהרת נגישות', en: 'Accessibility statement' },
} as const;

const pick = (lang: Locale, entry: { he: string; en: string }): string =>
  lang === 'he' ? entry.he : entry.en;

export const generateMetadata = async ({
  params,
}: TermsPageProps): Promise<Metadata> => {
  const { locale } = await params;
  const lang = (isSupportedLocale(locale) ? locale : 'he') as Locale;
  return { title: pick(lang, COPY.title) };
};

const TermsPage = async ({ params }: TermsPageProps) => {
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
      <p className="mt-6 text-lg leading-relaxed text-text-secondary">
        {pick(lang, COPY.intro)}
      </p>

      <ol className="mt-10 flex flex-col gap-8">
        {(he ? COPY.sections.he : COPY.sections.en).map((section, index) => (
          <li key={section.head} className="flex gap-4">
            <span
              aria-hidden="true"
              className="mt-1 grid size-7 flex-none place-items-center rounded-full border border-accent/40 text-xs font-semibold tabular-nums text-accent"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold text-text-primary">
                {section.head}
              </h2>
              <p className="mt-2 leading-relaxed text-text-secondary">
                {section.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-sm text-text-secondary">
        {pick(lang, COPY.seeAlso)}:{' '}
        <Link
          href={`/${lang}/privacy`}
          className="text-accent underline-offset-4 hover:underline"
        >
          {pick(lang, COPY.privacy)}
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

export default TermsPage;
