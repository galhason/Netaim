# Conference Integration Audit — Netaim Olami × Hason Platform

**תאריך:** 19.09.2026 · **סוג:** ביקורת קריאה בלבד · **מקור האמת:** הקוד המקומי ב־`C:\Users\ghgam\Documents\Claude\Projects\gov`

**לא שונה דבר.** לא נגעתי בקוד, ב־`package.json`, בקובצי סביבה, במסד הנתונים, בניתוב, באימות, בתלויות או בפריסה. לא הרצתי מיגרציות ולא שיניתי את האפליקציה הרצה.

**הערת ממשל:** לפי `CLAUDE.md` של הפרויקט, כל תיעוד חי ב־`docs/`. הדוח הזה נכתב לתיקיית הפלט של הסשן ולא לתוך ה־repo, כי זו ביקורת קריאה בלבד. מוכן להעתיק אותו ל־`docs/reports/` ברגע שתאשר כתיבה.

**היקף הקריאה — גילוי נאות:** מיפיתי את כל 819 הרשומות תחת `src/` ואת שורש הפרויקט, וקראתי לעומק **כ־95 קבצים** שנבחרו לפי רלוונטיות (קונפיגורציה, ניתוב, אימות, Payload, i18n, עיצוב, פריסה). לא קראתי את כל 554 קובצי המקור. מקומות שבהם מסקנה נשענת על תת־קבוצה מסומנים במפורש.

---

## 1. Executive Summary

הפרויקט המקומי הוא **`hason-platform`** (`package.json:2`) — פלטפורמת כנסים עצמאית ובוגרת, לא אתר תדמית. Next.js 15 App Router, React 19, Payload CMS 3 מעל PostgreSQL, next-intl, Tailwind v4. אין בה NestJS ואין Redis, בניגוד להנחה המוקדמת.

**המסקנה המרכזית, וגם ההפתעה:** מבנה ה־URL של האפליקציה **כבר זהה** ליעד הציבורי שהגדרת. היא מגישה היום `/{locale}/events/{slug}/...`, כלומר `/he/events/netaim-2026/schedule` הוא נתיב חוקי אצלה **עכשיו**, בלי שינוי אחד. המשמעות: **לא נדרש `basePath`, לא נדרש `assetPrefix`, ולא נדרשת הזזה של האפליקציה לתת־נתיב.** האינטגרציה מצטמצמת לניתוב reverse proxy לפי קידומות נתיב, וזה מוריד את הסיכון ואת העלות בסדר גודל.

**מה כן ידרוש עבודה:** שלושה דברים, לא יותר.

1. **התנגשות מרחב שמות ציבורי.** האפליקציה מגישה היום גם *אתר* משלה — `/he`, `/he/program`, `/he/speakers`, `/he/info`, `/he/contact`, `/he/privacy`, `/he/terms`, `/he/accessibility` — שנשלט ב־Global בשם `Site.activeConference` (`src/cms/globals/site.ts`). הנתיבים האלה יתנגשו חזיתית עם וורדפרס. צריך להחליט מי מגיש אותם, ולתקן קישורים פנימיים שמצביעים אליהם.
2. **כתובות מוחלטות.** `NEXT_PUBLIC_SERVER_URL` מוזרק ל־7 מקומות, ובהם הפניות אחרי כניסה וקישורי קסם במייל (`src/shared/utils/site-origin.ts`). כשהדומיין הציבורי משתנה ל־`netaimolami.org`, הערך הזה חייב להשתנות איתו — אחרת מייל ישלח אנשים ל־`netaim26.org`.
3. **התנגשות טוקנים בעיצוב.** האפליקציה כבר משתמשת בקידומת **`--nt-*`** — אותה קידומת שבחרנו למערכת העיצוב של וורדפרס — עם פלטה אחרת לגמרי (כחול־כהה `#173f73` במקום ירוק `#166633`) ועם שמות שונים (`--nt-r-md` מול `--nt-radius-md`). זו לא בעיית עיצוב אלא בעיית ארכיטקטורה, וכדאי לפתור אותה לפני הריסקין ולא אחריו.

**בידוד האימות מאומת.** האפליקציה אינה תלויה בוורדפרס בשום צורה — אין קריאה ל־WP, אין קוקי משותף, אין OAuth, אין משתמש משותף. המשתמשים שלה חיים ב־PostgreSQL שלה. העיקרון "WordPress Users ≠ Conference Users" מתקיים היום ואינו דורש הגנה מיוחדת.

**הערכת מורכבות כוללת:** בינונית־נמוכה. אין כאן כתיבה מחדש, יש הסטת תעבורה והתאמת כתובות.

---

## 2. Actual Tech Stack

| רכיב | גרסה בפועל | ראיה |
|---|---|---|
| **Next.js** | `~15.4.11`, App Router | `package.json:44` |
| **React** | `^19.0.0` | `package.json:48` |
| **TypeScript** | `^5.7.0`, `strict` + `noUncheckedIndexedAccess` | `package.json`, `tsconfig.json:9-10` |
| **Payload CMS** | `^3.0.0` (`payload`, `@payloadcms/next`) | `package.json:38-41` |
| **Payload DB** | `@payloadcms/db-postgres ^3.0.0` | `package.json:33` |
| **Rich text** | `@payloadcms/richtext-lexical` | `src/payload.config.ts:106` |
| **Object storage** | `@payloadcms/storage-s3 ^3.86.0`, נכנס רק כשה־env מלא | `src/payload.config.ts:41-70` |
| **PostgreSQL** | 16 (docker compose מקומי), מסד ייצור מקומי בשרת | `docker-compose.yml:3`, `DEPLOY.md` א.5 |
| **i18n** | `next-intl ^4.0.0` + plugin | `package.json:45`, `next.config.ts:5` |
| **CSS** | **Tailwind v4** דרך `@tailwindcss/postcss`, בלי `tailwind.config` | `package.json:55,63`, `postcss.config.mjs` |
| **גופן** | **Heebo** (עברית+לטינית) דרך `next/font/google` | `src/app/(frontend)/[locale]/layout.tsx:4,21` |
| **ולידציה** | `zod ^3.24` — גם לסכימת סביבה | `src/config/env.ts` |
| **מייל** | `nodemailer ^6.9` מעל SMTP (Google Workspace) | `src/infrastructure/email/smtp-channel.ts` |
| **אנימציה** | `motion ^12.42` | `package.json:36` |
| **אייקונים** | `lucide-react` | `package.json:35` |
| **QR** | `react-qr-code` | `package.json:49` |
| **תמונות** | `sharp ^0.34` + `next/image`, AVIF/WebP | `package.json:50`, `next.config.ts` |
| **בדיקות** | `vitest ^4.1` + integration מול postgres-test:5433 | `package.json:29-31` |
| **Node** | `>=20.9.0` | `package.json:6` |

**מה *אין*, בניגוד להנחה המוקדמת:** אין **NestJS** (אין תלות, אין `nest-cli.json`). אין **Redis**. אין **websockets** ואין ספריית realtime — עדכוני "פעמון" נעשים בפולינג של כחצי דקה מול route handler (`src/app/(frontend)/[locale]/me/notifications/route.ts`). אין Docker לאפליקציה עצמה (ה־compose מכיל רק Postgres). אין service worker ואין manifest.

**עבודות רקע:** אין תור בתהליך. שליחה חוזרת של מייל שנכשל נעשית דרך cron חיצוני שקורא ל־`/api/notifications/dispatch` עם `Bearer $DISPATCH_SECRET` (`src/app/(frontend)/api/notifications/dispatch/route.ts:13-22`). מחיקת מידע (retention) היא **ידנית בלבד**, בלי cron ובלי endpoint מוחק (`.env.example`, חלק ד2' ב־DEPLOY.md).

**API חיצוני יחיד:** monday.com — `https://api.monday.com/v2` (`src/infrastructure/monday/monday-client.ts:1`), מנוטרל כששני משתני הסביבה ריקים.

---

## 3. Complete Route Map

מבנה ה־App Router מחולק לשלוש קבוצות: `(frontend)`, `(payload)`, `(studio)`.

### A. נתיבים ציבוריים של הכנס

| נתיב | קובץ | אימות | רינדור | מקור נתונים |
|---|---|---|---|---|
| `/{locale}` | `app/(frontend)/[locale]/page.tsx` | לא | דינמי | `Site.activeConference` |
| `/{locale}/events/{slug}` | `.../events/[slug]/page.tsx` | לא (מזהה משתמש אם קיים) | `force-dynamic` | Payload events + experience |
| `/{locale}/experiences/{slug}` | `.../experiences/[slug]/page.tsx` | לא | דינמי | Payload experiences |
| `/{locale}/program` | `.../(experience)/program/page.tsx` | לא | דינמי | הכנס הפעיל |
| `/{locale}/speakers`, `/speakers/[id]` | `.../(experience)/speakers/` | לא | דינמי | Payload speakers |
| `/{locale}/info` | `.../(experience)/info/page.tsx` | לא | דינמי | CMS |
| `/{locale}/contact`, `/privacy`, `/terms`, `/accessibility` | `.../(site)/` | לא | סטטי/דינמי | CMS + env |

### B. נתיבי אימות

| נתיב | קובץ | תפקיד |
|---|---|---|
| `/{locale}/enter?token=…` | `.../[locale]/enter/route.ts` | נחיתת magic link ברמת הפלטפורמה → מאמת, פותח session, מפנה ל־`/{locale}/me` |
| `/{locale}/events/{slug}/enter` | `.../events/[slug]/enter/` | נחיתה ברמת כנס |
| `/{locale}/events/{slug}/register` | `.../events/[slug]/register/` | הרשמה לכנס |
| `/{locale}/connect/{token}` | `.../connect/[token]/` | קישור חיבור חתום (מדור נטוורקינג) |

**אין `/login` ואין `/register` גלובליים.** הכניסה היא ללא סיסמה, מבוססת קישור במייל, ועם TOTP אופציונלי (`src/features/registration/services/totp.ts`).

### C. נתיבי משתתף (דורשים session)

`/{locale}/me` · `/me/profile` · `/me/networking` · `/me/messages` · `/me/chat/{connectionId}` · `/me/contact/{connectionId}` · `/me/wa/{connectionId}` · `/me/badge` · `/me/notifications` (route handler) — כולם תחת `app/(frontend)/[locale]/me/`, כולם `force-dynamic` וקשורים לקוקי, וכל העץ מסומן `robots: index:false` ב־`me/layout.tsx`.

וברמת הכנס: `/{locale}/events/{slug}/me` · `/my-activities` · `/schedule` · `/workshops` · `/networking`.

### D. נתיבי ניהול — Studio

`/studio` (בית) · `/studio/events` · `/studio/events/{slug}/…` (program, people, participants, registration, sponsors, venue, media, notifications, opening, composer, check-in) · `/studio/homepage` · `/studio/team` · `/studio/organization` · וקבוצת `(console)`: `/studio/activity`, `/brand`, `/communications`, `/history`, `/insights`, `/logistics`, `/media`, `/networking`, `/participants`, `/people`, `/reports`, `/new`.

שער הכניסה: `getStudioAccess()` ב־`src/features/studio/services/studio-auth.ts` — אותו חשבון משתתף, בתוספת grant.

### E. נתיבי עורך/CMS

`/admin/[[...segments]]` — פאנל Payload. **חסום בייצור** אלא אם `CONTENT_ENGINE_ADMIN=true` (`src/app/(payload)/admin/[[...segments]]/page.tsx:20-23`). `/studio/preview/{slug}` — תצוגה מקדימה בתוך הסטודיו. `/studio/events/{slug}/composer` — עורך הסצנות.

### F. נתיבי API

| נתיב | קובץ | הגנה |
|---|---|---|
| `/api/[...slug]` | `app/(payload)/api/[...slug]/route.ts` | REST של Payload, access control ברמת collection |
| `/api/graphql` | `app/(payload)/api/graphql/route.ts` | אותו דבר |
| `/api/health` | `app/(frontend)/api/health/route.ts` | ציבורי, בודק DB, מחזיר 503 כשלא תקין |
| `/api/notifications/dispatch` | שם | `Bearer DISPATCH_SECRET`, סגור כשאין סוד |
| `/api/retention` | שם | `Bearer RETENTION_SECRET`, קריאה בלבד |
| `/api/preview` | שם | `PREVIEW_SECRET`, מחזיר 404 כשלא מוגדר |
| `/{locale}/me/notifications` | route handler | קוקי session |

### G. מערכת

`/sitemap.xml` (`app/sitemap.ts`) · `/robots.txt` (`app/robots.ts`) · `/icon.png`, `/apple-icon.png` · `/_next/*`.

### הערה קריטית על ה־middleware

```js
matcher: ['/((?!api|admin|studio|_next|_vercel|.*\\..*).*)']
```

`src/middleware.ts:47`. כלומר **`/api`, `/admin`, `/studio` ו־`/_next` אינם עוברים דרך ה־middleware ואינם נושאים קידומת שפה.** זו עובדה מכרעת לתכנון ה־proxy: אלה נתיבים גלובליים בשורש הדומיין, לא תחת `/he/`.

---

## 4. Authentication Architecture

**מודל:** ללא סיסמה, מבוסס magic link במייל, עם session בצד השרת. אין NextAuth, אין Auth.js, אין OAuth, אין JWT חיצוני. הכול נכתב בבית.

### הקוקיז

| שם | קובץ | מאפיינים |
|---|---|---|
| `participant_session` | `src/shared/security/session-token.ts:33` | `httpOnly`, `sameSite: 'lax'`, `secure` רק ב־production, `path: '/'`, `maxAge` 30 יום |
| `participant_locale` | `src/config/locales.ts:26` | אותם מאפיינים בדיוק |

שניהם נכתבים ב־`src/features/registration/services/participant-identity-service.ts:507-543`. **אין `domain` מפורש** בשום קוקי — כלומר host-only, נצמד לדומיין שהגיש את התשובה. זה דווקא נוח לאינטגרציה: בדומיין משותף הקוקי פשוט עובד.

### מבנה הטוקן

הקוקי הוא טוקן חתום ב־HMAC-SHA256 עם **namespace של מטרה**: `session`, `entrance`, `connect`, `totp` (`src/shared/security/token-namespace.ts:16-33`). המטרה חלק מהמטען החתום, ולכן טוקן שהונפק למטרה אחת לא יאומת לאחרת — הערה בקוד מסבירה שזה מונע הדבקת QR מודפס במקום קוקי session. הסוד: `REGISTRATION_LINK_SECRET` ואם ריק `PAYLOAD_SECRET`; סוד ריק זורק חריגה.

מזהה ה־session הוא 256 ביט מ־CSPRNG; **במסד נשמר רק ה־SHA-256 שלו**, לעולם לא הערך עצמו. תוקף מוחלט (לא מתגלגל) של 30 יום, והתפוגה חתומה בתוך המטען כדי שגם שכפול של הקוקי לא יאריך חיים.

### הזרימות

- **כניסה:** `requestMagicLink` → מייל → `/{locale}/enter?token=…` → `consumeMagicLink` → `establishSession` → הפניה ל־`/{locale}/me`.
- **סדר כתיבה:** רשומת ה־session נכתבת **לפני** הקוקי (`participant-identity-service.ts:521-528`) — אם הכתיבה נכשלת, לא מונפק אישור שמצביע על כלום.
- **יציאה:** `clearSession()` מבטל את ה־session בשרת ורק אז מוחק את הקוקי; `clearAllSessions()` מנתק את כל המכשירים.
- **אימות אימייל:** collection `email-verifications` + `email-verification-service.ts`.
- **TOTP:** אופציונלי, `features/registration/services/totp.ts`, מוצג כ־QR ב־`/me/profile`.
- **זהות לבקשה:** `currentParticipant()` עטוף ב־React `cache` — פעם אחת לכל בקשה.

### הרשאות

**שתי מערכות תפקידים מקבילות בקוד** — כדאי לשים לב:

1. `src/auth/types.ts` — 8 תפקידים (`platformOwner`, `orgAdmin`, `eventManager`, `contentEditor`, `registrationManager`, `volunteerManager`, `reviewer`, `readOnly`) ו־11 הרשאות, משמש את ה־access control של Payload.
2. `src/permission-engine/role/roles.ts` — 5 תפקידים (`owner`, `producer`, `editor`, `door`, `viewer`) מעל "capabilities", משמש את הסטודיו.

הגישור נעשה דרך `account-grants` ו־`can()`. זו לא בהכרח תקלה, אבל זו כפילות מושגית ששווה תיעוד החלטה.

**הגנה בעומק:** כל פעולת סטודיו קוראת שוב ל־`requireCapability()` ומאמתת מול מסד הנתונים; שער הניתוב אינו מספיק (`studio-auth.ts:56-96`).

### תלות בדומיין — התשובה המדויקת

| נשען על | תשובה |
|---|---|
| hostname | **לא.** הקוקיז host-only, הזיהוי מבוסס קוקי בלבד |
| origin | **לא** לאימות. CSP מגביל `form-action 'self'` — כלומר טפסים לאותו origin |
| localhost | לא בקוד; רק כברירת מחדל נפילה ב־`siteOrigin()` וכבדיקת שפיות ב־robots/sitemap |
| משתני סביבה | **כן** — `NEXT_PUBLIC_SERVER_URL` קובע לאן מפנים אחרי כניסה ולאן מצביע הקישור במייל |
| callback URLs מוחלטים | **כן**, ובדיוק במקום אחד: `src/shared/utils/site-origin.ts` |

**CSRF:** אין טוקן CSRF מפורש. ההגנה נשענת על Server Actions של Next (שמגינות מקור־עצמי), `sameSite: 'lax'`, ו־CSP עם `form-action 'self'`. תקין לארכיטקטורה הזו, ושווה לציין בבדיקת האבטחה.

**סודות:** כל הערכים ב־`.env` מוסתרים בדוח. שמות המפתחות בלבד: `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `PREVIEW_SECRET`, `DEMO_CONTENT`, `SMTP_*`, `NEXT_PUBLIC_PRIVACY_EMAIL`, `DISPATCH_SECRET`. סכימת הולידציה המלאה ב־`src/config/env.ts`.

---

## 5. Payload Architecture

`src/payload.config.ts` — **26 collections ו־3 globals**.

**תוכן:** `organizations`, `events`, `experiences`, `scenes`, `speakers`, `sponsors`, `rooms`, `sessions`, `media`.
**אנשים והרשאות:** `users` (משתמשי הפאנל), `participants` (משתתפים), `account-grants`, `participant-sessions`, `account-sessions`, `email-verifications`.
**הרשמה:** `registrations`, `registration-settings`, `session-registrations`.
**נטוורקינג:** `networking-connections`, `networking-blocks`, `networking-reports`, `networking-chat-messages`, `networking-meetings`.
**מערכת:** `notifications`, `rate-limits`, `audit-log`.
**Globals:** `platform-settings`, `opening-page`, `site`.

**לוקליזציה ברמת Payload:** `locales: ['he','en']`, ברירת מחדל `he`, `fallback: true` (`payload.config.ts:130-134`). שדות מסומנים `localized: true` — למשל `title`, `teaser`, `location` ב־`events`, ו־`content` (JSON) ב־`scenes`.

**מודל האירוע** (`src/cms/collections/events.ts`): `slug` ייחודי, `organization` חובה, `defaultLocale` לכל אירוע, `experience` (קשר יחיד), `composition` (מערך סצנות עם `scene`, `hidden`, `variant`, `density`, `emphasis`), `startsAt`/`endsAt`/`timezone`, `poster`/`heroImage`/`heroVideo`, ו־group `opening` עם שדות מתורגמים.

**Access control:** presets ב־`src/cms/access-presets.ts` ולוגיקה ב־`src/cms/access.ts` — סינון לפי ארגון (`{ organization: { in: scope.organizations } }`), כלומר **בידוד רב־ארגוני אמיתי**.

**אדפטר:** `postgresAdapter` עם `push: process.env.PAYLOAD_DB_PUSH === 'true'` — מוצהר במפורש אחרי באג שבו ברירת המחדל שינתה סכימה בשקט (הערה מפורטת ב־`payload.config.ts:76-93`).

**S3:** הפלאגין מצטרף רק כשקיימים `S3_BUCKET` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY`; אחרת מדיה נשמרת לדיסק המקומי.

---

## 6. PostgreSQL / Data Architecture

- מסד ייצור: PostgreSQL מקומי על אותו שרת Hetzner (`DEPLOY.md` א.5). פיתוח: `docker-compose.yml`, `postgres:16`, משתמש/סיסמה/DB = `hason`, פורט 5432; מסד בדיקות על 5433.
- **78 טבלאות** (מצוטט ב־`package.json` תחת `_migrations:README`).
- **חוב טכני מתועד:** המסד נבנה ב־`PAYLOAD_DB_PUSH` ולכן **אין לו היסטוריית מיגרציות**. `migrate:create` ייצר baseline של כל 78 הטבלאות ו־`migrate` ייכשל על ה־CREATE הראשון. יש תיקיית `src/migrations/` עם 8 מיגרציות מאוחרות יותר ותיעוד ב־`docs/Adopting-Migrations.md`. **לא נגעתי בזה ולא הרצתי כלום.**
- גיבוי ושחזור: `scripts/backup.sh` ו־`restore.sh`, מתועד ב־DEPLOY.md חלק ד'.

---

## 7. Admin Architecture

**שתי מערכות ניהול, במכוון:**

1. **Studio** (`/studio`) — הכלי שהצוות עובד בו. Shell משלו (`features/studio/components/studio-shell.tsx`), סיידבר, ניווט מוגדר ב־`features/studio/constants/navigation.ts`, 11 מסכי console, ניהול אירוע מלא לכל `slug`. אימות: אותו חשבון משתתף + grant; טקס "founder" נותן Owner לכתובת `PLATFORM_OWNER_EMAIL` בהתקנה ריקה.
2. **Payload Admin** (`/admin`) — פאנל הליבה, מוגדר כ"פרט מימוש" ו**חסום בייצור** אלא אם `CONTENT_ENGINE_ADMIN=true`. זו דלת חירום, לא כלי עבודה.

שתיהן נשארות על שרת הכנסים. וורדפרס לא נוגע בהן.

---

## 8. Page Editor Architecture

העורך הייעודי הוא ה־**Composer** של הסטודיו (`/studio/events/{slug}/composer`), והוא בנוי סביב מודל **Events → Experiences → Scenes** בדיוק כפי ש־`CLAUDE.md` מחייב.

- **אחסון:** סצנה היא רשומה ב־`scenes` עם `type` (מזהה חופשי) ו־`content` מסוג **JSON ומתורגם**. סדר הסצנות והווריאנטים נשמרים במערך `composition` על האירוע.
- **רינדור:** רישום סצנות בקוד (`src/experience-engine/registry/scene-registry.ts`, `src/scenes/`), פתרון בזמן ריצה (`scene-resolver.ts`), והצגה דרך `ExperienceStage` (`src/experience-runtime/`). **שרת בעיקרו**, עם `force-dynamic` בעמוד האירוע.
- **מדיה:** הפניה לקולקשן `media` (upload של Payload), לא נתיבים קשיחים.
- **לוקליזציה:** ברמת השדה ב־Payload, עם fallback.
- **תצוגה מקדימה:** `/api/preview` מפעיל draft mode מול `PREVIEW_SECRET` ומפנה ל־`/{locale}/events/{slug}`. הקנבס של הסטודיו הוא **iframe של האתר עצמו** — ולכן ה־CSP מגדיר `frame-ancestors 'self'` במפורש (הערה מפורשת ב־`next.config.ts:38-45`).
- **הנחת דומיין:** ההפניה של ה־preview היא נתיב יחסי; **אין `netaim26.org` קשיח באף קובץ מקור שקראתי.**

---

## 9. i18n / RTL Architecture

| נושא | מימוש |
|---|---|
| ספרייה | `next-intl` 4 + plugin ב־`next.config.ts` |
| שפות | `['he','en']`, fallback `he` (`src/config/locales.ts`) |
| אסטרטגיית נתיב | `localePrefix: 'always'` — כלומר **תמיד** `/he/...` או `/en/...` |
| זיהוי אוטומטי | **כבוי** (`localeDetection: false`) — עברית היא הכניסה לכולם |
| קוקי של next-intl | **כבוי** (`localeCookie: false`), מסיבות פרטיות מתועדות |
| העדפת שפה | קוקי `participant_locale` נכתב רק אחרי כניסה; ה־middleware מפנה לפיו |
| כיוון | `dir` על `<html>` לפי `getTextDirection(locale)` |
| גופן | **Heebo** אחד לשתי השפות, כמשתנה CSS `--font-body` |
| RTL ב־CSS | **אין כללי `[dir=rtl]` ב־`globals.css` בכלל.** ההיפוך נשען על `dir` ועל utilities לוגיים של Tailwind v4 (`focus:start-4`) |
| תרגומי ממשק | `src/i18n/messages/he.json` ו־`en.json` — chrome בלבד; תוכן מגיע מה־CMS |

**התשובה לשאלה שלך:** כן, האפליקציה יכולה לחיות תחת `/he/events/netaim-2026/` **בלי לשבור זיהוי שפה** — כי זה כבר בדיוק המבנה שלה. השפה נקראת מהסגמנט הראשון בנתיב, והסגמנט הראשון יישאר `/he`. אין כאן שום דבר לתקן.

---

## 10. Domain Dependencies

| תלות | מיקום | חומרה |
|---|---|---|
| `NEXT_PUBLIC_SERVER_URL` | 7 שימושים; מרכזי ב־`src/shared/utils/site-origin.ts` | **גבוהה** — קובע הפניות אחרי כניסה וקישורי מייל |
| אותו משתנה ב־robots ו־sitemap | `app/robots.ts:19`, `app/sitemap.ts:28` | בינונית — כתובות ציבוריות |
| `netaim26.org` | **רק ב־`DEPLOY.md`** (nginx, certbot, Cloudflare) — **לא בקוד המקור** | נמוכה |
| `127.0.0.1:3000` | `DEPLOY.md`, והערת cron ב־dispatch route | נמוכה |
| `S3_ENDPOINT` | נכנס ל־CSP ול־`images.remotePatterns` ב־`next.config.ts` | בינונית |
| `https://api.monday.com/v2` | `monday-client.ts:1` | נמוכה |
| CSP `'self'` | `next.config.ts` — `default-src`, `connect-src`, `form-action`, `frame-ancestors` | **גבוהה** בדומיין משותף |
| `SUPPORT_EMAIL` ברירת מחדל `support@hason.events` | `src/config/brand.ts` | נמוכה, אבל מותג ישן |
| נכסי מותג | `/brand/netaim-lockup.png` ועוד | נמוכה |

**נקודה חשובה:** `'self'` ב־CSP מתייחס ל**דומיין**, לא לנתיב. ברגע ששתי המערכות חיות תחת `netaimolami.org`, וורדפרס והאפליקציה הם אותו origin מבחינת הדפדפן — מה שמקל על האינטגרציה אבל גם אומר שהמדיניות הזו מפסיקה לבודד ביניהן.

---

## 11. Asset Dependencies

- `public/brand/` — שלושה PNG של הלוגו (lockup, lockup-light, mark).
- `public/demo/` — 6 תמונות placeholder; `public/placeholder/scene.jpg`; `public/videos/networking-hero.mp4|webm` (כ־3MB).
- מדיה שהועלתה: קולקשן `media` של Payload — דיסק מקומי, או S3 כשמוגדר. הפניות דרך מזהה, לא URL קשיח.
- `next/image` עם AVIF/WebP; `remotePatterns` נגזר מ־`S3_ENDPOINT` בלבד (מארחי stock הוסרו במכוון).
- נכסי Next: `/_next/static/*` ו־`/_next/image` — **בשורש הדומיין**, וזו הנקודה היחידה באמת רגישה בתת־נתיב.

---

## 12. Subpath Compatibility — הסעיף המרכזי

### האם האפליקציה מניחה שהיא ב־`/`?

**כן — ולא משנה.** `next.config.ts` **אינו** מגדיר `basePath` ואינו מגדיר `assetPrefix`, ולכן היא מגישה מהשורש. אבל היעד הציבורי שלך אינו "להזיז אותה לתת־נתיב", אלא לשים אותה תחת `/he/events/netaim-2026/` — **וזה כבר הנתיב שלה**.

| צריך | כרגע | פעולה |
|---|---|---|
| `/he/events/netaim-2026` | `/{locale}/events/{slug}` ✅ | אין |
| `/he/events/netaim-2026/schedule` | `/{locale}/events/{slug}/schedule` ✅ | אין |
| `/he/events/netaim-2026/my-activities` | ✅ | אין |
| `/he/events/netaim-2026/networking` | ✅ | אין |
| `/he/events/netaim-2026/register` | ✅ | אין |
| `/he/events/netaim-2026/speakers` | ❌ קיים כ־`/he/speakers` (ברמת האתר) | החלטה |
| `/he/events/netaim-2026/sessions` | ❌ קיים כ־`/workshops` ו־`/program` | מיפוי שמות |
| `/he/events/netaim-2026/profile` | ❌ קיים כ־`/he/me/profile` | החלטה |
| `/he/events/netaim-2026/login` | ❌ קיים כ־`/he/enter` | החלטה |

### מה כן ידרוש התאמה

1. **נתיבים גלובליים מחוץ לקידומת השפה.** `/_next/*`, `/api/*`, `/admin`, `/studio`, `/sitemap.xml`, `/robots.txt`, `/icon.png` — כולם בשורש. בדומיין משותף ה־proxy חייב להעביר אותם לאפליקציה, ולוודא שוורדפרס לא תופס אותם. וורדפרס לא משתמש באף אחד מהם (הוא משתמש ב־`/wp-admin`, `/wp-json`, `/wp-content`), ולכן **אין התנגשות בפועל** — אבל זה תלוי בכך שלא ייווצר בעתיד עמוד וורדפרס בשם `api` או `admin`.
2. **התנגשות האתר של האפליקציה.** `/he`, `/he/program`, `/he/speakers`, `/he/info`, `/he/contact`, `/he/privacy`, `/he/terms`, `/he/accessibility` — אלה נתיבי וורדפרס מעתה. **כל קישור פנימי שמצביע אליהם מתוך חוויית הכנס יישבר.**
3. **קישורים בנויים כמחרוזות.** הקוד בונה נתיבים כ־`` `/${locale}/events/${slug}/my-activities` `` (`events/[slug]/page.tsx:52`) ו־`` `/${locale}/me` ``. עם `basePath` של Next, `<Link>` היה מוסיף קידומת אוטומטית אבל `NextResponse.redirect(new URL(...))` לא — ולכן דווקא **הגישה בלי basePath בטוחה יותר** כאן.
4. **הפניות מוחלטות.** `siteOrigin()` בונה `new URL('/he/me', origin)`. כל עוד ה־origin הוא `https://netaimolami.org`, התוצאה נכונה.
5. **sitemap ו־robots.** יתנגשו עם אלה של וורדפרס (Yoast). צריך להחליט מי מגיש `/sitemap.xml` ולמפות את השני.
6. **קוקיז.** `path: '/'` — יישלחו גם לבקשות וורדפרס. לא שובר כלום, אבל מוסיף כמה בתים לכל בקשה ושווה תיעוד בהצהרת הפרטיות.

**שורה תחתונה:** אין צורך ב־`basePath`, ב־`assetPrefix`, בשינוי middleware או בשינוי ניתוב. נדרשת החלטת מרחב שמות והתאמת קישורים.

---

## 13. Reverse Proxy Compatibility

**מה האפליקציה מצפה לו היום** (`DEPLOY.md` א.9–א.12):

- מאזינה על `127.0.0.1:3000` תחת PM2. פורט 3000 **לא נפתח** בחומת האש.
- Nginx מקדימה, `proxy_pass http://127.0.0.1:3000`, עם `X-Forwarded-For` ו־`X-Forwarded-Proto`.
- Cloudflare מלפנים, SSL **Full (strict)**, Certbot על השרת.
- HTTPS מסתיים ב־Nginx; האפליקציה עצמה מדברת HTTP פנימי.
- **אין `trustProxy` מפורש בקוד** — האפליקציה לא מסיקה פרוטוקול או host מהכותרות; היא לוקחת את הכתובת הציבורית מ־`NEXT_PUBLIC_SERVER_URL`. זה דווקא יתרון: אין רגישות ל־`X-Forwarded-Host`.
- `client_max_body_size` חייב להתיישר עם `serverActions.bodySizeLimit: '200mb'` (`next.config.ts:60`) — שלושה מקומות שחייבים להסכים, וה־DEPLOY מזהיר על 413.
- **אין websockets בייצור** — בפיתוח בלבד (`connect-src ... ws: wss:` מחוץ לייצור).
- סטרימינג: Next שולח תשובות מוזרמות (`Suspense` בפריסת ה־locale), ולכן ה־proxy צריך `proxy_buffering off` לנתיבים האלה או לפחות לא לשבור SSE.

**היתכנות חשיפה תחת `/he/events/netaim-2026/*` משרת אחר:** גבוהה. זה תרחיש proxy סטנדרטי, והנתיבים כבר תואמים. הדרישה היחידה שאינה טריוויאלית היא שהנתיבים הגלובליים (`/_next`, `/api`, `/studio`, `/admin`) חייבים לעבור גם הם — כלומר אי אפשר להגביל את ה־proxy אך ורק לקידומת הכנס.

---

## 14. WordPress / Conference Boundary

**המינימום שוורדפרס צריך לדעת:** שלושה דברים, ואף אחד מהם אינו נתון.

1. שקיים פריט ניווט "כנסים / Conferences" שמצביע ל־`/he/events/` ול־`/events/`.
2. שקיים עמוד נחיתה `/he/events/` שמציג את רשימת הכנסים (עמוד וורדפרס רגיל, תוכן ידני, או רשימה דלילה).
3. שהנתיב `/he/events/{slug}/*` **אינו שלו** ואסור שייווצר בו עמוד באותו slug.

| וורדפרס מחזיק | פלטפורמת הכנסים מחזיקה |
|---|---|
| אתר, ניווט ראשי, מותג | משתמשי כנס, כניסה, הרשמה |
| `/`, `/about/`, `/programs/`, `/magazine/` | פרופילים, סשנים, פעילויות |
| עמוד `/he/events/` | נטוורקינג, לוח זמנים, "הפעילויות שלי" |
| שפת העיצוב (מקור האמת) | Studio, Payload, PostgreSQL, APIs |

**אין צורך ב־API בין השתיים.** לא הרשמה משותפת, לא SSO, לא סנכרון משתמשים, לא webhooks. הגבול הוא גבול **ניתוב ועיצוב** בלבד — וזו החלטה ארכיטקטונית מצוינת שכבר קיבלת.

---

## 15. Authentication Isolation — אימות מפורש

סרקתי את תת־הקבוצה שקראתי אחר כל תלות אפשרית בוורדפרס: `wp-`, `wordpress`, `wp-json`, `wp_`, קריאות חוצות־מערכת, OAuth, SAML, קוקיז זרים.

**אפס ממצאים.** האפליקציה:

- אינה קוראת לוורדפרס ואינה יודעת על קיומו.
- מזהה משתמשים דרך `participants` ב־PostgreSQL שלה בלבד.
- מנפיקה קוקיז בשמות `participant_session` / `participant_locale` — **אין התנגשות** עם `wordpress_logged_in_*`, `wp-settings-*` או `wordpress_sec_*`.
- שומרת את תפקידי הניהול ב־`account-grants` שלה.

**הדבר היחיד שראוי לשים לב אליו בדומיין משותף:** קוקיז של שתי המערכות ייסעו לשתיהן (`path: '/'`, host-only). זה לא יוצר תלות ולא סיכון אימות — וורדפרס אינו יודע לקרוא טוקן חתום של Payload ולהיפך — אבל זה כן אומר ששתיהן יראו את שמות הקוקיז של השנייה. אם תרצה בידוד מלא, אפשר לצמצם את `path` של קוקי הכנס ל־`/he/events/` ול־`/en/events/` — **אבל זה ישבור את הסטודיו ואת `/me`**, שיושבים מחוץ לנתיב הזה. ההמלצה: להשאיר `path: '/'` ולתעד.

---

## 16. Design Architecture — ומה שצריך לדעת לפני הריסקין

מערכת העיצוב של האפליקציה חיה ב־**`src/styles/globals.css`** (32KB) ובנויה על Tailwind v4 עם `@theme inline`.

**183 טוקנים** מוגדרים ב־`:root`, ובהם:

| קטגוריה | ערכים קיימים |
|---|---|
| מותג | `--nt-navy: #173f73` · `--nt-blue: #2a90c8` · `--nt-green: #159a4b` · `--nt-yellow: #ffd21c` · `--nt-orange: #f9a11b` |
| טקסט | `--nt-ink: #172033` · `--nt-ink-soft: #667085` · `--nt-mute: #5d6778` |
| משטחים | `--nt-bg: #f7f8fa` · `--nt-surface: #ffffff` · `--nt-border: #e6eaf0` |
| כרום כהה | `--nt-dark: #0b1b33` + 12 טוקנים נלווים |
| רדיוס | `--nt-r-sm: 8px` · `--nt-r-md: 10px` · `--nt-r-lg: 16px` · `--nt-r-xl: 20px` · `--nt-r-pill: 999px` |
| צללים | `--nt-shadow` · `--nt-shadow-lift` · `--nt-shadow-float` · `--nt-shadow-drawer` |
| סטטוס | `--nt-danger` ומשפחתו |
| גופן | `--font-body` = Heebo, `--font-display` ממופה אליו |

**שלושה ממצאים שמשנים את תוכנית הריסקין:**

1. **התנגשות קידומת.** האפליקציה כבר משתמשת ב־`--nt-*` — אותה קידומת שבחרנו לוורדפרס. השמות **אינם תואמים**: `--nt-r-md` מול `--nt-radius-md`, `--nt-ink` מול `--nt-color-text`, `--nt-shadow` מול `--nt-shadow-card`. שתי מערכות עם אותה קידומת ומשמעויות שונות זו הזמנה לבאגים. צריך להחליט: לשנות שם לאחת מהן, או לכתוב שכבת מיפוי מפורשת.
2. **פלטה שונה מהיסוד.** האפליקציה כחולה־נייבי; וורדפרס ירוק. הריסקין אינו כיוונון אלא **החלפת פלטה**. הצד החיובי: היא כבר בנויה נכון — ערכי הצבע במקום אחד, והקומפוננטות צורכות טוקנים.
3. **גופן שונה.** Heebo מול Montserrat/Open Sans/M PLUS Rounded 1c. כאן דווקא כדאי לעצור ולחשוב: Heebo היא משפחה אחת שמכסה עברית ולטינית כראוי, בעוד שבוורדפרס יש ארבע משפחות ושתיים מהן חסרות עברית. ההחלטה שקיבלת — וורדפרס הוא מקור האמת — אומרת להביא את Montserrat/Open Sans לאפליקציה. שווה לאשר את זה במפורש, כי זה החלפה של משפחה עובדת במשפחה מפוצלת.

**החדשות הטובות:** ההיגיון כבר תואם. גם היא עובדת בטוקנים, גם היא Tailwind v4 עם `@theme inline`, גם היא מנהלת ניגודיות מתועדת (יש הערות `/* 7.00 on white */` ליד ערכים), וגם היא עושה RTL נכון — דרך `dir` ותכונות לוגיות, בלי פריצות. **זו בדיוק הארכיטקטורה שתכננו.** הריסקין הוא החלפת ערכים, לא בנייה מחדש.

---

## 17. Recommended Integration Architecture

```
                        netaimolami.org  (Cloudflare)
                                  │
                        ┌─────────▼─────────┐
                        │   Nginx (קצה)     │
                        └─────────┬─────────┘
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
   /  /he/  /about/       /he/events/{slug}/*    /_next/  /api/
   /programs/ /magazine/  /en/events/{slug}/*    /studio  /admin
   /he/events/  (index)   /he/me/*  /en/me/*     /sitemap.xml
            │                     │                     │
   ┌────────▼────────┐   ┌────────▼─────────────────────▼────────┐
   │   SERVER 1      │   │            SERVER 2 (Hetzner)         │
   │   WordPress     │   │   Next 15 + Payload 3 @ 127.0.0.1:3000│
   │   Elementor     │   │   PostgreSQL 16 · PM2                 │
   └─────────────────┘   └───────────────────────────────────────┘
```

**ההמלצה: ניתוב לפי קידומת נתיב, בלי `basePath`.**

הנימוק: מבנה ה־URL של האפליקציה כבר תואם ליעד. כל פתרון שמזיז אותה לתת־נתיב מוסיף `basePath`, `assetPrefix`, ותיקון של כל הפניה מוחלטת — עבודה מיותרת שמכניסה סיכון. עדיף להשאיר אותה בדיוק כפי שהיא ולתת ל־proxy להחליט מי עונה על מה.

**כללי הניתוב המוצעים, לפי סדר:**

| קידומת | יעד |
|---|---|
| `/he/events/netaim-2026`, `/en/events/netaim-2026` (וכל כנס עתידי) | כנסים |
| `/he/me`, `/en/me` | כנסים |
| `/he/enter`, `/en/enter`, `/he/connect`, `/en/connect` | כנסים |
| `/studio`, `/admin`, `/api`, `/_next` | כנסים |
| `/he/events/` בדיוק (בלי slug) | **וורדפרס** — עמוד רשימת הכנסים |
| כל השאר | וורדפרס |

**החלטות שצריך לקבל לפני המימוש:**

1. מה קורה לאתר הפנימי של האפליקציה (`/he/program`, `/he/speakers`, `/he`). ההמלצה: להסב אותם לנתיבים תחת הכנס, או לנטרל אותם ציבורית. **זו החלטת מוצר — לא אחליט אותה לבד.**
2. האם ה־slug של הכנס קבוע (`netaim-2026`) או שהניתוב צריך לתפוס כל slug. ההמלצה: כל slug, לפי דפוס `^/(he|en)/events/[^/]+/.+`.
3. מי מגיש `/sitemap.xml` ו־`/robots.txt`.

---

## 18. Migration Plan

### PHASE 0 — Discovery ✅
הדוח הזה. **סיכון:** אין. **גלגול לאחור:** לא רלוונטי.

### PHASE 1 — תאימות מקומית
הרצת שתי המערכות זו לצד זו מקומית מאחורי proxy אחד (Nginx של XAMPP או קונטיינר).
**קבצים:** אף אחד באפליקציה. רק קונפיג proxy מקומי.
**סיכון:** נמוך. **גלגול לאחור:** מחיקת קובץ הקונפיג.

### PHASE 2 — תאימות תת־נתיב
מיפוי כל קישור פנימי שיוצא אל מחוץ לנתיב הכנס; החלטה על גורל נתיבי האתר של האפליקציה.
**קבצים:** `src/app/(frontend)/[locale]/(experience)/*`, `(site)/*`, כל בונה קישור ב־`features/`.
**סיכון:** בינוני — קישור שבור נראה כתקלה למשתמש. **גלגול לאחור:** Git revert.

### PHASE 3 — התאמת אימות ודומיין
עדכון `NEXT_PUBLIC_SERVER_URL` ל־`https://netaimolami.org`; בדיקה מקצה לקצה של magic link, יציאה, ו־TOTP.
**קבצים:** `.env` בלבד. **סיכון:** גבוה אם מפספסים — כניסה שבורה. **גלגול לאחור:** החזרת הערך והפעלה מחדש של PM2.

### PHASE 4 — Reverse proxy
כללי הניתוב על שרת הקצה, כולל `/_next` ו־`/api`.
**סיכון:** גבוה — טעות מפילה את שתי המערכות. **גלגול לאחור:** `nginx -t` לפני כל reload, וקובץ קודם שמור.

### PHASE 5 — דומיין ציבורי אחד
DNS, תעודות, Cloudflare, בדיקת לולאות הפניה.
**סיכון:** גבוה. **גלגול לאחור:** החזרת רשומות DNS; שמירת `netaim26.org` פעיל כגיבוי עד לייצוב.

### PHASE 6 — אינטגרציה חזותית
החלפת הפלטה והגופנים ב־`src/styles/globals.css` לטוקני נטעים; פתרון התנגשות `--nt-*`.
**קבצים:** `src/styles/globals.css`, `src/app/(frontend)/[locale]/layout.tsx` (הגופן), `src/config/brand.ts`.
**סיכון:** בינוני, ויזואלי בלבד. **גלגול לאחור:** Git revert לקובץ אחד.

### PHASE 7 — אימות אבטחה
CSP בדומיין משותף, קוקיז, `frame-ancestors`, בדיקת חשיפה של `/admin` ו־`/studio`, rate limiting.
**סיכון:** בינוני. **גלגול לאחור:** כותרות ב־`next.config.ts`.

### PHASE 8 — פריסה לייצור
לפי `DEPLOY.md` חלק ב', עם גיבוי DB לפני (`npm run backup`).
**סיכון:** גבוה. **גלגול לאחור:** `DEPLOY.md` חלק ה' — יש תהליך rollback מתועד.

---

## 19. Security Risks

| # | ממצא | חומרה | הערה |
|---|---|---|---|
| 1 | `.env` בדיסק המקומי עם סודות אמיתיים (DB, SMTP, PAYLOAD_SECRET) | גבוהה | לא חשפתי ערכים. ודא ש־`.gitignore` מכסה |
| 2 | אין היסטוריית מיגרציות — המסד נבנה ב־push | גבוהה (תפעולית) | מתועד ב־`docs/Adopting-Migrations.md`; אל תיגע לפני קריאה |
| 3 | `/admin` של Payload נפתח בייצור אם `CONTENT_ENGINE_ADMIN=true` | בינונית | דלת חירום; ודא שהיא סגורה |
| 4 | אין טוקן CSRF מפורש | בינונית | מוגן דרך Server Actions + SameSite + CSP. לתעד כהחלטה |
| 5 | קוקיז `path:'/'` ייסעו גם לוורדפרס בדומיין משותף | נמוכה | לא מסכן אימות; לעדכן הצהרת פרטיות |
| 6 | `'unsafe-inline'` ב־`script-src` | נמוכה־בינונית | נדרש ל־Next ול־Payload; מתועד בקוד |
| 7 | שתי מערכות תפקידים מקבילות | נמוכה | סיכון של דריפט בין המודלים |
| 8 | `serverActions.bodySizeLimit: 200mb` | נמוכה | חייב להתיישר עם `client_max_body_size` |
| 9 | גיבויים מכילים מידע אישי, הרשאות 600/700 | בינונית | מתועד; לא להגיש דרך nginx |
| 10 | Retention ידני בלבד | בינונית | אם ההצהרה מבטיחה מחיקה אוטומטית — יש פער |

---

## 20. Unknowns / Questions

1. **מה קורה לאתר של האפליקציה?** `/he`, `/he/program`, `/he/speakers`, `/he/info` — מוסבים תחת הכנס, מנוטרלים, או נשארים ומתנגשים? **החלטת מוצר, ממתינה לך.**
2. **Slug קבוע או גנרי?** האם הניתוב תופס `netaim-2026` בלבד או כל כנס?
3. **מיפוי שמות:** הבקשה שלך מזכירה `/sessions`, `/activities`, `/profile`, `/login`, `/register`. בקוד הם `/workshops`, `/my-activities`, `/me/profile`, `/enter`, `/register`. לשנות בקוד, למפות ב־proxy, או לעדכן את המפרט?
4. **התנגשות `--nt-*`:** לשנות שם לטוקנים של האפליקציה, של וורדפרס, או לכתוב שכבת מיפוי?
5. **Heebo:** באמת להחליף אותה ב־Montserrat/Open Sans, או לשקול מחדש לאור העובדה שהיא מכסה עברית טוב יותר?
6. **`netaim26.org`:** נשאר פעיל כ־alias, מפנה, או מושבת?
7. **מי מגיש sitemap ו־robots בדומיין המשותף?**
8. לא קראתי: `docs/CONSTITUTION.md`, `tests/`, `scripts/`, `.github/workflows`, ו־459 קובצי מקור נוספים. אם משהו מהם משנה את התמונה — אשמח לקרוא.

---

## 21. Files Likely to Require Changes Later

| קובץ | למה |
|---|---|
| `.env` (ייצור) | `NEXT_PUBLIC_SERVER_URL` → `https://netaimolami.org` |
| `src/styles/globals.css` | הפלטה והטוקנים — לב הריסקין |
| `src/app/(frontend)/[locale]/layout.tsx` | הגופן, אם מחליפים את Heebo |
| `src/config/brand.ts` | `SUPPORT_EMAIL`, נכסי הלוגו |
| `src/app/(frontend)/[locale]/(experience)/*`, `(site)/*` | גורל נתיבי האתר |
| `src/app/robots.ts`, `src/app/sitemap.ts` | תיאום מול וורדפרס |
| `src/features/**` בוני קישורים | אם נתיבים משתנים |
| `next.config.ts` | רק אם CSP ידרוש התאמה בדומיין משותף |
| קונפיג Nginx (בשרת, לא ב־repo) | כללי הניתוב |

## 22. Files That Should NOT Be Changed

`src/payload.config.ts` (למעט תוספת collection מכוונת) · `src/migrations/**` · `src/shared/security/*` — מרחב הטוקנים ומחזור ה־session, קוד שנכתב בקפידה עם נימוקי אבטחה מתועדים · `src/features/registration/services/participant-identity-service.ts` · `src/cms/access*.ts` · `src/middleware.ts` · `src/i18n/*` · `src/config/env.ts` · `package.json` · `src/payload-types.ts` (נוצר אוטומטית).

---

## A. מה יכול להישאר ללא שינוי

כמעט הכול. מודל הנתונים, Payload, PostgreSQL, האימות, ה־session, הסטודיו, העורך, מנוע הסצנות, ה־i18n, ה־middleware, מבנה הניתוב, ה־API, והרשאות. גם הפריסה עצמה — Node + PM2 + Nginx + Postgres — נשארת בדיוק כפי שהיא.

## B. מה חייב להשתנות בשביל `/he/events/netaim-2026/*`

פחות ממה שציפית. **לא** `basePath`, **לא** `assetPrefix`, **לא** ניתוב. רק: (1) כללי proxy בשרת הקצה, כולל העברת `/_next`, `/api`, `/studio`, `/admin`; (2) הכרעה לגבי נתיבי האתר המתנגשים; (3) תיקון קישורים פנימיים שיוצאים מהכנס אל אותם נתיבים; (4) מיפוי שמות אם רוצים `/sessions` ו־`/profile` במקום `/workshops` ו־`/me/profile`.

## C. מה חייב להשתנות באימות

**ערך אחד:** `NEXT_PUBLIC_SERVER_URL`. הוא קובע לאן מפנה הקישור במייל ולאן חוזרים אחרי כניסה. כל השאר — הקוקיז, הטוקנים החתומים, ה־session, ההרשאות — עובד כמו שהוא בדומיין החדש. אין SSO לבנות ואין משתמשים להעביר.

## D. מה חייב להשתנות בפריסה

DNS ותעודה לדומיין המאוחד, כללי ניתוב ב־Nginx של הקצה, `client_max_body_size` שמתיישר עם 200MB, ו־`proxy_buffering` שלא שובר תשובות מוזרמות. השרת של הכנסים ממשיך להאזין על `127.0.0.1:3000` ולא נחשף.

## E. מה וורדפרס צריך לעשות

פריט ניווט "כנסים / Conferences" בשני התפריטים (הם נפרדים), עמוד `/he/events/` שמציג את הכנסים ומקשר פנימה, ושמירה על שפת העיצוב כמקור אמת. זה הכול.

## F. מה וורדפרס לא יעשה לעולם

לא יחזיק משתמשי כנס, לא כניסה, לא הרשמה, לא פרופילים, לא סשנים, לא פעילויות, לא נטוורקינג, לא ניהול, לא עורך, ולא ייגע במסד הנתונים של הכנסים. ולא ייווצרו בו עמודים בנתיבים `events/{slug}`, `api`, `admin`, `studio`.

## G. טופולוגיית ה־proxy המומלצת

Cloudflare → Nginx בקצה (על שרת וורדפרס או שרת ייעודי) → פיצול לפי קידומת נתיב → וורדפרס מקומית, או `proxy_pass` ל־Hetzner עם `X-Forwarded-For`/`X-Forwarded-Proto`. TLS מסתיים בקצה; התעבורה הפנימית לשרת השני חייבת להיות מוצפנת (VPN, tunnel, או HTTPS עם תעודה) — **היא חוצה את האינטרנט וכוללת קוקיז של session**. זו הנקודה האחת שבה הטופולוגיה הזו מוסיפה סיכון אמיתי, והיא דורשת החלטה מפורשת.

## H. הערכת מורכבות לפי תחום

| תחום | מורכבות | נימוק |
|---|---|---|
| מבנה URL | **נמוכה מאוד** | כבר תואם |
| Reverse proxy | בינונית | נתיבים גלובליים + ערוץ מאובטח בין השרתים |
| אימות | **נמוכה** | משתנה סביבה אחד |
| התנגשות מרחב שמות | בינונית | דורשת החלטת מוצר, לא קוד |
| שינוי שמות נתיבים | בינונית | אם תבחר לשנות ולא למפות |
| אינטגרציה חזותית | בינונית | החלפת פלטה + פתרון התנגשות טוקנים |
| מסד נתונים | **אפס** | לא נוגעים |
| הרשאות ואבטחה | בינונית | ביקורת בדומיין משותף |
| פריסה | בינונית־גבוהה | DNS ותעודות הם הרגע המסוכן |

---

**READ-ONLY מאושר:** לא נוצר, לא נערך ולא נמחק שום קובץ בפרויקט הכנסים או בוורדפרס. לא הורצו פקודות, לא הותקנו חבילות, לא הורצו מיגרציות ולא בוצעה פריסה. הדוח הזה הוא הפלט היחיד.
