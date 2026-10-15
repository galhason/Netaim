import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The site's navigation is on every page of the platform — the profile
 * and a chat thread included, the two that once stood without it. A
 * chat thread pins its own header (the other person, the way back), so
 * there the bar sits at the top of the page and scrolls away rather
 * than covering it.
 */
const read = (path: string) => readFileSync(path, 'utf8');

describe('every page wears the bar', () => {
  it('draws the bar on the profile and on a chat thread', () => {
    for (const path of [
      'src/app/(frontend)/[locale]/me/profile/page.tsx',
      'src/app/(frontend)/[locale]/me/chat/[connectionId]/page.tsx',
    ]) {
      const page = read(path);
      expect(page).toContain('<ConferenceBar');
      expect(page).toContain('conferenceBarViewer()');
    }
  });

  it('lets the chat thread keep its own header in view', () => {
    expect(read('src/app/(frontend)/[locale]/me/chat/[connectionId]/page.tsx')).toContain('pinned={false}');
    expect(read('src/app/(frontend)/[locale]/me/profile/page.tsx')).not.toContain('pinned={false}');
    expect(read('src/features/conference/components/conference-bar.tsx')).toContain(
      "pinned ? 'nt-bar' : 'nt-bar nt-bar--flow'",
    );
    expect(read('src/features/conference/styles/conference-bar.css')).toMatch(
      /\.nt-bar\.nt-bar--flow \{\s*position: relative;/,
    );
  });
});
