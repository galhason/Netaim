import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { placeOf } from '@/shared/constants/activity-facets';

/*
 * Where an activity is held. The Studio writes it in words — "חדר
 * פראג" — and the programme printed nothing: the drawer looked only at
 * the room record, which the Studio never sets. The place is now one
 * line, composed from whichever the activity has, printed beside the
 * hour in the drawer, the cards, the schedule and the WordPress
 * programme, and written in both languages like the title.
 */
describe('the place is one line', () => {
  it('is the room, the typed place, or both joined', () => {
    expect(placeOf({ floor: 'חדר פראג' })).toBe('חדר פראג');
    expect(placeOf({ room: 'אולם א' })).toBe('אולם א');
    expect(placeOf({ room: 'אולם א', floor: 'קומה 2' })).toBe('אולם א · קומה 2');
    expect(placeOf({ room: ' ', floor: '' })).toBe('');
    expect(placeOf({})).toBe('');
  });
});

describe('the place travels the whole way', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('is stored in both languages, with every typed value kept as the Hebrew', () => {
    expect(read('src/cms/collections/sessions.ts')).toContain("{ name: 'floor', type: 'text', localized: true }");
    const migration = read('src/migrations/20261009_120000_place_in_both_languages.ts');
    expect(migration).toContain('ALTER TABLE "sessions_locales" ADD COLUMN IF NOT EXISTS "floor" varchar');
    expect(migration).toContain("WHERE l._parent_id = s.id AND l._locale = 'he' AND s.floor IS NOT NULL");
    expect(migration).toContain('ALTER TABLE "sessions" DROP COLUMN IF EXISTS "floor"');
  });

  it('is written from the Studio in both languages and read back into the form', () => {
    const wizard = read('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx');
    expect(wizard).toContain('name="floor"');
    expect(wizard).toContain('en={initial?.floorEn ?? \'\'}');
    expect(wizard).not.toContain('id="w-floor"');
    const action = read('src/app/(studio)/studio/(console)/activity/actions.ts');
    expect(action).toContain("...(text(formData.get('floor_en')) ? { floor: text(formData.get('floor_en')) } : {})");
    expect(read('src/app/(studio)/studio/(console)/activity/[id]/page.tsx')).toContain('floorEn: en?.floor');
    /* The translation read gives back the place and the language note — the note was never read back before. */
    const repository = read('src/infrastructure/payload/payload-session.ts');
    expect(repository).toContain('...(row.floor ? { floor: row.floor } : {})');
    expect(repository).toContain('...(row.languageNote ? { languageNote: row.languageNote } : {})');
  });

  it('is printed beside the hour wherever an activity is shown', () => {
    expect(read('src/features/program/services/program-model.ts')).toContain('place: placeOf(session) || undefined');
    const drawer = read('src/features/conference/components/activity-drawer.tsx');
    expect(drawer).toContain('{activity.place ? (');
    expect(drawer).not.toContain('{activity.room ? (');
    const card = read('src/features/conference/components/activity-card.tsx');
    expect(card).toContain('{activity.place}');
    expect(card).not.toContain('{activity.room}');
    expect(read('src/app/(frontend)/[locale]/events/[slug]/my-activities/schedule-row.tsx')).toContain("const place = activity.place ?? '';");
    expect(read('src/infrastructure/payload/payload-marketing.ts')).toContain('{ place: placeOf(whereOf(row)) }');
  });

  it('is a column of the import sheet in both languages', () => {
    const importer = read('src/features/program/services/activity-import.ts');
    expect(importer).toContain("'floor',\n  'floorEn',");
    expect(importer).toContain("...(raw.floorEn ? { floor: raw.floorEn } : {})");
  });
});
