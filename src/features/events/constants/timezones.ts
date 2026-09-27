/*
 * The clocks a conference may run on — the same list the CMS offers,
 * kept here so the Studio can offer it and the repository can refuse
 * anything else. An IANA zone each; the label is how an organizer
 * recognises it.
 */
export const EVENT_TIMEZONE_OPTIONS = [
  { value: 'Asia/Jerusalem', label: 'ישראל · Jerusalem (UTC+2/+3)' },
  { value: 'Europe/Berlin', label: 'מרכז אירופה · Berlin, Paris' },
  { value: 'Europe/Prague', label: 'פראג · Prague (UTC+1/+2)' },
  { value: 'Europe/London', label: 'לונדון · London' },
  { value: 'America/New_York', label: 'ניו יורק · New York' },
  { value: 'America/Chicago', label: 'שיקגו · Chicago' },
  { value: 'America/Los_Angeles', label: 'לוס אנג׳לס · Los Angeles' },
  { value: 'Asia/Dubai', label: 'דובאי · Dubai' },
  { value: 'UTC', label: 'UTC' },
] as const;

export const EVENT_TIMEZONES: string[] = EVENT_TIMEZONE_OPTIONS.map((option) => option.value);
