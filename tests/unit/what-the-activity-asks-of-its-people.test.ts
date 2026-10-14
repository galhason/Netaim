import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapHeader } from '@/features/program';

/*
 * "Closed shoes and a hat": what an activity asks of the people who
 * come. Written in both languages in the Studio, printed in the
 * activity's details only when written, and carried by the import
 * sheet. It lives in the collection's `equipment` column — the older
 * name — so no migration was needed.
 */
describe('what the activity asks of its people', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('is stored in the equipment column, in both languages', () => {
    const repo = read('src/infrastructure/payload/payload-session.ts');
    expect(repo).toContain('requirements: row.equipment ?? undefined');
    expect(repo).toContain("...(row.equipment ? { requirements: row.equipment } : {})");
    expect(repo).toContain('equipment: input.requirements');
    const action = read('src/app/(studio)/studio/(console)/activity/actions.ts');
    expect(action).toContain("requirements: text(formData.get('requirements'))");
    expect(action).toContain("requirements_en");
  });

  it('is asked in the Studio and printed only when written', () => {
    expect(read('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx')).toContain('name="requirements"');
    const drawer = read('src/features/conference/components/activity-drawer.tsx');
    expect(drawer).toContain('{activity.requirements ? (');
    expect(read('src/features/program/services/program-model.ts')).toContain(
      "...(session.requirements ? { requirements: session.requirements } : {})",
    );
  });

  it('is a column of the import sheet, by the question the sheet asks', () => {
    const mapped = mapHeader(['כותרת', 'האם יש דרישות מיוחדות מהמשתתפים?', 'special requirements en']);
    expect(mapped.requirements).toBe(1);
    expect(mapped.requirementsEn).toBe(2);
  });
});
