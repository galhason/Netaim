import { notFound, redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

/*
 * The old seminars list, retired.
 *
 * Seminars and tours are chosen in the programme now — the same cards,
 * the same rules, the hour beside its alternatives — and this page had
 * stopped being kept in step with it. The address still arrives from a
 * bookmark or an old message, so it answers by moving on to the
 * programme, one activity still open when the address named it. The
 * programme asks a visitor to sign in, and brings them back.
 */
interface WorkshopsPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ activity?: string }>;
}

const WorkshopsPage = async ({ params, searchParams }: WorkshopsPageProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const { activity } = await searchParams;
  const opened = activity && /^\d+$/.test(activity) ? `?activity=${activity}` : '';
  redirect(`/${locale}/events/${encodeURIComponent(slug)}/agenda${opened}`);
};

export default WorkshopsPage;
