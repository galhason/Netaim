import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { cacheTags } from '@/shared/cache/content-cache';

const root = path.resolve(process.cwd(), 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory()
      ? walk(full)
      : /\.tsx?$/.test(entry)
        ? [full]
        : [];
  });

const sources = walk(root).map((file) => ({
  file: path.relative(root, file),
  text: readFileSync(file, 'utf8'),
}));

/*
 * Caching published content is what makes 600 concurrent visitors
 * survivable, and it is also the fastest way to serve one visitor's
 * private view to the next. These guards fail on the two mistakes that
 * would cause that.
 */
describe('content cache safety', () => {
  it('never caches a reader that resolves the visitor', () => {
    const identityCalls =
      /cookies\(\)|currentParticipant|requireActor|getActorContext/;

    const offenders = sources
      .filter(({ text }) => text.includes('cachedContent('))
      .filter(({ text }) => identityCalls.test(text))
      .map(({ file }) => file);

    expect(
      offenders,
      'a cached reader in these files also resolves the visitor — it would serve one person’s view to the next',
    ).toEqual([]);
  });

  it('keeps the locale in every cache key', () => {
    /*
     * `cachedContent(fn, keyParts, tags)`. A reader that takes a locale
     * and forgets it in its key serves Hebrew to an English visitor.
     */
    const calls = sources.flatMap(({ file, text }) =>
      [...text.matchAll(/cachedContent\(\s*([\s\S]{0,400}?)\)\(/g)].flatMap(
        (match) => {
          const body = match[1];
          return body === undefined ? [] : [{ file, body }];
        },
      ),
    );

    expect(calls.length, 'no cachedContent call sites found').toBeGreaterThan(0);

    const offenders = calls
      .filter(({ body }) => body.includes('locale'))
      .filter(({ body }) => {
        const key = body.match(/\[([\s\S]*?)\]/)?.[1];
        return key === undefined || !key.includes('locale');
      })
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('leaves no blanket revalidatePath in the Studio', () => {
    /*
     * `revalidatePath('/', 'layout')` discarded the cache of every
     * conference because one was edited. Writes name their subject now.
     */
    const offenders = sources
      .filter(({ file }) => !file.startsWith(path.join('shared', 'cache')))
      .filter(({ text }) => text.includes("revalidatePath('/', 'layout')"))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('gives each tag a distinct namespace', () => {
    const tags = [
      cacheTags.event('a'),
      cacheTags.event('b'),
      cacheTags.experience('a'),
      cacheTags.activeConference,
      cacheTags.homepage,
      cacheTags.speakers,
      cacheTags.sponsors,
    ];
    expect(new Set(tags).size).toBe(tags.length);
    /* An event tag and an experience tag with the same slug must differ. */
    expect(cacheTags.event('a')).not.toBe(cacheTags.experience('a'));
  });
});
