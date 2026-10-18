import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

/*
 * Giving a place back, in the open.
 *
 * A registered reader saw one green "רשומ/ה" and nothing else; the
 * cancel was the same control, revealed only while a pointer hovered —
 * which a phone never does. Now the green mark states the registration
 * and a second button, named for what it does, gives the place back.
 * Where the activity forbids cancelling, the mark stands alone, as
 * before.
 */
vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: () => 'div' }),
  useReducedMotion: () => true,
}));

const { RegistrationButton } = await import('@/features/conference/ui/kit');

const noop = async () => undefined;
const render = (props: Partial<Parameters<typeof RegistrationButton>[0]>) =>
  renderToString(
    <RegistrationButton
      state="registered"
      locale="he"
      slug="ntaym-2026"
      sessionId="7"
      registerAction={noop}
      leaveAction={noop}
      {...props}
    />,
  );

describe('a registered reader', () => {
  it('sees the registration and a button that cancels it, side by side', () => {
    const html = render({});
    expect(html).toContain('רשומ/ה');
    expect(html).toContain('ביטול הרשמה');
    /* The cancel is a real form submit, not a hover state. */
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[^<]*ביטול הרשמה/);
    expect(html).not.toContain('group-hover');
    /* The mark itself is no longer a button. */
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*רשומ\/ה/);
  });

  it('says it in English too', () => {
    const html = render({ locale: 'en' });
    expect(html).toContain('Registered');
    expect(html).toContain('Cancel registration');
  });

  it('is offered no cancel where the activity forbids one', () => {
    const html = render({ canLeave: false });
    expect(html).toContain('רשומ/ה');
    expect(html).not.toContain('ביטול הרשמה');
    expect(html).not.toContain('<form');
  });

  it('carries the activity in the cancel form', () => {
    const html = render({});
    expect(html).toContain('name="sessionId" value="7"');
    expect(html).toContain('name="slug" value="ntaym-2026"');
  });
});

describe('the drawer', () => {
  const drawer = readFileSync('src/features/conference/components/activity-drawer.tsx', 'utf8');

  it('gives the two controls the row, with the availability above them', () => {
    expect(drawer).toContain("activity.registration === 'registered'\n            ? 'flex flex-col gap-3'");
  });

  it('no longer sends the reader to the personal area to cancel', () => {
    expect(drawer).not.toContain('ניתן לבטל את ההרשמה בכל עת מהאזור האישי');
    expect(drawer).toContain('אפשר לבטל כאן או מהלו״ז האישי');
  });
});
