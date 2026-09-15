import type { Locale } from '@/config/locales';
import { getActiveConferenceSlug } from '@/features/events';
import ConferenceSpotlight from './conference-spotlight';

/*
 * PRD §4.1: the ticker banner sits at the top of every page of the
 * site, and the pop-up finds the person wherever on the site they are.
 * The live conference is the one the Studio named live; with none
 * named there is nothing to announce. Mounted once, in the locale
 * layout, so no page can forget it.
 */
const SiteSpotlight = async ({ locale }: { locale: Locale }) => {
  const slug = await getActiveConferenceSlug(locale).catch(() => null);
  if (!slug) {
    return null;
  }
  return <ConferenceSpotlight slug={slug} locale={locale} />;
};

export default SiteSpotlight;
