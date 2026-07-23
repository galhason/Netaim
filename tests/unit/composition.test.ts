import { describe, expect, it } from 'vitest';
import type { ContentSource } from '@/features/events/types/event-experience';
import { toStudioCreator } from '@/infrastructure/payload/payload-identity';

const source = (name: string): ContentSource => ({
  getEventExperience: () =>
    Promise.resolve({
      slug: name,
      title: name,
      brandName: name,
      navigation: [],
      scenes: [],
    }),
});

describe('composition boundaries', () => {
  it('chooses the demo source only when demo mode is enabled', async () => {
    const { chooseContentSource } = await import(
      '@/infrastructure/selection'
    );
    const demo = source('demo');
    const live = source('live');
    expect(chooseContentSource(true, demo, live)).toBe(demo);
    expect(chooseContentSource(false, demo, live)).toBe(live);
  });

  it('maps storage users to the StudioCreator model', () => {
    expect(
      toStudioCreator({ id: 7, name: 'Dana', email: 'dana@example.test' }),
    ).toEqual({ id: '7', name: 'Dana', email: 'dana@example.test' });
  });

  it('falls back to email when the creator has no name', () => {
    expect(
      toStudioCreator({ id: 'u1', name: '  ', email: 'a@example.test' }).name,
    ).toBe('a@example.test');
    expect(
      toStudioCreator({ id: 'u1', email: 'a@example.test' }).name,
    ).toBe('a@example.test');
  });
});
