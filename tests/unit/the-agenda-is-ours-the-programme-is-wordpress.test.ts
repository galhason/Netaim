import { readFileSync, readdirSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { isWordPressHref, wordpressHref } from '@/config/wordpress';

/*
 * Two programmes, two owners, and exactly one address each.
 *
 * WordPress owns the public programme and the edge enforces it: every
 * URL ending in `/program` is handed to WordPress, for POST as well as
 * GET. The platform's own programme sat at
 * `/{locale}/events/{slug}/program`, which meant a participant could
 * never open it -- and, worse, that the "register for this activity"
 * form posted its Server Action to an address WordPress answered. Next
 * never ran the action, so nothing was ever registered, and because the
 * edge collapses every locale onto one English page a Hebrew reader was
 * left reading English.
 *
 * The participant's programme is now `/agenda`. These cases hold the
 * two apart: nothing of ours may live under `/program` again, and
 * WordPress's own addresses must stay exactly as they are.
 */
const FRONTEND = 'src/app/(frontend)/[locale]';
const EXPERIENCE = `${FRONTEND}/events/[slug]/(experience)`;
const read = (path: string): string => readFileSync(path, 'utf8');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = posix.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

describe('the participant’s programme lives at /agenda', () => {
  it('is a route, with its page and its actions', () => {
    expect(read(`${EXPERIENCE}/agenda/page.tsx`)).toContain('ProgramExperience');
    expect(read(`${EXPERIENCE}/agenda/actions.ts`)).toContain('registerActivityAction');
  });

  /*
   * The address the action returns to is built from the locale the form
   * submitted, and it must be a route this application actually serves.
   * Both halves matter: the old code built the locale correctly and
   * still sent the reader to an English WordPress page, because the
   * address itself belonged to somebody else.
   */
  it('returns to the agenda of the locale the form came from', () => {
    const source = read(`${EXPERIENCE}/agenda/actions.ts`);
    expect(source).toContain('`/${locale}/events/${slug}/agenda`');
    expect(source).not.toMatch(/\/\$\{slug\}\/program/);
  });

  it('keeps the conflict and the full room as soft notices on that same address', () => {
    const source = read(`${EXPERIENCE}/agenda/actions.ts`);
    expect(source).toContain("'conflict'");
    expect(source).toContain("`${base}?notice=${reason}`");
    /* Leaving returns to the agenda too, not to the old address. */
    expect(source).toContain('leaveActivityAction');
  });

  it('is still read only by someone who joined the conference', () => {
    expect(read(`${EXPERIENCE}/agenda/page.tsx`)).toContain('await requireParticipant(');
  });

  it('has no page left under the old address', () => {
    expect(() => statSync(`${EXPERIENCE}/program`)).toThrow();
  });
});

/*
 * The repository-wide guard. A single link left behind sends a
 * participant to WordPress, in English, and the failure is silent --
 * which is exactly how this one survived.
 */
describe('no platform address ends in /program any more', () => {
  const PLATFORM_PROGRAM = /\/events\/(\$\{[^}]+\}|\*|[a-z0-9-]+)\/program\b/;

  it('has no conference-scoped /program link anywhere in src', () => {
    const offenders = walk('src')
      /*
       * The Studio's own editor is a different tree with a different
       * prefix (`/studio/events/...`), which the edge does not claim.
       */
      .filter((file) => !file.startsWith('src/app/(studio)/'))
      .filter((file) => PLATFORM_PROGRAM.test(read(file)))
      .map((file) => `${file}: ${PLATFORM_PROGRAM.exec(read(file))?.[0]}`);
    expect(offenders).toEqual([]);
  });

  it('points the crawler at the agenda instead', () => {
    const robots = read('src/app/robots.ts');
    expect(robots).toContain("'/he/events/*/agenda'");
    expect(robots).toContain("'/en/events/*/agenda'");
    expect(robots).not.toContain("'/he/events/*/program'");
  });

  /*
   * Sharing an activity used to hand someone a link to a page they
   * could not open. Both builders — the card and the drawer — carry
   * the new address.
   */
  it('shares an activity by an address the platform serves', () => {
    for (const file of [
      'src/features/conference/components/activity-card.tsx',
      'src/features/conference/components/activity-drawer.tsx',
    ]) {
      expect(read(file), file).toContain('/events/${slug}/agenda');
    }
  });
});

describe('WordPress keeps its own programme, untouched', () => {
  it('still answers for the public programme at its own addresses', () => {
    expect(wordpressHref('conferenceProgram', 'en')).toBe('/events/program/');
    expect(wordpressHref('conferenceProgram', 'he')).toBe(
      encodeURI('/he/כנסים/תוכנית/'),
    );
  });

  it('still recognises those addresses as somebody else’s', () => {
    expect(isWordPressHref('/events/program/')).toBe(true);
    expect(isWordPressHref('/he/כנסים/תוכנית/')).toBe(true);
  });

  /* And the conference bar still sends "programme" to WordPress. */
  it('leaves the conference bar pointing at WordPress', () => {
    const bar = read('src/features/conference/components/conference-bar.tsx');
    expect(bar).toContain("wordpressHref('conferenceProgram', locale)");
  });
});

/*
 * The action itself, run. `redirect` throws in Next, so it is mocked to
 * record where it was sent; `selectWorkshop` is mocked to stand for the
 * four outcomes the engine can produce.
 */
const sent: string[] = [];
const outcome: { mode: 'ok' | 'conflict' | 'full' } = { mode: 'ok' };
const selected: { sessionId?: string; locale?: string } = {};

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    sent.push(to);
  },
}));

vi.mock('@/features/program', () => ({
  selectWorkshop: async (sessionId: string, locale: string) => {
    selected.sessionId = sessionId;
    selected.locale = locale;
    if (outcome.mode === 'conflict') throw new Error('conflict');
    if (outcome.mode === 'full') throw new Error('Workshop is full');
    return { id: 'reg-1', sessionId, status: 'confirmed' };
  },
  leaveWorkshop: async () => undefined,
}));

const { registerActivityAction, leaveActivityAction } = await import(
  '@/app/(frontend)/[locale]/events/[slug]/(experience)/agenda/actions'
);

const submit = (locale: string, sessionId = 'session-7'): FormData => {
  const form = new FormData();
  form.set('locale', locale);
  form.set('slug', 'ntaym-2026');
  form.set('sessionId', sessionId);
  return form;
};

const reset = () => {
  sent.length = 0;
  outcome.mode = 'ok';
  selected.sessionId = undefined;
  selected.locale = undefined;
};

describe('registering for an activity, in either language', () => {
  it('registers and comes back to the Hebrew agenda', async () => {
    reset();
    await registerActivityAction(submit('he'));
    expect(selected.sessionId).toBe('session-7');
    expect(selected.locale).toBe('he');
    expect(sent).toEqual(['/he/events/ntaym-2026/agenda']);
  });

  it('registers and comes back to the English agenda', async () => {
    reset();
    await registerActivityAction(submit('en'));
    expect(selected.locale).toBe('en');
    expect(sent).toEqual(['/en/events/ntaym-2026/agenda']);
  });

  it('carries the activity the button belongs to, and no other', async () => {
    reset();
    await registerActivityAction(submit('he', 'session-42'));
    expect(selected.sessionId).toBe('session-42');
  });

  it('says a clash softly, without leaving the language', async () => {
    reset();
    outcome.mode = 'conflict';
    await registerActivityAction(submit('he'));
    expect(sent).toEqual(['/he/events/ntaym-2026/agenda?notice=conflict']);
  });

  it('says a full room softly, without leaving the language', async () => {
    reset();
    outcome.mode = 'full';
    await registerActivityAction(submit('en'));
    expect(sent).toEqual(['/en/events/ntaym-2026/agenda?notice=full']);
  });

  /* A form with no activity on it asks the engine nothing. */
  it('asks nothing when no activity was submitted', async () => {
    reset();
    const form = new FormData();
    form.set('locale', 'he');
    form.set('slug', 'ntaym-2026');
    await registerActivityAction(form);
    expect(selected.sessionId).toBeUndefined();
    expect(sent).toEqual(['/he/events/ntaym-2026/agenda']);
  });

  /* An unknown language falls back rather than building a broken address. */
  it('falls back to Hebrew for a language it does not speak', async () => {
    reset();
    await registerActivityAction(submit('fr'));
    expect(sent).toEqual(['/he/events/ntaym-2026/agenda']);
  });

  it('returns to the same agenda when a place is given up', async () => {
    reset();
    await leaveActivityAction(submit('en'));
    expect(sent).toEqual(['/en/events/ntaym-2026/agenda']);
  });
});

/*
 * The card and the drawer are two ways into the same registration. They
 * are given the same pair of actions by whichever screen renders them,
 * and the button under both is a real form -- never a link, which would
 * navigate instead of registering.
 */
describe('the card and the drawer register the same way', () => {
  it('both take the actions from their screen rather than importing their own', () => {
    for (const file of [
      'src/features/conference/components/activity-card.tsx',
      'src/features/conference/components/activity-drawer.tsx',
    ]) {
      const source = read(file);
      expect(source, file).toContain('registerAction');
      expect(source, file).toContain('leaveAction');
      expect(source, file).not.toContain("from './actions'");
    }
  });

  it('is handed both actions by every screen that shows them', () => {
    for (const screen of [
      `${EXPERIENCE}/agenda/program-experience.tsx`,
      `${FRONTEND}/events/[slug]/my-activities/my-schedule-dashboard.tsx`,
    ]) {
      const source = read(screen).replace(/\s+/g, ' ');
      expect(source, screen).toContain('registerAction={registerActivityAction}');
      expect(source, screen).toContain('leaveAction={leaveActivityAction}');
    }
  });

  it('submits the conference, the language and the activity on every button', () => {
    const kit = read('src/features/conference/ui/kit.tsx').replace(/\s+/g, ' ');
    for (const field of ['name="slug"', 'name="locale"', 'name="sessionId"']) {
      expect(kit, field).toContain(field);
    }
    /* A form, submitted — not an anchor that would navigate away. */
    expect(kit).toContain('<form action={registerAction}');
    expect(kit).toContain('type="submit"');
  });

  /*
   * The personal schedule keeps its own pair, which return to the
   * personal schedule. Two screens, two ways back, one engine.
   */
  it('leaves the personal schedule returning to itself', () => {
    const source = read(`${FRONTEND}/events/[slug]/my-activities/actions.ts`);
    expect(source).toContain('/my-activities');
    /* The route, not the `@/features/program` import beside it. */
    expect(source).not.toMatch(/events\/\$\{slug\}\/program/);
  });
});
