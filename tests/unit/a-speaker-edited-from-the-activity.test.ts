import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A speaker added from the activity wizard could be removed from it but
 * never corrected: a typo in the name meant leaving the activity for
 * the roster page. Each chosen speaker now opens in place, in both
 * languages, and the chip redraws from what the server kept.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

describe('a speaker edited from the activity', () => {
  it('opens in place from the chip, in both languages, with a way to the full roster card', () => {
    const picker = read('src/app/(studio)/studio/(console)/activity/speaker-picker.tsx');
    expect(picker).toContain("onClick={() => setEditing(editing === s.id ? null : s.id)}");
    expect(picker).toContain('<SpeakerEditor');
    expect(picker).toContain('<LangTag>עב</LangTag>');
    expect(picker).toContain('<LangTag>EN</LangTag>');
    expect(picker).toContain('/speakers#speaker-${speaker.id}');
    /* The chip is replaced by the saved speaker, never by the typed words. */
    expect(picker).toContain('setSelected((prev) => prev.map((s) => (s.id === speaker.id ? speaker : s)))');
  });

  it('reads the words as written and saves one write per language, the link on the Hebrew', () => {
    const actions = read('src/app/(studio)/studio/(console)/activity/actions.ts');
    expect(actions).toContain("listConferenceSpeakers(slug, 'he', { fallback: false })");
    expect(actions).toContain("listConferenceSpeakers(slug, 'en', { fallback: false })");
    expect(actions).toContain("updateSpeaker(id, { ...he, socialLinks: link ? [{ url: link }] : [] }, 'he')");
    expect(actions).toContain("updateSpeaker(id, trimmed(input.en), 'en')");
    expect(actions).toContain('return getSpeaker(id, input.contentLocale)');
    /* Both doors check the same capability as the rest of the wizard. */
    expect(actions.match(/if \(!slug \|\| !id \|\| !\(await authorized\(slug\)\)\)/g)).toHaveLength(2);
  });
});
