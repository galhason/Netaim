# אימות תוכנית האינטגרציה — סקירת תלויות סופית (קריאה בלבד)

**תאריך:** 19 בספטמבר 2026
**היקף:** `src/features/cinematic/**`, `src/features/events/**`, `docs/CONSTITUTION.md`, `tests/**` (הרלוונטיים), `scripts/**`, `.github/workflows/**`, `DEPLOY.md`, `CLAUDE.md` — ובנוסף, בעל כורחי, מפת הנתיבים המלאה של `src/app/**` (ההסבר בסעיף 0).
**מה בוצע:** קריאה בלבד. לא שונה קובץ אחד, לא הורצה פקודה אחת, לא נגעתי בוורדפרס ולא בייצור.
**התוצאה:** **עצירה.** ארבעה סעיפים בתוכנית חייבים תיקון לפני שלב 1. הארכיטקטורה עצמה מחזיקה. הפירוט בסוף.

---

## 0. תיקון שחייב להיפתח בו — היקף הביקורת הקודמת

הביקורת של שלב 9 נבנתה על **~95 קבצים** שהעליתי לסביבה. העץ האמיתי של `src/` מכיל **554 קבצי מקור** ב־819 רשומות.

מה שלא ראיתי אז וקיים בפועל:

| מודול | מה זה |
|---|---|
| `src/experience-engine/**` (9 קבצים) | מנוע סצנות: registry, resolver, loader, validation, inspector |
| `src/experience-runtime/**` (11) | ה־Runtime שמריץ את ה־descriptor — `ExperienceStage`, composition, lifecycle |
| `src/event-engine/**` (7) | capabilities, health, lifecycle, readiness |
| `src/registration-engine/**` (11) | capacity, waitlist, conflict, anonymization |
| `src/networking-engine/**` (5) | connection/meeting state machines |
| `src/scenes/**` (3) | קטלוג הסצנות הרשומות |
| `src/foundation/event-bus.ts` | event bus |
| `src/migrations/**` (17) | 8 מיגרציות + index |
| `src/features/**` | **21 מודולי feature**, לא 3: access, accessibility, account, attendee, cinematic, composer, conference, events, experience, experiences, home, networking, notifications, opening, privacy, program, registration, speakers, sponsors, studio |

וגם: `app/(frontend)/[locale]/events/[slug]/` אינו `page.tsx` בודד — יש תחתיו **8 תתי־נתיבים** (`register`, `enter`, `me`, `me/profile`, `me/messages`, `me/speakers`, `me/venue`, `my-activities`, `networking`, `schedule`, `workshops`), ו־`app/(studio)` מכיל **שני** סטודיו במקביל: `(classic)` ו־`(console)`.

**המסקנות של הביקורת עמדו** — בדקתי אותן מחדש אחת־אחת מול הקוד המלא, וכולן החזיקו. מה שלא החזיק הוא **טענת הכיסוי**. זה חשוב כי סעיף 3 בתוכנית (בעלות על כתובות) נגזר מהרשימה החלקית, ושם נמצאות שתי הטעויות שמחייבות את העצירה.

---

## A. תלויות `Site.activeConference` — מפה מלאה

**ההגדרה:** `src/cms/globals/site.ts:23` — שדה `relationship` אל `events`, `read: isPublic`, `update: anyGrantWith('content:write')`.

**הפתרון:** `src/features/events/services/site-service.ts:30-63`. לא רק קורא את המצביע — כשהוא ריק הוא **מחשב** תחליף: `listPortalEvents(locale)` → מיון לפי `featured` ואז לפי התאריך הקרוב → הכנס הראשון. כלומר גם בלי בחירה בסטודיו יש "כנס שהוא האתר". נשמר בקאש תחת `cacheTags.activeConference`.

**14 אתרי קריאה ב־9 קבצים:**

| קובץ | שורות | תפקיד הקריאה | סיווג |
|---|---|---|---|
| `app/(frontend)/[locale]/page.tsx` | 34 | דף הבית **הוא** הכנס הפעיל | **ציבורי — נעלם בתוכנית** |
| `app/(frontend)/[locale]/(experience)/layout.tsx` | 30 | chrome + `registerHref` + `scheduleHref` | **ציבורי — חייב הגירה** |
| `app/(frontend)/[locale]/(experience)/program/page.tsx` | 26 | איזו תוכנית להציג | **ציבורי — חייב הגירה** |
| `app/(frontend)/[locale]/(experience)/speakers/page.tsx` | 31 | איזה roster | **ציבורי — חייב הגירה** |
| `app/(frontend)/[locale]/(experience)/info/page.tsx` | 55 | מידע של איזה כנס | **ציבורי — חייב הגירה** |
| `app/(frontend)/[locale]/(site)/layout.tsx` | 29 | `registerHref` בעמודים המשפטיים | ציבורי — ברירת מחדל בלבד |
| `app/(frontend)/[locale]/me/page.tsx` | 122, 194, 243 | לאיזה כנס להציע הרשמה / איזו ספריה / ברירת מחדל | **פנימי — לגיטימי** |
| `app/(frontend)/[locale]/me/profile/actions.ts` | 88, 126 | הקשר הכנס לעדכון פרופיל | **פנימי — לגיטימי** |
| `app/(frontend)/[locale]/me/notifications/route.ts` | 49 | הקשר להודעות | **פנימי — לגיטימי** |
| `app/(studio)/studio/(console)/page.tsx` | 39 | לסמן בסטודיו מי חי | **פנימי — לגיטימי** |

**עוד שלוש נגיעות:** `shared/cache/publish.ts:22,27` (מבטל את התג), `(studio)/studio/(console)/actions.ts:870` (רשומת audit `event.activeConferenceChanged`), `tests/unit/cache-safety.test.ts:90` (בודק שהתג קיים).

**המסקנה שמשנה את סעיף 6 פסקה 5:** אין צורך להחליט "להשאיר או לסמן כמיושן". החלוקה ברורה מהקוד — **6 קריאות ציבוריות** (שמהן 4 חייבות הגירה, 1 נעלמת, 1 ברירת מחדל) ו־**8 קריאות פנימיות** שמשתמשות בשדה בתור *ברירת מחדל שפויה*, לא בתור "הכנס שהוא האתר". השדה נשאר; מה שמתבטל הוא **התפקיד הציבורי** שלו, ואין לזה מחיר בשמונה האתרים הפנימיים.

---

## B. נתיבי החוויה הציבוריים — המצב האמיתי

### B.1 הגילוי המשמעותי: הם אינם ציבוריים

`(experience)/program`, `(experience)/speakers`, `(experience)/speakers/[id]`, `(experience)/info` — **כל ארבעתם** קוראים `await requireParticipant(lang)`, ש־(`features/registration/services/participant-gate.ts:26-31`) מפנה כל מי שאינו מזוהה אל `/{locale}/me`.

התוכנית קוראת לסעיף 6 "Conference **Public**-Route Migration". הם לא ציבוריים. הם מאחורי הזדהות, במכוון, עם נימוק מתועד בקוד: *"הם הכנס, לא פרסומת לו"*.

**מה זה משנה:**

1. **סעיף 18 (Sitemap):** `src/app/sitemap.ts` מפרסם `/program`, `/speakers`, `/info` תחת הערה שכותבת במפורש *"כל רשומה כאן היא עמוד שכל מבקר יכול לפתוח בלי להזדהות"*. **זה לא נכון היום.** ה־sitemap מפנה זחלנים לשלושה עמודים שמחזירים הפניה להתחברות. זה באג קיים, לא תוצאה של האינטגרציה, והוא צריך תיקון בכל מקרה.
2. **סעיף 19 (Robots):** `src/app/robots.ts` חוסם `/me/`, `/studio`, `/api/`, `/enter`, `/connect` — ומתיר `/`. שלושת העמודים החסומים־בפועל אינם ברשימת ה־disallow.
3. **סעיף 6 פסקה 4 (מה עושים עם הנתיבים הישנים):** הטיעון היחיד בעד הפניה היה "קישור חיצוני ישן". לעמוד שמפנה אנונימי להתחברות אין קישורים חיצוניים בעלי ערך ואין דירוג. **אפשרות א׳ (הסרה) הופכת מ"מומלצת" ל"היחידה שיש לה הצדקה"** — וזה מייתר החלטת מוצר.

### B.2 מפת הנתיבים הציבוריים המלאה (מה שקיים בפועל)

תחת `[locale]`:

| נתיב | שער | סיווג |
|---|---|---|
| `/` | פתוח | דף נחיתה = הכנס הפעיל |
| `/program` | `requireParticipant` | כנס־סינגלטון |
| `/speakers`, `/speakers/[id]` | `requireParticipant` | סינגלטון / **`[id]` אינו קשור לכנס בכלל** |
| `/info` | `requireParticipant` | כנס־סינגלטון |
| `/privacy`, `/terms`, `/accessibility`, `/contact` | פתוח | פלטפורמה `(site)` |
| `/events/[slug]` | פתוח | **דינמי** |
| `/events/[slug]/register`, `/enter`, `/me`, `/me/{profile,messages,speakers,venue}`, `/my-activities`, `/networking`, `/schedule`, `/workshops` | מעורב | **דינמי** |
| `/experiences/[slug]` | פתוח | **דינמי — חסר בתוכנית (סעיף Z.1)** |
| `/me/**` (badge, chat, contact, messages, networking, notifications, profile, wa) | session | אישי |
| `/connect/[token]`, `/enter` | טוקן | אישי |

מחוץ לקידומת השפה: `/studio/**` (שני סטודיו), `/admin/**`, `/api/**` (כולל `/api/graphql`), `/_next/**`, `/sitemap.xml`, `/robots.txt`, `/icon.png`, `/apple-icon.png`, **`/brand/*`, `/demo/*`, `/placeholder/*`, `/videos/*`** (סעיף Z.2).

**שני שרידים, לא נתיבים:** `app/(studio)/console/**` — `events/[slug]`, `homepage`, `new`, `people` — **תיקיות ריקות**, בלי קובץ אחד. `/console` אינו נתיב חי. וכן `(site)/info` ו־`(site)/speakers` — ריקות (אחרת ה־build היה נכשל על התנגשות עם `(experience)`). שתי הקבוצות ראויות לניקוי, ואינן שייכות לתוכנית הניתוב.

### B.3 פרט מימוש שהתוכנית לא אמרה, ושובר את ההגירה אם מתעלמים ממנו

לא ניתן להעביר את `(experience)/program` אל `events/[slug]/program` ישירות. ל־`(experience)` יש `layout.tsx` עם chrome בהיר (`ExperienceNav` + `ConferenceFooter`, `bg-[var(--x-bg)]`). אם ה־layout הזה יעבור אל `events/[slug]/layout.tsx` הוא **יעטוף גם את `events/[slug]/page.tsx`** — דף הנחיתה הקינמטי, בעל chrome כהה משלו. התוצאה: שתי ניווטים זה על זה על עמוד הכנס.

**הצורה היחידה שעובדת:** קבוצת נתיבים **בתוך** הסגמנט הדינמי —
`app/(frontend)/[locale]/events/[slug]/(experience)/{program,speakers,speakers/[id],info}/` + `.../(experience)/layout.tsx`.
קבוצה בסוגריים אינה מופיעה בכתובת, ו־`params.slug` עובר אליה מהסגמנט שמעליה. זה נכון ב־Next 15 ואין לו חלופה.

**התנגשויות אחרי ההגירה — שתיהן קיימות:**

| חדש | קיים כבר | השאלה |
|---|---|---|
| `/events/{slug}/program` | `/events/{slug}/schedule`, `/workshops`, `/my-activities` | ארבעה עמודי־תוכנית תחת כנס אחד |
| `/events/{slug}/speakers` | `/events/{slug}/me/speakers` | שתי רשימות דוברים תחת כנס אחד |

אין כאן התנגשות טכנית (הנתיבים שונים) — יש **כפילות מוצרית** שצריך להכריע לפניה, לא אחריה.

---

## C. בוני קישורים פנימיים — מלאי מלא

### C.1 המצב הטוב

**אין אף קישור פנימי מוחלט בקוד.** כל 80+ אתרי הבנייה הם תבניות יחסיות `` `/${locale}/...` ``. כתובות מוחלטות נבנות במקום אחד בלבד — `siteOrigin(request)` (`shared/utils/site-origin.ts`) ו־`serverUrl()` — שתיהן קוראות `NEXT_PUBLIC_SERVER_URL`, ו־`tests/unit/architecture-guards.test.ts` **אוכף** שאף `route.ts` לא בונה הפניה מ־`nextUrl.origin` בלי `siteOrigin`. משמעות: **אין שום צורך ב־`basePath`**, ושינוי הדומיין הוא שינוי משתנה סביבה אחד. זה אישור לסעיף 1 בתוכנית.

### C.2 הקישורים שיישברו — רשימה מדויקת

הכתובות `/{locale}/program`, `/{locale}/speakers`, `/{locale}/info` עוברות לוורדפרס לפי סעיף 5. אחרי ההגירה הן גם לא יתקיימו באפליקציה. **11 אתרי קישור ב־8 קבצים** מפנים אליהן היום:

| קובץ | שורות | אל |
|---|---|---|
| `features/cinematic/constants/cinematic-content.ts` | 74-98 | **`SITE_NAV_LINKS`** — הקבוע עצמו: `''`, `/program`, `/speakers`, `/info`, `/me/networking` |
| `features/cinematic/components/cinematic-nav.tsx` | 145-150 | מרנדר את `SITE_NAV_LINKS` כ־`` `${home}${link.path}` `` |
| `features/conference/components/experience-nav.tsx` | 95, 148 | אותו קבוע + `` `${home}/program` `` נוסף |
| `features/cinematic/components/arrival-scene.tsx` | 43 | `/program` |
| `features/cinematic/components/closing-scene.tsx` | 59 | `/program` |
| `features/cinematic/components/featured-sessions-scene.tsx` | 342, 369 | `/program`, `/program?activity=` |
| `features/cinematic/components/program-scene.tsx` | 204 | `/program` |
| `features/cinematic/components/speakers-scene.tsx` | 140, 348 | `/speakers/{id}`, `/speakers` |
| `app/(frontend)/[locale]/me/page.tsx` | 317, 381 | `/program?activity=`, `/program` |

**סעיף 26 בתוכנית מונה "בוני קישורים ב־`features/cinematic`, `features/events`". הרשימה האמיתית כוללת `features/conference` (שאינו מופיע) ו־`app/(frontend)/[locale]/me/page.tsx` (שאינו מופיע), ולא כוללת `features/events` בכלל** — `event-header.tsx` בונה נכון `` `/${locale}/events/${slug}` `` וכבר עובד.

**נקודת המפתח:** `SITE_NAV_LINKS` הוא **קבוע משותף** לשני ה־nav ולשני ה־layout. לעשות אותו מודע ל־slug = לשנות את הצורה שלו (מ־`path: string` לפונקציה או להוספת קידומת בזמן הרינדור), וזה נוגע בשני ה־nav בו־זמנית. זו העבודה האמיתית בסעיף 6 צעד 3, והיא גדולה מ"התאמת בוני הקישורים בקומפוננטות הניווט".

### C.3 קישורים אל וורדפרס — עובדים רק אם וורדפרס בנוי לזה

`features/cinematic/components/conference-footer.tsx:39,45,51,60` מפנה אל `/{locale}/privacy`, `/{locale}/terms`, `/{locale}/accessibility`, `/{locale}/contact`.

סעיף 3 בתוכנית נותן לוורדפרס `/privacy/`, `/terms/`, `/accessibility/`, `/contact/` — **בלי קידומת שפה** (רק `/he/about/` ו־`/he/programs/` מופיעים עם קידומת). אם וורדפרס לא מגיש `/he/privacy/`, ה־footer של **כל עמוד כנס** מחזיר 404 בארבעה קישורים שהחוק מחייב להיות נגישים מכל עמוד.

**זה חייב הכרעה מפורשת:** או שוורדפרס מקבל עמודים בנתיבים עם קידומת שפה (Polylang עושה את זה ממילא), או שה־footer מקבל את הנתיבים שוורדפרס באמת מגיש.

### C.4 קישורים אל דף הבית — מתוכנן, אבל צריך לדעת

`/{locale}` עובר לוורדפרס. תשעה אתרים מפנים לשם: `cinematic-nav:132` (הלוגו), `experience-nav:129`, `SITE_NAV_LINKS` פריט `home`, `me/page.tsx:427`, `account/actions/sign-out.ts:31,41`, `scenes/opening-scenes.tsx:135` (`/` חשוף), ו־fallback ה־`registerHref` בשני ה־layout.

כולם *נכונים* — וורדפרס הוא הבית. אבל המשמעות התפעולית: **התנתקות מהאפליקציה מוציאה את המשתמש מהאפליקציה**, ולחיצה על הלוגו בעמוד כנס מוציאה אותו לאתר הארגוני. זו החלטת UX שהתוכנית לא אמרה בקול, והיא נכונה לפי סעיף 5 — צריך רק לאשר אותה במודע.

---

## D. תמיכה דינמית בריבוי כנסים — אישור

**חיפשתי `netaim-2026`, `netaim26`, `netaimolami` בכל `src/`. אפס תוצאות.** הופעות קיימות רק ב־`DEPLOY.md`, ב־header של `scripts/bootstrap-platform.ts` (דוגמת שימוש בהערה) ובשתי בדיקות (`one-logo-everywhere`, `email-layout`) כערך fixture.

שרשרת הנתונים כולה פרמטרית ב־slug, ואומתה בקוד:

- `getConferenceExperience(slug, locale)` → `cachedContent(..., ['conference-experience', slug, locale], [cacheTags.event(slug), speakers, sponsors])`
- `findPortalEvent(slug, locale)`, `findEventOpeningContent(slug, locale)`, `listAgenda(slug, locale)`, `listSponsors(slug)`, `listConferenceSpeakers(slug, locale)`
- `assembleExperience` בונה `registerHref = /{locale}/events/{slug}/register` מתוך הפרמטר
- `feedItemHref(type, locale, slug)`, `myAreaHref(locale, eventSlug)`
- `cacheTags.event(slug)`, `cacheTags.directory(slug)`, `cacheTags.experience(slug)`
- `events.slug` — `unique: true`, `index: true`
- `toEventSlug()` מרומן עברית לתעתיק לטיני (`utils/slug.ts`), כך ש־slug תמיד ASCII — מה שמייתר את הסייג בסעיף 4 על `[^/]+` מול `[a-z0-9-]+`: **הקוד כבר מבטיח ASCII**, ולכן דפוס מוגבל לא יישבר על slug עברי. אני לא ממליץ לשנות — רק מציין שהחשש שהוליד את הסייג אינו קיים.

**הסינגלטונים המבניים היחידים** הם ששת אתרי הקריאה הציבוריים של `activeConference` (סעיף A) ו־`SITE_NAV_LINKS` (סעיף C.2). אלה. **עקרון "פלטפורמה אחת, כנסים רבים" עומד בקוד**, וההגירה בסעיף 6 היא בדיוק מה שמסלק את שני החריגים.

`docs/CONSTITUTION.md` §4 ו־§6 אומרים את אותו הדבר במילים: *"Everything must be event-driven. Nothing should be hardcoded for a single conference"*, *"Never hardcode scene sequences"*. התוכנית מיושרת עם החוקה, לא מתנגשת בה.

---

## E. Studio / Composer / Preview — אישור, עם תלות אחת

| רכיב | מצב | מסקנה |
|---|---|---|
| `/studio/preview/[slug]` | כבר לפי slug; `getConferenceExperiencePreview(slug, locale)`; `buildConferenceDescriptor` הציבורי; שער הסטודיו | לא נוגע בהגירה |
| `CanvasSelectBridge` (iframe) | `next.config.ts`: `frame-ancestors 'self'` | בדומיין משותף `'self'` = `netaimolami.org`, וה־iframe הוא `/studio/preview/...` באותו origin → **ממשיך לעבוד** |
| `/api/preview` (draft mode) | דורש `PREVIEW_SECRET`, מפנה ל־`/{locale}/events/{slug}` | תחת `/api/*` שבבעלות הפלטפורמה → עובד |
| Composer | `saveComposerContent(locale, scenes)` → `sceneContentRepository.updateSceneContent(id, locale, content)` | **אינו יודע דבר על נתיבים** → אינו מושפע |
| `experience-runtime` / `experience-engine` | `applyComposition`, `registerScene`, `resolveScene` | composition בלבד → אינו מושפע |
| `(console)/experiences/[slug]` | העורך של document experiences | **תלוי בכך ש־`/{locale}/experiences/{slug}` נשאר נגיש** → ראה Z.1 |
| `STUDIO_AREAS` | `/studio`, `/studio/events`, `/studio/homepage`, `/studio/team`, `/studio/organization` | הכל תחת `/studio*` → כלל proxy אחד מכסה |

**שני סטודיו במקביל** — `(classic)` ו־`(console)` — שניהם תחת `/studio`. לא בעיה לניתוב; חוב טכני שראוי לתעד.

---

## F. כיסוי בדיקות — מה מגן, ומה יישבר

### F.1 הבדיקה שתישבר בוודאות

`tests/unit/public-experience-snapshots.test.tsx` + `tests/unit/__snapshots__/public-experience-snapshots.test.tsx.snap` — **142,948 בתים** של markup נעול, כולל `buildConferenceDescriptor(fallbackConference('he'), 'he')` בשתי השפות. ה־descriptor הזה מכיל את סצנת ה־`nav`, שמרנדרת `SITE_NAV_LINKS`.

**ברגע שהקישורים בסעיף C.2 יהיו מודעים ל־slug, ה־snapshot ישתנה.** ההערה בראש הקובץ אומרת במפורש: *"Any migration of the composition model must leave these snapshots untouched — zero visual change for visitors"*. ההגירה **תפר** את ההבטחה הזאת בכוונה, ולכן:

- יש לעדכן את ה־snapshot **במסגרת** ה־commit של ההגירה, ולא כתיקון שלאחר מכן;
- יש לקרוא את ה־diff שלו, לא לאשר אותו עיוור. זו ההזדמנות האחת לראות שום דבר אחר לא זז.

התוכנית אינה מזכירה עבודת בדיקות בכלל. זהו פער אמיתי בסעיפים 6 ו־26.

### F.2 שומרים שמגבילים את דרך המימוש

| בדיקה | מה היא אוכפת | הרלוונטיות |
|---|---|---|
| `signed-in-nav-destination.test.ts` | ליטרל `meHref` **אסור** שיכיל `/events/` | "תיקון" שיפנה את המזוהה ללאונג' של כנס **ייכשל ב־CI**. הליטרל היחיד המותר הוא `/{locale}/me` (וזה מה שיש) |
| `personal-pages-are-dynamic.test.ts` | כל `page`/`route`/`layout` שקורא אחת מ־30 פונקציות־מבקר חייב `export const dynamic = 'force-dynamic'` | ההצהרה חייבת **לנדוד עם הקבצים**. גם `layout.tsx` נספר — ולכן ה־`(experience)/layout.tsx` המועבר חייב לשמור עליה |
| `architecture-guards.test.ts` | (א) `src/app` לא מייבא `@/features/*/components/<file>` ישירות (ב) שכבת הרינדור לא מסתעפת על `scene.type`/`experience.type` (ג) הפניה מוחלטת ב־`route.ts` עוברת ב־`siteOrigin` (ד) `infrastructure` לא מייבא feature barrel כ־value (ה) `'use client'` לא מייבא את barrel הסטודיו | חמישה שומרים שההגירה חייבת לכבד. (ג) הוא בדיוק ההגנה שעושה את שינוי הדומיין בטוח |
| `cache-safety.test.ts` | locale בכל מפתח `cachedContent`; אין `cookies()`/`currentParticipant` בקורא מקאש; `cacheTags.activeConference` קיים (שורה 90) | אם המצביע יימחק — הבדיקה נשברת. סיבה נוספת להשאיר את השדה ולבטל רק את תפקידו הציבורי |
| `nav-viewer.test.ts` | `ConferenceNavContent` אסור שיכיל `viewer`/`account`/`participant`/`signedIn`; `NavRenderer` מקבל `viewer` כהקשר; אין renderer אסינכרוני; `conference-scenes.tsx` לא מכיל `currentParticipant` | **slug אינו זהות** → להעביר slug דרך `content` מותר ואינו מפיל את השומר |
| `two-languages-stay-apart.test.ts` | נתיבי קבצים **קשיחים**: `(console)/homepage/page.tsx`, `(console)/experiences/[slug]/page.tsx` | אל תזיז את שני הקבצים האלה |
| `tests/integration/isolation.int.test.ts` | בידוד `organization` מול Postgres אמיתי; `CI=true` מונע skip שקט | שער ה־CI הכבד. אינו מושפע מניתוב |

### F.3 מה אין לו כיסוי

אין בדיקה שמרנדרת `(experience)/program|speakers|info` בכלל, ואין בדיקה שמאמתת שקישור פנימי מצביע לנתיב קיים. **אחרי ההגירה, שום דבר ב־CI לא יתפוס 11 קישורים שבורים.** הדרך היחידה לתפוס אותם היא ידנית, או בבדיקה חדשה. אני מציע (ולא מבצע) בדיקה בסגנון השומרים הקיימים: סריקת כל ליטרל `` `/${locale}/...` `` ואימות מול עץ הנתיבים.

---

## G. פריסה ו־CI

### G.1 `.github/workflows/gates.yml`

`push` ל־main + כל PR. שני שירותי Postgres (5432 לאפליקציה, 5433 לבידוד). הרצף: `npm ci` → `generate:types` → `typecheck` → `lint` → `test` → `vitest run tests/integration` (עם `CI=true`, `PAYLOAD_DB_PUSH=true`) → `build`.

`NEXT_PUBLIC_SERVER_URL` ב־CI הוא `http://localhost:3000`. **שינוי המשתנה בייצור אינו נוגע ב־CI** — לכן אין סיכון שהשינוי יעבור בשקט; הוא גם לא ייבדק שם. `next build` ב־CI **כן** יתפוס העברת תיקיות שבורה, ייבוא חסר או התנגשות נתיבים. זה שער אמיתי לשלב 1.

`npm run gates` מריץ את אותו הרצף מקומית.

### G.2 חוב המיגרציות — הגבלה אמיתית על סעיף 24

`package.json` מכיל שדה בשם `_migrations:README` שתוכנו: *"STOP. This database was built with PAYLOAD_DB_PUSH, so it has no migration history... `migrate` will then fail on the first CREATE TABLE"*. 78 טבלאות. קיימת `src/migrations/` עם 8 מיגרציות ו־`docs/Adopting-Migrations.md`.

**המשמעות לתוכנית:** שלב 1 (הגירת נתיבים) **אינו שינוי סכימה** ולכן אינו נוגע בזה, וזה טוב. אבל סעיף 24 מציין "מסד נתונים → `DEPLOY.md` חלק ה'" כאילו יש נוהל rollback סכימתי זמין. **אין.** כל עוד החוב לא נפרע, הגלגול לאחור היחיד למסד הוא **שחזור מגיבוי**, וזה אומר אובדן כתיבות מרגע הגיבוי. צריך לומר את זה במפורש בסעיף 24, ולא להסתמך על "לפי הנוהל".

### G.3 `DEPLOY.md` מול מה שהתוכנית צריכה

הקונפיג הקיים (א.10):

```nginx
server { listen 80; server_name netaim26.org www.netaim26.org;
         client_max_body_size 50M;
         location / { proxy_pass http://127.0.0.1:3000; ... } }
```

תעודת Certbot ל־`netaim26.org` + `www` בלבד. Cloudflare Full (strict).

**שתי בעיות מוחשיות בדומיין משותף:**

1. **`server_name`** אינו מכיל `netaimolami.org`. הבלוק כן ייתפס בפועל (הוא ה־site היחיד שמופעל, ו־`default` הוסר, ולכן הוא ברירת המחדל *במקרה*) — אבל להסתמך על מקריות בקונפיג חזית זה בדיוק מה שנשבר בשינוי הבא. יש להוסיף את השם במפורש.
2. **`client_max_body_size 50M`** מול `serverActions.bodySizeLimit: '200mb'` ב־`next.config.ts`, שההערה שם אומרת במפורש שהוא *"נשמר שווה ל־`client_max_body_size` של Nginx"*. הם **לא** שווים: 50M מול 200mb. העלאת וידאו בין 50MB ל־200MB נחסמת ב־Nginx לפני שהיא מגיעה לאפליקציה. באג קיים, יתחדד כשיתווסף proxy שני בשרשרת.
3. **TLS אל המקור:** תעודה ל־`netaim26.org` בלבד. אם וורדפרס יפנה HTTPS אל שרת הכנסים עם `Host: netaimolami.org`, אימות שם המאחז ייכשל — אלא אם תונפק תעודה לשם הזה על שרת הכנסים, או שהתעבורה תעבור ב־**Cloudflare Tunnel** (שאינו צריך תעודה מצד המקור כלל). **זו עדות קשה לטובת אפשרות ה־Tunnel** באחת מהחלטות המוצר הפתוחות — לא הכרעה, אבל הנימוק הטכני נמצא בקוד ולא בהעדפה.

### G.4 CSP ו־HSTS — סיכון חוצה־מערכות שאינו בתוכנית

`next.config.ts` מחזיר את כותרות האבטחה על `source: '/:path*'` — **כל נתיב**. בין השאר:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

בדומיין משותף, הכותרת הזאת מגיעה מהפלטפורמה אבל **חלה על כל `netaimolami.org` ועל כל תתי־הדומיינים שלו, לשנתיים**, ברגע שמבקר טוען עמוד כנס אחד. אם קיים תת־דומיין שמוגש ב־HTTP בלבד (staging, mail, כלי פנימי) — הוא ייפול לאותו מבקר, ואי אפשר לבטל את זה בצד השרת. `preload` היא התחיימות נוספת.

`default-src 'self'` דווקא עובד לטובתנו — שני המערכות באותו origin. אבל `font-src 'self' data:` יישבר אם עבודת הטיפוגרפיה תוסיף Google Fonts, ו־`img-src` לא מתיר את `/wp-content/uploads` של דומיין אחר (באותו דומיין — מתיר).

סעיף 25 מסמן "HSTS" כצ'קבוקס להדליק ב־Cloudflare. הוא אינו אומר ש**האפליקציה כבר שולחת אותו עם `includeSubDomains; preload`** ושזה יחול על אתר וורדפרס. זה חייב להיכנס לתוכנית כהחלטה: להשאיר, לצמצם, או לוודא שכל תת־דומיין ב־HTTPS לפני שלב 3.

### G.5 סקריפטים

`backup.sh` (גיבוי DB + מדיה, עם **אימות** שהדאמפ אינו ריק, 700/600, ומחיקת דאמפ שנכשל כדי ש־`restore.sh` לא יקח אותו), `restore.sh`, `retention.ts`, `push-schema.ts`, `bootstrap-platform.ts` (מסרב לרוץ פעמיים; אינו מקבל סיסמה כארגומנט בכוונה). **כולם אגנוסטיים לדומיין. אף אחד מהם אינו צריך שינוי.** שלב 0 בסעיף 23 (`npm run backup` + `backup:verify`) מגובה בקוד אמיתי שבודק את עצמו — זה חלק חזק בתוכנית.

---

## H. בדיקת בטיחות סופית לפני מימוש

### H.1 מה משתנה בשלב 1 (הגירת הנתיבים) — הרשימה המדויקת

| # | קובץ | פעולה |
|---|---|---|
| 1 | `app/(frontend)/[locale]/(experience)/layout.tsx` | → `.../events/[slug]/(experience)/layout.tsx`; מקור ה־slug: `params.slug` במקום `getActiveConferenceSlug` |
| 2 | `.../(experience)/program/{page,actions,loading,program-experience,program-view}.tsx` | → תחת `events/[slug]/(experience)/program/` |
| 3 | `.../(experience)/speakers/{page,speakers-directory}.tsx` | → `events/[slug]/(experience)/speakers/` |
| 4 | `.../(experience)/speakers/[id]/page.tsx` | → `events/[slug]/(experience)/speakers/[id]/`; **אינו קורא slug כלל היום** — יקבל פרמטר שאינו משתמש בו |
| 5 | `.../(experience)/info/page.tsx` | → `events/[slug]/(experience)/info/` |
| 6 | `features/cinematic/constants/cinematic-content.ts` | `SITE_NAV_LINKS` — שינוי צורה כדי לשאת slug |
| 7 | `features/cinematic/components/cinematic-nav.tsx` | קידומת `events/{slug}` בבניית הקישור |
| 8 | `features/conference/components/experience-nav.tsx` | אותו דבר + `${home}/program` בשורה 148 |
| 9 | `features/cinematic/components/{arrival,closing,featured-sessions,program,speakers}-scene.tsx` | 7 אתרי קישור |
| 10 | `app/(frontend)/[locale]/me/page.tsx` | שורות 317, 381 |
| 11 | `app/(frontend)/[locale]/page.tsx` | להכריע: להשאיר (מוגש רק ב־`netaim26.org`) או להסיר |
| 12 | `app/(frontend)/[locale]/(site)/layout.tsx` | `registerHref` — נשאר על ברירת מחדל, ללא שינוי מבני |
| 13 | `tests/unit/__snapshots__/public-experience-snapshots.test.tsx.snap` | עדכון מבוקר, ב־commit אחד עם 6–10 |
| 14 | `app/sitemap.ts`, `app/robots.ts` | תיקון האי־התאמה שבסעיף B.1 |

**14 פריטים, לא 3.** כולם בתוך `src` ובתוך `tests`; אף אחד אינו נוגע בוורדפרס, ב־proxy, ב־DNS או במסד.

### H.2 מה אסור לגעת בו (מאושר מחדש מול הקוד המלא)

`src/payload.config.ts` · `src/migrations/**` · `src/shared/security/{session-token,token-namespace}.ts` · `src/features/registration/services/participant-identity-service.ts` · `src/features/registration/services/participant-gate.ts` · `src/cms/access*.ts` וכל `src/cms/collections/**` · `src/cms/globals/site.ts` (השדה נשאר — סעיף A) · `src/middleware.ts` · `src/i18n/**` · `src/config/{env,locales}.ts` · `src/experience-engine/**` · `src/experience-runtime/**` · `src/event-engine/**` · `src/registration-engine/**` · `src/networking-engine/**` · `src/payload-types.ts` · `package.json` · `scripts/**` · `.github/workflows/gates.yml` · כל מבנה העמודים בוורדפרס.

**תוספת לרשימה המקורית:** חמשת מודולי ה־engine ו־`participant-gate.ts`. הם לא היו ברשימה כי לא ידעתי שהם קיימים.

### H.3 סדר, והפיכות

| שלב | פעולה | הפיכות | שער |
|---|---|---|---|
| 0 | `npm run backup` + `backup:verify` | — | הדאמפ מאמת את עצמו |
| 1a | הכרעה בשתי הכפילויות (B.3) ובקישורי ה־footer (C.3) | החלטה | — |
| 1b | הגירת 5 קבצי נתיב לקבוצה `(experience)` בתוך `events/[slug]` | `git revert` | `npm run gates` ירוק |
| 1c | 11 אתרי הקישור + `SITE_NAV_LINKS` | `git revert` | `gates` ירוק |
| 1d | עדכון ה־snapshot, **בקריאת diff** | `git revert` | ה־diff מכיל רק קישורים |
| 1e | `sitemap.ts` + `robots.ts` | `git revert` | — |
| 2+ | תעבורה / proxy / DNS / `NEXT_PUBLIC_SERVER_URL` | לפי סעיף 24 | לפי סעיף 23 |

כל שלב הפיך בפעולה אחת. אין שינוי סכימה, ולכן אין תלות בחוב המיגרציות (G.2).

### H.4 סיכונים, מדורגים

| # | סיכון | חמור | ניתן לגילוי ב־CI |
|---|---|---|---|
| 1 | `/{locale}/experiences/{slug}` לא ינותב → פיצ'ר חי נופל בשקט | גבוה | **לא** |
| 2 | `/brand`, `/placeholder`, `/videos`, `/demo`, `/icon.png` לא ינותבו → תמונות ווידאו שבורים בכל עמוד כנס | גבוה | **לא** |
| 3 | footer מפנה ל־`/he/privacy` שאינו קיים בוורדפרס | גבוה (חוק נגישות) | **לא** |
| 4 | 11 קישורים ל־`/program`/`/speakers`/`/info` אחרי ההגירה | בינוני-גבוה | **לא** |
| 5 | HSTS `includeSubDomains; preload` חל על דומיין וורדפרס | בינוני, בלתי הפיך למבקר | לא |
| 6 | `client_max_body_size 50M` מול `200mb` | בינוני | לא |
| 7 | שני עמודי־דוברים / ארבעה עמודי־תוכנית תחת כנס | בינוני (UX) | לא |
| 8 | snapshot 143KB מאושר עיוור ומסתיר שינוי אחר | בינוני | הבדיקה נכשלת, ה־diff לא נקרא |
| 9 | TLS אל המקור בלי תעודה ל־`netaimolami.org` | בינוני | לא |
| 10 | עמוד וורדפרס חדש תחת `events` נבלע ב־proxy | נמוך, מתועד בתוכנית | לא |

**שבעה מעשרה אינם ניתנים לגילוי אוטומטי.** זה הטיעון החזק ביותר בעד בדיקת־קישורים חדשה (F.3) ובעד רשימת אימות ידנית לכל שלב.

### H.5 הכרעות שנדרשות לפני שלב 1b

לפי `docs/CONSTITUTION.md` §21 — *"Stop. Do not invent behavior. Explain the available options. Wait for approval. Never guess"* — אני לא מכריע באלה:

1. `/{locale}/experiences/{slug}` — לפלטפורמה (תיקון סעיף 3), או לסגור את הפיצ'ר?
2. נכסים סטטיים — לפלטפורמה בנתיבי השורש שלהם, או להעביר את `public/` תחת קידומת?
3. עמודי ה־footer — וורדפרס מקבל נתיבים עם קידומת שפה, או ה־footer משתנה?
4. `/events/{slug}/program` מול `schedule`/`workshops`/`my-activities` — מה נשאר?
5. `/events/{slug}/speakers` מול `/events/{slug}/me/speakers` — מה נשאר?
6. `[locale]/page.tsx` (הנחיתה) — נשאר חי ל־`netaim26.org` כמפל, או מוסר?
7. HSTS — להשאיר `includeSubDomains; preload`, לצמצם, או לאמת קודם כל תת־דומיין?
8. `client_max_body_size` — ל־200M, או להוריד את `bodySizeLimit`?

---

## Z. שתי הטעויות שמחייבות תיקון בתוכנית עצמה

### Z.1 `/{locale}/experiences/{slug}` נשמט מרשימת הבעלות

**קיים בפועל:** `app/(frontend)/[locale]/experiences/[slug]/page.tsx` → `getDocumentExperience(slug)` → `ExperienceStage`. אוסף `experiences` ב־Payload, תג קאש `cacheTags.experience(slug)`, שירות `features/experiences/services/document-experiences.ts`, עורך בסטודיו ב־`(console)/experiences/[slug]`, ובדיקה `tests/unit/document-experiences.test.tsx`.

**בתוכנית:** סעיף 3 מונה שמונה דפוסים בבעלות הפלטפורמה. `experiences` אינו ביניהם. סעיף 5 קובע: *"כל נתיב שאינו מופיע ברשימת הבעלות של הכנסים הולך לוורדפרס כברירת מחדל"*.

**התוצאה אם מיישמים כפי שכתוב:** `/he/experiences/<כל דבר>` → וורדפרס → 404. פיצ'ר חי, עם אוסף, עורך ובדיקה, נופל בלי שאף כלי אוטומטי יגיד מילה.

**זו אינה טעות של הביקורת** — הביקורת מנתה את הנתיב (שורה 73 ב־`conference-integration-audit.md`). היא טעות של התוכנית, שנגזרה ממנה. תיקון: שורה אחת בסעיף 3 ושורה בסעיף 5.

### Z.2 נכסי `public/` נשמטו — ארבעה נתיבי שורש

`public/` מוגש בשורש הדומיין, לא תחת `/_next/`:

| נתיב | תוכן | מי מפנה אליו |
|---|---|---|
| `/brand/netaim-lockup.png`, `-light.png`, `netaim-mark.png` | הלוגו המשולב | `config/brand.ts` — כל chrome, וכל **מייל** |
| `/placeholder/scene.jpg` | ה־fallback היחיד לכל סצנה | `cinematic-content.ts:PLACEHOLDER_SCENE`, `opening-service.ts` |
| `/demo/*.jpg` (6) | תמונות demo | `constants/demo-event.ts` |
| `/videos/networking-hero.mp4 \| .webm` (~3MB) | וידאו רקע | סצנת networking |
| `/icon.png`, `/apple-icon.png` | favicon | `src/app/` |

הביקורת מנתה את כולם (שורות 120, 274, 282-283). **התוכנית לא.** אותו כלל ברירת מחדל שולח את כולם לוורדפרס. התוצאה: לוגו שבור בכל עמוד כנס **ובכל מייל יציאה**, וכל תמונת fallback שבורה.

תיקון: להוסיף `/brand/*`, `/demo/*`, `/placeholder/*`, `/videos/*`, `/icon.png`, `/apple-icon.png` לרשימת סעיף 3 — או, נקי יותר, להוסיף לסעיף 5 כלל שלילי: **כל נתיב ששרת הכנסים מגיש כקובץ סטטי מ־`public/` שייך לפלטפורמה**, ולוודא שהרשימה נבדקת מול `ls public/` בכל פריסה.

---

## סיכום — עצירה

**הארכיטקטורה מחזיקה.** שני שרתים, וורדפרס מחזיק את האתר הארגוני, ניתוב לפי דפוס `^/(he|en)/events/[^/]+`, אפס slug קשיח (אומת: אפס הופעות ב־`src/`), אימות שאינו נוגע, תעבורה מוצפנת, `NEXT_PUBLIC_SERVER_URL` כנקודת השינוי היחידה לכתובות מוחלטות, ואין צורך ב־`basePath`. כל אחת מהקביעות האלה אומתה מול הקוד המלא, לא מול דגימה.

**אבל התוכנית כתובה לא ניתנת ליישום כמו שהיא.** שני פיצ'רים חיים — document experiences וכל נכסי `public/` (כולל הלוגו במיילים) — היו נופלים בשלב 3–4 בלי שאף בדיקה תגיד מילה, כי שניהם נשמטו מרשימת בעלות הכתובות ש**סעיף 5 מפרש כברירת מחדל לוורדפרס**. בנוסף, ארבעה סעיפים (6, 18, 19, 26) נכתבו בהנחה שעמודי `(experience)` ציבוריים — הם מאחורי `requireParticipant` — והיקף עבודת הקוד בסעיף 6 הוא 14 פריטים ולא 3, כולל snapshot נעול של 143KB שההגירה שוברת בכוונה.

**מה שנדרש לפני שלב 1b** — תיקון סעיפים 3, 5, 6, 18, 19, 24, 25, 26, ושמונה ההכרעות בסעיף H.5. שלב 0 (גיבוי) בטוח להרצה עכשיו ואינו תלוי בכלום.

לא מימשתי דבר. לא שיניתי דבר.
