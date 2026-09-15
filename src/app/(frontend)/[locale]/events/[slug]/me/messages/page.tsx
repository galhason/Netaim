import { notFound, redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

/*
 * There is one notifications centre, at /me/messages, and it reads
 * every conference the account holds — including this one. The
 * per-conference address stays so old links and the conference Lounge
 * keep working, but it leads to the one place rather than to a second
 * copy of it.
 */
interface EventMessagesPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const EventMessagesPage = async ({ params }: EventMessagesPageProps) => {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  redirect(`/${locale}/me/messages`);
};

export const dynamic = 'force-dynamic';

export default EventMessagesPage;
