# העלאה לשרת — HASON / נטעים

מדריך מלא להעלאת הפרויקט לשרת **Hetzner CPX42 (Ubuntu)** בכתובת `https://netaim26.org`.
ה-DNS של הדומיין מנוהל ב-**Cloudflare**, והמייל (אימות הרשמה, אישורים, התראות) יוצא דרך **Google Workspace**.

הסטאק בשרת: **Node 20 + PM2 + Nginx + Certbot (HTTPS) + PostgreSQL מקומי**.
אין Vercel, אין Netlify, אין Neon — הכול רץ על השרת שלך.

---

## 0. איך זה עובד בגדול

יש שלוש נקודות בשרשרת:

1. **המחשב שלך** — כאן אתה כותב קוד ודוחף אותו ל-GitHub (`git push`).
2. **GitHub** — `https://github.com/galhason/Netaim.git`, ענף `main`. זו נקודת האמת.
3. **השרת (Hetzner)** — מושך את הקוד (`git pull`), בונה אותו (`npm run build`) ומריץ אותו דרך PM2.
   Nginx יושב מלפנים ומעביר את התעבורה מפורט 443 (HTTPS) לאפליקציה שרצה על 127.0.0.1:3000.

**חשוב:** את כל פקודות ה-git צריך להריץ אתה — בטרמינל שלך ובטרמינל של השרת. אני לא יכול להריץ אותן בשבילך.

### 0.1 סדר העלייה לאוויר (פעם ראשונה)

1. **מייל קודם.** Cloudflare: SPF + DMARC (א.11). Google: אימות דו-שלבי ב-`gal@`, "Send mail as" לכינוי `noreply@`, סיסמת אפליקציה. `.env` מקומי → הרשמה עם כתובת אמיתית → הקוד מגיע, ו-"Show original" ב-Gmail מראה SPF/DKIM/DMARC PASS.
2. **git.** במחשב: `npm run typecheck && npm run lint && npm run build`, ואז commit + push (ב.1). כל העבודה מאז `c41a9e4` יושבת רק על הדיסק שלך עד לרגע הזה.
3. **השרת.** חלק א' מא.1 עד א.10 — עם ה-Proxy של Cloudflare **כבוי** על רשומות ה-A. כולל `npm run migrate` (א.8.1) וסקריפט האתחול (א.8.2).
4. **תעודה.** א.12, ואז להדליק את ה-Proxy ולבחור Full (strict).
5. **כניסה ראשונה** (א.13): "שכחתי סיסמה" לאימייל הבעלים, כניסה לסטודיו, יצירת הכנס וסימון שלו ככנס החי.
6. **הרשמה אמיתית מהאתר החי** — לפני שמפרסמים קישור.

---

## חלק א' — הכנה חד־פעמית של השרת

את החלק הזה עושים **פעם אחת בלבד**. אם השרת כבר מוכן — דלג לחלק ב'.

### א.1 התחברות לשרת

מהטרמינל שלך (PowerShell / CMD / Git Bash):

```bash
ssh root@<כתובת-ה-IP-של-השרת>
```

מכאן והלאה — כל הפקודות רצות **על השרת**, לא במחשב שלך.

### א.2 עדכון בסיסי וחומת אש

```bash
apt update && apt upgrade -y
apt install -y curl git ufw build-essential

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

`Nginx Full` פותח את פורט 80 (HTTP) ואת 443 (HTTPS). **אל תפתח את פורט 3000 החוצה** — האפליקציה צריכה להיות נגישה רק דרך Nginx.

### א.3 התקנת Node 20

הפרויקט דורש `node >= 20.9.0` (מוגדר ב-`package.json`).

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v    # צריך להחזיר v20.x
npm -v
```

### א.4 זיכרון — הוספת Swap (חשוב!)

`next build` של פרויקט Payload הוא כבד. אם לשרת יש 2GB RAM או פחות, הבנייה תיפול עם `Killed` או `JavaScript heap out of memory`. הוספת Swap פותרת את זה:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h    # צריך להראות Swap: 4.0Gi
```

### א.5 התקנת PostgreSQL והקמת מסד הנתונים

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql
```

יצירת משתמש ומסד נתונים לפרויקט:

```bash
sudo -u postgres psql
```

בתוך `psql` (החלף `SUPER_SECRET_PASSWORD` בסיסמה חזקה משלך ותשמור אותה):

```sql
CREATE USER hason WITH PASSWORD 'SUPER_SECRET_PASSWORD';
CREATE DATABASE hason OWNER hason;
GRANT ALL PRIVILEGES ON DATABASE hason TO hason;
\q
```

מסד הנתונים מאזין רק על `localhost` — זה בדיוק מה שאנחנו רוצים, האפליקציה רצה על אותו שרת.

### א.6 משיכת הקוד

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/galhason/Netaim.git hason
cd /var/www/hason
```

אם המאגר פרטי, GitHub יבקש שם משתמש וטוקן. עדיף ליצור **Personal Access Token** ב-GitHub ולהשתמש בו כסיסמה, או להגדיר מפתח SSH לשרת.

### א.7 קובץ ה-`.env`

זה השלב הכי חשוב. הקובץ הזה **לא נמצא ב-git** (הוא ב-`.gitignore`) — צריך ליצור אותו ידנית על השרת.

קודם צור שלושה סודות חזקים:

```bash
openssl rand -base64 32    # → PAYLOAD_SECRET
openssl rand -base64 32    # → PREVIEW_SECRET
openssl rand -base64 32    # → DISPATCH_SECRET
```

עכשיו:

```bash
nano /var/www/hason/.env
```

והדבק (עם הערכים שלך במקום ה-placeholders):

```env
DATABASE_URL=postgresql://hason:SUPER_SECRET_PASSWORD@localhost:5432/hason
PAYLOAD_SECRET=<הסוד-הראשון-שיצרת>
PREVIEW_SECRET=<הסוד-השני-שיצרת>
NEXT_PUBLIC_SERVER_URL=https://netaim26.org
DEMO_CONTENT=false
CONTENT_ENGINE_ADMIN=false
PAYLOAD_DB_PUSH=false
NODE_ENV=production
PLATFORM_OWNER_EMAIL=gal@netaim26.org

# מייל — Google Workspace (ראה חלק ג')
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=gal@netaim26.org
SMTP_PASSWORD=<סיסמת-האפליקציה-מ-Google, 16 תווים>
SMTP_FROM=noreply@netaim26.org
SMTP_REPLY_TO=gal@netaim26.org
NEXT_PUBLIC_PRIVACY_EMAIL=gal@netaim26.org
DISPATCH_SECRET=<הסוד-השלישי-שיצרת>
```

שמירה: `Ctrl+O` → `Enter` → `Ctrl+X`.
הגבלת הרשאות: `chmod 600 /var/www/hason/.env`

> **`PAYLOAD_DB_PUSH` חייב להישאר `false`.** האפליקציה מסרבת לעלות אם הוא `true` ו-`NODE_ENV=production` יחד — הדגל הזה נותן לדפלוי לשנות טבלאות חיות בלי מיגרציה. הסכימה נבנית מהמיגרציות (א.8.1), שנבדקו על מסד נתונים ריק ומייצרות בדיוק את הסכימה של סביבת הפיתוח.
>
> **`PLATFORM_OWNER_EMAIL`** — האימייל שיקבל בעלות על הפלטפורמה. חייב להיות זהה לאימייל שתעביר לסקריפט האתחול (א.8.2).

### א.8 התקנה ובנייה ראשונה

```bash
cd /var/www/hason
npm ci
npm run build
```

`npm ci` מתקין בדיוק לפי `package-lock.json`. הבנייה לוקחת כמה דקות.

> אם `npm ci` מדלג על חבילות פיתוח והבנייה נכשלת — זה קורה כש-`NODE_ENV=production` מוגדר גלובלית בשרת. הפתרון: `npm ci --include=dev`.

### א.8.1 בניית הסכימה (מיגרציות)

מסד הנתונים ריק כרגע. הפקודה הזו בונה אותו:

```bash
cd /var/www/hason
npm run migrate
```

צריך להדפיס שורת `Migrated:` לכל מיגרציה ואז `Done.`. זה נבדק מול מסד נתונים ריק — התוצאה זהה לסכימה שרצה בפיתוח.

לבדיקה: `npm run migrate:status`.

### א.8.2 פתיחת הפלטפורמה — משתמש הבעלים הראשון

כאן יש ביצה ותרנגולת: הסטודיו נפתח רק לחשבון עם הרשאה, חשבון נוצר בהרשמה לכנס, וכנס נוצר בסטודיו. הסקריפט הבא שובר את המעגל פעם אחת:

```bash
cd /var/www/hason
npx tsx scripts/bootstrap-platform.ts "גל חסון" gal@netaim26.org "נטעים"
```

הוא יוצר את הארגון, פותח חשבון לאימייל הזה ונותן לו הרשאת **בעלים**. הוא מסרב לרוץ פעם שנייה — ברגע שיש בעלים, הרשאות נוספות ניתנות מהסטודיו (אנשים ← גישה).

**אין סיסמה בסקריפט בכוונה** (ארגומנט נשאר בהיסטוריית ה-shell). אחרי שהאתר באוויר: `https://netaim26.org/he/me` ← "שכחתי סיסמה" ← הקישור מגיע למייל ← קובעים סיסמה. זה גם מוכיח ששרת המייל עובד לפני שמזמינים מישהו.

> **לא צריך את פאנל Payload.** `CONTENT_ENGINE_ADMIN` נשאר `false` ו-`/admin` חסום בפרודקשן — זו ההחלטה של החוקה §7, והסקריפט הזה הוא הסיבה שאפשר לעמוד בה.

### א.9 הרצה עם PM2

PM2 שומר על התהליך חי, מפעיל מחדש אם הוא נופל, ומחזיר אותו לאוויר אחרי אתחול של השרת.

```bash
npm install -g pm2

cd /var/www/hason
pm2 start npm --name hason -- start
pm2 save
pm2 startup    # מדפיס פקודה — העתק אותה, הדבק והרץ
```

בדיקה שהאפליקציה חיה:

```bash
pm2 status
curl -I http://127.0.0.1:3000
```

### א.10 Nginx — שרת החזית

```bash
apt install -y nginx
nano /etc/nginx/sites-available/hason
```

תוכן הקובץ:

```nginx
server {
    listen 80;
    server_name netaim26.org www.netaim26.org;

    # העלאות מדיה ל-Payload — בלי זה תמונות גדולות ייחסמו
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

הפעלה:

```bash
ln -s /etc/nginx/sites-available/hason /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t          # חייב להחזיר "syntax is ok" + "test is successful"
systemctl reload nginx
```

### א.11 Cloudflare — הדומיין

ה-DNS של `netaim26.org` יושב ב-Cloudflare. ברשומות (DNS → Records) צריכות להיות:

| סוג | שם | ערך | Proxy |
|---|---|---|---|
| A | `@` | ה-IP של שרת Hetzner | **כבוי (אפור)** בזמן הוצאת התעודה, ואז דלוק (כתום) |
| A | `www` | ה-IP של שרת Hetzner | כמו `@` |
| MX | `@` | `smtp.google.com` (עדיפות 1) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:gal@netaim26.org` | DNS only |
| TXT | `google._domainkey` | מפתח ה-DKIM מ-Google Admin | DNS only |

בדיקה מהמחשב שלך: `nslookup netaim26.org` — צריך להחזיר את ה-IP של השרת (כשה-Proxy כבוי) או כתובות של Cloudflare (כשהוא דלוק).

ב-SSL/TLS של Cloudflare בחר **Full (strict)** ודלק **Always Use HTTPS**. במצב "Flexible" האתר ייכנס ללולאת הפניות.

### א.12 HTTPS עם Certbot

עם ה-Proxy של Cloudflare **כבוי** (אפור) על `@` ו-`www`:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d netaim26.org -d www.netaim26.org
```

Certbot ישאל למייל, יבקש אישור לתנאים, וישאל אם להפנות HTTP ל-HTTPS — **ענה כן**. הוא יערוך את קובץ ה-Nginx בעצמו ויוסיף את בלוק ה-443.

אחרי שהתעודה הונפקה — הדלק את ה-Proxy (כתום) על שתי רשומות ה-A. החידוש האוטומטי ממשיך לעבוד גם דרך ה-Proxy כי מצב ה-SSL הוא Full (strict). אפשר לבדוק: `certbot renew --dry-run`

### א.13 כניסה ראשונה

עכשיו האתר באוויר:

- **האתר הציבורי:** `https://netaim26.org/he`
- **הסטודיו:** `https://netaim26.org/studio`

הכניסה הראשונה:

1. `https://netaim26.org/he/me` ← **שכחתי סיסמה** ← האימייל שהעברת בא.8.2.
2. הקישור מגיע למייל (אם לא — בדוק את הלוג: `pm2 logs hason --lines 50`, וחפש `"scope":"smtp"`).
3. קבע סיסמה, ואז `https://netaim26.org/studio` — אתה בעלים.
4. בסטודיו: **כנס חדש** ← שם ותאריך ← פתיחת הסטודיו ← הרכבת הסצנות.
5. כשהכנס מוכן: **העלאה לאוויר**, ואז לסמן אותו ככנס החי של האתר.

`/admin` יחזיר 404 — זה תקין ומכוון.

---

## חלק ב' — עדכון שוטף (זה מה שתעשה מעכשיו והלאה)

בכל פעם שסיימת לעבוד על שינוי במחשב שלך:

### ב.1 במחשב שלך

```bash
cd C:\Users\ghgam\Documents\Claude\Projects\gov

npm run typecheck    # בדיקת טיפוסים
npm run lint         # בדיקת ESLint
npm run build        # ודא שהבנייה עוברת לפני שדוחפים

git add -A
git commit -m "תיאור השינוי"
git push origin main
```

אם `build` נכשל אצלך — הוא ייכשל גם בשרת. תקן קודם.

### ב.2 בשרת

```bash
ssh root@<כתובת-ה-IP>

cd /var/www/hason
git pull origin main
npm ci                 # רק אם package.json / package-lock.json השתנו
npm run build
pm2 restart hason
pm2 logs hason --lines 50
```

זהו. השינוי באוויר.

> אפשר לקצר את זה לפקודה אחת בשרת:
> ```bash
> cd /var/www/hason && git pull origin main && npm ci && npm run build && pm2 restart hason
> ```
> אפשר גם לשמור את זה כסקריפט: `nano /root/deploy.sh`, להדביק, `chmod +x /root/deploy.sh`, ומאז פשוט `/root/deploy.sh`.

---

## חלק ג' — משתני הסביבה

| משתנה | חובה | מה זה |
|---|---|---|
| `DATABASE_URL` | ✅ | חיבור ל-PostgreSQL המקומי: `postgresql://hason:PASS@localhost:5432/hason` |
| `PAYLOAD_SECRET` | ✅ | מפתח ההצפנה של Payload. **שינוי שלו מנתק את כל הסשנים הקיימים** |
| `NEXT_PUBLIC_SERVER_URL` | ✅ | `https://netaim26.org`. משמש לקישורים מוחלטים ולקישורי כניסה |
| `PREVIEW_SECRET` | ✅ | סוד לתצוגה מקדימה של תוכן טיוטה |
| `DEMO_CONTENT` | ✅ | `false` בפרודקשן — אחרת יוצג תוכן דמו |
| `PAYLOAD_DB_PUSH` | ✅ | `true` בהעלאה ראשונה ובכל שינוי סכימה, אחרת `false` |
| `CONTENT_ENGINE_ADMIN` | | `false` — פאנל פנימי למפתחים בלבד |
| `REGISTRATION_LINK_SECRET` | | סוד לקישורי הרשמה ללא סיסמה. אם ריק — נופל חזרה ל-`PAYLOAD_SECRET` |
| `MONDAY_API_TOKEN` / `MONDAY_BOARD_ID` | | אינטגרציית monday.com. השאר ריק כדי לכבות |
| `S3_*` | | לא בשימוש בהתקנה הזאת — המדיה נשמרת על דיסק השרת |
| `RETENTION_DAYS` | | כמה ימים אחרי סיום הכנס נמחקים נתוני המשתתפים. ברירת מחדל: 7. **חייב להתאים למה שכתוב במדיניות הפרטיות** |
| `RETENTION_SECRET` | | סוד לנתיב הקריאה בלבד `/api/retention` (רשות — המחיקה עצמה היא פקודה ידנית). בלעדיו הנתיב סגור |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | ✅ | `smtp.gmail.com` / `587` / `false` (STARTTLS). Google Workspace |
| `SMTP_USER` / `SMTP_PASSWORD` | ✅ | החשבון האמיתי (`gal@netaim26.org`) ו**סיסמת אפליקציה** שלו (לא סיסמת החשבון). דורש אימות דו-שלבי בחשבון |
| `SMTP_FROM` | ✅ | כתובת בלבד, בלי שם תצוגה. `noreply@netaim26.org` הוא **כינוי** של החשבון — כדי ש-Google לא יחליף אותו ב-`gal@`, הכינוי חייב להופיע ב-Gmail של `gal@` תחת Settings → Accounts → "Send mail as" |
| `SMTP_REPLY_TO` | | לאן יגיעו תשובות של משתתפים — `gal@netaim26.org` (אפשר להחליף לכינוי `info@` כשיהיה) |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | | הכתובת שמופיעה במדיניות הפרטיות. `gal@netaim26.org`, או כינוי `privacy@` אם תיצור |
| `DISPATCH_SECRET` | ✅ עם SMTP | סוד ל-`/api/notifications/dispatch` (שליחה חוזרת של מיילים שנכשלו). לפחות 32 תווים |

> **חובה: SMTP חייב לעבוד לפני שההרשמה נפתחת.**
> מאז שנוסף אימות כתובת המייל, ההרשמה לא מסתיימת בלי שהקוד יגיע —
> אדם שלא מקבל מייל לא יכול להירשם. `SMTP_HOST` ו-`SMTP_FROM` הם
> המינימום, ו-`DISPATCH_SECRET` נדרש לצידם. בדקו שמייל אמיתי מגיע
> לתיבה אמיתית (לא רק שהשרת עולה) לפני פרסום קישור ההרשמה.

### סכימה: טבלת `email_verifications`

ההרשמה מחזיקה את הפרטים בטבלה נפרדת בין הטופס לבין יצירת החשבון. אם
ההעלאה נעשית עם `PAYLOAD_DB_PUSH=true` הטבלה נוצרת מעצמה. על מסד קיים
שלא רוצים לדחוף אליו סכימה, הריצו במקום זאת:

```bash
psql "$DATABASE_URL" -f scripts/sql/001-email-verifications.sql
```

הקובץ יוצר גם את עמודת הקשר ב-`payload_locked_documents_rels`. בלעדיה
הכתיבה הראשונה נכשלת עם `column ... does not exist` — הטבלה לבדה אינה
מספיקה.

---

## חלק ד' — מדיה, גיבוי ושחזור

### מה בכלל צריך גיבוי

שני דברים שהמערכת לא יודעת לייצר מחדש:

1. **מסד הנתונים** — כל ההרשמות, החשבונות, ההרשאות, התוכנית, ההתראות.
2. **תיקיית `media/`** — התמונות והסרטונים שהועלו דרך הסטודיו. היא ב-`.gitignore`, כלומר היא קיימת **רק בשרת**. `git pull` לא ידרוס אותה, אבל גם שום דבר לא מעתיק אותה.

הקוד עצמו לא צריך גיבוי — הוא ב-GitHub.

### התקנה חד־פעמית

```bash
sudo mkdir -p /var/backups/hason
sudo chmod 700 /var/backups/hason
sudo chmod +x /var/www/hason/scripts/backup.sh /var/www/hason/scripts/restore.sh
```

הרצה ראשונה ידנית, כדי לראות שזה עובד לפני שזה רץ לבד:

```bash
/var/www/hason/scripts/backup.sh
```

הפלט צריך להיראות כך — שימו לב למספרים, הם הבדיקה:

```
[2026-09-16 03:00:01] dumping the database
[2026-09-16 03:00:04] database: 3.1M — participants=214 registrations=198 events=1 media=42
[2026-09-16 03:00:05] media: 84M mirrored
[2026-09-16 03:00:05] done — 1 copies kept in /var/backups/hason/db
```

ואז `crontab -e` ושורה אחת:

```
0 3 * * * /var/www/hason/scripts/backup.sh >> /var/backups/hason/cron.log 2>&1
```

### מה הסקריפט עושה

- `pg_dump` בפורמט custom (דחוס, ניתן לשחזור טבלה-טבלה) לתוך `/var/backups/hason/db/`.
- **קורא את הגיבוי בחזרה** ומוודא שהטבלאות שחשובות באמת נמצאות בו. גיבוי שרץ, החזיר 0 והוא ריק — זה איך שנראית סיסמה שהשתנתה או דיסק מלא, וזה בדיוק מה שהבדיקה תופסת. גיבוי שנכשל בבדיקה נמחק מיד, כדי שהשחזור לעולם לא יבחר בו.
- רושם את מספר השורות בכל לילה ליד הקובץ. מספר שקורס פתאום נראה ביומן, לא מתגלה בשחזור.
- מסנכרן את `media/` כמראה (`rsync --delete`) — לא tar חדש כל לילה, כי בתיקייה יש סרטונים והיא תמלא את הדיסק שהגיבוי אמור לשרוד.
- שומר 14 גיבויים ומוחק ישנים יותר. לשינוי: `BACKUP_KEEP=30`.
- הקבצים נוצרים 600 והתיקייה 700 — יש שם שמות, אימיילים וטלפונים של אנשים. **לא לשים את זה במקום ש-nginx מגיש.**

### לבדוק שהגיבוי באמת עובד

גיבוי שאף אחד לא שחזר הוא קובץ, לא גיבוי. הסקריפט הזה משחזר לדאטהבייס צדדי — לא נוגע בחי — ומדפיס מה חזר:

```bash
/var/www/hason/scripts/restore.sh
```

```
restoring hason-20260916-0300.dump into hason_restore_test

what came back:
  participants  214
  registrations 198
  events        1
  media         42
  grants        3

This was a test. Nothing live was touched.
```

המספרים צריכים להתאים לשורת היומן של אותו לילה. שווה להריץ את זה פעם בחודש, ובוודאי שבוע לפני הכנס.

### שחזור אמיתי

```bash
pm2 stop hason
/var/www/hason/scripts/restore.sh /var/backups/hason/db/hason-20260916-0300.dump hason --i-mean-the-live-database
cd /var/www/hason && npx payload migrate     # הגיבוי נושא את הסכימה של הלילה שבו נלקח
pm2 start hason
```

ואם צריך גם את המדיה:

```bash
rsync -a /var/backups/hason/media/ /var/www/hason/media/
```

### מה זה עדיין לא מכסה

הגיבוי יושב על אותו דיסק של השרת. זה מגן מפני הטעות הנפוצה — מיגרציה שהשתבשה, טבלה שנמחקה, קובץ שנדרס — אבל **לא** מפני אובדן המכונה עצמה. בשביל זה צריך עותק מחוץ לשרת. שתי אפשרויות פשוטות:

```bash
# למחשב שלך, מתי שבא לך:
scp -r root@46.225.232.227:/var/backups/hason/db ~/netaim-backups/
```

או Hetzner Backups בפאנל של השרת (תמונת דיסק יומית, בתשלום נוסף) — שזו ההגנה היחידה שעובדת גם כשהשרת עצמו נעלם.

---

## חלק ד2' — מדיניות שמירת מידע (Retention)

**הכלל:** נתוני המשתתפים נשמרים לצורך הכנס בלבד, ונמחקים **7 ימים אחרי שהכנס נגמר**.

**המחיקה ידנית בכוונה.** אין cron, אין טיימר, ואין נתיב HTTP שמוחק. אתה מריץ אותה, בפקודה, כשאתה מחליט. מחיקה שכל בקשה או שורת cron יכולה להפעיל היא מחיקה שיום אחד תרוץ כשאף אחד לא התכוון — והאנשים שהיא מוחקת לא חוזרים.

### לראות מה עומד למחיקה

```bash
npm run retention:status
```

מדפיס אילו כנסים עברו את התאריך, מה כל אחד עדיין מחזיק, ואת הפקודה המדויקת למחיקה. **לא מוחק כלום.** אם שום כנס לא עבר את התאריך — יראה את התאריכים הקרובים.

### למחוק כנס

```bash
npm run retention:purge -- <slug> --confirm
```

שני הדברים נדרשים: שם הכנס **וגם** `--confirm`. בלי `--confirm` הפקודה רק מציגה מה עומד להימחק ועוצרת. כנס שלא עבר את התאריך לא יימחק גם עם `--confirm`.

### מה נמחק

הודעות הצ׳אט, החיבורים, הפגישות, ההתראות שנשלחו, ההרשמות לסדנאות וההרשמות לכנס. לאחר מכן כל חשבון שלא נשאר רשום לשום כנס אחר נמחק לגמרי — יחד עם הסשנים, החסימות והדיווחים שלו.

**מה לא נמחק:** רשומת הכנס עצמה (היא לא מידע אישי), וחשבונות של אנשי צוות שמחזיקים הרשאה לסטודיו — אחרת הצוות היה ננעל מחוץ למערכת שלו שבוע אחרי הכנס. המספר מדווח בנפרד כ-`accounts kept (staff)`.

**כנס בלי תאריך התחלה וסיום לעולם לא נמחק** — המערכת לא מנחשת תאריך ומוחקת על סמך הניחוש.

### בדיקה מרחוק (רשות)

אם מוגדר `RETENTION_SECRET`, יש גם נתיב לקריאה בלבד שמחזיר את אותה רשימה — שימושי למוניטור. **הוא לא מוחק; אין בו POST.**

```bash
curl -s -H "Authorization: Bearer $RETENTION_SECRET" http://127.0.0.1:3000/api/retention
```

בלי הסוד הנתיב סגור לחלוטין.

### תיעוד

כל מחיקה נרשמת ביומן הפעולות תחת `privacy.retentionPurge` עם המספרים בלבד — בלי שמות. יומן של שכחה לא אמור להיות המקום האחרון שבו השמות עדיין מופיעים.

**לפני כל מחיקה — גיבוי:** `pg_dump -U hason -h localhost hason > /root/backups/pre-purge-$(date +%F).sql`

---

## חלק ה' — חזרה אחורה (Rollback)

אם עלה שינוי ששבר את האתר:

```bash
cd /var/www/hason
git log --oneline -10          # מצא את הקומיט התקין האחרון
git checkout <hash-של-הקומיט>
npm ci && npm run build
pm2 restart hason
```

וכשהתיקון מוכן, לחזור לענף הראשי:

```bash
git checkout main && git pull origin main && npm run build && pm2 restart hason
```

---

## חלק ו' — פקודות תחזוקה שימושיות

```bash
pm2 status                 # מה רץ עכשיו
pm2 logs hason             # לוגים חיים (Ctrl+C ליציאה)
pm2 logs hason --err       # שגיאות בלבד
pm2 restart hason          # הפעלה מחדש
pm2 monit                  # ניטור CPU/זיכרון

systemctl status nginx
nginx -t                   # בדיקת תקינות הקונפיג לפני reload
systemctl reload nginx

systemctl status postgresql
df -h                      # מקום בדיסק
free -h                    # זיכרון ו-Swap
```

---

## חלק ז' — תקלות נפוצות

**502 Bad Gateway** — Nginx חי אבל האפליקציה לא. הרץ `pm2 status`; אם התהליך נפל, `pm2 logs hason --err` יראה למה. בדרך כלל: `.env` חסר או `DATABASE_URL` שגוי.

**הבנייה נופלת עם `Killed` / `heap out of memory`** — אין מספיק זיכרון. ודא ש-Swap מוגדר (סעיף א.4). אפשר גם: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`.

**`ECONNREFUSED 127.0.0.1:5432`** — PostgreSQL לא רץ. `systemctl start postgresql`.

**`password authentication failed for user "hason"`** — הסיסמה ב-`DATABASE_URL` לא תואמת. אם היא מכילה תווים מיוחדים כמו `@` או `:` — צריך לקודד אותם ב-URL encoding, או פשוט לבחור סיסמה בלי תווים כאלה.

**טבלאות חסרות / שגיאות סכימה** — הגדר `PAYLOAD_DB_PUSH=true` ב-`.env`, `pm2 restart hason`, המתן שהאתר יעלה, ואז החזר ל-`false`.

**התמונות לא עולות / שגיאת 413** — `client_max_body_size` ב-Nginx נמוך מדי. הגדל אותו ו-`systemctl reload nginx`.

**האתר עולה אבל הקישורים מפנים ל-localhost** — `NEXT_PUBLIC_SERVER_URL` שגוי. תקן ב-`.env`, ואז **`npm run build` מחדש** — זה משתנה שנצרב בזמן הבנייה, `pm2 restart` לבדו לא יספיק.

**`git pull` נכשל עם local changes** — מישהו ערך קבצים ישירות בשרת. `git status` יראה מה, ו-`git checkout -- <קובץ>` יבטל. השרת אמור להיות קריאה־בלבד; כל עריכה נעשית במחשב שלך ועולה דרך GitHub.

**התעודה פגה** — `certbot renew` ואז `systemctl reload nginx`.

---

## חלק ח' — הערות למערכת הזאת

- **אין אימות דו-שלבי ואין אימות מייל** כרגע, לפי ההחלטה לשלב הבדיקות. לפני פתיחה לקהל אמיתי — זה הדבר הראשון להחזיר.
- **`DEMO_CONTENT` חייב להיות `false`** בשרת, אחרת יוצג תוכן הדגמה במקום התוכן האמיתי.
- **הכניסה הראשונה ל-`/admin` יוצרת את משתמש-העל.** מי שמגיע ראשון לכתובת הזאת אחרי העלייה — הוא הבעלים. תעשה את זה מיד אחרי ההעלאה הראשונה.
- **`PAYLOAD_SECRET` לא משנים אחרי שהמערכת באוויר** — שינוי שלו מנתק את כל המשתמשים ושובר קישורי כניסה קיימים.
- **הקובץ `.env` לעולם לא נכנס ל-git.** הוא חי רק בשרת, ורק שם.
