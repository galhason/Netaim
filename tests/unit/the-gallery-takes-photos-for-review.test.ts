import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A participant sends a photograph; the team decides.
 *
 * Proven here, in order of the path a photograph takes: the gallery
 * page's action refuses a visitor who is not signed in, a conference
 * that is not published and a sender over the allowance, and refuses a
 * file over the ceiling before reading it; the service refuses what is
 * not really a JPEG, PNG or WebP whatever it is called, and credits the
 * sender by their own name — nothing else is asked of them; the store
 * keeps it as a pending, unpublished item whose file is held from every
 * listing, re-encoded without the camera's metadata, bound for the grid
 * further down; and the library's read rule leaves a held file out of
 * anything an anonymous caller can list.
 */
const MB = 1024 * 1024;
const calls: { payload: { op: string; args: Record<string, unknown> }[] } = { payload: [] };
const gate: { participant: { id: string; name: string; email: string } | null; published: boolean; allowed: boolean } = {
  participant: { id: '7', name: 'Dana Levi', email: 'dana@example.test' },
  published: true,
  allowed: true,
};
const queued: unknown[] = [];

vi.mock('@/infrastructure/payload/payload-context', () => ({
  getSystemPayload: async () => ({
    find: async (args: Record<string, unknown>) => {
      calls.payload.push({ op: 'find', args });
      return args.collection === 'events' ? { docs: [{ id: 42, organization: 4 }] } : { docs: [] };
    },
    create: async (args: Record<string, unknown>) => {
      calls.payload.push({ op: 'create', args });
      return { id: args.collection === 'media' ? 900 : 901 };
    },
    delete: async (args: Record<string, unknown>) => {
      calls.payload.push({ op: 'delete', args });
      return {};
    },
  }),
  actorContext: async () => null,
}));

vi.mock('@/features/registration', () => ({ currentParticipant: async () => gate.participant }));
vi.mock('@/features/events', () => ({ findPortalEvent: async () => (gate.published ? { slug: 'summit', title: 'Summit' } : null) }));
vi.mock('@/features/access', () => ({
  checkRateLimit: async () => (gate.allowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 60 }),
}));

const { payloadGalleryRepository } = await import('@/infrastructure/payload/payload-gallery');
vi.doMock('@/infrastructure', () => ({
  galleryRepository: {
    submit: async (slug: string, input: unknown) => {
      queued.push({ slug, input });
      return { id: '901' };
    },
  },
}));
const { sniffImageType, submitGalleryPhoto } = await import('@/features/gallery/services/gallery-service');
const { submitGalleryPhotoAction } = await import('@/app/(frontend)/[locale]/events/[slug]/(experience)/gallery/actions');
const { mediaReadAccess } = await import('@/cms/collections/media');

const jpeg = async () =>
  new Uint8Array(
    await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 30, g: 90, b: 50 } } })
      .withMetadata({ exif: { IFD0: { Copyright: 'camera' } } })
      .jpeg()
      .toBuffer(),
  );

const form = (fields: Record<string, string | File>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const idle = { status: 'idle' as const };

beforeEach(() => {
  calls.payload.length = 0;
  queued.length = 0;
  gate.participant = { id: '7', name: 'Dana Levi', email: 'dana@example.test' };
  gate.published = true;
  gate.allowed = true;
});

describe('what the file really is', () => {
  it('knows the three formats by their first bytes', async () => {
    expect(sniffImageType(await jpeg())).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });

  it('knows nothing else, whatever it is called', () => {
    const html = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    expect(sniffImageType(html)).toBeNull();
    expect(sniffImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
  });
});

describe('the service', () => {
  const participant = { id: '7', name: 'Dana Levi' };
  const request = async (over: Record<string, unknown> = {}) => ({
    file: { name: 'a.jpg', type: 'image/jpeg', data: await jpeg() },
    ...over,
  });

  it('queues a real photograph with the sender’s own name as the credit', async () => {
    expect(await submitGalleryPhoto('summit', participant, 'he', await request())).toEqual({ ok: true });
    expect(queued[0]).toMatchObject({ slug: 'summit', input: { participantId: '7', credit: 'Dana Levi', locale: 'he' } });
  });

  it('takes the credit from the account, never from the form', async () => {
    await submitGalleryPhotoAction(idle, form({ slug: 'summit', locale: 'he', credit: 'Someone Else', photo: new File([await jpeg()], 'a.jpg', { type: 'image/jpeg' }) }));
    expect(queued[0]).toMatchObject({ input: { credit: 'Dana Levi' } });
  });

  it('refuses a file over the ceiling', async () => {
    const big = new Uint8Array(8 * MB + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(await submitGalleryPhoto('summit', participant, 'he', await request({ file: { name: 'a.jpg', type: 'image/jpeg', data: big } }))).toEqual({ ok: false, reason: 'size' });
  });

  it('refuses a file that is not a photograph, even named like one', async () => {
    const fake = new TextEncoder().encode('<html>hello</html>');
    expect(await submitGalleryPhoto('summit', participant, 'he', await request({ file: { name: 'a.jpg', type: 'image/jpeg', data: fake } }))).toEqual({ ok: false, reason: 'type' });
  });

  it('refuses nothing sent', async () => {
    expect(await submitGalleryPhoto('summit', participant, 'he', await request({ file: null }))).toEqual({ ok: false, reason: 'missing' });
  });
});

describe('the gallery page’s action', () => {
  const photo = async (size?: number) =>
    size ? new File([new Uint8Array(size)], 'big.jpg', { type: 'image/jpeg' }) : new File([await jpeg()], 'a.jpg', { type: 'image/jpeg' });
  const fields = async (over: Record<string, string | File> = {}) => ({ slug: 'summit', locale: 'he', photo: await photo(), ...over });

  it('refuses a visitor who is not signed in', async () => {
    gate.participant = null;
    expect(await submitGalleryPhotoAction(idle, form(await fields()))).toEqual({ status: 'error', reason: 'signed-out' });
    expect(queued).toEqual([]);
  });

  it('refuses a conference that is not published', async () => {
    gate.published = false;
    expect(await submitGalleryPhotoAction(idle, form(await fields()))).toEqual({ status: 'error', reason: 'closed' });
  });

  it('refuses a sender over the allowance', async () => {
    gate.allowed = false;
    expect(await submitGalleryPhotoAction(idle, form(await fields()))).toEqual({ status: 'error', reason: 'busy' });
  });

  it('refuses a file over the ceiling before reading it', async () => {
    expect(await submitGalleryPhotoAction(idle, form(await fields({ photo: await photo(8 * MB + 1) })))).toEqual({ status: 'error', reason: 'size' });
    expect(queued).toEqual([]);
  });

  it('queues a photograph and says so — never publishing it', async () => {
    expect(await submitGalleryPhotoAction(idle, form(await fields()))).toEqual({ status: 'sent' });
    expect(queued).toHaveLength(1);
  });
});

describe('the store', () => {
  it('keeps a pending, unpublished item, and a held file under a random name, without the camera’s metadata', async () => {
    const outcome = await payloadGalleryRepository.submit('summit', {
      file: { name: 'IMG_0001.jpg', type: 'image/jpeg', data: await jpeg() },
      participantId: '7',
      credit: 'Dana Levi',
      locale: 'he',
    });
    expect(outcome).toEqual({ id: '901' });
    const media = calls.payload.find((call) => call.op === 'create' && call.args.collection === 'media')!.args;
    expect(media.data).toMatchObject({ organization: 4, reviewHold: true });
    const file = media.file as { name: string; mimetype: string; data: Buffer };
    expect(file.name).toMatch(/^gallery-[0-9a-f-]{36}\.jpg$/);
    expect(file.name).not.toContain('IMG_0001');
    expect(file.mimetype).toBe('image/jpeg');
    expect((await sharp(file.data).metadata()).exif).toBeUndefined();
    const item = calls.payload.find((call) => call.op === 'create' && call.args.collection === 'gallery-items')!.args;
    expect(item.data).toMatchObject({ event: 42, media: 900, credit: 'Dana Levi', status: 'pending', published: false, placement: 'more', submittedBy: 7 });
  });

  it('keeps nothing that does not decode as an image', async () => {
    const outcome = await payloadGalleryRepository.submit('summit', {
      file: { name: 'x.jpg', type: 'image/jpeg', data: new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2, 3]) },
      participantId: '7',
      credit: '',
      locale: 'he',
    });
    expect(outcome).toBeNull();
    expect(calls.payload.filter((call) => call.op === 'create')).toEqual([]);
  });
});

describe('the library’s read rule', () => {
  type Args = Parameters<typeof mediaReadAccess>[0];
  const ask = (user: unknown, isReadingStaticFile?: boolean) =>
    mediaReadAccess({ req: { user }, isReadingStaticFile } as unknown as Args);

  it('leaves held files out of anything an anonymous caller can list', () => {
    expect(ask(null)).toEqual({ or: [{ reviewHold: { equals: false } }, { reviewHold: { exists: false } }] });
  });

  it('still serves a file’s bytes to whoever holds its address, so the reviewer sees it', () => {
    expect(ask(null, true)).toBe(true);
  });

  it('lets the team read everything', () => {
    expect(ask({ id: 1 })).toBe(true);
  });

  it('keeps held files out of the Studio’s media picker until approved', () => {
    const source = readFileSync('src/infrastructure/payload/payload-people-media.ts', 'utf8');
    expect(source).toContain("{ reviewHold: { equals: false } }");
  });
});
