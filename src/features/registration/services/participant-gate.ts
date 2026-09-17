import { redirect } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { currentParticipant } from './participant-identity-service';

/*
 * The door to the conference's own pages.
 *
 * The programme, the speakers and the community are what a person
 * registers *for*: they are the conference, not an advertisement for
 * it. So they are read by people who joined, and a visitor who has not
 * is sent to the one screen that can change that — the sign-in page,
 * which carries the invitation to register beside it.
 *
 * Deliberately not in the middleware. The edge cannot reach the
 * database, so a check there could only look at whether a cookie
 * exists, and a cookie is something a visitor can type. This resolves
 * the session against the database, which is the same answer the page
 * itself would get.
 *
 * What stays open, and why: the landing and each conference's own page
 * (a person cannot register for something they may not look at), the
 * registration form, the sign-in screen, and the legal pages — privacy,
 * terms and the accessibility statement are reachable from every page
 * by law, which is not a thing a login may stand in front of.
 */
export const requireParticipant = async (locale: Locale): Promise<void> => {
  const participant = await currentParticipant().catch(() => null);
  if (!participant) {
    redirect(`/${locale}/me`);
  }
};
