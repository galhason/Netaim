import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eligibleSessions } from '@/event-engine';
import { PLAIN_SESSION_TYPES, SESSION_TYPES, isPlainSession } from '@/features/program/types/session';
import { TYPE_LABELS } from '@/features/program/services/program-model';

/*
 * The opening, the welcome, the closing word: moments the whole
 * conference attends. They used to be filed as breaks, which kept them
 * off the front page and drew them as coffee. A gathering is simply on
 * the schedule like a break — nobody registers, no seats — but it is
 * something the conference leads with.
 */
describe('a gathering on the schedule', () => {
  const read = (file: string): string => readFileSync(file, 'utf8');

  it('is a kind of its own, plain like a break, named in both languages', () => {
    expect(SESSION_TYPES).toContain('gathering');
    expect(PLAIN_SESSION_TYPES).toEqual(['break', 'gathering']);
    expect(isPlainSession('gathering')).toBe(true);
    expect(isPlainSession('break')).toBe(true);
    expect(isPlainSession('talk')).toBe(false);
    expect(isPlainSession(undefined)).toBe(false);
    /* Named a panel since: an opening, a welcome, greetings — led by a host whose name it carries. */
    expect(TYPE_LABELS.gathering).toEqual({ he: 'פאנל', en: 'Panel' });
  });

  it('may lead the front page, where a break never does', () => {
    const chosen = eligibleSessions([
      { sessionType: 'break', startsAt: '2026-11-14T07:00:00.000Z' },
      { sessionType: 'gathering', startsAt: '2026-11-14T07:00:00.000Z' },
      { sessionType: 'talk', startsAt: '2026-11-14T08:00:00.000Z' },
    ]);
    expect(chosen.map((s) => s.sessionType)).toEqual(['gathering', 'talk']);
  });

  it('is on the database, in the Studio, in the sheet, and takes no registration', () => {
    expect(read('src/migrations/20261012_090000_a_gathering_on_the_schedule.ts')).toContain(
      `ALTER TYPE "public"."enum_sessions_session_type" ADD VALUE IF NOT EXISTS 'gathering';`,
    );
    expect(read('src/cms/collections/sessions.ts')).toContain("{ label: 'Gathering', value: 'gathering' }");
    const wizard = read('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx');
    expect(wizard).toContain('gathering: false,');
    expect(read('src/features/program/services/activity-import.ts')).toContain("מפגש: 'gathering',");
    /* No forged request registers for one. */
    const service = read('src/features/program/services/program-service.ts');
    expect(service).toContain('if (isPlainSession(situation.session.sessionType)) {');
  });

  it('names its host, and its host is one of the speakers like anyone else', () => {
    expect(read('src/features/conference/components/activity-band.tsx')).toContain('export const BandHosts');
    /* A panel host is listed among the speakers, whether or not they also lead a seminar. */
    expect(read('src/features/marketing/services/marketing-service.ts')).toContain('speakers.map((speaker) => publicSpeaker(speaker, origin)),');
    expect(read('src/features/cinematic/services/cinematic-service.ts')).not.toContain('withoutPanelHosts');
    expect(read('src/app/(frontend)/[locale]/events/[slug]/(experience)/speakers/page.tsx')).not.toContain(
      "s.sessionType === 'gathering'",
    );
    expect(existsSync('src/event-engine/program/panel-hosts.ts')).toBe(false);
    expect(read('src/features/program/services/activity-import.ts')).toContain("פאנל: 'gathering',");
  });

  it('is drawn as a band with its own picture, never as a tile with a button', () => {
    expect(read('src/features/conference/components/time-block.tsx')).toContain('if (block.isPlain) {');
    expect(read('src/features/conference/components/activity-card.tsx')).toContain('if (isPlainSession(activity.type)) {');
    expect(read('src/features/conference/components/activity-band.tsx')).toContain("type === 'gathering' ? <IconGathering");
    const css = read('src/styles/globals.css');
    expect(css).toContain('--nt-kind-gathering:');
    expect(css).toContain('--x-kind-gathering: var(--nt-kind-gathering);');
    /* The personal schedule and the conflict check treat it like a break. */
    expect(read('src/app/(frontend)/[locale]/events/[slug]/my-activities/timeline.ts')).toContain('isPlainSession(item.activity.type)');
  });
});
