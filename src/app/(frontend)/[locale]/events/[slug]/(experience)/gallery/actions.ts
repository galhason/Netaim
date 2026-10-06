'use server';

import { isSupportedLocale, type Locale } from '@/config/locales';
import { checkRateLimit } from '@/features/access';
import { mayEnterConference } from '@/features/conference/services/conference-door';
import { findPortalEvent } from '@/features/events';
import {
  SUBMISSION_MAX_BYTES,
  submitGalleryPhoto,
  type GallerySubmissionState,
} from '@/features/gallery';
import { currentParticipant } from '@/features/registration';

const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();

/*
 * A participant sends a photograph to the conference gallery.
 *
 * It is queued for the Netaim team and never shown until someone there
 * approves it. Asked in order, cheapest first: a signed-in person (the
 * session, not anything the form says), a conference that is published
 * (the address can name any slug), an allowance not yet spent, and a
 * file under the ceiling before a byte of it is read. The service then
 * checks what the file really is; the store re-encodes it.
 */
export const submitGalleryPhotoAction = async (
  _previous: GallerySubmissionState,
  formData: FormData,
): Promise<GallerySubmissionState> => {
  const rawLocale = text(formData, 'locale');
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'he';
  const slug = text(formData, 'slug');

  const participant = await currentParticipant().catch(() => null);
  if (!participant) {
    return { status: 'error', reason: 'signed-out' };
  }
  /* A conference kept to the Netaim team takes no photographs from anyone else. */
  const event =
    slug && (await mayEnterConference(slug))
      ? await findPortalEvent(slug, locale).catch(() => null)
      : null;
  if (!event) {
    return { status: 'error', reason: 'closed' };
  }
  const throttle = await checkRateLimit('gallery-submission', participant.id);
  if (!throttle.allowed) {
    return { status: 'error', reason: 'busy' };
  }

  const photo = formData.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    return { status: 'error', reason: 'missing' };
  }
  if (photo.size > SUBMISSION_MAX_BYTES) {
    return { status: 'error', reason: 'size' };
  }

  const outcome = await submitGalleryPhoto(slug, participant, locale, {
    file: { name: photo.name, type: photo.type, data: new Uint8Array(await photo.arrayBuffer()) },
  });
  return outcome.ok ? { status: 'sent' } : { status: 'error', reason: outcome.reason };
};
