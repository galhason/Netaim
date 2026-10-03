import { beforeEach, describe, expect, it, vi } from 'vitest';
import { can, ROLE_CAPABILITIES, type Grant } from '@/permission-engine';
import { WORKSPACE_TABS } from '@/features/studio/constants/workspace-tabs';

/*
 * Who may change a gallery, decided on the server.
 *
 * The Studio's gallery actions ask the grants, not the page, whether the
 * person may keep this conference's gallery (gallery:manage for this
 * slug), and an item or a submission named in a form must belong to the
 * conference named beside it. The fake gate below answers with the real
 * `can` over a grant list the test sets, so what is proven is the rule
 * itself: the Netaim admin, supervisor and staff may add, remove,
 * approve and delete; a participant (no grants), the legacy read-only
 * roles and a conference-scoped grant used on another conference are
 * refused and write nothing.
 */
const session: { grants: Grant[] } = { grants: [] };
const writes: string[] = [];
const items = new Map<string, { slug: string; id: string }>([
  ['1', { slug: 'summit', id: '1' }],
  ['2', { slug: 'other', id: '2' }],
]);
const submissions = new Map<string, { slug: string; id: string }>([
  ['s1', { slug: 'summit', id: 's1' }],
  ['s2', { slug: 'other', id: 's2' }],
]);

vi.mock('@/features/studio/services/studio-auth', () => ({
  actorFor: async (capability: string, slug?: string) =>
    can(session.grants, capability as never, slug) ? { id: 'a1', name: 'Admin' } : null,
}));

vi.mock('@/features/gallery', async () => {
  const compose = await import('@/features/gallery/utils/compose');
  const types = await import('@/features/gallery/types/gallery');
  return {
    parseDuration: compose.parseDuration,
    isGalleryPlacement: types.isGalleryPlacement,
    listGalleryItems: async (slug: string) =>
      [...items.values()].filter((item) => item.slug === slug).map((item) => ({ ...item, published: true, placement: 'story' })),
    addGalleryItem: async (slug: string) => {
      writes.push(`add:${slug}`);
      return { id: '99', published: true };
    },
    addGalleryItems: async (slug: string, ids: string[], placement: string) => {
      writes.push(`add-many:${slug}:${ids.join('+')}:${placement}`);
      return ids.map((id) => ({ id: `n${id}` }));
    },
    placeGalleryItem: async (slug: string, id: string, placement: string) => {
      writes.push(`place:${slug}:${id}:${placement}`);
      return { ok: true };
    },
    updateGalleryItem: async (id: string) => {
      writes.push(`update:${id}`);
      return { id, published: true };
    },
    removeGalleryItem: async (id: string) => {
      writes.push(`remove:${id}`);
      return true;
    },
    moveGalleryItem: async (slug: string, id: string) => {
      writes.push(`move:${slug}:${id}`);
      return [];
    },
    listGallerySubmissions: async (slug: string) =>
      [...submissions.values()].filter((item) => item.slug === slug).map((item) => ({ ...item, caption: '', credit: '' })),
    approveGallerySubmission: async (slug: string, id: string) => {
      writes.push(`approve:${slug}:${id}`);
      return true;
    },
    rejectGallerySubmission: async (id: string) => {
      writes.push(`reject:${id}`);
      return true;
    },
  };
});

vi.mock('@/features/access', () => ({ audit: async () => undefined }));
vi.mock('@/shared/cache/publish', () => ({ publishedEvent: () => undefined }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const actions = await import('@/app/(studio)/studio/(console)/gallery/actions');

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
};

/* Run an action; a redirect is its normal ending, so it is not a failure here. */
const run = async (action: (data: FormData) => Promise<void>, fields: Record<string, string>) => {
  await action(form(fields)).catch((error: Error) => {
    if (!error.message.startsWith('redirect:')) {
      throw error;
    }
  });
};

const every = (fields: Record<string, string>) =>
  [
    [actions.addGalleryItemAction, { ...fields, mediaId: '7' }],
    [actions.addGalleryItemsAction, { ...fields, mediaIds: '7,8', placement: 'more' }],
    [actions.placeGalleryItemAction, { ...fields, id: '1', placement: 'hero' }],
    [actions.updateGalleryItemAction, { ...fields, id: '1', mediaId: '7' }],
    [actions.setGalleryItemPublishedAction, { ...fields, id: '1', published: 'false' }],
    [actions.removeGalleryItemAction, { ...fields, id: '1' }],
    [actions.moveGalleryItemAction, { ...fields, id: '1', direction: 'up' }],
    [actions.approveGallerySubmissionAction, { ...fields, id: 's1' }],
    [actions.rejectGallerySubmissionAction, { ...fields, id: 's1' }],
  ] as const;

beforeEach(() => {
  writes.length = 0;
});

describe('the roles', () => {
  it('give the gallery to the Netaim admin, supervisor and staff', () => {
    for (const role of ['owner', 'producer', 'editor'] as const) {
      expect(ROLE_CAPABILITIES[role], role).toContain('gallery:manage');
    }
  });

  it('do not give it to the legacy read-only roles', () => {
    for (const role of ['door', 'viewer'] as const) {
      expect(ROLE_CAPABILITIES[role], role).not.toContain('gallery:manage');
    }
  });

  it('show the tab only to those who may use it', () => {
    const tab = WORKSPACE_TABS.find((entry) => entry.id === 'gallery');
    expect(tab).toMatchObject({ path: '/studio/gallery', scoped: false, needs: 'gallery:manage' });
  });
});

describe('the actions', () => {
  it('write nothing for a person with no grants — a participant or a visitor', async () => {
    session.grants = [];
    for (const [action, fields] of every({ slug: 'summit' })) {
      await run(action, fields);
    }
    expect(writes).toEqual([]);
  });

  it('write nothing for the legacy read-only roles', async () => {
    for (const role of ['door', 'viewer'] as const) {
      session.grants = [{ role, eventSlug: null } as Grant];
      for (const [action, fields] of every({ slug: 'summit' })) {
        await run(action, fields);
      }
    }
    expect(writes).toEqual([]);
  });

  it('write nothing on a conference the grant does not cover', async () => {
    session.grants = [{ role: 'owner', eventSlug: 'other' } as Grant];
    for (const [action, fields] of every({ slug: 'summit' })) {
      await run(action, fields);
    }
    expect(writes).toEqual([]);
  });

  it('let the admin, the supervisor and staff add, edit, show or hide, remove, reorder, approve and delete', async () => {
    for (const role of ['owner', 'producer', 'editor'] as const) {
      writes.length = 0;
      session.grants = [{ role, eventSlug: null } as Grant];
      for (const [action, fields] of every({ slug: 'summit' })) {
        await run(action, fields);
      }
      expect(writes, role).toEqual([
        'add:summit',
        'add-many:summit:7+8:more',
        'place:summit:1:hero',
        'update:1',
        'update:1',
        'remove:1',
        'move:summit:1',
        'approve:summit:s1',
        'reject:s1',
      ]);
    }
  });

  it('refuse an item or a submission that belongs to another conference', async () => {
    session.grants = [{ role: 'owner', eventSlug: 'summit' } as Grant];
    await run(actions.updateGalleryItemAction, { slug: 'summit', id: '2', mediaId: '7' });
    await run(actions.removeGalleryItemAction, { slug: 'summit', id: '2' });
    await run(actions.setGalleryItemPublishedAction, { slug: 'summit', id: '2', published: 'true' });
    await run(actions.approveGallerySubmissionAction, { slug: 'summit', id: 's2' });
    await run(actions.rejectGallerySubmissionAction, { slug: 'summit', id: 's2' });
    expect(writes).toEqual([]);
  });

  it('will not approve or delete something that is not waiting for review', async () => {
    session.grants = [{ role: 'editor', eventSlug: null } as Grant];
    await run(actions.approveGallerySubmissionAction, { slug: 'summit', id: '1' });
    await run(actions.rejectGallerySubmissionAction, { slug: 'summit', id: '1' });
    expect(writes).toEqual([]);
  });

  it('will not add an item without a file', async () => {
    session.grants = [{ role: 'owner', eventSlug: null } as Grant];
    await run(actions.addGalleryItemAction, { slug: 'summit' });
    await run(actions.addGalleryItemsAction, { slug: 'summit', mediaIds: 'x,../1' });
    expect(writes).toEqual([]);
  });

  it('will not place an item of another conference, or in a place that does not exist', async () => {
    session.grants = [{ role: 'owner', eventSlug: null } as Grant];
    await run(actions.placeGalleryItemAction, { slug: 'summit', id: '2', placement: 'hero' });
    await run(actions.placeGalleryItemAction, { slug: 'summit', id: '1', placement: 'banner' });
    expect(writes).toEqual([]);
  });

  it('moves an item when its editor changes where it sits', async () => {
    session.grants = [{ role: 'editor', eventSlug: null } as Grant];
    await run(actions.updateGalleryItemAction, { slug: 'summit', id: '1', mediaId: '7', placement: 'more' });
    expect(writes).toEqual(['update:1', 'place:summit:1:more']);
  });
});
