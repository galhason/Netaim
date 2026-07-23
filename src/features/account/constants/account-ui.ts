import type { Locale } from '@/config/locales';

export const ACCOUNT_UI = {
  title: { he: 'האזור האישי', en: 'My space' },
  greeting: { he: 'שלום', en: 'Hello' },
  signInTitle: { he: 'הכניסה לאזור האישי', en: 'Enter your space' },
  signInIntro: {
    he: 'חשבון אחד לכל הכנסים. היכנסו עם האימייל והסיסמה שלכם.',
    en: 'One account for every conference. Sign in with your email and password.',
  },
  signIn: { he: 'כניסה', en: 'Sign in' },
  passwordLabel: { he: 'סיסמה', en: 'Password' },
  openAccountTitle: { he: 'פתיחת חשבון', en: 'Open an account' },
  openAccountIntro: {
    he: 'חשבון אחד לפלטפורמה — ומכל הכנסים נהנים איתו.',
    en: 'One account for the platform — every conference opens with it.',
  },
  openAccount: { he: 'לפתוח חשבון', en: 'Open account' },
  noAccountYet: { he: 'אין לכם חשבון? פתחו אחד', en: 'No account yet? Open one' },
  haveAccount: { he: 'כבר יש חשבון? כניסה', en: 'Have an account? Sign in' },
  forgotPassword: { he: 'שכחתי סיסמה', en: 'Forgot password' },
  resetTitle: { he: 'שחזור כניסה', en: 'Recover access' },
  resetIntro: {
    he: 'נשלח קישור כניסה חד-פעמי לאימייל. אחרי הכניסה קבעו סיסמה חדשה בפרופיל.',
    en: 'We will email a one-time sign-in link. After signing in, set a new password in your profile.',
  },
  wrongCredentials: {
    he: 'האימייל או הסיסמה אינם נכונים.',
    en: 'The email or password is incorrect.',
  },
  signInLocked: {
    he: 'יותר מדי ניסיונות כושלים. נסו שוב בעוד כרבע שעה.',
    en: 'Too many failed attempts. Try again in about fifteen minutes.',
  },
  totpIntro: {
    he: 'החשבון מוגן באימות דו-שלבי. הזינו את הקוד מאפליקציית האימות.',
    en: 'This account is protected by two-factor authentication. Enter the code from your authenticator app.',
  },
  totpCodeLabel: { he: 'קוד בן 6 ספרות', en: '6-digit code' },
  totpSubmit: { he: 'אימות וכניסה', en: 'Verify & sign in' },
  totpWrong: {
    he: 'הקוד לא נכון או שפג תוקפו. נסו את הקוד הנוכחי באפליקציה.',
    en: 'Wrong or expired code. Try the current code in the app.',
  },
  accountBlocked: {
    he: 'החשבון הזה חסום. פנו אלינו לפרטים.',
    en: 'This account is blocked. Contact us for details.',
  },
  noPasswordYet: {
    he: 'לחשבון הזה עדיין אין סיסמה — השתמשו ב"שכחתי סיסמה" כדי להיכנס ולקבוע אחת.',
    en: 'This account has no password yet — use "Forgot password" to sign in and set one.',
  },
  accountExists: {
    he: 'כבר קיים חשבון עם האימייל הזה. נסו להיכנס.',
    en: 'An account with this email already exists. Try signing in.',
  },
  weakPassword: {
    he: 'הסיסמה חלשה מדי.',
    en: 'That password is too weak.',
  },
  missingFields: {
    he: 'מלאו את כל השדות.',
    en: 'Please fill in all the fields.',
  },
  nameLabel: { he: 'שם מלא (להרשמה ראשונה)', en: 'Full name (first time only)' },
  fullNameLabel: { he: 'שם מלא', en: 'Full name' },
  emailLabel: { he: 'אימייל', en: 'Email' },
  sendLink: { he: 'שלחו לי קישור', en: 'Send me a link' },
  linkSent: {
    he: 'אם האימייל קיים, נשלח אליו קישור כניסה.',
    en: 'If that email exists, a sign-in link is on its way.',
  },
  needName: {
    he: 'זו הפעם הראשונה כאן? הוסיפו שם מלא כדי לפתוח חשבון.',
    en: 'First time here? Add your full name to open an account.',
  },
  devLink: {
    he: 'סביבת פיתוח — קישור הכניסה:',
    en: 'Development environment — sign-in link:',
  },
  myConferences: { he: 'הכנסים שלי', en: 'My conferences' },
  viewFullProgram: { he: 'לתוכנית המלאה', en: 'View full program' },
  noConferences: {
    he: 'עדיין לא הצטרפתם לאף כנס.',
    en: 'You haven’t joined a conference yet.',
  },
  discover: { he: 'כנסים פתוחים להצטרפות', en: 'Open to join' },
  noneAvailable: {
    he: 'אין כרגע כנסים נוספים.',
    en: 'No other conferences right now.',
  },
  join: { he: 'להצטרף', en: 'Join' },
  leave: { he: 'לבטל הרשמה', en: 'Cancel registration' },
  openLounge: { he: 'לאזור של הכנס', en: 'Open conference space' },
  profile: { he: 'הפרופיל שלי', en: 'My profile' },
  signOut: { he: 'יציאה', en: 'Sign out' },
  blocked: { he: 'מתנגש בזמן', en: 'Time clash' },
  conflictPrefix: { he: 'מתנגש עם', en: 'Clashes with' },
  conflictHint: {
    he: 'כדי להצטרף, בטלו קודם את ההרשמה לכנס החופף.',
    en: 'To join, first cancel the overlapping conference.',
  },
  joinFailed: {
    he: 'לא הצלחנו לצרף אתכם. נסו שוב.',
    en: 'We could not add you. Please try again.',
  },
} as const;

export const ACCOUNT_STATUS_LABELS: Record<string, Record<Locale, string>> = {
  pending: { he: 'ממתין לאישור', en: 'Awaiting approval' },
  confirmed: { he: 'רשומ/ה', en: 'Registered' },
  waitlisted: { he: 'רשימת המתנה', en: 'Waiting list' },
  attended: { he: 'נכחת', en: 'Attended' },
};
