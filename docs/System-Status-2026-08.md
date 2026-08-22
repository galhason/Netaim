# מצב המערכת — אוגוסט 2026

סיכום מצב מלא של פלטפורמת Hason / נטעים. מחליף את `System-State-and-Gaps.md`
(שנכתב ב-2026-07-16 ומאז התיישן: Program, שער כניסה ציבורי, Audit ו-Check-in
כבר נבנו). נכון ל-2026-08-20, אחרי Development Report 16 ושתי עבודות נוספות
שטרם דווחו.

---

## 1. מה זו המערכת

פלטפורמת חוויית אירועים לגופים ציבוריים וממשלתיים. לא אתר כנס — מוצר
שמייצר חוויות אירוע. המבנה: **Event → Experience → Scenes**, כשכל התוכן
מגיע מה-CMS ואין שום דבר מקודד קשיח.

**Stack:** Next.js 15 (App Router) · React 19 · Payload CMS 3 (משובץ באפליקציה)
· PostgreSQL · Tailwind 4 · next-intl (he/en, RTL) · Zod · Motion · Vitest.

---

## 2. ארכיטקטורה — מה קיים

### מנועי דומיין (טהורים, ללא תלות ב-Payload)

| מנוע | מצב | מה יש |
|---|---|---|
| `event-engine` | הושלם | 8 שלבי מחזור-חיים (draft→archived), מעברים, capabilities, readiness, event-health |
| `experience-runtime` | פעיל (v2) | descriptor, composition, lifecycle (9 שלבים), 12 capabilities, registry של סוגי חוויה |
| `experience-engine` | ישן (v1) | registry, resolver, lazy loader, ולידציית Zod, inspector — משרת רק את תצוגת ה-Composer הישן |
| `registration-engine` | הושלם | סטטוסים, מעברים, מודים, קיבולת, waitlist, זיהוי התנגשויות, אנונימיזציה, domain events, seam לאינטגרציה חיצונית |
| `permission-engine` | הושלם | 8 capabilities, 5 תפקידים, authorize, rate-limit, grants |
| `notification-engine` | הושלם | templates, outbox + retry, dispatcher, channel adapter |
| `networking-engine` | הושלם | connection machine, meeting machine |
| `foundation/event-bus` | בסיסי | בוס אירועים סינכרוני in-process (תור עמיד = החלפה עתידית) |

### CMS — 24 קולקציות + 3 גלובלים

כולן מתוחמות ל-`organization` (multi-tenant אמיתי, נבדק בבדיקת אינטגרציה):

organizations, users, media, events, experiences, scenes, speakers, sponsors,
participants, account-grants, registrations, registration-settings,
participant-sessions, account-sessions, notifications, rate-limits, audit-log,
rooms, sessions, session-registrations, networking-profiles,
networking-connections, networking-chat-messages, networking-meetings.

גלובלים: `platform-settings`, `opening-page` (דף הבית), `site` (איזה כנס הוא
שער הכניסה).

### מפת מסלולים

**ציבורי / משתתף (`(frontend)`)** — כ-30 מסלולים:
דף נחיתה של הכנס הפעיל, תוכנית, דוברים + עמוד דובר, מידע והגעה, צור קשר;
עמוד אירוע, הרשמה, לוח זמנים, סדנאות, "הפעילויות שלי", נטוורקינג, לאונג' אישי;
אזור אישי (`/me`): פרופיל, תג דיגיטלי עם QR, סורק, הודעות, צ'אט, אנשי קשר,
קישורי WhatsApp/vCard; magic links, `/api/health`, `/api/notifications/dispatch`.

**סטודיו (`(studio)`)** — שני סטודיו במקביל:
- `(console)` — ה-Experience Control Center החדש: קיר חוויות, יצירת חוויה,
  workspace של דף הבית, פעילויות (אשף 5 שלבים), check-in, תקשורת, היסטוריה,
  תובנות, מדיה, משתתפים, אנשים והרשאות.
- `(classic)` — הסטודיו הישן: אירועים, תוכנית, אנשים, נרשמים, הרשמה,
  ספונסרים, מקום, מדיה, התראות, פתיחה, Composer, check-in, ארגון, צוות.

**Payload (`(payload)`)** — פאנל אדמין חסום בפרודקשן (break-glass בלבד), REST, GraphQL.

### סצנות

- **v2 (בשימוש ציבורי):** 23 חבילות סצנה — 8 ל-`homepage`, 15 ל-`conference`.
  כולן עם רנדרר אמיתי, גרסה, variants/densities/emphases ותוכן ברירת מחדל.
- **v1 (רק ב-Composer):** 10 סוגי סצנה עם סכמות Zod. שניים דלים (`content`,
  `session-list`).

### תשתית ואבטחה

- Composition root אחד (`src/infrastructure`) עם 27 מתאמי Payload — אף מילה
  של Payload לא דולפת החוצה (נאכף ע"י guard).
- **חתימת טוקנים עם namespace** — תג מודפס לא יכול לשמש כעוגיית סשן.
- **סשנים ניתנים לביטול** — מזהה אקראי 256 ביט + תפוגה חתומה, hash בלבד בבסיס
  הנתונים, חלון מוחלט של 30 יום, שורה למכשיר, `clearAllSessions`.
- **Rate limiting ב-Postgres** (שורד deploy), security headers, `assertServerEnv()`
  בזמן boot, correlation id בכל תגובה, לוגים לדיסק עם רוטציה.
- **מטמון תוכן מפורסם** (`cachedContent`) + פרסום ממוקד לפי subject; 40 עמודים
  אישיים מכריזים `force-dynamic` במפורש, עם בדיקה שמונעת רגרסיה.
- **Audit log append-only** — 23 פעולות, שם ומייל המבצע מועתקים לרשומה.
- **משלוח מיילים אמיתי דרך SMTP** (nodemailer) — הספק הוא משתנה סביבה, לא קוד.
- CI: `.github/workflows/gates.yml` — types → typecheck → lint → tests →
  isolation gate מול Postgres אמיתי → build.
- 36 קבצי בדיקות יחידה + בדיקת אינטגרציה אחת.

---

## 3. מה נשאר — לפי סדר עדיפות

### P0 — חוסם העלאה לאוויר

1. **אימוץ Migrations.** בסיס הנתונים נבנה כולו ב-`PAYLOAD_DB_PUSH`, אין
   היסטוריית מיגרציות. הרצת `migrate` תיכשל על ההצהרה הראשונה. הנוהל הבטוח
   כתוב ב-`docs/Adopting-Migrations.md` — זו עבודה של סשן נפרד, על עותק
   של הדאטהבייס.
2. **הרצת `npm run gates` מלאה על מכונת Windows.** ה-sandbox לא הצליח להריץ
   `vitest`/`next build`. בפועל שתי עבודות אחרונות אומתו רק חלקית.
3. **שתי טבלאות חדשות** (`audit-log`, `account-sessions`) דורשות ריצת push
   חד-פעמית לפני שהקוד הזה עולה.
4. **Snapshots מיושנים.** צריך `vitest -u`. לפני זה — לבדוק באג אמיתי:
   ב-snapshot האנגלי המותג מופיע כ"נטעים" במקום `HASON`.

### P1 — הפער המוצרי הגדול

5. **Composer לא שומר.** רק תוכן הסצנה נשמר. סדר, enabled, כותרת ושכפול
   נעלמים ברענון. `ComposerPersistence` הוא חוזה שמור שמעולם לא מומש. זהו
   הפער היחיד שמונע מהסטודיו להיות עורך אמיתי.
6. **שני מנועי חוויה במקביל.** ההמלצה הרשומה: לשמר את `experience-runtime`
   ולהעביר אליו שני דברים מהדור הישן — ולידציית Zod (יש כבר חריץ `validate`
   בחוזה) וטעינה עצלה של סצנות. לבצע יחד עם עבודת ה-Composer כדי להזיז את
   ה-Composer פעם אחת ולא פעמיים. **מחכה לאישור.**
7. **שני סטודיו במקביל.** ה-Console מפנה במפורש ל-Classic ברשימות "עד שה-Composer
   יגיע". צריך החלטה: להשלים את ה-Console ולמחוק את ה-Classic, או להפך.

### P2 — חובות ידועים

8. **שתי מערכות הרשאות** — `src/auth` (גישה לקולקציות) מול `src/permission-engine`
   (הסטודיו). שתי אמיתות על מי רשאי מה.
9. **תמונות דמה** — חמישה שירותים נופלים ל-`i.pravatar.cc` / `picsum.photos`
   כשאין תצלום ב-CMS, כלומר אירוע אמיתי יכול להציג פנים מומצאות. צריך החלטה
   מוצרית: מה מציג פורטרט ללא תצלום.
10. **`totpSecret` נשמר גלוי.** הצפנה במנוחה דורשת החלטת ניהול מפתחות.
11. **טוקני `connect` ו-`entrance` ללא תפוגה.** אף אחד מהם אינו סשן ואינו נותן
    גישה לחשבון, אבל זה פתוח.
12. **אין מסך שמציג לאורח את הסשנים הפעילים שלו**, ורשומות סשן שפגו לא נמחקות אף פעם.
13. **תקרת fan-out של 5 כנסים** לאורח — מגבלה גלויה ומתועדת, לא באג נסתר.
    הפתרון הנכון הוא שאילתת aggregate אחת (מתודת repository שעדיין לא קיימת).
14. **אין טיפול באזורי זמן** — נדחה במפורש ל-Event Engine.
15. **`src/features/home/` תיקייה ריקה לגמרי.** כמה features חורגות ממבנה
    התיקיות המחייב (אף feature ללא `hooks/`; ל-program/registration/speakers/
    sponsors/networking אין `components/`).
16. **קבצים שנוצרו בטעות בגיט:** `logs/hason.log`, `tsconfig.tsbuildinfo`.
17. **`.env.example` חסר מפתחות** ש-`env.ts` ו-`payload.config.ts` באמת קוראים:
    `SMTP_*`, `S3_*`, `DISPATCH_SECRET`, `PAYLOAD_ADMIN`.
18. **אין README.**

### P3 — כיסוי בדיקות

19. אין בדיקות ל: networking chat/meetings, notifications, program, speakers,
    sponsors, check-in, אינטגרציית Monday, ולאף אחד מ-70 המסלולים ו-server actions.
20. **אין שכבת e2e בכלל.** `vitest.config.ts` רץ ב-`environment: 'node'` ואין
    ספריות DOM מותקנות, למרות שקיימים קבצי `.test.tsx`.

### תיעוד

21. **Development Report 17 חסר.** שתי עבודות הושלמו אחרי דוח 16 ולא דווחו:
    משלוח מיילים ב-SMTP וביטול סשנים. החוקה (§22) מחייבת דוח כל שני ספרינטים.

---

## 4. החלטות שממתינות לך

מתוך `Open-Questions.md`, מה שעדיין פתוח באמת:

- **יעד הפריסה** — ענן (איזה?) או on-prem. מחליט גם אחסון מדיה (מקומי מול S3).
  פתוח מאז דוח 01.
- **מתנדבים** — האם מתנדבים הם תת-סוג של משתתף עם שיבוצים.
- **דפוס ניווט במובייל** — התפריט הציבורי מוסתר מתחת ל-`md` ואין דפוס מאושר.
- **אסטרטגיית offline** — כניסה בלבד או כל המסע.
- **מצב "במהלך האירוע"** — היקף חוויית יום האירוע (עכשיו/הבא, שינויי חדרים, push).
- **מודל Experience Identity ב-CMS** — הרעיון אושר, מודל השדות לא.
- **ממשל קטלוג הסצנות** — מי מאשר סוג סצנה חדש אחרי ההשקה.

---

## 5. המסלול המומלץ לסיום

1. **סשן מיגרציות** — לפי `Adopting-Migrations.md`, על עותק, ואז בפרודקשן.
   בלי זה אי אפשר לפרוס בביטחון.
2. **`npm run gates` ירוק** + עדכון snapshots + תיקון באג המותג באנגלית.
3. **Composer + איחוד מנועי החוויה** בפרוסה אחת — מימוש `ComposerPersistence`
   והעברת הוולידציה והטעינה העצלה ל-runtime. אחרי זה למחוק את `experience-engine`.
4. **החלטה על סטודיו אחד** ומחיקת השני.
5. **איחוד מערכות ההרשאות** לאמת אחת.
6. **ניקוי חובות** — תמונות הדמה, `features/home`, `.env.example`, README,
   קבצים שנכנסו לגיט בטעות.
7. **Development Report 17** שמכסה את מה שנעשה מאז דוח 16.
