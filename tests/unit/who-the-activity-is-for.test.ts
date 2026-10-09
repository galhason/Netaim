import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  audienceLabels,
  languageLine,
  parseLanguageText,
  topicLabels,
} from '@/shared/constants/activity-facets';

/*
 * The three facets the programme sheet names for every activity — who
 * it is for, what field, which language — as closed lists read in
 * either language, written in the Studio, and shown in the programme.
 */
describe('the facets, read in the reader’s language', () => {
  it('turns stored values into words, and drops anything it does not know', () => {
    expect(audienceLabels(['educators', 'youth', 'nope'], 'he')).toEqual(['מחנכים / אנשי צוות', 'נוער (12–18)']);
    expect(audienceLabels(['adults', 'children'], 'en')).toEqual(['Adults (30+)', 'Children (5–12)']);
    expect(topicLabels(['informal', 'community'], 'he')).toEqual(['חינוך בלתי-פורמלי', 'קהילתי']);
    expect(topicLabels(['formal'], 'en')).toEqual(['Formal Education']);
    expect(audienceLabels(undefined, 'he')).toEqual([]);
  });

  it('writes the language line the way the sheet does', () => {
    expect(languageLine({ languages: ['en'], translated: true }, 'he')).toBe('אנגלית · תרגום סימולטני');
    expect(languageLine({ languages: ['he', 'en'] }, 'en')).toBe('Hebrew / English');
    expect(languageLine({ languages: ['en'], languageNote: 'אפשרות לדיון בצרפתית' }, 'he')).toBe('אנגלית · אפשרות לדיון בצרפתית');
    expect(languageLine({}, 'he')).toBe('');
    expect(languageLine({ translated: true }, 'en')).toBe('Simultaneous translation');
  });

  it('reads the old free text into the lists, keeping what it cannot place as the note', () => {
    expect(parseLanguageText('אנגלית (מתורגם)')).toEqual({ languages: ['en'], translated: true });
    expect(parseLanguageText('עברית / אנגלית')).toEqual({ languages: ['he', 'en'], translated: false });
    expect(parseLanguageText('French with slides')).toEqual({ languages: ['fr'], translated: false });
    expect(parseLanguageText('Yiddish')).toEqual({ languages: [], translated: false, languageNote: 'Yiddish' });
    expect(parseLanguageText('')).toEqual({ languages: [], translated: false });
  });
});

describe('the facets travel the whole way', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('are stored as closed lists on the activity', () => {
    const collection = read('src/cms/collections/sessions.ts');
    for (const name of ['audiences', 'topics', 'languages']) {
      expect(collection).toContain(`name: '${name}',\n      type: 'select',\n      hasMany: true,`);
    }
    expect(collection).toContain("{ name: 'translated', type: 'checkbox', defaultValue: false }");
    expect(collection).toContain("{ name: 'languageNote', type: 'text', localized: true }");
    expect(collection).not.toContain("name: 'language',\n      type: 'text',");
    const migration = read('src/migrations/20261009_090000_activity_facets.ts');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "sessions_audiences"');
    expect(migration).toContain('ALTER TABLE "sessions" DROP COLUMN IF EXISTS "language"');
  });

  it('are written from the Studio wizard as ticked sets, in both languages for the note', () => {
    const wizard = read('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx');
    expect(wizard).toContain('name="audiences"');
    expect(wizard).toContain('name="topics"');
    expect(wizard).toContain('name="languages"');
    expect(wizard).toContain('<Check name="translated"');
    expect(wizard).toContain('name="languageNote"');
    expect(wizard).not.toContain('name="language"\n');
    const action = read('src/app/(studio)/studio/(console)/activity/actions.ts');
    expect(action).toContain("audiences: audiencesOf(formData.getAll('audiences').map(String))");
    expect(action).toContain("languages: activityLanguagesOf(formData.getAll('languages').map(String))");
    expect(action).toContain("text(formData.get('languageNote_en'))");
  });

  it('reach the reader as words — the drawer, the card, the public API and the WordPress programme', () => {
    const model = read('src/features/program/services/program-model.ts');
    expect(model).toContain('language: languageLine(session, locale) || undefined');
    expect(model).toContain('audiences: audienceLabels(session.audiences, locale)');
    const drawer = read('src/features/conference/components/activity-drawer.tsx');
    expect(drawer).toContain("{ label: he ? 'קהל יעד' : 'Audience', values: activity.audiences }");
    expect(drawer).toContain('<ReadMore');
    expect(read('src/features/conference/components/speaker-card.tsx')).toContain('<ReadMore');
    expect(read('src/features/conference/components/activity-card.tsx')).toContain('...activity.audiences');
    const marketing = read('src/infrastructure/payload/payload-marketing.ts');
    expect(marketing).toContain('toPublicSession(row, locale)');
    expect(marketing).toContain('audiences: audienceLabels(row.audiences ?? undefined, locale)');
  });

  it('fold a long text and leave a short one whole', () => {
    const readMore = read('src/features/conference/ui/read-more.tsx');
    expect(readMore).toContain("const foldable = text.trim().length > FOLD_THRESHOLD || text.includes('\\n');");
    expect(readMore).toContain('aria-expanded={open}');
    expect(readMore).toContain("more: { he: 'קרא עוד', en: 'Read more' }");
  });
});
