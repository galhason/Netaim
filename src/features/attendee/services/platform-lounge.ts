import type { Locale } from '@/config/locales';
import type {
  AttendeeExperienceContent,
  AttendeePerson,
} from '../types/attendee-experience';

/*
 * The platform Lounge (approved: the Lounge IS the profile, always at
 * /me): a guest who has not joined a conference yet still enters the
 * same room — the platform's own light, their name on the door, and
 * every card waiting to fill. `slug` stays empty; the view renders the
 * waiting states and the conferences section carries the invitation.
 */
export const buildPlatformLounge = (
  name: string,
  locale: Locale,
  people: AttendeePerson[] = [],
): AttendeeExperienceContent => {
  const he = locale === 'he';
  return {
    slug: '',
    brandName: 'נטעים',
    navigation: [],
    welcome: {
      greeting: he ? `שלום, ${name}` : `Hello, ${name}`,
      heading: 'נטעים',
      countdownTarget: '',
      countdownLabel: '',
      eventDateLabel: he ? 'הבית של הכנסים שלך' : 'The home of your conferences',
      venueLine: '',
      primaryCta: {
        label: he ? 'לכנסים הפתוחים' : 'Open conferences',
        href: `/${locale}/me#conferences`,
      },
    },
    myEvent: {
      summary: he
        ? 'זה המרחב האישי שלך. ברגע שתצטרפו לכנס — הכרטיס, הלו״ז, האנשים והעדכונים שלו יתעוררו כאן.'
        : 'This is your personal space. The moment you join a conference — its ticket, schedule, people and updates wake up here.',
      statusLabel: he ? 'הסטטוס שלך' : 'Your status',
      statusValue: he ? 'חשבון פעיל' : 'Active account',
      image: {
        url: 'https://picsum.photos/seed/hason-lounge-dusk/2400/1200',
        alt: 'נטעים',
      },
      updates: [],
    },
    myDay: {
      savedLabel: he ? 'נשמר' : 'Saved',
      moments: [],
    },
    networking: {
      people,
    },
    entrance: {
      heading: he ? 'הכניסה שלך' : 'Your entrance',
      qrValue: '',
      qrCaption: '',
      statusLabel: he ? 'כרטיס' : 'Ticket',
      statusValue: he ? 'אין עדיין' : 'None yet',
      details: [],
    },
    after: {
      resources: [],
    },
  };
};
