import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

interface ConnectPageProps {
  params: Promise<{ locale: string }>;
}

/*
 * Connecting by scanned badge was withdrawn.
 *
 * The token in this address was a permanent, unrevocable handle on a
 * participant: signed over an identifier with no expiry and no nonce, so
 * a photograph of anyone's badge stayed a working connect link forever.
 * The page also answered before sign-in, which made it a lookup for a
 * name, organization, role and portrait to anyone holding a token.
 *
 * All of that to save two taps in the directory, which does the same
 * thing while knowing who is asking. The address stays only so a printed
 * badge still in someone's pocket lands somewhere useful.
 */
const ConnectPage = async ({ params }: ConnectPageProps) => {
  const { locale } = await params;
  const lang = isSupportedLocale(locale) ? locale : 'he';
  redirect(`/${lang}/me/networking`);
};

export default ConnectPage;
