import type { Locale } from '@/config/locales';

/*
 * The Console's voice: every label the dark suite speaks, in both
 * languages. The Console never exposes an infrastructure word
 * (Constitution v2 §4).
 */
export const CONSOLE_UI = {
  experiences: { he: 'כנסים', en: 'Conferences' },
  controlSub: {
    he: 'כל מה שהארגון מעלה — במבט אחד.',
    en: 'Everything your organization is staging — at a glance.',
  },
  openWorkspace: { he: 'פתיחת סטודיו', en: 'Open Workspace' },
  live: { he: 'באוויר', en: 'Live' },
  homepageName: { he: 'חוויית הפתיחה', en: 'The Opening' },
  homepageSub: {
    he: 'הדף הראשון שכל מבקר פוגש',
    en: 'The first page every visitor meets',
  },
  workspaceTitle: { he: 'סטודיו', en: 'Workspace' },
  scenes: { he: 'סצנות', en: 'Scenes' },
  canvasNote: {
    he: 'האתר החי — הקנבס עצמו',
    en: 'The live site — the canvas itself',
  },
  reload: { he: 'רענון הקנבס', en: 'Reload canvas' },
  inspectorEmpty: {
    he: 'בחרו סצנה מהרשימה כדי לביים אותה',
    en: 'Choose a scene from the strip to direct it',
  },
  editedInEvent: {
    he: 'הסצנה הזו נולדת מהאירוע המוביל — עורכים אותה בחוויית האירוע עצמה.',
    en: 'This scene is born from the lead event — direct it inside the event experience.',
  },
  toEventEditor: { he: 'לעריכת האירוע', en: 'Edit the event' },
  saveAndPublish: { he: 'שמירה ופרסום', en: 'Save & publish' },
  savedNote: {
    he: 'שמירה עולה לאוויר מיד; זרימת טיוטות מגיעה בפרוסה הבאה.',
    en: 'Saving goes live immediately; the draft flow arrives in the next slice.',
  },
  contentLanguage: { he: 'שפת תוכן', en: 'Content language' },
  classicStudio: { he: 'ניהול מתקדם', en: 'Advanced' },
  people: { he: 'אנשים', en: 'People' },
  soon: { he: 'בקרוב', en: 'Soon' },
  dockAssets: { he: 'נכסים', en: 'Assets' },
  dockDna: { he: 'DNA', en: 'DNA' },
  dockActivity: { he: 'פעילות', en: 'Activity' },
  dockHistory: { he: 'היסטוריה', en: 'History' },
  backToConsole: { he: 'למרכז הכנסים', en: 'All conferences' },
  visibleScene: { he: 'מוצגת', en: 'Showing' },
  newExperience: { he: 'כנס חדש', en: 'New Conference' },
  newExperienceSub: {
    he: 'שם וזהו — הבמה, הסצנות וה-DNA כבר מחכים.',
    en: 'A name is enough — the stage, scenes and DNA are already waiting.',
  },
  experienceName: { he: 'שם הכנס', en: 'Conference name' },
  experienceDate: { he: 'תאריך פתיחה', en: 'Opening date' },
  createAndOpen: { he: 'יצירה ופתיחת הסטודיו', en: 'Create & open workspace' },
  canvasUnlaunched: {
    he: 'הקנבס יתעורר ברגע שהכנס יפורסם; עד אז עורכים מול הטיוטה.',
    en: 'The canvas wakes when the experience is published; until then, direct the draft.',
  },
  editedInClassic: {
    he: 'הרשימה הזו נערכת בינתיים בסטודיו הקלאסי.',
    en: 'This list is edited in the classic Studio for now.',
  },
  toClassicEditor: { he: 'לעריכה שם', en: 'Edit there' },
  peopleTitle: { he: 'אנשים', en: 'People' },
  peopleSub: {
    he: 'הצוות שמביים את הכנסים של הארגון.',
    en: 'The team that directs the organization\u2019s experiences.',
  },
  accessTitle: { he: 'גישה והרשאות', en: 'Access' },
  accessSub: {
    he: 'כל מי שפתח חשבון בפלטפורמה — חיפוש לפי שם או אימייל, ומתן תפקיד.',
    en: 'Everyone with an account on the platform — search by name or email, and grant a role.',
  },
  accessHint: {
    he: 'גישה ניתנת לחשבון קיים בלבד: אנשים פותחים חשבון בעצמם בכניסתם לפלטפורמה, ואיש הצוות מקבל תפקיד — לכל הפלטפורמה או לכנס אחד.',
    en: 'Access is granted to an existing account only: people open their own account when they first enter, and a teammate receives a role — platform-wide or for one conference.',
  },
  searchAccounts: { he: 'חיפוש לפי שם או אימייל', en: 'Search by name or email' },
  searchAction: { he: 'חיפוש', en: 'Search' },
  clearSearch: { he: 'ניקוי', en: 'Clear' },
  accessHolders: { he: 'מחזיקי גישה', en: 'Access holders' },
  searchResults: { he: 'תוצאות חיפוש', en: 'Search results' },
  noAccountsFound: {
    he: 'לא נמצאו חשבונות תואמים.',
    en: 'No matching accounts.',
  },
  noAccessYet: {
    he: 'עוד לא ניתנה גישה לאף חשבון. חפשו חשבון כדי להתחיל.',
    en: 'No account holds access yet. Search for an account to begin.',
  },
  inviteTitle: { he: 'הזמנת חבר/ת צוות', en: 'Invite a teammate' },
  memberName: { he: 'שם', en: 'Name' },
  memberEmail: { he: 'אימייל', en: 'Email' },
  memberPassword: { he: 'סיסמה ראשונית', en: 'Initial password' },
  memberRole: { he: 'תפקיד', en: 'Role' },
  invite: { he: 'הזמנה', en: 'Invite' },
  launch: { he: 'העלאה לאוויר', en: 'Go live' },
  publishChanges: { he: 'פרסום השינויים', en: 'Publish changes' },
  draftCanvasNote: {
    he: 'הקנבס מציג את הטיוטה — מה שהקהל יראה אחרי הפרסום.',
    en: 'The canvas shows the draft — what the audience sees after publishing.',
  },
  draftSavedNote: {
    he: 'שמירה נשמרת כטיוטה בלבד; "פרסום השינויים" מעלה אותה לאוויר.',
    en: 'Saving keeps a draft only; \u201cPublish changes\u201d takes it live.',
  },
  insightsTitle: { he: 'מידע כנסים', en: 'Conference info' },
  insightsSub: {
    he: 'כל כנס — מי נרשם אליו, וניהול ההרשמות.',
    en: 'Every conference — who registered, and registration management.',
  },
  insightsBack: { he: 'לכל הכנסים', en: 'All conferences' },
  registrantsSub: {
    he: 'כל מי שנרשם לכנס הזה — אפשר להסיר נרשם מההרשמה.',
    en: 'Everyone registered for this conference — a registrant can be removed.',
  },
  noRegistrantsYet: {
    he: 'עוד אף אחד לא נרשם לכנס הזה.',
    en: 'No one has registered for this conference yet.',
  },
  removeRegistrant: { he: 'הסרה מההרשמה', en: 'Remove' },
  removeRegistrantHint: {
    he: 'מבטל את ההרשמה ומפנה את המקום; הנרשם יוכל להירשם שוב.',
    en: 'Cancels the registration and frees the place; the person can register again.',
  },
  colConfirmed: { he: 'מאושרים', en: 'Confirmed' },
  colPending: { he: 'ממתינים', en: 'Pending' },
  colWaitlist: { he: 'רשימת המתנה', en: 'Waitlist' },
  renameMember: { he: 'עדכון שם', en: 'Rename' },
  participantsTitle: { he: 'משתתפים', en: 'Participants' },
  participantsSub: {
    he: 'כל מי שנרשם — הכנסים שלהם, המצב שלהם, והדלת.',
    en: 'Everyone who registered — their conferences, their state, and the door.',
  },
  blockedTag: { he: 'חסום/ה', en: 'Blocked' },
  block: { he: 'חסימה', en: 'Block' },
  unblock: { he: 'ביטול חסימה', en: 'Unblock' },
  noRegistrations: { he: 'עוד לא נרשם/ה לאף כנס.', en: 'No registrations yet.' },
  grantsLabel: { he: 'הרשאות', en: 'Access' },
  grantRole: { he: 'מתן הרשאה', en: 'Grant role' },
  revokeGrant: { he: 'הסרה', en: 'Revoke' },
  platformWide: { he: 'כל הפלטפורמה', en: 'Platform-wide' },
  scopeToEvent: { he: 'תיחום לכנס (רשות)', en: 'Scope to a conference (optional)' },
  lastOwnerNote: {
    he: 'אי אפשר להסיר את הבעלים האחרון — לפלטפורמה חייב להישאר בעלים.',
    en: 'The last Owner cannot be revoked — the platform must keep an owner.',
  },
  moveFailedNote: {
    he: 'ההעברה נכשלה — ההרשמה המקורית בוטלה אך ההרשמה החדשה לא נקלטה.',
    en: 'The move failed — the original registration was cancelled but the new one was not accepted.',
  },
  cancelRegistration: { he: 'ביטול הרשמה', en: 'Cancel registration' },
  moveTo: { he: 'העברה אל…', en: 'Move to…' },
  moveConfirm: { he: 'העברה', en: 'Move' },
  deleteAccount: { he: 'מחיקת משתמש ונתונים', en: 'Delete account & data' },
  deleteAccountHint: {
    he: 'מוחק לצמיתות את החשבון, ההרשמות, הנטוורקינג וההרשאות.',
    en: 'Permanently deletes the account, registrations, networking and grants.',
  },
  commsTitle: { he: 'תקשורת', en: 'Communications' },
  commsSub: {
    he: 'כל הודעה שהמערכת שלחה — מגיע ההרשמות ועד אישורי הסדנאות.',
    en: 'Every message the system sent — from registration to workshop confirmations.',
  },
  commsBroadcastNote: {
    he: 'הודעות מתפרצות לקהל (באנר, פופ-אפ, שליחה ממוקדת) מגיעות עם מערכת הפרופיל — השלב הבא אחרי הסטודיו.',
    en: 'Broadcast announcements (banner, pop-up, targeted send) arrive with the profile system — the next act after the Studio.',
  },
  commsEmpty: {
    he: 'עוד לא נשלחו הודעות עבור הכנס הזה.',
    en: 'No messages have been sent for this conference yet.',
  },
  directorMode: { he: 'מצב בימאי', en: 'Director Mode' },
  exitDirector: { he: 'יציאה · Esc', en: 'Exit · Esc' },
  directorHint: {
    he: 'מצב בימאי — הסטודיו זז הצידה',
    en: 'Director Mode — the Studio steps aside',
  },
  groupMain: { he: 'ראשי', en: 'MAIN' },
  groupWorkspace: { he: 'סביבת עבודה', en: 'WORKSPACE' },
  groupOrg: { he: 'הארגון', en: 'ORGANIZATION' },
  media: { he: 'ספריית מדיה', en: 'Media Library' },
  communications: { he: 'תקשורת', en: 'Communications' },
  insights: { he: 'מידע כנסים', en: 'Conference info' },
  organization: { he: 'הארגון', en: 'Organization' },
  teams: { he: 'צוות', en: 'Teams' },
  settings: { he: 'הגדרות', en: 'Settings' },
  moveUp: { he: 'הקדמת הסצנה', en: 'Move scene earlier' },
  moveDown: { he: 'איחור הסצנה', en: 'Move scene later' },
  hideScene: { he: 'הסתרת הסצנה', en: 'Hide scene' },
  showScene: { he: 'החזרת הסצנה', en: 'Show scene' },
  hiddenTag: { he: 'מוסתרת', en: 'Hidden' },
  experienceMap: { he: 'מפת החוויה', en: 'Experience Map' },
  actTag: { he: 'מערכה', en: 'Act' },
  moveActUp: { he: 'הקדמת המערכה', en: 'Move act earlier' },
  moveActDown: { he: 'איחור המערכה', en: 'Move act later' },
  hideAct: { he: 'הסתרת המערכה', en: 'Hide act' },
  showAct: { he: 'החזרת המערכה', en: 'Show act' },
  mediaTitle: { he: 'ספריית מדיה', en: 'Media Library' },
  mediaSub: {
    he: 'כל מה שהכנסים של הארגון עשויים ממנו.',
    en: 'Everything the organization\u2019s experiences are made of.',
  },
  uploadMedia: { he: 'העלאת קובץ', en: 'Upload file' },
  uploadAlt: { he: 'תיאור (Alt)', en: 'Description (Alt)' },
  activityTitle: { he: 'יומן ההפקה', en: 'The Production Log' },
  activitySub: {
    he: 'כל פעולה מספרת את סיפור ההפקה.',
    en: 'Every action tells the story of the production.',
  },
  activityExperience: { he: 'הכנס עודכן', en: 'Conference updated' },
  activityMedia: { he: 'נכס חדש בספרייה', en: 'New asset in the library' },
  statusLive: { he: 'באוויר', en: 'Live' },
  statusDraft: { he: 'טיוטה', en: 'Draft' },
  noImage: { he: 'ללא תמונה', en: 'No image' },
  variantTitle: { he: 'תצוגת הסצנה', en: 'Scene layout' },
  densityTitle: { he: 'צפיפות', en: 'Density' },
  emphasisTitle: { he: 'עוצמה', en: 'Emphasis' },
  variantDefault: { he: 'ברירת מחדל', en: 'Default' },
  canvasSelectHint: {
    he: 'לחיצה על סצנה בקנבס פותחת אותה באינספקטור',
    en: 'Click a scene on the canvas to open it in the inspector',
  },
  checkinNav: { he: 'צ׳ק-אין', en: 'Check-in' },
  broadcastCompose: { he: 'הודעה חדשה לכנס', en: 'New conference message' },
  broadcastConference: { he: 'כנס', en: 'Conference' },
  broadcastLanguage: { he: 'שפת ההודעה', en: 'Message language' },
  broadcastKind: { he: 'אופן הצגה', en: 'Presentation' },
  broadcastKindFeed: { he: 'הודעה רגילה (פיד)', en: 'Regular (feed)' },
  broadcastKindBanner: { he: 'באנר עליון בכל הדפים', en: 'Top ticker banner' },
  broadcastKindPopup: {
    he: 'הודעה מתפרצת (דורשת אישור)',
    en: 'Pop-up (requires approval)',
  },
  broadcastAudience: { he: 'קהל יעד', en: 'Audience' },
  broadcastAudienceAll: {
    he: 'כל משתתפי הכנס שנבחר',
    en: 'Everyone in the chosen conference',
  },
  broadcastHeSection: { he: 'ההודעה בעברית', en: 'The message in Hebrew' },
  broadcastEnSection: { he: 'ההודעה באנגלית', en: 'The message in English' },
  broadcastBilingualNote: {
    he: 'מלאו את שתי השפות — כל משתתף מקבל את ההודעה בשפת האתר שבחר; שפה שנשארה ריקה פשוט לא נשלחת.',
    en: 'Fill both languages — every guest receives the message in their chosen site language; an empty language is simply not sent.',
  },
  broadcastSubject: { he: 'נושא', en: 'Subject' },
  broadcastBody: { he: 'תוכן ההודעה', en: 'Message body' },
  broadcastSend: { he: 'שליחה לכל המשתתפים', en: 'Send to all guests' },
  broadcastSent: {
    he: 'ההודעה נשלחה ומופיעה כעת בפיד של המשתתפים.',
    en: 'The message was sent and now appears in the guests’ feed.',
  },
  broadcastFeedNote: {
    he: 'ההודעה מופיעה מיד בחדר ההודעות של כל משתתפי הכנס. שליחה במייל תצטרף כשספק אימייל יחובר.',
    en: 'The message appears immediately in every guest’s messages room. Email delivery joins once a provider is connected.',
  },
  momentsImages: { he: 'תמונות הרגעים', en: 'Moments images' },
  momentsHint: {
    he: 'לחיצה מוסיפה או מסירה תמונה מהגלריה.',
    en: 'Tap to add or remove an image from the gallery.',
  },
  autoSceneNote: {
    he: 'הסצנה נבנית לבדה מנתוני הכנס — התאריך, התוכנית והאנשים. עדכנו אותם ותתעדכן גם היא.',
    en: 'This scene builds itself from the conference data — the date, the program and the people. Update those and it follows.',
  },
  rhythmTitle: { he: 'עוזר הקצב', en: 'Rhythm Assistant' },
  uploadToScene: {
    he: 'העלאה מהמחשב ישירות לסצנה',
    en: 'Upload from your computer straight to the scene',
  },
  uploadToSceneHint: {
    he: 'הקובץ נשמר גם בספריית המדיה, והסצנה מתעדכנת מיד.',
    en: 'The file also lands in the media library; the scene updates immediately.',
  },
  uploadAction: { he: 'העלאה', en: 'Upload' },
  momentCaption: { he: 'כיתוב', en: 'Caption' },
  momentCaptions: { he: 'כיתובי הרגעים', en: 'Moment captions' },
  uploadNote: {
    he: 'עד 10MB לקובץ; הנכס זמין מיד בכל אינספקטור.',
    en: 'Up to 10MB per file; the asset is available in every inspector immediately.',
  },
} satisfies Record<string, Record<Locale, string>>;

/*
 * How the Console names each scene package on the filmstrip — the
 * visitor-facing vocabulary of the opening experience.
 */
export const CONSOLE_SCENE_LABELS: Record<string, Record<Locale, string>> = {
  'opening-nav': { he: 'ניווט', en: 'Navigation' },
  'opening-featured-hero': { he: 'כנס מוביל', en: 'Featured' },
  'opening-hero': { he: 'פתיחה', en: 'Hero' },
  'opening-portal-wall': { he: 'קיר שערים', en: 'Portal Wall' },
  'opening-story': { he: 'הסיפור', en: 'Story' },
  'opening-moments': { he: 'רגעים', en: 'Moments' },
  'opening-closing': { he: 'הזמנה', en: 'Invitation' },
  'opening-footer': { he: 'חתימה', en: 'Footer' },
  'conference-nav': { he: 'ניווט', en: 'Navigation' },
  'conference-arrival': { he: 'הגעה', en: 'Arrival' },
  'conference-countdown': { he: 'ספירה לאחור', en: 'Countdown' },
  'conference-facts': { he: 'במספרים', en: 'At a glance' },
  'conference-sponsors': { he: 'שותפים', en: 'Partners' },
  'conference-act-intro': { he: 'פתיח מערכה', en: 'Act intro' },
  'conference-story': { he: 'הסיפור', en: 'Story' },
  'conference-quote': { he: 'הציטוט', en: 'Quote' },
  'conference-moments': { he: 'רגעים', en: 'Moments' },
  'conference-featured-sessions': {
    he: 'הרצאות מרכזיות',
    en: 'Featured sessions',
  },
  'conference-speakers': { he: 'דוברים', en: 'Speakers' },
  'conference-program': { he: 'התוכנית', en: 'Program' },
  'conference-venue': { he: 'המקום', en: 'Venue' },
  'conference-closing': { he: 'סגירה', en: 'Closing' },
  'conference-footer': { he: 'חתימה', en: 'Footer' },
};

/*
 * How the Console names each declared scene variant — the client's
 * vocabulary for a presentation choice, never an internal term.
 */
export const SCENE_VARIANT_LABELS: Record<string, Record<Locale, string>> = {
  mirrored: { he: 'תמונה פותחת', en: 'Image first' },
  minimal: { he: 'מינימלי', en: 'Minimal' },
  grid: { he: 'רשת שקטה', en: 'Quiet grid' },
  split: { he: 'מסך מפוצל', en: 'Split' },
  editorial: { he: 'מגזין', en: 'Editorial' },
  community: { he: 'קהילה', en: 'Community' },
};

/*
 * The other two presentation axes (Experience Engine v3): how tightly a
 * scene breathes, and how loudly it speaks.
 */
export const SCENE_DENSITY_LABELS: Record<string, Record<Locale, string>> = {
  compact: { he: 'דחוס', en: 'Compact' },
  spacious: { he: 'מרווח', en: 'Spacious' },
  tight: { he: 'צפוף', en: 'Tight' },
  airy: { he: 'אוורירי', en: 'Airy' },
};

export const SCENE_EMPHASIS_LABELS: Record<string, Record<Locale, string>> = {
  cinematic: { he: 'קולנועי', en: 'Cinematic' },
  featured: { he: 'דובר מוביל', en: 'Featured' },
  bold: { he: 'נועז', en: 'Bold' },
};

/*
 * How the Console names each Act of the conference journey — the
 * narrative vocabulary of the Experience Map
 * (docs/Experience-Engine-V2.md).
 */
export const CONFERENCE_ACT_LABELS: Record<string, Record<Locale, string>> = {
  invitation: { he: 'ההזמנה', en: 'The Invitation' },
  story: { he: 'הסיפור', en: 'The Story' },
  people: { he: 'האנשים', en: 'The People' },
  experience: { he: 'החוויה', en: 'The Experience' },
  join: { he: 'ההצטרפות', en: 'Join' },
};

/*
 * Which editable field group the conference inspector shows per scene;
 * list-driven scenes stay with the classic Studio for now.
 */
export type ConferenceInspectorGroup =
  | 'arrival'
  | 'story'
  | 'quote'
  | 'moments'
  | 'venue'
  | 'closing'
  | 'speakers'
  | 'classic'
  | 'auto'
  | 'none';

export const CONFERENCE_SCENE_GROUPS: Record<string, ConferenceInspectorGroup> = {
  'conference-arrival': 'arrival',
  'conference-countdown': 'auto',
  'conference-facts': 'auto',
  'conference-story': 'story',
  'conference-quote': 'quote',
  'conference-moments': 'moments',
  'conference-featured-sessions': 'auto',
  'conference-speakers': 'speakers',
  'conference-sponsors': 'classic',
  'conference-program': 'classic',
  'conference-venue': 'venue',
  'conference-closing': 'closing',
};

/*
 * Which editable field group the homepage inspector shows per scene.
 * Chrome scenes and event-born scenes have no homepage fields.
 */
export type HomepageInspectorGroup =
  | 'hero'
  | 'events'
  | 'story'
  | 'moments'
  | 'closing'
  | 'featured'
  | 'none';

export const HOMEPAGE_SCENE_GROUPS: Record<string, HomepageInspectorGroup> = {
  'opening-hero': 'hero',
  'opening-featured-hero': 'featured',
  'opening-portal-wall': 'events',
  'opening-story': 'story',
  'opening-moments': 'moments',
  'opening-closing': 'closing',
};

/*
 * The registration status in the operator's language — the Console never
 * shows the raw engine token inside Hebrew (Constitution v2 §4, §9).
 */
export const REGISTRATION_STATUS_LABELS: Record<string, Record<Locale, string>> = {
  pending: { he: 'ממתין לאישור', en: 'Pending' },
  confirmed: { he: 'מאושר', en: 'Confirmed' },
  waitlisted: { he: 'רשימת המתנה', en: 'Waitlist' },
  cancelled: { he: 'בוטל', en: 'Cancelled' },
  declined: { he: 'נדחה', en: 'Declined' },
  attended: { he: 'נכח', en: 'Attended' },
  expired: { he: 'פג תוקף', en: 'Expired' },
  noShow: { he: 'לא הגיע', en: 'No-show' },
};
