import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';

/*
 * Preview foundation: enables Next.js draft mode so the content service
 * fetches draft documents. Guarded by PREVIEW_SECRET and disabled
 * entirely when the secret is not configured.
 */
export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const draft = await draftMode();

  if (url.searchParams.get('exit') === 'true') {
    draft.disable();
    redirect('/');
  }

  const secret = process.env.PREVIEW_SECRET;
  const provided = url.searchParams.get('secret');
  const slug = url.searchParams.get('slug');
  const locale = url.searchParams.get('locale');

  if (
    !secret ||
    provided !== secret ||
    !slug ||
    !locale ||
    !isSupportedLocale(locale)
  ) {
    return new Response(null, { status: 404 });
  }

  draft.enable();
  redirect(`/${locale}/events/${slug}`);
};
