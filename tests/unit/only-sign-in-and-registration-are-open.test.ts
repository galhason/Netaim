import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wordpressHref } from '@/config/wordpress';
import { readReturnPath } from '@/shared/utils/return-path';

/*
 * Only the way in is open.
 *
 * A visitor who has not signed in and opens any page of the conference
 * — the landing, the programme, a speaker, the gallery — is sent to the
 * sign-in screen, told why, and brought back to that page once they are
 * in. The sign-in screen and the registration form wear the site's
 * green, as the programme does.
 */
const signedIn = { current: null as { id: string; name: string; email: string } | null };

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('@/features/registration/services/participant-identity-service', () => ({
  currentParticipant: async () => signedIn.current,
}));

const { requireParticipant } = await import('@/features/registration/services/participant-gate');
const { signInHref } = await import('@/features/registration/utils/sign-in-href');

const read = (path: string): string => readFileSync(path, 'utf8');

describe('the gate', () => {
  beforeEach(() => {
    signedIn.current = null;
  });

  it('sends a visitor to sign in, naming the page to come back to', async () => {
    await expect(requireParticipant('he', '/he/events/ntaym-2026/agenda')).rejects.toThrow(
      'REDIRECT /he/me?next=%2Fhe%2Fevents%2Fntaym-2026%2Fagenda',
    );
    await expect(requireParticipant('en', '/en/events/ntaym-2026')).rejects.toThrow(
      'REDIRECT /en/me?next=%2Fen%2Fevents%2Fntaym-2026',
    );
  });

  it('lets a signed-in participant through, and hands them back', async () => {
    signedIn.current = { id: '7', name: 'Dana', email: 'dana@example.org' };
    await expect(requireParticipant('he', '/he/events/ntaym-2026')).resolves.toEqual(signedIn.current);
  });

  it('names a page the sign-in screen accepts as a way back', () => {
    const next = new URLSearchParams(signInHref('he', '/he/events/ntaym-2026/speakers/12').split('?')[1]).get('next');
    expect(readReturnPath(next)).toBe('/he/events/ntaym-2026/speakers/12');
  });
});

describe('the sign-in screen', () => {
  const screen = 'src/app/(frontend)/[locale]/me/sign-in-screen.tsx';

  it('says why, when a page of the conference sent the person here', () => {
    const source = read(screen);
    expect(source).toContain('{next && !note ? (');
    expect(source).toContain('הכנס פתוח למשתתפים רשומים.');
    expect(source).toContain('The conference is open to registered participants.');
  });

  it('carries the page to come back to through the form', () => {
    expect(read(screen)).toContain('{next ? <input type="hidden" name="next" value={next} /> : null}');
  });
});

describe('the way in wears the site green', () => {
  it('draws sign-in and registration in the programme scope', () => {
    expect(read('src/features/registration/components/onboarding-shell.tsx')).toContain(
      'className="experience experience--programme flex min-h-dvh flex-col',
    );
    expect(read('src/features/conference/components/conference-preparing.tsx')).toContain('experience experience--programme');
    expect(read('src/features/registration/components/media-consent-dialog.tsx')).toContain('experience experience--programme');
  });

  it('greens the keyboard focus too, inside the scope', () => {
    const css = read('src/styles/globals.css');
    const scope = css.slice(css.indexOf('\n.experience--programme {'), css.indexOf('\n}', css.indexOf('\n.experience--programme {')));
    expect(scope).toContain('--color-focus-ring: var(--nt-green-deep);');
  });

  it('casts no blue shadow under a button', () => {
    for (const file of [
      'src/features/registration/components/onboarding-shell.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/register/verify-form.tsx',
    ]) {
      const source = read(file);
      expect(source, file).not.toContain('42 144 200');
      expect(source, file).toContain('color-mix(in_srgb,var(--x-primary)_28%,transparent)');
    }
  });

  /*
   * Read from the source, not rendered: the frame brings the whole
   * cinematic module with it, and loading that inside a test is what
   * ran it past the time limit on a busy machine.
   */
  it('leads home to the organisation’s site, which is open', () => {
    const shell = read('src/features/registration/components/onboarding-shell.tsx');
    expect(shell.match(/href=\{wordpressHref\('home', locale\)\}/g)).toHaveLength(2);
    expect(shell).not.toContain('href={`/${locale}`}');
    expect(wordpressHref('home', 'he')).toBe('/he/');
    expect(wordpressHref('home', 'en')).toBe('/');
  });
});
