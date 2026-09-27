import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The section editor's one write: a section's words in both languages
 * and its pictures, and nothing beyond the section. What reaches the
 * opening service is recorded here, per language, and read back.
 */
const writes: { locale: string; input: Record<string, unknown> }[] = [];
const state = { actor: { id: 'op-1', name: 'Ops', email: 'ops@example.org' } as object | null };

vi.mock('@/features/studio/services/studio-auth', () => ({
  actorFor: async () => state.actor,
}));
vi.mock('@/features/access', () => ({ audit: async () => undefined }));
vi.mock('@/shared/cache/publish', () => ({ publishedEvent: () => undefined }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/events', () => ({
  saveEventOpening: async (_slug: string, locale: string, input: Record<string, unknown>) => {
    writes.push({ locale, input });
  },
  saveEventComposition: async () => undefined,
  launchExperience: async () => ({ ok: true, event: {} }),
}));

const load = () => import('@/app/(studio)/studio/(console)/conference/[slug]/content/actions');

describe('editing a conference section', () => {
  beforeEach(() => {
    writes.length = 0;
    state.actor = { id: 'op-1', name: 'Ops', email: 'ops@example.org' };
  });

  it('writes the story in both languages, the picture once, and nothing else', async () => {
    const { saveConferenceSectionAction } = await load();
    const outcome = await saveConferenceSectionAction({
      slug: 'brkt',
      section: 'story',
      he: { storyTitle: 'למה', storyParagraph: 'כי', teaser: 'לא שייך לסקשן' },
      en: { storyTitle: 'Why', storyParagraph: '' },
      shared: { storyImageId: '12', heroImageId: 'not-this-section' },
    });
    expect(outcome.ok).toBe(true);
    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual({
      locale: 'he',
      input: { storyTitle: 'למה', storyParagraph: 'כי', storyImageId: '12' },
    });
    /* English: the same words, an empty one passed through so the service clears it. */
    expect(writes[1]).toEqual({ locale: 'en', input: { storyTitle: 'Why', storyParagraph: '' } });
  });

  it('clears a picture with null when the field is emptied', async () => {
    const { saveConferenceSectionAction } = await load();
    await saveConferenceSectionAction({ slug: 'brkt', section: 'closing', he: {}, en: {}, shared: { closingImageId: '' } });
    expect(writes[0]?.input).toEqual({ closingImageId: null });
  });

  it('keeps the venue facts one list, filtered by the Hebrew label, with each language’s words', async () => {
    const { saveConferenceSectionAction } = await load();
    await saveConferenceSectionAction({
      slug: 'brkt',
      section: 'venue',
      he: { venueName: 'האסם' },
      en: { venueName: 'The Barn' },
      shared: { venueMapUrl: 'https://maps.example/x' },
      facts: [
        { icon: 'parking', he: { label: 'חניה', description: 'חינם' }, en: { label: 'Parking', description: 'Free' } },
        { icon: 'wifi', he: { label: '', description: '' }, en: { label: 'Wi-Fi', description: '' } },
      ],
    });
    const he = writes.find((w) => w.locale === 'he')!.input;
    const en = writes.find((w) => w.locale === 'en')!.input;
    expect(he.venueFacts).toEqual([{ icon: 'parking', label: 'חניה', description: 'חינם' }]);
    expect(en.venueFacts).toEqual([{ icon: 'parking', label: 'Parking', description: 'Free' }]);
    expect(he.venueMapUrl).toBe('https://maps.example/x');
    expect(en.venueMapUrl).toBeUndefined();
  });

  it('writes a fact icon the database can hold: the newer names as they are, the Studio’s older twins mapped, nonsense to accessibility', async () => {
    const { saveConferenceSectionAction } = await load();
    await saveConferenceSectionAction({
      slug: 'brkt',
      section: 'venue',
      he: {},
      en: {},
      shared: {},
      facts: [
        { icon: 'wifi', he: { label: 'רשת', description: '' }, en: { label: 'Wi-Fi', description: '' } },
        { icon: 'nature', he: { label: 'ירוק', description: '' }, en: { label: 'Green', description: '' } },
        { icon: 'transport', he: { label: 'רכבת', description: '' }, en: { label: 'Train', description: '' } },
        { icon: 'unicorn', he: { label: 'אחר', description: '' }, en: { label: 'Other', description: '' } },
      ],
    });
    const he = writes.find((w) => w.locale === 'he')!.input;
    expect((he.venueFacts as { icon: string }[]).map((fact) => fact.icon)).toEqual(['wifi', 'leaf', 'transit', 'accessibility']);
  });

  it('refuses an unknown section and a stranger', async () => {
    const { saveConferenceSectionAction } = await load();
    expect(await saveConferenceSectionAction({ slug: 'brkt', section: 'nope', he: {}, en: {}, shared: {} })).toEqual({ ok: false, reason: 'unknown-section' });
    state.actor = null;
    expect(await saveConferenceSectionAction({ slug: 'brkt', section: 'story', he: {}, en: {}, shared: {} })).toEqual({ ok: false, reason: 'forbidden' });
    expect(writes).toHaveLength(0);
  });
});
