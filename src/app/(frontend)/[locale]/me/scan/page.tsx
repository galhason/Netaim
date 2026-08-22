import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

interface ScanPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * Scanning a fellow guest's badge was withdrawn. Connecting happens in
 * the directory, where both sides are known and the request is filed in
 * a conference they actually share.
 *
 * The door's scanner in the Studio is a different thing entirely and is
 * untouched.
 */
const ScanPage = async ({ params }: ScanPageProps) => {
  const { locale } = await params;
  const lang = isSupportedLocale(locale) ? locale : 'he';
  redirect(`/${lang}/me/networking`);
};

export default ScanPage;
