import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A registration that keeps the person.
 *
 * Guests, most of them registering from abroad on the English site,
 * reported that the platform lost them: they entered the code, were told
 * it had expired, filled the form again, were told the address already
 * had an account, and could not find their way in. Reproduced: a second
 * press of "verify" (or a phone re-sending the form) arrived at a code
 * the first press had already spent, and the answer was "expired" — over
 * an account the first press had made and signed in. And a signed-in
 * guest who came back to an address like /en/me?state=wrong landed on a
 * list of conferences with a "cancel registration" button under their
 * own — a button that, for a guest, only ever failed.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

const calls: string[] = [];
const state = {
  checked: { ok: true, pending: { slug: 'summit', locale: 'en', passwordHash: 'h', details: { name: 'A B', email: 'a@b.org', mediaConsent: true } } } as unknown,
  me: null as { id: string; email: string } | null,
  held: null as { status: string } | null,
  hasAccount: false,
  sessionFails: false,
  registerFails: false,
};

class Redirect extends Error {}

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
vi.mock('@/features/access', () => ({ checkRateLimit: async () => ({ allowed: true }) }));
vi.mock('@/shared/cache/publish', () => ({ publishedDirectory: () => undefined }));
vi.mock('@/features/account', () => ({ scheduleConflictFor: async () => null }));
vi.mock('@/features/conference/services/conference-door', () => ({ mayEnterConference: async () => true }));
vi.mock('@/features/registration', () => ({
  emailHasAccount: async () => state.hasAccount,
  applyPasswordHash: async () => {
    calls.push('password');
  },
  beginEmailVerification: async () => ({ ok: true, delivered: true }),
  confirmEmailVerification: async () => state.checked,
  currentParticipant: async () => state.me,
  establishSession: async () => {
    calls.push('session');
    if (state.sessionFails) throw new Error('database unreachable');
  },
  getParticipantRegistration: async () => state.held,
  isLatinName: () => true,
  isStrongPassword: () => true,
  parseRegisterForm: () => ({ success: true, data: {} }),
  passwordHashFor: (value: string) => value,
  registerForEvent: async () => {
    calls.push('register');
    if (state.registerFails) throw new Error('Registration is full');
    return { outcome: 'confirmed', participantId: '7', registrationId: '9' };
  },
  reissueEmailVerification: async () => ({ ok: true, delivered: true }),
  signInWithPassword: async () => ({ ok: true }),
}));

const { confirmCodeAction } = await import('@/app/(frontend)/[locale]/events/[slug]/register/actions');

const submit = async (): Promise<string> => {
  const form = new FormData();
  form.set('slug', 'summit');
  form.set('locale', 'en');
  form.set('email', 'A@B.org');
  form.set('code', '123456');
  try {
    await confirmCodeAction(form);
  } catch (error) {
    if (error instanceof Redirect) return error.message;
    throw error;
  }
  return '';
};

beforeEach(() => {
  calls.length = 0;
  state.checked = { ok: true, pending: { slug: 'summit', locale: 'en', passwordHash: 'h', details: { name: 'A B', email: 'a@b.org', mediaConsent: true } } };
  state.me = null;
  state.held = null;
  state.hasAccount = false;
  state.sessionFails = false;
  state.registerFails = false;
});

describe('the code makes the account once, and says so every time it is asked', () => {
  it('a right code registers, sets the password, then opens the session', async () => {
    expect(await submit()).toBe('/en/events/summit/register?outcome=confirmed');
    expect(calls).toEqual(['register', 'password', 'session']);
  });

  it('a session that fails to open does not unsay the registration', async () => {
    state.sessionFails = true;
    expect(await submit()).toBe('/en/events/summit/register?outcome=confirmed');
    expect(calls).toEqual(['register', 'password', 'session']);
  });

  it('a registration the conference refuses is said as closed, with nothing made', async () => {
    state.registerFails = true;
    expect(await submit()).toBe('/en/events/summit/register?error=closed');
    expect(calls).toEqual(['register']);
  });

  it('the spent code, asked again by the guest it signed in, shows the place held', async () => {
    state.checked = { ok: false, reason: 'expired' };
    state.me = { id: '7', email: 'a@b.org' };
    state.held = { status: 'confirmed' };
    expect(await submit()).toBe('/en/events/summit/register?outcome=confirmed');
    expect(calls).toEqual([]);
  });

  it('the spent code in a browser not signed in: told the registration is complete, and to sign in', async () => {
    state.checked = { ok: false, reason: 'expired' };
    state.hasAccount = true;
    expect(await submit()).toBe('/en/events/summit/register?error=registered');
  });

  it('a code that truly expired, for an address with no account, is still "expired"', async () => {
    state.checked = { ok: false, reason: 'expired' };
    expect(await submit()).toBe('/en/events/summit/register?error=expired');
  });

  it('a wrong code is still a wrong code', async () => {
    state.checked = { ok: false, reason: 'wrong' };
    state.hasAccount = true;
    expect(await submit()).toBe('/en/events/summit/register?verify=A%40B.org&error=wrong');
  });
});

describe('one press, one request', () => {
  it('the verify button holds still while the code is checked', () => {
    const form = read('src/app/(frontend)/[locale]/events/[slug]/register/verify-form.tsx');
    expect(form).toContain('const { pending } = useFormStatus();');
    expect(form).toContain('disabled={!complete || pending}');
    expect(form).toContain('{pending ? pendingLabel : label}');
  });
});

describe('a registered guest is shown their place', () => {
  it('the register page answers a signed-in, registered guest with the place, not a form', () => {
    const page = read('src/app/(frontend)/[locale]/events/[slug]/register/page.tsx');
    expect(page).toContain('await getParticipantRegistration(slug).catch(() => null)');
    expect(page).toContain('if (shownOutcome) {');
  });

  it('and "already registered" is said in both languages, with the way in', () => {
    const page = read('src/app/(frontend)/[locale]/events/[slug]/register/page.tsx');
    expect(page).toContain('ההרשמה עם הכתובת הזו כבר הושלמה.');
    expect(page).toContain('Your registration with this address is already complete.');
    expect(read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx')).toContain(
      "state.error === 'exists' || state.error === 'registered'",
    );
  });
});

describe('the personal area', () => {
  const page = read('src/app/(frontend)/[locale]/me/page.tsx');

  it('is the Lounge and nothing else for someone signed in: every sign-in address, and the old account view, go home', () => {
    expect(page).toContain('if (account && (state || ticket || totpError || link || detail || view)) {');
    expect(page).not.toContain('wantsAccount');
    expect(page).not.toContain('accountHref');
  });

  it('offers no way for a guest to cancel their own registration', () => {
    expect(page).not.toContain('leaveConferenceAction');
    expect(page).not.toContain('joinConferenceAction');
    expect(read('src/app/(frontend)/[locale]/me/actions.ts')).not.toContain('leaveConference');
    expect(read('src/features/account/index.ts')).not.toContain('leaveConference');
  });
});

describe('a signed-in account joins from the registration page', () => {
  const page = read('src/app/(frontend)/[locale]/events/[slug]/register/page.tsx');
  const actions = read('src/app/(frontend)/[locale]/events/[slug]/register/actions.ts');

  it('in one press, with the consent the form would have asked', () => {
    expect(page).toContain('if (participant && open) {');
    expect(page).toContain('<form action={joinThisConferenceAction}');
    expect(page).toContain('name="mediaConsent" required');
    expect(actions).toContain("if (formData.get('mediaConsent') !== 'on') {");
    expect(actions).toContain('await joinConference(slug, locale, { mediaConsent: true })');
  });

  it('and signing in from the registration page comes back to it', () => {
    expect(read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx')).toContain(
      'const signInHref = `/${locale}/me?next=${encodeURIComponent(withBasePath(`/${locale}/events/${slug}/register`))}`;',
    );
  });
});

describe('a sign-in, on the record and paired', () => {
  it('a refusal is logged with its reason and the account id, never the address', () => {
    const identity = read('src/features/registration/services/participant-identity-service.ts');
    for (const reason of ['unknown address', 'blocked', 'no password yet', 'password did not match']) {
      expect(identity).toContain(`reason: '${reason}'`);
    }
    expect(identity).not.toMatch(/signInLog\.warn\([^)]*email/);
  });

  it('the address and the password are paired for a password manager, at registration and at sign-in', () => {
    expect(read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx')).toContain('autoComplete="username"');
    expect(read('src/app/(frontend)/[locale]/me/sign-in-screen.tsx')).toContain('autoComplete="username"');
  });
});
