import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

/*
 * The conference's own networking page was retired.
 *
 * It had become three things at once and none of them well: a second
 * profile form beside the account's, a duplicate of the community hub's
 * connections list, and — at the top, in the most prominent position on
 * the page — two buttons for a QR scanner that was withdrawn in Report
 * 18 and now only redirect back here.
 *
 * What was genuinely its own moved rather than vanished: the contact
 * channels sit on the connection they belong to, and meetings have a
 * section beside the connections that make them possible. The profile
 * became one profile, on the account, shown at every conference.
 *
 * The redirect stays because links to this address are in the wild —
 * in the lounge, in older notices, and in people's tabs.
 */
interface RetiredNetworkingPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const RetiredNetworkingPage = async ({
  params,
}: RetiredNetworkingPageProps) => {
  const { locale } = await params;
  const lang = isSupportedLocale(locale) ? locale : 'he';
  redirect(`/${lang}/me/networking`);
};

export default RetiredNetworkingPage;
