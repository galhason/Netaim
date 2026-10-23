import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The agenda looks like the organisation's programme.
 *
 * The public programme on the WordPress site is this same page, ported
 * from it and re-drawn in Netaim green. A participant goes back and
 * forth between the two, and the one they register on used to be navy
 * -- recognisably the same layout in another organisation's colours.
 * The agenda now renames the few values that differ, and nothing else.
 *
 * Two things are guarded: that the agenda really wears the green, and
 * that nothing outside it does. The personal schedule, registration and
 * the speaker pages share the same components and keep their navy.
 */
const read = (path: string): string => readFileSync(path, 'utf8');
const css = read('src/styles/globals.css');
const AGENDA = 'src/app/(frontend)/[locale]/events/[slug]/(experience)/agenda';

/* One rule's body, by its exact selector. */
const block = (selector: string): string => {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `${selector} is declared`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('\n}', start));
};

/* A token's value inside one block, or null. */
const value = (body: string, token: string): string | null =>
  body.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1]?.trim() ?? null;

/* The brand block's hex for a token. */
const brandHex = (token: string): string | null =>
  css.match(new RegExp(`${token}:\\s*(#[0-9a-f]{3,8})`))?.[1] ?? null;

describe('the programme green is part of the brand', () => {
  /*
   * The organisation's own programme page draws its chosen day and its
   * buttons in its green-600, pressed in its green-800. Both are
   * declared once, with the rest of the brand, and nowhere else.
   */
  it('declares the two greens the organisation’s programme uses', () => {
    expect(brandHex('--nt-green-deep')).toBe('#166633');
    expect(brandHex('--nt-green-deeper')).toBe('#0f4a24');
    expect(css).toContain('--nt-green-ring: rgb(22 102 51 / 0.22);');
  });
});

describe('the agenda wears it', () => {
  const scope = block('.experience--programme');

  it('draws its actions, its chosen day and its halo in the programme green', () => {
    expect(value(scope, '--x-primary')).toBe('var(--nt-green-deep)');
    expect(value(scope, '--x-primary-strong')).toBe('var(--nt-green-deeper)');
    /* Sage under an open hour and a chosen state — the approved design's wash. */
    expect(value(scope, '--x-primary-wash')).toBe('var(--nt-sage)');
    expect(value(scope, '--x-ring')).toBe('var(--nt-green-ring)');
    /* The chosen filter chip is the one thing drawn in --x-nav. */
    expect(value(scope, '--x-nav')).toBe('var(--nt-green-deep)');
  });

  it('marks a tour in amber, as the programme does', () => {
    expect(value(scope, '--x-tour')).toBe('var(--nt-amber-ink)');
    expect(value(scope, '--x-tour-wash')).toBe('var(--nt-orange-wash)');
  });

  it('sets its buttons as bold pills', () => {
    expect(value(scope, '--x-r-button')).toBe('var(--x-r-pill)');
    expect(value(scope, '--x-button-weight')).toBe('700');
  });

  it('is the class the agenda — and its loading frame — are drawn in', () => {
    for (const file of [`${AGENDA}/program-experience.tsx`, `${AGENDA}/loading.tsx`]) {
      expect(read(file), file).toContain('className="experience experience--programme');
    }
  });

  /*
   * The header took its wash from navy by name, so the scope could not
   * reach it. It reads the scope's wash now, and the title is in the
   * programme green with the organisation's orange rule beneath.
   */
  it('lets the header follow the scope rather than naming navy', () => {
    const page = read(`${AGENDA}/program-experience.tsx`);
    expect(page).not.toContain('--nt-navy-wash');
    /* The heading in the scope's green, the conference's name in the orange above it. */
    expect(page).toContain('text-[var(--x-primary)] md:text-5xl');
    expect(page).toContain('text-[var(--nt-orange)]');
  });
});

describe('nothing outside the agenda changes', () => {
  const experience = block('.experience');

  it('keeps navy as the action everywhere else', () => {
    expect(value(experience, '--x-primary')).toBe('var(--nt-navy)');
    expect(value(experience, '--x-nav')).toBe('var(--nt-dark)');
  });

  it('keeps the registration button exactly as it was everywhere else', () => {
    expect(value(experience, '--x-r-button')).toBe('var(--x-r-field)');
    expect(value(experience, '--x-button-weight')).toBe('500');
  });

  it('keeps a tour in the interactive blue everywhere else', () => {
    expect(value(experience, '--x-tour')).toBe('var(--x-interactive)');
    expect(value(experience, '--x-tour-wash')).toBe('var(--x-interactive-wash)');
  });

  /*
   * The shared components read the tokens rather than naming a colour
   * or a shape, which is the only reason one scope can restyle them
   * without a second copy of any of them.
   */
  it('has the shared buttons and pills reading the tokens, not a value', () => {
    const kit = read('src/features/conference/ui/kit.tsx');
    const buttons = kit.slice(kit.indexOf('const PRIMARY_BTN'), kit.indexOf('const MUTED_BTN'));
    expect(buttons).not.toContain('rounded-[var(--x-r-field)]');
    expect(buttons).not.toContain(' font-medium ');
    /* Register, waiting list, registered, and the cancel beside it. */
    expect(buttons.match(/rounded-\[var\(--x-r-button\)\]/g)).toHaveLength(4);
    /* The pill reads the kind's colour where a scope paints one, and the platform's wash where none does. */
    expect(kit).toContain("tour: 'bg-[var(--x-kind-tour,var(--x-tour-wash))] text-[var(--x-kind-ink,var(--x-tour))]'");
  });
});

/*
 * The personal schedule is read beside the programme, so it wears the
 * same green: its shell takes the scope, its kind pills take the
 * programme's kind colours, and nothing in it names navy by value.
 */
describe('my schedule wears the programme green too', () => {
  const MINE = 'src/app/(frontend)/[locale]/events/[slug]/my-activities';

  it('is drawn in the programme scope', () => {
    expect(read(`${MINE}/layout.tsx`)).toContain('className="experience experience--programme');
  });

  it('paints the kinds as the agenda does, and names no navy', () => {
    const row = read(`${MINE}/schedule-row.tsx`);
    expect(row).toContain('var(--x-kind-workshop,');
    expect(row).toContain('<Pill tone={KIND_PILL[activity.type]}>');
    for (const file of ['schedule-row.tsx', 'notification-bar.tsx', 'my-schedule-dashboard.tsx']) {
      const source = read(`${MINE}/${file}`);
      expect(source, file).not.toContain('--x-navy');
      expect(source, file).not.toContain('rgba(23,63,115');
    }
  });
});

/*
 * The personal area wears the site's green as well: the Lounge, the
 * profile and a chat thread through `lounge--site`, the notification
 * centre through the programme scope.
 */
describe('the personal area wears the site green', () => {
  const lounge = block('.lounge--site');

  it('draws forest where the Lounge drew navy, and green where it drew bronze', () => {
    expect(value(lounge, '--l-navy')).toBe('var(--nt-forest)');
    expect(value(lounge, '--l-bronze')).toBe('var(--nt-green-deep)');
    expect(value(lounge, '--l-bg')).toBe('var(--nt-programme-bg)');
  });

  it('is worn by the Lounge, the profile, a chat thread and the notification centre', () => {
    for (const [file, cls] of [
      ['src/features/attendee/components/lounge/lounge-view.tsx', 'lounge lounge--site'],
      ['src/app/(frontend)/[locale]/me/profile/page.tsx', 'lounge lounge--site'],
      ['src/app/(frontend)/[locale]/me/chat/[connectionId]/page.tsx', 'lounge lounge--site'],
      ['src/app/(frontend)/[locale]/me/messages/page.tsx', 'experience experience--programme'],
    ] as const) {
      expect(read(file), file).toContain(cls);
    }
  });

  it('tints its veils from the scope, not from navy by value', () => {
    for (const file of ['src/features/attendee/components/lounge/lounge-view.tsx', 'src/app/(frontend)/[locale]/me/page.tsx']) {
      expect(read(file), file).not.toMatch(/(from|via|to)-\[rgba\(11,27,51/);
    }
  });
});

/*
 * The community — the networking room — in the same green: forest under
 * the film, the site's green on every action, gold still the accent.
 */
describe('the networking room wears the site green', () => {
  const community = block('.community--site');

  it('draws the forest where it drew the night, and green where it drew navy', () => {
    expect(value(community, '--n-deep')).toBe('var(--nt-forest)');
    expect(value(community, '--n-veil')).toBe('var(--nt-forest)');
    expect(value(community, '--n-purple')).toBe('var(--nt-green-deep)');
    expect(value(community, '--n-bg')).toBe('var(--nt-programme-bg)');
    /* Gold stays the accent; it is not restated here. */
    expect(value(community, '--n-gold-soft')).toBeNull();
  });

  it('is worn by the room and by its loading sketch', () => {
    expect(read('src/app/(frontend)/[locale]/me/networking/page.tsx')).toContain('community community--site lounge lounge--site');
    expect(read('src/app/(frontend)/[locale]/me/networking/loading.tsx')).toContain('community community--site');
  });

  it('tints the hero from the scope, not from navy by value', () => {
    const hero = read('src/app/(frontend)/[locale]/me/networking/ui/hero.tsx');
    expect(hero).not.toContain('rgba(11,27,51');
    expect(hero).not.toContain('var(--nt-navy)');
    expect(hero).toContain('color-mix(in_srgb,var(--n-veil)_72%,transparent)');
  });
});
