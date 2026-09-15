import { chatSince, sendChatMessageReturning } from '@/features/networking';

/*
 * The door an open thread talks to.
 *
 * The page itself is server-rendered and stays that way; this exists
 * only so a conversation already on screen can keep up without
 * reloading the page around it. Both verbs go through the same services
 * the page and the form use, so membership, an accepted connection and
 * the block rule are enforced once and cannot drift between the two
 * ways into the same conversation.
 *
 * Nothing here is cacheable and nothing is shared: the answer depends
 * entirely on the cookie that arrived with the request.
 */
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export const GET = async (
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) => {
  const { connectionId } = await context.params;
  const after = new URL(request.url).searchParams.get('after') ?? '0';
  const update = await chatSince(connectionId, after).catch(() => null);
  if (!update) {
    /*
     * Gone rather than forbidden: from the thread's point of view the
     * conversation has ended, and the client's job is to stop asking
     * rather than to retry with different credentials.
     */
    return json({ closed: true }, 410);
  }
  return json(update);
};

export const POST = async (
  request: Request,
  context: { params: Promise<{ connectionId: string }> },
) => {
  const { connectionId } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    body?: unknown;
  } | null;
  const body = typeof payload?.body === 'string' ? payload.body : '';
  if (!body.trim()) {
    return json({ error: 'empty' }, 400);
  }
  const message = await sendChatMessageReturning(connectionId, body).catch(
    () => null,
  );
  if (!message) {
    return json({ closed: true }, 410);
  }
  return json({ message });
};

export const dynamic = 'force-dynamic';
