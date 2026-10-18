import { redirect } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { currentParticipant } from './participant-identity-service';
import { signInHref } from '../utils/sign-in-href';
import type { ParticipantSummary } from '../types/registration';

/*
 * The door to the platform.
 *
 * Every page of a conference — its landing, the programme, the
 * speakers, the gallery, the workshops, the personal schedule, the
 * community — is read by people who registered. A visitor who has not
 * signed in is sent to the one screen that can change that: the
 * sign-in page, which carries the invitation to register beside it, and
 * which brings them back to the page they asked for once they are in.
 *
 * What stays open: the sign-in screen itself, the registration form,
 * the links that sign a person in (the email link, the verification
 * link), and the legal pages — privacy, terms and the accessibility
 * statement are reachable from every page by law, which is not a thing
 * a login may stand in front of. The organisation's WordPress site, on
 * the same domain, is a different application and stays public.
 *
 * Deliberately not in the middleware. The edge cannot reach the
 * database, so a check there could only look at whether a cookie
 * exists, and a cookie is something a visitor can type. This resolves
 * the session against the database, which is the same answer the page
 * itself would get.
 */

export const requireParticipant = async (
  locale: Locale,
  returnTo: string,
): Promise<ParticipantSummary> => {
  const participant = await currentParticipant().catch(() => null);
  if (!participant) {
    redirect(signInHref(locale, returnTo));
  }
  return participant;
};
