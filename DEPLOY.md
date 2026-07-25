# העלאה לשרת — HASON / נטעים

מדריך מלא להעלאת הפרויקט לשרת **Hetzner (Ubuntu)** בכתובת `https://galhason.duckdns.org`.

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

קודם צור שני סודות חזקים:

```bash
openssl rand -base64 32    # → PAYLOAD_SECRET
openssl rand -base64 32    # → PREVIEW_SECRET
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
NEXT_PUBLIC_SERVER_URL=https://galhason.duckdns.org
DEMO_CONTENT=false
CONTENT_ENGINE_ADMIN=false
PAYLOAD_DB_PUSH=true
NODE_ENV=production
```

שמירה: `Ctrl+O` → `Enter` → `Ctrl+X`.
הגבלת הרשאות: `chmod 600 /var/www/hason/.env`

> **על `PAYLOAD_DB_PUSH=true`** — בפרויקט הזה אין סקריפט `payload migrate`. הסכימה של מסד הנתונים נוצרת אוטומטית מהקולקציות בהרצה הראשונה, וזה מה שהדגל הזה עושה. השאר אותו `true` בהעלאה הראשונה, ואחריה מומלץ להחליף ל-`false` כדי שהשרת לא ישנה סכימה בכל הפעלה. כשמוסיפים שדות חדשים ל-CMS — מחזירים ל-`true` להעלאה אחת ואז שוב `false`.

### א.8 התקנה ובנייה ראשונה

```bash
cd /var/www/hason
npm ci
npm run build
```

`npm ci` מתקין בדיוק לפי `package-lock.json`. הבנייה לוקחת כמה דקות.

> אם `npm ci` מדלג על חבילות פיתוח והבנייה נכשלת — זה קורה כש-`NODE_ENV=production` מוגדר גלובלית בשרת. הפתרון: `npm ci --include=dev`.

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
    server_name galhason.duckdns.org;

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

### א.11 DuckDNS — הדומיין

ודא שברשומת ה-DuckDNS שלך (`galhason`) מוגדרת כתובת ה-IP של השרת. לשרת עם IP קבוע (כמו ב-Hetzner) מספיק לעדכן פעם אחת באתר `duckdns.org`.

בדיקה מהמחשב שלך: `nslookup galhason.duckdns.org` — צריך להחזיר את ה-IP של השרת.

### א.12 HTTPS עם Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d galhason.duckdns.org
```

Certbot ישאל למייל, יבקש אישור לתנאים, וישאל אם להפנות HTTP ל-HTTPS — **ענה כן**. הוא יערוך את קובץ ה-Nginx בעצמו ויוסיף את בלוק ה-443.

חידוש אוטומטי כבר מוגדר. אפשר לבדוק אותו: `certbot renew --dry-run`

### א.13 כניסה ראשונה

עכשיו האתר באוויר:

- **האתר הציבורי:** `https://galhason.duckdns.org/he`
- **פאנל Payload:** `https://galhason.duckdns.org/admin` — הכניסה הראשונה יוצרת את משתמש-העל. תשמור את הפרטים.
- **הסטודיו:** `https://galhason.duckdns.org/studio`

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
| `NEXT_PUBLIC_SERVER_URL` | ✅ | `https://galhason.duckdns.org`. משמש לקישורים מוחלטים ולקישורי כניסה |
| `PREVIEW_SECRET` | ✅ | סוד לתצוגה מקדימה של תוכן טיוטה |
| `DEMO_CONTENT` | ✅ | `false` בפרודקשן — אחרת יוצג תוכן דמו |
| `PAYLOAD_DB_PUSH` | ✅ | `true` בהעלאה ראשונה ובכל שינוי סכימה, אחרת `false` |
| `CONTENT_ENGINE_ADMIN` | | `false` — פאנל פנימי למפתחים בלבד |
| `REGISTRATION_LINK_SECRET` | | סוד לקישורי הרשמה ללא סיסמה. אם ריק — נופל חזרה ל-`PAYLOAD_SECRET` |
| `MONDAY_API_TOKEN` / `MONDAY_BOARD_ID` | | אינטגרציית monday.com. השאר ריק כדי לכבות |
| `S3_*` | | לא בשימוש בהתקנה הזאת — המדיה נשמרת על דיסק השרת |

---

## חלק ד' — מדיה, גיבוי ושחזור

### מדיה

תיקיית `media/` נמצאת ב-`.gitignore` — כלומר **התמונות שהעלית בשרת קיימות רק בשרת**, ו-`git pull` לעולם לא ידרוס אותן. זה טוב, אבל זה גם אומר שהן לא מגובות בשום מקום אוטומטית.

### גיבוי מסד הנתונים

```bash
mkdir -p /root/backups
pg_dump -U hason -h localhost hason > /root/backups/hason-$(date +%F).sql
```

גיבוי אוטומטי יומי ב-03:00 — `crontab -e` והוסף:

```
0 3 * * * pg_dump -U hason -h localhost hason > /root/backups/hason-$(date +\%F).sql
```

### גיבוי מדיה

```bash
tar -czf /root/backups/media-$(date +%F).tgz -C /var/www/hason media
```

### שחזור

```bash
psql -U hason -h localhost -d hason < /root/backups/hason-2026-07-25.sql
```

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
