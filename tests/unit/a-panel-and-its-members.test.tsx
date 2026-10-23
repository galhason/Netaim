import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PANEL_SESSION_TYPES, takesPanel, type SessionSummary } from '@/features/program/types/session';
import { BandLine, PANEL_WORDS } from '@/features/conference/components/activity-band';
import type { SpeakerVM } from '@/features/conference';
import type { ResolvedSpeaker } from '@/features/speakers/types/speaker';

/*
 * A panel and its members.
 *
 * A panel had one list of people: whoever leads it. A panel that seats
 * others beside its host now names them apart — the host as the panel's
 * moderator, the others as its members, each credited on the line.
 * Members come from the same speaker library, and are not, by being
 * members, on the conference's speakers page. Nothing changes for an
 * activity of any other kind, or for a panel that seats no one.
 */
const read = (file: string): string => readFileSync(file, 'utf8');
/* The markup as text: React marks the seam between two text nodes with an empty comment. */
const render = (node: Parameters<typeof renderToString>[0]): string => renderToString(node).replaceAll('<!-- -->', '');

const person = (id: string, name: string): ResolvedSpeaker =>
  ({ id, name, isRegistered: false, kind: 'external' }) as unknown as ResolvedSpeaker;

const session = (over: Partial<SessionSummary>): SessionSummary => ({
  id: '1',
  title: 'מובילים שינוי בקהילה',
  sessionType: 'gathering',
  startsAt: '2026-10-30T11:00:00.000Z',
  endsAt: '2026-10-30T12:00:00.000Z',
  capacity: null,
  waitlistEnabled: false,
  ...over,
});

const listed: { sessions: SessionSummary[] } = { sessions: [] };

vi.mock('@/features/program/services/program-service', () => ({
  listConferenceActivities: async () =>
    listed.sessions.map((s) => ({
      session: s,
      capacity: { confirmed: 0, waiting: 0, limit: null, available: null, state: 'unlimited' },
    })),
  myWorkshops: async () => [],
  myActivities: async () => null,
}));

const { buildProgramModel } = await import('@/features/program/services/program-model');

const activityOf = async (s: SessionSummary) => {
  listed.sessions = [s];
  const model = await buildProgramModel('summit', 'he', Date.parse('2026-10-01T00:00:00.000Z'));
  return model.activities[0]!;
};

describe('who seats a panel', () => {
  it('only a panel', () => {
    expect(PANEL_SESSION_TYPES).toEqual(['gathering']);
    expect(takesPanel('gathering')).toBe(true);
    for (const type of ['talk', 'workshop', 'keynote', 'break', 'tour', undefined, null]) {
      expect(takesPanel(type)).toBe(false);
    }
  });

  it('is a second list on the activity, from the same speaker library, shown in the CMS for a panel alone', () => {
    const collection = read('src/cms/collections/sessions.ts');
    const field = collection.slice(collection.indexOf("name: 'panelists'"));
    expect(field).toContain("relationTo: 'speakers'");
    expect(field).toContain('hasMany: true');
    expect(field).toContain("condition: (data) => data?.sessionType === 'gathering'");
  });
});

describe('the programme reads a panel', () => {
  it('carries its members beside its moderator', async () => {
    const vm = await activityOf(
      session({ speakers: [person('1', 'ערן ברקוביץ׳')], panelists: [person('2', 'דנה לוי'), person('3', 'יוסי כהן')] }),
    );
    expect(vm.speakers.map((s) => s.name)).toEqual(['ערן ברקוביץ׳']);
    expect(vm.panelists?.map((s) => s.name)).toEqual(['דנה לוי', 'יוסי כהן']);
  });

  it('never credits the moderator twice, nor a member twice', async () => {
    const vm = await activityOf(
      session({
        speakers: [person('1', 'ערן ברקוביץ׳')],
        panelists: [person('1', 'ערן ברקוביץ׳'), person('2', 'דנה לוי'), person('2', 'דנה לוי')],
      }),
    );
    expect(vm.panelists?.map((s) => s.id)).toEqual(['2']);
  });

  it('a panel with no members, or with only its moderator listed again, carries none', async () => {
    expect((await activityOf(session({ speakers: [person('1', 'ערן')] }))).panelists).toBeUndefined();
    expect(
      (await activityOf(session({ speakers: [person('1', 'ערן')], panelists: [person('1', 'ערן')] }))).panelists,
    ).toBeUndefined();
  });
});

describe('the band names them', () => {
  const host: SpeakerVM = { id: '1', name: 'ערן ברקוביץ׳', registered: false, photoUrl: '/m/eran.jpg' };
  const members: SpeakerVM[] = [
    { id: '2', name: 'דנה לוי', registered: false },
    { id: '3', name: 'יוסי כהן', registered: false },
  ];

  it('the moderator as such, and the members on a line of their own', () => {
    const html = render(<BandLine speakers={[host]} panelists={members} place="אולם א׳" locale="he" />);
    expect(html).toContain('ערן ברקוביץ׳');
    expect(html).toContain(`· ${PANEL_WORDS.moderator.he}`);
    expect(html).toContain(`${PANEL_WORDS.members.he}:`);
    expect(html).toContain('דנה לוי');
    expect(html).toContain('יוסי כהן');
    expect(html).toContain('אולם א׳');
  });

  it('in English too', () => {
    const html = render(<BandLine speakers={[host]} panelists={members} locale="en" />);
    expect(html).toContain('Panel moderator');
    expect(html).toContain('Panel members:');
  });

  it('a band without members is exactly what it was — no moderator, no members', () => {
    const html = render(<BandLine speakers={[host]} place="אולם א׳" locale="he" />);
    expect(html).toContain('ערן ברקוביץ׳');
    expect(html).not.toContain(PANEL_WORDS.moderator.he);
    expect(html).not.toContain(PANEL_WORDS.members.he);
  });

  it('nothing to say, nothing drawn', () => {
    expect(render(<BandLine speakers={[]} locale="he" />)).toBe('');
  });

  it('on the programme, a single panel and the personal day alike', () => {
    expect(read('src/features/conference/components/time-block.tsx')).toContain(
      '<BandLine speakers={speakers} panelists={panelists} place={first.place} locale={locale} />',
    );
    expect(read('src/features/conference/components/activity-card.tsx')).toContain(
      '<BandLine speakers={activity.speakers} panelists={activity.panelists} place={activity.place} locale={locale} />',
    );
    const row = read('src/app/(frontend)/[locale]/events/[slug]/my-activities/schedule-row.tsx');
    expect(row).toContain('{PANEL_WORDS.members[locale]}: {activity.panelists.map((s) => s.name).join(\', \')}');
  });
});

describe('the Studio seats them', () => {
  const actions = read('src/app/(studio)/studio/(console)/activity/actions.ts');
  const wizard = read('src/app/(studio)/studio/(console)/activity/activity-wizard.tsx');

  it('from the same picker, under a field of their own, shown for a panel', () => {
    expect(read('src/app/(studio)/studio/(console)/activity/speaker-picker.tsx')).toContain(
      '<input key={s.id} type="hidden" name={fieldName} value={s.id} />',
    );
    expect(wizard).toContain('fieldName="panelistId"');
    expect(wizard).toContain("const panel = takesPanel(type);");
    expect(wizard).toContain("panelModerator: locale === 'he' ? 'מנחה הפאנל' : 'Panel moderator',");
    expect(wizard).toContain("panelMembers: locale === 'he' ? 'חברי הפאנל' : 'Panel members',");
  });

  it('saves them for a panel only, so a panel turned into a talk keeps no hidden members', () => {
    expect(actions).toContain('panelistIds: takesPanel(type)');
    expect(actions).toContain(".getAll('panelistId')");
    expect(actions).toContain('panelistIds: s.panelists?.map((speaker) => speaker.id),');
    const repository = read('src/infrastructure/payload/payload-session.ts');
    expect(repository).toContain('panelists: takesPanel(input.sessionType) ? input.panelistIds?.map((id) => Number(id)) : [],');
    expect(repository).toContain('? { panelists: input.panelistIds.map((id) => Number(id)) }');
    /* A member's account photo is fetched like a lead's. */
    expect(repository).toContain('[row.speakers, row.panelists].flatMap(');
  });
});

describe('a member is not a speaker of the conference, and their card is safe', () => {
  it('the roster that makes the speakers page counts who leads, not who sits on a panel', () => {
    const roster = read('src/infrastructure/payload/payload-speaker-roster.ts');
    expect(roster).toContain('select: { speakers: true },');
    expect(roster).not.toContain('panelists');
  });

  it('the library counts a panel seat as use, so the card is not offered for deletion', () => {
    const speakers = read('src/infrastructure/payload/payload-speaker.ts');
    expect(speakers).toContain('{ or: [{ speakers: { exists: true } }, { panelists: { exists: true } }] },');
    expect(speakers).toContain('...relationIds(session.speakers), ...relationIds(session.panelists)');
  });

  it('merging two cards moves the panel seats too, or they would be deleted with the folded card', () => {
    const speakers = read('src/infrastructure/payload/payload-speaker.ts');
    expect(speakers).toContain("where: { or: [{ speakers: { in: [foldId] } }, { panelists: { in: [foldId] } }] },");
    expect(speakers).toContain('data: { speakers: swap(session.speakers), panelists: swap(session.panelists) },');
  });
});
