import { readFileSync, readdirSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A conference for the team first.
 *
 * The Studio can publish a conference and keep it to the Netaim team
 * while they check it. A signed-in team member sees every page as it
 * will be, with a small "team preview" reminder; everyone else — a
 * visitor, or a signed-in guest — sees "the conference is being
 * prepared" and, if not signed in, a way to sign in that brings them
 * back. Nothing of the conference reaches them: not its pages, not its
 * name in the marketing API, not a registration of any kind.
 */
const state = {
  closed: null as string | null,
  active: 'summit' as string | null,
  me: null as { id: string; name: string; email: string } | null,
  role: null as string | null,
};

vi.mock('@/features/events', () => ({
  getStaffOnlyConferenceSlug: async () => state.closed,
  getActiveConferenceSlug: async () => state.active,
  getSiteBrand: async () => ({ onLight: '/logo.png', onDark: '/logo-dark.png' }),
}));
vi.mock('@/features/registration', () => ({
  currentParticipant: async () => state.me,
}));
vi.mock('@/features/access', () => ({
  staffRoleOf: async () => state.role,
}));
vi.mock('@/infrastructure', () => ({
  staffOnlyConferenceSlug: async () => state.closed,
  sessionRepository: {
    getById: async (id: string) => ({ id, eventSlug: 'summit', title: 'Workshop', capacity: 10 }),
    countsBySession: async () => ({ confirmed: 0, pending: 0, waitlisted: 0 }),
    listByEvent: async () => [],
  },
  sessionRegistrationRepository: {
    find: async () => null,
    listForParticipant: async () => [],
  },
  notificationOutbox: { enqueue: async () => undefined },
}));
vi.mock('@/features/program/services/session-change-notices', () => ({
  announceSessionCancelled: async () => undefined,
  announceSessionChange: async () => undefined,
}));

const door = await import('@/features/conference/services/conference-door');
const { readReturnPath } = await import('@/shared/utils/return-path');

const guest = () => {
  state.me = null;
  state.role = null;
};
const member = () => {
  state.me = { id: 'p1', name: 'Dana', email: 'dana@example.org' };
  state.role = null;
};
const team = () => {
  state.me = { id: 'p2', name: 'Noa', email: 'noa@example.org' };
  state.role = 'editor';
};

beforeEach(() => {
  state.closed = null;
  state.active = 'summit';
  guest();
});

describe('the door', () => {
  it('is open to everyone, and looks at nobody, while no conference is kept to the team', async () => {
    expect(await door.conferenceDoor('summit')).toEqual({ staffOnly: false, open: true });
  });

  it('lets the team in, and keeps a visitor and a signed-in guest out', async () => {
    state.closed = 'summit';
    expect(await door.conferenceDoor('summit')).toEqual({ staffOnly: true, open: false, viewer: 'guest' });
    member();
    expect(await door.conferenceDoor('summit')).toEqual({ staffOnly: true, open: false, viewer: 'member' });
    team();
    expect(await door.conferenceDoor('summit')).toEqual({ staffOnly: true, open: true, viewer: 'staff' });
  });

  it('closes only the conference it names', async () => {
    state.closed = 'next-year';
    expect((await door.conferenceDoor('summit')).open).toBe(true);
  });

  it('hides the site’s conference from the account pages of anyone outside the team', async () => {
    state.closed = 'summit';
    member();
    expect(await door.visibleSiteConference('he')).toBeNull();
    team();
    expect(await door.visibleSiteConference('he')).toBe('summit');
  });

  it('draws the closed page with a sign-in that comes back to the page asked for', async () => {
    state.closed = 'summit';
    expect(await door.closedConferencePage('summit', 'he', '/agenda')).toEqual({
      locale: 'he',
      viewer: 'guest',
      signInHref: '/he/me?next=%2Fhe%2Fevents%2Fsummit%2Fagenda',
      brand: expect.any(String),
      brandLogo: '/logo.png',
    });
    expect((await door.closedSitePage('summit', 'en'))?.signInHref).toBe('/en/me?next=%2Fen');
    team();
    expect(await door.closedConferencePage('summit', 'he', '/agenda')).toBeNull();
  });
});

describe('the marketing API', () => {
  it('answers for the team only when the forwarded session is the team’s', async () => {
    state.closed = 'summit';
    expect(await door.marketingAudience('team')).toBe('public');
    member();
    expect(await door.marketingAudience('team')).toBe('public');
    team();
    expect(await door.marketingAudience('team')).toBe('team');
    expect(await door.marketingAudience('public')).toBe('public');
    expect(await door.marketingAudience(null)).toBe('public');
  });

  it('does not find a closed conference for the public, and never lets a team answer be kept', async () => {
    state.closed = 'summit';
    expect(await door.marketingMayShow('summit', 'public')).toBe(false);
    expect(await door.marketingMayShow('other', 'public')).toBe(true);
    expect(await door.marketingMayShow('summit', 'team')).toBe(true);
    expect(door.marketingCacheControl('team')).toBe('private, no-store');
    expect(door.marketingCacheControl('public')).toBe('no-store');
  });
});

describe('an activity in a closed conference', () => {
  it('registers nobody outside the team, whatever conference the form names', async () => {
    state.closed = 'summit';
    member();
    const program = await import('@/features/program/services/program-service');
    await expect(program.selectWorkshop('s1', 'he')).rejects.toThrow('Session not found');
    /* The same activity, open: whatever happens next, it is not the door. */
    state.closed = null;
    const open = await program.selectWorkshop('s1', 'he').then(() => 'registered', (error: Error) => error.message);
    expect(open).not.toBe('Session not found');
  });
});

describe('the way back after signing in', () => {
  it('takes a path on this site', () => {
    expect(readReturnPath('/he/events/summit/agenda')).toBe('/he/events/summit/agenda');
    expect(readReturnPath('/he/%D7%9B%D7%A0%D7%A1%D7%99%D7%9D/')).toBe('/he/%D7%9B%D7%A0%D7%A1%D7%99%D7%9D/');
  });

  it('refuses another site, however it is spelled', () => {
    for (const value of ['https://evil.example', '//evil.example/x', '/\\evil.example', 'evil', '', '/a\nb', `/${'x'.repeat(600)}`, undefined, 7]) {
      expect(readReturnPath(value)).toBeNull();
    }
  });
});

const read = (file: string) => readFileSync(file, 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = posix.join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

describe('every door of the conference', () => {
  const root = 'src/app/(frontend)/[locale]/events/[slug]';
  /* Two addresses only redirect to the account's own pages, and show nothing. */
  const redirectsOnly = new Set([`${root}/me/messages/page.tsx`, `${root}/networking/page.tsx`]);

  it('has every page ask before it reads anything, and draw the closed page instead', () => {
    const pages = walk(root).filter((file) => file.endsWith('/page.tsx') && !redirectsOnly.has(file));
    expect(pages.length).toBeGreaterThanOrEqual(12);
    for (const file of pages) {
      const source = read(file);
      expect(source, file).toMatch(/const closed = await closedConferencePage\(slug, \w+, [^)]+\);/);
      expect(source, file).toContain('return <ConferencePreparing {...closed} />;');
    }
    expect(read('src/app/(frontend)/[locale]/page.tsx')).toContain('closedSitePage(slug');
  });

  it('draws no conference chrome for those it keeps out', () => {
    for (const file of [`${root}/(experience)/layout.tsx`, `${root}/my-activities/layout.tsx`]) {
      expect(read(file), file).toContain('if (!(await mayEnterConference(slug))) {\n    return children;');
    }
  });

  it('refuses every registration the public could send', () => {
    expect(read(`${root}/register/actions.ts`).match(/await mayEnterConference\(slug\)/g)?.length).toBe(3);
    expect(read(`${root}/(experience)/gallery/actions.ts`)).toContain('await mayEnterConference(slug)');
    expect(read('src/app/(frontend)/[locale]/me/actions.ts')).toContain('!(await mayEnterConference(slug))');
    expect(read('src/app/(frontend)/[locale]/me/networking/actions.ts')).toContain('!(await mayEnterConference(slug))');
    expect(read('src/features/program/services/program-service.ts')).toContain('(await staffOnlyConferenceSlug()) === situation.session.eventSlug');
  });

  it('keeps the closed conference out of every marketing answer, the sitemap and the account pages', () => {
    const api = 'src/app/(frontend)/api/public/conferences';
    expect(read(`${api}/route.ts`)).toContain('listed.filter((conference) => conference.slug !== closed)');
    for (const file of [`${api}/[slug]/route.ts`, `${api}/[slug]/program/route.ts`, `${api}/[slug]/gallery/route.ts`]) {
      expect(read(file), file).toContain('if (!(await marketingMayShow(slug, audience))) {');
    }
    expect(read('src/app/sitemap.ts')).toContain('events.filter((event) => event.slug !== closed)');
    for (const file of [
      'src/app/(frontend)/api/session/route.ts',
      'src/app/(frontend)/[locale]/me/page.tsx',
      'src/app/(frontend)/[locale]/(site)/layout.tsx',
      'src/features/notifications/components/site-spotlight.tsx',
    ]) {
      expect(read(file), file).not.toContain('getActiveConferenceSlug(');
    }
  });

  it('carries the way back through the sign-in, checked every time', () => {
    const actions = read('src/app/(frontend)/[locale]/me/actions.ts');
    expect(actions.match(/readReturnPath\(formData\.get\('next'\)\)/g)?.length).toBe(2);
    expect(read('src/app/(frontend)/[locale]/me/page.tsx')).toContain('const returnTo = readReturnPath(nextParam);');
  });

  it('adds the door to the site record without closing anything that is open', () => {
    const migration = read('src/migrations/20261007_090000_staff_only_conference.ts');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "staff_only_conference_id" integer');
    expect(migration).not.toMatch(/UPDATE\s+"site"/);
  });
});
