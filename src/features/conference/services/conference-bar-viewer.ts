import { getActiveConferenceSlug } from '@/features/events';
import { currentParticipant, getMyDetails } from '@/features/registration';
import type { Locale } from '@/config/locales';
import type { ConferenceBarViewer } from '../components/conference-bar';

/*
 * What the conference bar needs to know about who is looking: a name
 * to greet with and a picture for the chip. Resolved on the server once
 * per page and handed to the bar as plain props, so the bar itself
 * stays synchronous (the landing's scene renderer requires it) and
 * never carries an email or an id into the browser.
 *
 * Server-only, and deliberately outside the feature's barrel: the barrel
 * is imported by client components, and a module that reads cookies
 * cannot be in a browser bundle.
 */
export const conferenceBarViewer = async (): Promise<ConferenceBarViewer | null> => {
  const me = await currentParticipant().catch(() => null);
  if (!me) {
    return null;
  }
  const details = await getMyDetails().catch(() => null);
  const name = (details?.name ?? me.name ?? me.email).trim();
  return {
    name,
    ...(details?.photoUrl ? { photoUrl: details.photoUrl } : {}),
  };
};

/* The conference a page without one in its address belongs to. */
export const conferenceBarSlug = async (locale: Locale): Promise<string | null> =>
  getActiveConferenceSlug(locale).catch(() => null);
