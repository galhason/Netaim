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
    expect(value(scope, '--x-primary-wash')).toBe('var(--nt-green-wash)');
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
    expect(page).toContain('var(--x-primary-wash)_0%');
    expect(page).toContain('text-[var(--x-primary)] md:text-5xl');
    expect(page).toContain('bg-[var(--nt-orange)]');
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
    expect(buttons.match(/rounded-\[var\(--x-r-button\)\]/g)).toHaveLength(3);
    expect(kit).toContain("tour: 'bg-[var(--x-tour-wash)] text-[var(--x-tour)]'");
  });
});
