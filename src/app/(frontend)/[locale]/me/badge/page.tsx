import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

interface BadgePageProps {
  params: Promise<{ locale: string }>;
}

/*
 * The networking badge was withdrawn along with scanning.
 *
 * Not to be confused with the entrance pass: that one lives in the
 * conference lounge, carries a registration rather than an account, and
 * is what the door scans. It stays.
 */
const BadgePage = async ({ params }: BadgePageProps) => {
  const { locale } = await params;
  const lang = isSupportedLocale(locale) ? locale : 'he';
  redirect(`/${lang}/me/networking`);
};

export default BadgePage;
