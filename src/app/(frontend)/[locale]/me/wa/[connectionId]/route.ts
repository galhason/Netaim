import { whatsappLinkFor } from '@/features/networking';

/*
 * The WhatsApp door (Connection Framework v1.0): opens a conversation
 * without printing the number anywhere in the UI. The service verifies
 * the accepted connection and the other side's permission; the number
 * exists only inside this redirect.
 */
export const GET = async (
  _request: Request,
  context: { params: Promise<{ locale: string; connectionId: string }> },
) => {
  const { connectionId } = await context.params;
  const link = await whatsappLinkFor(connectionId).catch(() => null);
  if (!link) {
    return new Response('Not available', { status: 404 });
  }
  return Response.redirect(link, 302);
};
