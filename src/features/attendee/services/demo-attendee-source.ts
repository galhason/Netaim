import type { AttendeeContentSource } from '../types/attendee-experience';
import { DEMO_ATTENDEE_SLUG, getDemoAttendee } from '../constants/demo-attendee';

export const demoAttendeeSource: AttendeeContentSource = {
  getAttendeeExperience: ({ slug, locale }) =>
    Promise.resolve(
      slug === DEMO_ATTENDEE_SLUG ? getDemoAttendee(locale) : null,
    ),
};
