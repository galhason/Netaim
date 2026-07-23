# העלאת Hason לשרת בדיקות — חינמי לגמרי

מדריך צעד-אחר-צעד להעלאת הפלטפורמה לשרת חיצוני לבדיקות, בלי לשלם כלום.

## המחסנית (הכול בשכבה חינמית)

| רכיב | שירות | תוכנית חינם |
|------|--------|-------------|
| האפליקציה (Next.js + Payload) | **Vercel** | Hobby — חינם, לשימוש אישי/בדיקות |
| מסד נתונים (Postgres) | **Neon** | 0.5GB חינם |
| מדיה/תמונות (אופציונלי) | **Cloudflare R2** | 10GB חינם |

הקוד כבר מוכן לפריסה — לא צריך לשנות שום דבר בקוד. הכול נשלט דרך משתני סביבה.

> **הערה חשובה:** את פקודות ה-git צריך להריץ **בטרמינל שלך**, לא דרכי — הסביבה בענן לא יכולה לכתוב קבצי git לתיקייה שלך.

---

## שלב 1 — העלאת הקוד ל-GitHub

1. פִּתחו חשבון חינם ב-github.com ותצרו repo חדש (פרטי) בשם `hason`.
2. בטרמינל שלכם, בתוך תיקיית הפרויקט:

```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<שם-המשתמש>/hason.git
git push -u origin main
```

הקובץ `.gitignore` כבר מגן — הסוד ב-`.env` לא ייעלה ל-GitHub.

---

## שלב 2 — מסד נתונים ב-Neon

1. פִּתחו חשבון חינם ב-neon.tech ותצרו Project חדש.
2. העתיקו את מחרוזת החיבור (Connection string, גרסת ה-Pooled). היא נראית כך:
   `postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require`
3. זה יהיה `DATABASE_URL`.

---

## שלב 3 — פריסה ב-Vercel

1. פִּתחו חשבון חינם ב-vercel.com (התחברו עם GitHub).
2. Add New → Project → בחרו את ה-repo `hason`. Vercel יזהה אוטומטית Next.js.
3. פִּתחו Environment Variables והוסיפו:

| שם | ערך |
|----|-----|
| `DATABASE_URL` | מחרוזת החיבור מ-Neon |
| `PAYLOAD_SECRET` | סוד אקראי ארוך (`openssl rand -base64 32`) |
| `PAYLOAD_DB_PUSH` | `true` |
| `NEXT_PUBLIC_SERVER_URL` | `https://<שם-הפרויקט>.vercel.app` |
| `PREVIEW_SECRET` | סוד אקראי נוסף |

4. לחצו Deploy (2–4 דקות).

> `PAYLOAD_DB_PUSH=true` יוצר את טבלאות מסד הנתונים אוטומטית בהפעלה הראשונה — בלי migrations. (בפרודקשן אמיתי בהמשך נחליף ל-migrations מסודרות.)

---

## שלב 4 — התחברות ראשונה

1. פִּתחו: `https://<שם-הפרויקט>.vercel.app/admin`
2. צרו משתמש מנהל ראשון (אימייל + סיסמה).
3. גשו ל-`/studio` כדי לבנות את הכנס.
4. האתר הציבורי: `https://<שם-הפרויקט>.vercel.app/he`

> תוכן הדמו מושבת אוטומטית בפרודקשן, לכן שרת הבדיקות מתחיל ריק ואתם בונים תוכן דרך הסטודיו.

---

## שלב 5 (אופציונלי) — שמירת תמונות עם Cloudflare R2

ב-Vercel האחסון אינו קבוע, כך שתמונות שמעלים "ייעלמו" אלא אם מחברים אחסון חיצוני. R2 נותן 10GB חינם ותואם למה שכבר בנוי בקוד.

1. cloudflare.com → R2 → צרו Bucket.
2. צרו API Token עם הרשאת קריאה/כתיבה.
3. הוסיפו ב-Vercel:

| שם | ערך |
|----|-----|
| `S3_BUCKET` | שם ה-Bucket |
| `S3_ACCESS_KEY_ID` | Access Key |
| `S3_SECRET_ACCESS_KEY` | Secret |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |

4. Redeploy. מעכשיו המדיה נשמרת ב-R2.

בלי השלב הזה האתר עובד לגמרי — רק תמונות שתעלו עלולות לא להישמר. לבדיקות ראשוניות אפשר לדלג.

---

## הערות

- Vercel Hobby — לשימוש אישי/בדיקות (לא מסחרי).
- Neon בחינם "נרדם" ומתעורר תוך שנייה בבקשה הראשונה.
- כל push חדש ל-GitHub מפעיל פריסה מחדש אוטומטית.
- דומיין משלכם: Vercel → Project → Domains.
- ראו `.env.production.example` לרשימת כל המשתנים.
