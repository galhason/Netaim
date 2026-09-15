import { addMedia } from '@/features/events';
import { authorized } from '@/features/studio';

/*
 * The upload behind every media field.
 *
 * This is a route handler rather than a Server Action, and the reason
 * is the picker's own state. Calling an action from a client component
 * refreshes the route from the server; the picker is rendered inside a
 * branch that depends on which scene is selected, so that refresh
 * remounts it — and the file that was just uploaded landed in the
 * library while the field it was uploaded *for* went back to "none".
 * Which is the precise confusion this control exists to remove.
 *
 * A plain fetch changes nothing else on the page. The picker adds the
 * returned item to its list, selects it, and the editor saves when they
 * are ready, exactly as with any other change.
 */
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ACCEPTED =
  /^(?:image\/(?:jpeg|png|webp|avif|svg\+xml)|video\/(?:mp4|webm))$/;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export const POST = async (request: Request): Promise<Response> => {
  if (!(await authorized('experiences:manage'))) {
    return json({ ok: false, reason: 'denied' }, 403);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, reason: 'missing' }, 400);
  }
  if (!ACCEPTED.test(file.type)) {
    return json({ ok: false, reason: 'type' }, 415);
  }
  const ceiling = file.type.startsWith('video/')
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
  if (file.size > ceiling) {
    return json({ ok: false, reason: 'size' }, 413);
  }

  const alt = String(form?.get('alt') ?? '').trim();
  const data = new Uint8Array(await file.arrayBuffer());
  const media = await addMedia({
    file: { name: file.name, type: file.type, data },
    alt: alt || file.name,
  }).catch(() => null);

  if (!media) {
    return json({ ok: false, reason: 'failed' }, 500);
  }

  return json({
    ok: true,
    media: {
      id: media.id,
      url: media.url,
      alt: media.alt,
      filename: media.filename,
      ...(media.mimeType ? { mimeType: media.mimeType } : {}),
    },
  });
};
