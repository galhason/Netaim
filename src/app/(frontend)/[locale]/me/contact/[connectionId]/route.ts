import { connectionContactCard } from '@/features/networking';

/*
 * The contact download door: an accepted connection becomes a vCard the
 * guest keeps in their own address book. The service holds every check
 * (signed-in, member of the connection, accepted) — this route only
 * hands the file over, or nothing.
 */
export const GET = async (
  _request: Request,
  context: { params: Promise<{ locale: string; connectionId: string }> },
) => {
  const { connectionId } = await context.params;
  const card = await connectionContactCard(connectionId).catch(() => null);
  if (!card) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(card.vcard, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${card.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
};
