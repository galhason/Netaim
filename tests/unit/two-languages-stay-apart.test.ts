import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Two languages, edited separately.
 *
 * The write was always locale-scoped; what went wrong was upstream of
 * it. The platform falls back — an English page with no English text
 * shows the Hebrew — and the inspector read the page the same way a
 * visitor does. So opening the English editor filled every field with
 * Hebrew, and the first save wrote all of it into English. After that
 * the two languages could never differ again.
 *
 * And the control that chooses which language is being written was a
 * bare "עברית / EN" sitting beside another bare "עברית / EN" that
 * changes the Studio's own language. Nothing distinguished them.
 *
 * These cases hold both halves.
 */
const read = (file: string) => readFileSync(file, 'utf8');

describe('the editor reads one language, not the visitor view', () => {
  it('asks for the conference draft without the fallback', () => {
    const adapter = read('src/infrastructure/payload/payload-event-repository.ts');
    const method = adapter.slice(adapter.indexOf('getOpeningDraft:'));
    const body = method.slice(0, method.indexOf('\n  updateComposition'));
    expect(
      body.includes("fallbackLocale: 'null'"),
      'without this the English form is pre-filled with Hebrew',
    ).toBe(true);
  });

  it('reads the homepage twice — once for the visitor, once for the editor', () => {
    const adapter = read('src/infrastructure/payload/payload-opening-page.ts');
    expect(adapter.includes('payloadHomepageDraft')).toBe(true);
    expect(adapter.includes("fallbackLocale: 'null' as const")).toBe(true);
  });

  it('points the Studio at the editor reading', () => {
    const service = read(
      'src/features/opening/services/homepage-admin-service.ts',
    );
    expect(service.includes('homepageDraftContent(locale)')).toBe(true);
    expect(
      service.includes('homepageContent(locale)'),
      'the draft must not use the visitor reading',
    ).toBe(false);
  });

  it('still falls back for a visitor', () => {
    const adapter = read('src/infrastructure/payload/payload-opening-page.ts');
    expect(adapter.includes('readHomepage(locale, false)')).toBe(true);
  });
});

describe('the two language switches cannot be confused', () => {
  for (const file of [
    'src/app/(studio)/studio/(console)/homepage/page.tsx',
    'src/app/(studio)/studio/(console)/experiences/[slug]/page.tsx',
  ]) {
    it(`${file.split('/').slice(-2).join('/')} names the content switch`, () => {
      const page = read(file);
      expect(page.includes('CONSOLE_UI.contentLanguage[locale].toUpperCase()')).toBe(
        true,
      );
      expect(
        page.includes('CONSOLE_UI.inheritedNote[locale]'),
        'an editor must be told that an empty field inherits',
      ).toBe(true);
    });
  }

  it('names the interface switch too', () => {
    const shell = read(
      'src/features/studio/components/console/console-shell.tsx',
    );
    expect(shell.includes('שפת הממשק')).toBe(true);
  });
});
