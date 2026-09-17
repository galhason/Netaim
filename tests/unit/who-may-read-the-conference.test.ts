import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_NAV_LINKS } from '@/features/cinematic';

/*
 * Who may read the conference, and what the chrome says.
 *
 * The programme, the speakers and the community are what a person
 * registers for — they are read by people who joined. Everything that
 * leads *to* joining, and everything the law requires to be reachable,
 * stays open to anyone. Both halves of that sentence are easy to break
 * by accident in opposite directions: a forgotten guard opens the
 * conference, and an over-eager one locks the registration form or the
 * accessibility statement behind a login.
 */
const read = (path: string): string => readFileSync(path, 'utf8');
const FRONTEND = 'src/app/(frontend)/[locale]';

describe('the conference is read by people who joined it', () => {
  const GUARDED = [
    `${FRONTEND}/(experience)/program/page.tsx`,
    `${FRONTEND}/(experience)/speakers/page.tsx`,
    `${FRONTEND}/(experience)/speakers/[id]/page.tsx`,
  ];

  it('asks every guarded page for a participant', () => {
    for (const page of GUARDED) {
      expect(read(page), page).toContain('await requireParticipant(');
    }
  });

  /*
   * A guard on a page that can be prerendered runs once, at build time,
   * as nobody — and the HTML it produced is then served to everyone.
   * This is how the programme stayed open after it was closed.
   */
  it('renders every guarded page per request', () => {
    for (const page of GUARDED) {
      expect(read(page), page).toContain("export const dynamic = 'force-dynamic'");
    }
  });

  it('resolves the session against the database, not a cookie at the edge', () => {
    /*
     * A cookie is something a visitor can type. The middleware cannot
     * reach the database, so the gate lives in the pages.
     */
    const gate = read('src/features/registration/services/participant-gate.ts');
    expect(gate).toContain('currentParticipant');
    expect(read('src/middleware.ts')).not.toContain('participant_session');
  });

  it('sends a visitor to the one screen that can change their answer', () => {
    const gate = read('src/features/registration/services/participant-gate.ts');
    expect(gate).toMatch(/redirect\(`\/\$\{locale\}\/me`\)/);
  });

  /*
   * The open half. A person cannot register for something they may not
   * look at, and the legal pages are reachable from every page by law.
   */
  const OPEN = [
    `${FRONTEND}/page.tsx`,
    `${FRONTEND}/events/[slug]/page.tsx`,
    `${FRONTEND}/events/[slug]/register/page.tsx`,
    `${FRONTEND}/(site)/privacy/page.tsx`,
    `${FRONTEND}/(site)/terms/page.tsx`,
    `${FRONTEND}/(site)/accessibility/page.tsx`,
    `${FRONTEND}/(site)/contact/page.tsx`,
    `${FRONTEND}/(experience)/info/page.tsx`,
    `${FRONTEND}/(site)/layout.tsx`,
    `${FRONTEND}/(experience)/layout.tsx`,
  ];

  it('never puts the gate in front of the way in, or the law', () => {
    for (const page of OPEN) {
      expect(read(page), page).not.toContain('requireParticipant');
    }
  });
});

describe('the navigation bar carries the conference, not the contact form', () => {
  it('has no contact link left in it', () => {
    expect(SITE_NAV_LINKS.some((link) => link.key === 'contact')).toBe(false);
  });

  it('keeps every label on one line', () => {
    const nav = read('src/features/conference/components/experience-nav.tsx');
    /* Two Hebrew words on two lines is what a wrapped nav link looks like. */
    expect(nav).toContain('whitespace-nowrap');
  });

  it('offers the personal day from both chromes', () => {
    for (const component of [
      'src/features/conference/components/experience-nav.tsx',
      'src/features/cinematic/components/cinematic-nav.tsx',
    ]) {
      const source = read(component);
      expect(source, component).toContain('scheduleHref');
      expect(source, component).toContain('My schedule');
    }
  });

  it('draws the personal day only for someone who has one', () => {
    /*
     * On the landing the nav is a cached scene, so the link rides on the
     * content while the decision to draw it reads the viewer — which is
     * render context and never cached.
     */
    const scenes = read('src/scenes/conference-scenes.tsx');
    expect(scenes).toContain('viewer && content.scheduleHref');
  });
});

describe('the footer says who built it', () => {
  it('credits GHX in both footers, in both languages', () => {
    for (const component of [
      'src/features/cinematic/components/conference-footer.tsx',
      'src/features/opening/components/opening-footer.tsx',
    ]) {
      const source = read(component);
      expect(source, component).toContain('GHX.CO.IL');
      expect(source, component).toContain('https://ghx.co.il');
      expect(source, component).toContain('builtBy');
    }
  });

  it('carries contact, now that the nav does not', () => {
    expect(
      read('src/features/cinematic/components/conference-footer.tsx'),
    ).toContain('CINEMATIC_UI.contact[locale]');
  });
});

describe('the Lounge points at the day, and shows what the conference said', () => {
  it('opens my schedule, not the programme', () => {
    const lounge = read(
      'src/features/attendee/components/lounge/lounge-view.tsx',
    );
    expect(lounge).toContain('my-activities');
  });

  it('fills the updates card from the outbox even before an account-level join', () => {
    const page = read(`${FRONTEND}/me/page.tsx`);
    expect(page).toContain('listMyAnnouncements');
    expect(page).toContain('toAttendeeUpdates');
    /* The platform Lounge used to build this card empty and leave it empty. */
    expect(
      read('src/features/attendee/services/platform-lounge.ts'),
    ).not.toMatch(/updates: \[\]/);
  });
});
