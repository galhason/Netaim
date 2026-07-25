import type { Locale } from '@/config/locales';
import { mySpotlight } from '../services/notifications-service';
import AnnouncementBanner from './announcement-banner';
import AnnouncementPopup from './announcement-popup';

/*
 * The live channels of a conference page (PRD §4.1): the ticker banner
 * pinned above everything with the latest urgent line, and the pop-up
 * that waits for a click. Both close on the guest's word and stay
 * closed. Renders nothing when the production is quiet. Personal
 * targeting respected — a signed-out visitor sees nothing.
 */
interface ConferenceSpotlightProps {
  slug: string;
  locale: Locale;
}

const ConferenceSpotlight = async ({
  slug,
  locale,
}: ConferenceSpotlightProps) => {
  const spotlight = await mySpotlight(slug, locale).catch(() => ({
    banner: null,
    popup: null,
  }));

  if (!spotlight.banner && !spotlight.popup) {
    return null;
  }

  return (
    <>
      {spotlight.banner ? (
        <AnnouncementBanner
          id={spotlight.banner.id}
          subject={spotlight.banner.subject}
          body={spotlight.banner.body}
          closeLabel={locale === 'he' ? 'סגירת ההודעה' : 'Dismiss message'}
        />
      ) : null}
      {spotlight.popup ? (
        <AnnouncementPopup
          id={spotlight.popup.id}
          subject={spotlight.popup.subject}
          body={spotlight.popup.body}
          approveLabel={locale === 'he' ? 'הבנתי, תודה' : 'Got it, thanks'}
        />
      ) : null}
    </>
  );
};

export default ConferenceSpotlight;
