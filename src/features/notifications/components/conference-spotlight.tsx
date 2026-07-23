import type { Locale } from '@/config/locales';
import { mySpotlight } from '../services/notifications-service';
import AnnouncementPopup from './announcement-popup';

/*
 * The live channels of a conference page (PRD §4.1): the ticker banner
 * pinned above everything with the latest urgent line, and the pop-up
 * that waits for a click. Renders nothing when the production is quiet.
 * Personal targeting respected — a signed-out visitor sees nothing.
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
        <div
          role="status"
          className="sticky top-0 z-[90] flex items-center justify-center gap-3 bg-[#B8860B] px-4 py-2.5 text-center text-sm font-medium text-[#1A1204] shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
        >
          <span
            aria-hidden="true"
            className="size-2 flex-none animate-pulse rounded-full bg-[#1A1204]"
          />
          <span className="min-w-0">
            <strong>{spotlight.banner.subject}</strong>
            {spotlight.banner.body ? ` — ${spotlight.banner.body}` : ''}
          </span>
        </div>
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
