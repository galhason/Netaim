/*
 * Registration product language (Objective 2, 10). Organizers welcome
 * participants; participants feel invited, not processed. `as const`
 * keeps every key literal so access is definite.
 */
export const REGISTRATION_MESSAGES = {
  studio: {
    title: { he: 'הרשמה', en: 'Registration' },
    notConfigured: {
      he: 'האירוע עדיין לא אוסף הרשמות. אפשר להגדיר כאן.',
      en: 'This event doesn’t collect registrations yet. Set it up below.',
    },
    adjust: { he: 'הגדרות ההרשמה', en: 'Registration settings' },
    whoCanAttend: { he: 'מי יכול להשתתף?', en: 'Who can attend?' },
    modeOpen: { he: 'כל מי שנרשם', en: 'Anyone who registers' },
    modeApproval: { he: 'באישור מארגן', en: 'With organizer approval' },
    modeInvitation: { he: 'בהזמנה אישית', en: 'By personal invitation' },
    howManyPlaces: { he: 'כמה מקומות?', en: 'How many places?' },
    placesHint: { he: 'ריק = ללא הגבלה', en: 'Empty = unlimited' },
    closesWhen: { he: 'מתי ההרשמה נסגרת?', en: 'When does registration close?' },
    opensWhen: { he: 'מתי ההרשמה נפתחת?', en: 'When does registration open?' },
    waitingList: { he: 'רשימת המתנה כשאין מקום', en: 'Waiting list when full' },
    confirmationMessage: {
      he: 'הודעת אישור למשתתפים',
      en: 'Confirmation message to participants',
    },
    collectPhone: { he: 'לבקש מספר טלפון', en: 'Ask for a phone number' },
    collectAccessibility: {
      he: 'לבקש בקשות נגישות',
      en: 'Ask about accessibility needs',
    },
    collectDietary: {
      he: 'לבקש העדפות תזונה',
      en: 'Ask about dietary requirements',
    },
    save: { he: 'לשמור', en: 'Save' },
    participants: { he: 'משתתפים', en: 'Participants' },
    awaitingApproval: { he: 'ממתינים לאישור', en: 'Awaiting approval' },
    onWaitlist: { he: 'ברשימת המתנה', en: 'On the waiting list' },
    confirmedList: { he: 'רשומים', en: 'Registered' },
    approve: { he: 'לאשר', en: 'Approve' },
    decline: { he: 'לדחות', en: 'Decline' },
    promote: { he: 'לאשר מהרשימה', en: 'Confirm from list' },
    cancel: { he: 'לבטל', en: 'Cancel' },
    noParticipants: {
      he: 'עדיין אין נרשמים. כאן יופיעו האנשים שיצטרפו.',
      en: 'No one has registered yet. The people who join will appear here.',
    },
  },
  capacity: {
    heading: { he: 'התמונה כרגע', en: 'The picture right now' },
    confirmed: { he: 'רשומים', en: 'Registered' },
    reserved: { he: 'ממתינים לאישור', en: 'Awaiting approval' },
    waiting: { he: 'ברשימת המתנה', en: 'Waiting' },
    available: { he: 'מקומות פנויים', en: 'Places available' },
    unlimited: { he: 'ללא הגבלת מקום', en: 'No capacity limit' },
    full: { he: 'האירוע מלא', en: 'The event is full' },
  },
  public: {
    heading: { he: 'הצטרפות לאירוע', en: 'Join the event' },
    intro: {
      he: 'כמה פרטים ומקומך שמור. נשמור על הקשר לקראת האירוע.',
      en: 'A few details and your place is saved. We will stay in touch before the event.',
    },
    name: { he: 'שם מלא', en: 'Full name' },
    email: { he: 'אימייל', en: 'Email' },
    phone: { he: 'טלפון', en: 'Phone' },
    accessibility: { he: 'בקשות נגישות', en: 'Accessibility needs' },
    organization: {
      he: 'ארגון / מוסד חינוכי',
      en: 'Organization / institution',
    },
    role: { he: 'תפקיד בארגון', en: 'Role in the organization' },
    networkingOptIn: {
      he: 'האם תרצה/י להופיע במדריך המשתתפים ולאפשר החלפת פרטי קשר?',
      en: 'Would you like to appear in the participant directory and exchange contact details?',
    },
    dietary: { he: 'העדפות תזונה', en: 'Dietary requirements' },
    submit: { he: 'לשמור מקום', en: 'Save my place' },
    closed: {
      he: 'ההרשמה סגורה כרגע.',
      en: 'Registration is closed right now.',
    },
    invalid: {
      he: 'משהו חסר. נא לבדוק את השם והאימייל.',
      en: 'Something is missing. Please check the name and email.',
    },
    signInPrompt: {
      he: 'כבר נרשמת? קבלת קישור לאזור האישי לאימייל שלך.',
      en: 'Already registered? Get a link to your personal area by email.',
    },
    signInAction: { he: 'לשלוח לי קישור', en: 'Send me a link' },
    signInSent: {
      he: 'אם האימייל רשום, ישלח אליו קישור כניסה.',
      en: 'If the email is registered, a sign-in link is on its way.',
    },
  },
  confirmed: {
    heading: { he: 'מקומך שמור', en: 'Your place is saved' },
    text: {
      he: 'נרשמת לאירוע. קוד הכניסה יחכה באזור האישי, ונעדכן אותך בכל מה שחשוב.',
      en: 'You are registered. Your entrance code will be in your personal area, and we will keep you posted on everything that matters.',
    },
  },
  pending: {
    heading: { he: 'קיבלנו את הבקשה', en: 'We received your request' },
    text: {
      he: 'בקשתך ממתינה לאישור המארגן. נעדכן אותך ברגע שתאושר.',
      en: 'Your request is awaiting the organizer’s approval. We will let you know as soon as it is confirmed.',
    },
  },
  waitlisted: {
    heading: { he: 'הצטרפת לרשימת ההמתנה', en: 'You are on the waiting list' },
    text: {
      he: 'האירוע מלא כרגע. אם יתפנה מקום, נפנה אליך לפי הסדר.',
      en: 'The event is full right now. If a place opens, we will reach you in order.',
    },
  },
  toPersonalArea: { he: 'לאזור האישי', en: 'To my personal area' },
  toWorkshops: { he: 'לבחירת הסדנאות', en: 'Choose your workshops' },
} as const;
