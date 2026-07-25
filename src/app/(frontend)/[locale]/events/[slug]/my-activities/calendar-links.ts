import type { ActivityVM } from '@/features/conference';

/*
 * A schedule the guest can carry out of the building. Two dialects only —
 * Google and Outlook — because those are the calendars people here
 * actually keep, and every link is built in the browser, so no export
 * ever waits on the server.
 */
const utcStamp = (ms: number): string =>
  new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const isoLocal = (ms: number): string => new Date(ms).toISOString();

const detailsOf = (activity: ActivityVM): string => {
  const speakers = activity.speakers.map((s) => s.name).join(', ');
  return [activity.description, speakers ? `— ${speakers}` : '']
    .filter(Boolean)
    .join('\n\n');
};

const endOf = (activity: ActivityVM): number =>
  activity.endMs ?? activity.startMs + 3600000;

const locationOf = (activity: ActivityVM): string =>
  [activity.room, activity.floor].filter(Boolean).join(', ');

export const googleCalendarUrl = (activity: ActivityVM): string => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: activity.title,
    dates: `${utcStamp(activity.startMs)}/${utcStamp(endOf(activity))}`,
    details: detailsOf(activity),
    location: locationOf(activity),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/*
 * The way to the room. A map can find an address, not a lecture hall, so
 * the venue leads and the room rides along as context. With neither of
 * them there is nothing to navigate to — we return nothing rather than
 * open an empty map.
 */
export const mapDirectionsUrl = (
  activity: ActivityVM,
  venue?: string,
): string | null => {
  const query = [venue, activity.room].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const outlookCalendarUrl = (activity: ActivityVM): string => {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: activity.title,
    body: detailsOf(activity),
    startdt: isoLocal(activity.startMs),
    enddt: isoLocal(endOf(activity)),
    location: locationOf(activity),
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
};
