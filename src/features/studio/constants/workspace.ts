import type { Locale } from '@/config/locales';

export interface WorkspaceArea {
  id: string;
  segment: string;
  label: Record<Locale, string>;
}

export const WORKSPACE_AREAS: WorkspaceArea[] = [
  { id: 'overview', segment: '', label: { he: 'מבט־על', en: 'Overview' } },
  { id: 'composer', segment: 'composer', label: { he: 'החוויה', en: 'Experience' } },
  { id: 'opening', segment: 'opening', label: { he: 'הפתיחה', en: 'Opening' } },
  { id: 'people', segment: 'people', label: { he: 'אנשים', en: 'People' } },
  { id: 'venue', segment: 'venue', label: { he: 'המקום', en: 'Venue' } },
  { id: 'media', segment: 'media', label: { he: 'צילומים', en: 'Photographs' } },
  {
    id: 'sponsors',
    segment: 'sponsors',
    label: { he: 'נותני חסות', en: 'Sponsors' },
  },
  {
    id: 'registration',
    segment: 'registration',
    label: { he: 'הרשמה', en: 'Registration' },
  },
  {
    id: 'participants',
    segment: 'participants',
    label: { he: 'נרשמים', en: 'Registrants' },
  },
  { id: 'program', segment: 'program', label: { he: 'תוכנית', en: 'Program' } },
  { id: 'checkin', segment: 'check-in', label: { he: 'קבלה', en: 'Check-in' } },
  {
    id: 'notifications',
    segment: 'notifications',
    label: { he: 'הודעות', en: 'Messages' },
  },
];

export const WORKSPACE_MESSAGES = {
  newEvent: { he: 'אירוע חדש', en: 'New event' },
  eventTitle: { he: 'שם האירוע', en: 'Event name' },
  eventDate: { he: 'תאריך (רשות)', en: 'Date (optional)' },
  create: { he: 'ליצור', en: 'Create' },
  open: { he: 'לפתוח', en: 'Open' },
  duplicate: { he: 'שכפול', en: 'Duplicate' },
  archive: { he: 'לארכיון', en: 'Archive' },
  launched: { he: 'הושק', en: 'Launched' },
  notLaunched: { he: 'טרם הושק', en: 'Not launched yet' },
  readyToLaunch: { he: 'מוכן להשקה', en: 'Ready to launch' },
  launchAction: { he: 'להשיק את החוויה', en: 'Launch the experience' },
  launchBlocked: {
    he: 'ההשקה ממתינה לטיפול בחסמים.',
    en: 'Launch waits until the blockers are resolved.',
  },
  alreadyLaunched: {
    he: 'החוויה חיה. עדכונים שמורים ימשיכו אליה.',
    en: 'The experience is live. Saved updates flow to it.',
  },
  addPerson: { he: 'להוסיף אדם', en: 'Add a person' },
  personName: { he: 'שם', en: 'Name' },
  personRole: { he: 'תפקיד', en: 'Role' },
  add: { he: 'להוסיף', en: 'Add' },
  searchMedia: { he: 'חיפוש צילומים', en: 'Search photographs' },
  noMatch: {
    he: 'אין צילומים שתואמים את החיפוש.',
    en: 'No photographs match that search.',
  },
  addMedia: { he: 'להעלות צילום', en: 'Upload a photograph' },
  mediaAlt: { he: 'תיאור לצילום', en: 'Photograph description' },
  upload: { he: 'להעלות', en: 'Upload' },
  venueName: { he: 'שם המקום', en: 'Venue name' },
  venueAddress: { he: 'כתובת', en: 'Address' },
  venueDescription: { he: 'על המקום', en: 'About the place' },
  venueMapUrl: { he: 'קישור מפה', en: 'Map link' },
  venueMapLabel: { he: 'טקסט קישור ההגעה', en: 'Directions link text' },
  venueAccess: { he: 'נגישות', en: 'Accessibility' },
  venueEmergency: { he: 'מידע חירום', en: 'Emergency information' },
  venueParking: { he: 'חניה', en: 'Parking' },
  venueTransit: { he: 'תחבורה ציבורית', en: 'Public transit' },
  contentLanguage: { he: 'שפת התוכן', en: 'Content language' },
  save: { he: 'לשמור', en: 'Save' },
  nothingHere: { he: 'שקט כרגע.', en: 'Quiet for now.' },
  connectionNeeded: {
    he: 'החיבור לנתונים אינו זמין כרגע.',
    en: 'The data connection is not available right now.',
  },
  requiredActions: { he: 'פעולות נדרשות', en: 'Required actions' },
} satisfies Record<string, Record<Locale, string>>;

export const PHASE_LABELS: Record<string, Record<Locale, string>> = {
  draft: { he: 'טיוטה', en: 'Draft' },
  planning: { he: 'תכנון', en: 'Planning' },
  registrationOpen: { he: 'הרשמה פתוחה', en: 'Registration open' },
  registrationClosed: { he: 'הרשמה סגורה', en: 'Registration closed' },
  preparation: { he: 'התארגנות', en: 'Preparation' },
  live: { he: 'חי', en: 'Live' },
  completed: { he: 'הסתיים', en: 'Completed' },
  archived: { he: 'בארכיון', en: 'Archived' },
};
