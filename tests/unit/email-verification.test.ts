import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * Registration proves the address before it creates the account.
 *
 * The rule this file guards is one sentence: nothing is written to the
 * participants table until a code sent to the address comes back. It is
 * worth guarding because every part of it is easy to undo by accident —
 * a well-meaning refactor that creates the account first and verifies
 * afterwards would pass every other test in this suite and quietly
 * return the platform to registering addresses that do not exist.
 *
 * The behaviour itself was proved against a running server: a form
 * submitted, a real message caught off SMTP, the six digits in it typed
 * back, and the participants table checked before and after. These
 * cases hold the shape of what was proved.
 */
const read = (path: string): string => readFileSync(path, 'utf8');

const service = read(
  'src/features/registration/services/email-verification-service.ts',
);
const actions = read(
  'src/app/(frontend)/[locale]/events/[slug]/register/actions.ts',
);
const collection = read('src/cms/collections/email-verifications.ts');

describe('no account exists before the address answers', () => {
  it('creates the participant only in the code step', () => {
    /*
     * The whole guarantee, as a position in a file: `registerForEvent`
     * must live in the action that receives a code, and nowhere in the
     * action that receives the form.
     */
    const request = actions.slice(
      actions.indexOf('export const requestCodeAction'),
      actions.indexOf('export const resendCodeAction'),
    );
    const confirm = actions.slice(actions.indexOf('export const confirmCodeAction'));
    expect(
      request.includes('registerForEvent'),
      'the form step must not create an account — that is the entire point',
    ).toBe(false);
    expect(confirm.includes('registerForEvent')).toBe(true);
    expect(confirm.includes('confirmEmailVerification')).toBe(true);
  });

  it('validates everything before spending someone’s inbox', () => {
    /*
     * A person sent a code and then told their password was too weak
     * has been made to wait for nothing. Every check that can fail runs
     * before the message goes out.
     */
    const request = actions.slice(
      actions.indexOf('export const requestCodeAction'),
      actions.indexOf('export const resendCodeAction'),
    );
    const at = (needle: string) => request.indexOf(needle);
    expect(at('scheduleConflictFor')).toBeGreaterThan(-1);
    expect(at('isStrongPassword')).toBeGreaterThan(-1);
    expect(at('parseRegisterForm')).toBeGreaterThan(-1);
    expect(
      at('beginEmailVerification') > at('isStrongPassword') &&
        at('beginEmailVerification') > at('parseRegisterForm'),
      'the code is sent last, after every reason to refuse has been checked',
    ).toBe(true);
  });

  it('never carries the plain password back to the browser', () => {
    /*
     * The details survive the two steps server-side. Round-tripping them
     * through hidden inputs would put a password in the page source of
     * a form the person is still looking at.
     */
    expect(
      actions.includes('passwordHashFor('),
      'the password is hashed on the way into the pending record',
    ).toBe(true);
    const page = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
    );
    const verifyStep = page.slice(
      page.indexOf('if (verify && open)'),
      page.indexOf("if (outcome && isOutcome(outcome))"),
    );
    expect(
      /name="password"/.test(verifyStep),
      'the code screen must not carry the password in a field of any kind',
    ).toBe(false);
  });
});

describe('what the pending record may hold', () => {
  it('stores the address and the code as hashes, never in clear', () => {
    expect(service.includes("createHash('sha256')")).toBe(true);
    expect(
      /emailKey = \(email: string\)[\s\S]{0,200}digest\('hex'\)/.test(service),
      'the table must not become a list of people who considered attending',
    ).toBe(true);
    expect(
      service.includes('code:${code}:${email'),
      'the code hash is bound to the address, so it cannot be replayed elsewhere',
    ).toBe(true);
  });

  it('binds both hashes to the deployment secret', () => {
    expect(service.includes('REGISTRATION_LINK_SECRET')).toBe(true);
    expect(service.includes('PAYLOAD_SECRET')).toBe(true);
  });

  it('generates the code from a source fit for a credential', () => {
    expect(
      service.includes('randomInt('),
      'Math.random is predictable, and for fifteen minutes this is a credential',
    ).toBe(true);
    /* The call, not the word — the comment above it names Math.random too. */
    expect(service.includes('Math.random(')).toBe(false);
  });

  it('compares the answer without leaking it through timing', () => {
    expect(service.includes('timingSafeEqual')).toBe(true);
  });

  it('expires, and is swept as the store is used', () => {
    expect(/CODE_TTL_MS = 15 \* 60 \* 1000/.test(service)).toBe(true);
    expect(service.includes('.sweep(')).toBe(true);
    expect(collection.includes('expiresAt')).toBe(true);
  });

  it('is invisible in the CMS and reachable only by the platform', () => {
    expect(collection.includes('platformOnlyAccess')).toBe(true);
    expect(collection.includes('hidden: true')).toBe(true);
  });
});

describe('guessing at six digits costs something', () => {
  it('declares a ceiling for asking and for answering', () => {
    const policy = readFileSync(
      'src/permission-engine/throttle/rate-limit.ts',
      'utf8',
    );
    expect(policy.includes("'email-verification'")).toBe(true);
    expect(policy.includes("'email-code'")).toBe(true);
  });

  it('destroys the pending registration rather than locking it', () => {
    /*
     * A locked row is a thing to keep attacking. A row that is gone
     * means starting again from the form, which is the cost a guesser
     * should pay and a person who mistyped rarely reaches.
     */
    expect(/MAX_ATTEMPTS = 5/.test(service)).toBe(true);
    expect(
      /attempts >= MAX_ATTEMPTS[\s\S]{0,400}discard/.test(service),
    ).toBe(true);
  });

  it('spends the code on first use', () => {
    expect(
      /ok: true[\s\S]{0,80}pending: held.pending/.test(service) &&
        /discard\(key\)[\s\S]{0,400}return \{ ok: true/.test(service),
      'one code must create at most one account',
    ).toBe(true);
  });
});

describe('a mistyped address is recoverable without retyping the form', () => {
  it('moves the held details to the corrected address', () => {
    expect(service.includes('reissueEmailVerification')).toBe(true);
    expect(
      /details: \{ \.\.\.held.pending.details, email: toEmail \}/.test(service),
    ).toBe(true);
    expect(
      /changed[\s\S]{0,200}discard\(emailKey\(fromEmail\)\)/.test(service),
      'the old address keeps no claim on the registration',
    ).toBe(true);
  });

  it('never returns what is held to the browser', () => {
    /*
     * The resend takes an address and gives back nothing but an
     * outcome. Returning the pending details would let anyone read a
     * stranger's half-finished registration by guessing their address.
     */
    const reissue = service.slice(service.indexOf('reissueEmailVerification'));
    expect(reissue.includes('return issued;')).toBe(true);
    expect(/return \{[^}]*pending[^}]*\}/.test(reissue)).toBe(false);
  });
});

describe('the code does not go through the retry queue', () => {
  it('is delivered straight to the channel', () => {
    /*
     * Everything else the platform sends is recorded and retried. A code
     * is worthless after fifteen minutes, so a retry an hour later would
     * deliver confusion — and the outbox holds no addresses by design,
     * resolving them from a participant who does not exist yet.
     */
    expect(service.includes('emailChannel')).toBe(true);
    expect(service.includes('sendNotification')).toBe(false);
  });

  it('tells the page whether the message actually went out', () => {
    expect(service.includes('delivered: status === \'sent\'')).toBe(true);
    const page = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
    );
    expect(
      page.includes('undelivered'),
      'a screen waiting for an email that will never arrive is the worst outcome',
    ).toBe(true);
  });

  it('shows the code outside production only', () => {
    expect(
      /NODE_ENV === 'production' \? \{\} : \{ devCode: code \}/.test(service),
      'the guard must be the environment, not a flag someone can set',
    ).toBe(true);
  });
});

describe('a refusal costs one field, not the whole form', () => {
  const form = read(
    'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx',
  );

  it('returns the refusal instead of redirecting away from it', () => {
    /*
     * A redirect is a new page, and a new page is an empty form — which
     * is how a password one character short used to cost somebody the
     * six fields above it. Every refusal in the form step returns.
     */
    const request = actions.slice(
      actions.indexOf('export const requestCodeAction'),
      actions.indexOf('export const resendCodeAction'),
    );
    expect(request.includes('const refuse =')).toBe(true);
    for (const reason of [
      "refuse('conflict'",
      "refuse('weakPassword')",
      "refuse('passwordMismatch')",
      "refuse('invalid')",
      "refuse('tooManyCodes')",
    ]) {
      expect(request.includes(reason), `${reason} must return, not redirect`).toBe(
        true,
      );
    }
    /* The one redirect left in the step is the success path. */
    expect((request.match(/redirect\(/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('hands back everything typed except the passwords', () => {
    const request = actions.slice(
      actions.indexOf('export const requestCodeAction'),
      actions.indexOf('export const resendCodeAction'),
    );
    expect(request.includes('keptFrom(formData)')).toBe(true);
    for (const field of [
      'firstName',
      'lastName',
      'email',
      'phone',
      'organization',
      'role',
      'dietary',
      'accessibility',
      'directory',
    ]) {
      expect(
        actions.includes(`${field}: `),
        `${field} must survive a refusal`,
      ).toBe(true);
    }
    const kept = actions.slice(
      actions.indexOf('const keptFrom'),
      actions.indexOf('export const requestCodeAction'),
    );
    expect(
      /password/i.test(kept),
      'a password echoed back lives in the page source and the back/forward cache',
    ).toBe(false);
  });

  it('draws the fields from what came back', () => {
    /*
     * The form is stateful now — two steps inside one submission — so
     * the returned values seed that state rather than each input's
     * `defaultValue`. Either way, what the server handed back is what
     * the person sees.
     */
    expect(form.includes('...(state.values ?? {})')).toBe(true);
    for (const field of [
      'values.firstName',
      'values.lastName',
      'values.email',
      'values.phone',
      'values.organization',
      'values.role',
      'values.dietary',
      'values.directory',
    ]) {
      expect(
        form.includes(`value={${field}}`) || form.includes(`checked={${field}}`),
        `${field} must be drawn from the kept values`,
      ).toBe(true);
    }
  });

  it('leaves both password fields empty on the way back', () => {
    const passwordBlock = form.slice(
      form.indexOf('id="reg-password"'),
      form.indexOf('id="reg-password-hint"'),
    );
    expect(
      /defaultValue/.test(passwordBlock),
      'neither password field may be pre-filled from a previous attempt',
    ).toBe(false);
  });

  it('adds no JavaScript requirement of its own', () => {
    /*
     * `useActionState` was chosen over a submit handler precisely
     * because it degrades: the form posts natively and React emits a
     * hidden field so the server can pick the action up without a
     * script. A handler-driven form would have made the script
     * mandatory and there would be no way back.
     *
     * Measured honestly, though: this route already needs the script.
     * It is dynamic with a `loading.tsx` beside it, so Next streams the
     * page inside a hidden block that an inline script reveals — with
     * scripting fully off, `/program` renders 156 characters and this
     * page renders 23, and the untouched sign-in form beside this one
     * is just as invisible. That predates this component and is a
     * property of the route, not of the form. What these cases hold is
     * the part that is in the form's gift.
     */
    expect(form.includes('useActionState')).toBe(true);
    expect(form.includes('<form action={action}')).toBe(true);
    expect(
      /onSubmit=/.test(form),
      'a submit handler would make the script a requirement',
    ).toBe(false);
    /*
     * The one `preventDefault` in the form is a click guard on the
     * submit button that fires only when a field on screen is empty, so
     * the message can sit under the field. A valid submission is never
     * intercepted.
     */
    expect((form.match(/preventDefault/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(form.includes('const guardSubmit')).toBe(true);
  });
});

describe('the password is chosen twice', () => {
  it('asks for a confirmation field', () => {
    const form = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx',
    );
    expect(form.includes('name="passwordConfirm"')).toBe(true);
    expect(form.includes("autoComplete=\"new-password\"")).toBe(true);
  });

  it('refuses a mismatch, and says which problem it is', () => {
    const request = actions.slice(
      actions.indexOf('export const requestCodeAction'),
      actions.indexOf('export const resendCodeAction'),
    );
    expect(request.includes('password !== confirmation')).toBe(true);
    /*
     * Order matters: someone who typed the same weak password twice is
     * told what is wrong with the password, not sent to fix a mismatch
     * that does not exist.
     */
    expect(
      request.indexOf('isStrongPassword') <
        request.indexOf('password !== confirmation'),
    ).toBe(true);
  });

  it('has wording for the mismatch in both languages', () => {
    const page = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
    );
    expect(page.includes('passwordMismatch')).toBe(true);
    expect(page.includes('do not match')).toBe(true);
  });
});

describe('there is one way to become a participant', () => {
  /*
   * An account used to be obtainable two ways: the conference's form,
   * and a plain "open an account" box beside the sign-in on /me. The
   * second asked for a name, an address and a password and wrote a full
   * account — no phone, no organisation, no section 11 notice, no
   * directory question, and, once the conference form began proving
   * addresses, no proof of the address either.
   *
   * It is removed rather than hidden. A door that is merely unlinked is
   * still a door, and these cases are what keeps it shut.
   */
  const identity = read(
    'src/features/registration/services/participant-identity-service.ts',
  );
  const mePage = read('src/app/(frontend)/[locale]/me/page.tsx');
  const meActions = read('src/app/(frontend)/[locale]/me/actions.ts');

  it('no longer has a function that mints an account on its own', () => {
    expect(
      /export const openAccountWithPassword/.test(identity),
      'a function that creates an account without a verified address must not exist',
    ).toBe(false);
    expect(
      read('src/features/registration/index.ts').includes(
        'openAccountWithPassword',
      ),
      'and it must not be exported from the feature either',
    ).toBe(false);
  });

  it('no longer has an action behind the retired form', () => {
    expect(/export const openAccountAction/.test(meActions)).toBe(false);
  });

  it('no longer renders the second form', () => {
    expect(mePage.includes("view === 'open' ?")).toBe(false);
    expect(mePage.includes('openAccountAction')).toBe(false);
    expect(
      mePage.includes('ui.openAccount'),
      'the copy for the retired form should be gone with it',
    ).toBe(false);
  });

  it('sends an old link to the conference form instead of nowhere', () => {
    expect(mePage.includes("view === 'open' && registerHref")).toBe(true);
    expect(mePage.includes('/events/${openSlug}/register')).toBe(true);
  });

  it('points the signed-out visitor at the conference', () => {
    expect(mePage.includes('registerHref')).toBe(true);
    expect(
      mePage.includes('?view=open'),
      'nothing may link to the retired form any more',
    ).toBe(false);
  });
});

describe('recovery recovers, and does not register', () => {
  const meActions = read('src/app/(frontend)/[locale]/me/actions.ts');

  it('never hands a name to the link issuer', () => {
    /*
     * `requestAccountLink` opens an account when given a name, and this
     * action used to read one out of the form. The form never showed
     * that field — but a form is not a gate, and posting `name` beside
     * the address created a full account with none of the questions the
     * conference asks.
     */
    const act = meActions.slice(
      meActions.indexOf('export const requestAccountLinkAction'),
      meActions.indexOf('export const joinConferenceAction'),
    );
    expect(act.includes('requestAccountLink(email, null, locale)')).toBe(true);
    expect(
      /formData\.get\('name'\)/.test(act),
      'reading a name here is what made recovery a second registration',
    ).toBe(false);
  });

  it('answers the same whether or not the address has an account', () => {
    const act = meActions.slice(
      meActions.indexOf('export const requestAccountLinkAction'),
      meActions.indexOf('export const joinConferenceAction'),
    );
    expect(
      /reason === 'needName'[\s\S]{0,120}state=sent/.test(act),
      'a different answer for an unknown address turns this into an account-existence oracle',
    ).toBe(true);
  });

  it('offers recovery where the sign-in box is', () => {
    const page = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
    );
    expect(page.includes('?view=reset')).toBe(true);
    expect(page.includes('שכחתי סיסמה')).toBe(true);
  });
});

describe('a click on "continue" can never submit the form', () => {
  it('keeps the continue and submit buttons as two distinct elements', () => {
    /*
     * React patches a <button> in place when both steps render one in
     * the same slot — so the button clicked as type="button" turned
     * into type="submit" during the click and the browser submitted
     * with step two empty. Only a real mouse click showed it. The keys
     * are what make them two elements.
     */
    const form = read(
      'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx',
    );
    expect(form.includes('key="continue"')).toBe(true);
    expect(form.includes('key="submit"')).toBe(true);
    const cont = form.slice(form.indexOf('key="continue"'), form.indexOf('key="continue"') + 120);
    expect(/type="button"/.test(cont)).toBe(true);
  });
});

describe('the registration page can be read in the other language', () => {
  const page = read(
    'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
  );
  const shell = read('src/features/registration/components/onboarding-shell.tsx');

  it('carries a language switch in the minimal header', () => {
    /*
     * The register page has its own header — no site navigation, so
     * no site language switch. A visitor who lands on the Hebrew page
     * from an English invitation needs a way out that they can read
     * without reading Hebrew: both names, each in its own script.
     */
    expect(shell.includes("language: { he: 'שפה', en: 'Language' }")).toBe(true);
    expect(shell.includes("{option === 'he' ? 'עב' : 'EN'}")).toBe(true);
    expect(shell.includes('aria-current="true"')).toBe(true);
    expect(shell.includes('hrefLang={option}')).toBe(true);
    expect(page.includes('OnboardingLayout')).toBe(true);
  });

  it('switches to the same screen, not to the start', () => {
    /*
     * Half-way through verification the switch must keep `?verify=`
     * and the address — otherwise switching language costs the code.
     */
    expect(page.includes('const switchHref = `/${other}/events/${slug}/register${query')).toBe(true);
    const carried = page.slice(page.indexOf('const carried = new URLSearchParams'), page.indexOf('const query = carried.toString()'));
    for (const key of ['verify', 'outcome', 'error', 'with: conflictWith', 'resent', 'undelivered', 'devCode']) {
      expect(carried.includes(key), `${key} is carried across the switch`).toBe(true);
    }
    /* The one layout on the page hands the switch to the frame. */
    expect(page.includes('switchHref={switchHref}')).toBe(true);
  });
});

describe('sign-in and registration are one place seen from two sides', () => {
  const shell = read('src/features/registration/components/onboarding-shell.tsx');
  const signIn = read('src/app/(frontend)/[locale]/me/sign-in-screen.tsx');
  const register = read(
    'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx',
  );
  const mePage = read('src/app/(frontend)/[locale]/me/page.tsx');

  it('draws both screens from the same frame, panel and language switch', () => {
    expect(shell.includes("aria-label={pickCopy(locale, ONBOARDING_COPY.language)}")).toBe(true);
    for (const file of [signIn, register]) {
      expect(file.includes('OnboardingLayout')).toBe(true);
      expect(file.includes('PromoPanel')).toBe(true);
      expect(file.includes("from '@/features/registration'")).toBe(true);
    }
    /* Neither page keeps a private copy of the header any more. */
    expect(register.includes('const Frame =')).toBe(false);
    expect(signIn.includes('<header')).toBe(false);
  });

  it('keeps the three doors and the actions behind them', () => {
    expect(signIn.includes('action={signInAction}')).toBe(true);
    expect(signIn.includes('action={requestAccountLinkAction}')).toBe(true);
    expect(signIn.includes('action={totpSignInAction}')).toBe(true);
    for (const field of ['name="email"', 'name="password"', 'name="ticket"', 'name="code"', 'name="locale"']) {
      expect(signIn.includes(field), `${field} still posts`).toBe(true);
    }
    expect(signIn.includes('?view=reset')).toBe(true);
  });

  it('still speaks every outcome the actions can announce', () => {
    for (const state of [
      'wrong', 'blocked', 'noPassword', 'locked', 'exists', 'weakPassword',
      'missing', 'invalid', 'needName', 'tooMany', 'sent', 'failed',
    ]) {
      expect(signIn.includes(`case '${state}':`), `?state=${state} has words`).toBe(true);
    }
    expect(signIn.includes("totpError === 'wrong'")).toBe(true);
  });

  it('carries the moment across the language switch', () => {
    const carried = mePage.slice(
      mePage.indexOf('const carried = new URLSearchParams'),
      mePage.indexOf('const switchHref = `/${other}/me'),
    );
    for (const key of ['view', 'state', 'ticket', 'totpError', 'link', 'detail']) {
      expect(carried.includes(key), `${key} survives the switch`).toBe(true);
    }
  });
});

describe('a door that can be entered is visibly leavable', () => {
  const action = read('src/features/account/actions/sign-out.ts');
  const nav = read('src/features/cinematic/components/cinematic-nav.tsx');
  const profile = read('src/app/(frontend)/[locale]/me/profile/page.tsx');
  const meActions = read('src/app/(frontend)/[locale]/me/actions.ts');

  it('has one sign-out action, shared by every door out', () => {
    expect(action.startsWith("'use server'")).toBe(true);
    expect(action.includes('export const signOutAction')).toBe(true);
    expect(action.includes('await clearSession()')).toBe(true);
    expect(meActions.includes('export const signOutAction'), 'no second sign-out action').toBe(false);
    const mePage = read('src/app/(frontend)/[locale]/me/page.tsx');
    expect(mePage.includes('action={signOutAction}')).toBe(true);
    expect(/signOutAction,\n\} from '@\/features\/account'/.test(mePage), 'the account screen posts to the shared action').toBe(true);
  });

  it('offers sign-out in the site navigation whenever someone is signed in', () => {
    const signedIn = nav.slice(nav.indexOf('{viewer ? (\n            /*\n             * The way out'), nav.indexOf(') : ('));
    expect(signedIn.includes('action={signOutAction}')).toBe(true);
    expect(signedIn.includes('name="locale"')).toBe(true);
    expect(signedIn.includes('aria-label={CINEMATIC_UI.signOut[locale]}'), 'the icon-only phone form has a name').toBe(true);
  });

  it('offers sign-out in the conference bar too — both bars, one action', () => {
    const experienceNav = read('src/features/conference/components/experience-nav.tsx');
    expect(experienceNav.includes("from '@/features/account/actions/sign-out'")).toBe(true);
    /* In the bar beside the name, and again in words inside the phone menu. */
    expect(experienceNav.split('action={signOutAction}').length - 1).toBe(2);
    expect(experienceNav.includes('aria-label={signOutLabel}')).toBe(true);
  });

  it('offers sign-out on the profile, here and everywhere', () => {
    expect(profile.split('action={signOutAction}').length - 1).toBe(2);
    expect(profile.includes('action={signOutEverywhereAction}')).toBe(true);
    /* "Everywhere" revokes every session the account holds before ending this one. */
    const everywhere = action.slice(action.indexOf('signOutEverywhereAction'));
    expect(everywhere.indexOf('clearAllSessions(me.id)')).toBeLessThan(everywhere.indexOf('await clearSession()'));
  });
});

describe('the Lounge carries the site navigation once', () => {
  const lounge = read('src/features/attendee/components/lounge/lounge-view.tsx');

  it('has no second language switch or bell under the bar', () => {
    /*
     * The hero strip used to end with its own "EN" link and a bell —
     * a second row of controls right under the site bar that has both.
     * One bar, one set of controls.
     */
    expect(lounge.includes("{locale === 'he' ? 'EN' : 'עב'}")).toBe(false);
    const strip = lounge.slice(lounge.indexOf('{content.welcome.venueLine}'), lounge.indexOf('{LOUNGE_UI.welcomeBack[locale]}'));
    expect(strip.includes('NavIcon'), 'no icon controls between the venue line and the greeting').toBe(false);
  });

  it('is handed the site bar on both Lounge routes', () => {
    for (const file of [
      'src/app/(frontend)/[locale]/me/page.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/me/page.tsx',
    ]) {
      const page = read(file);
      expect(page.includes('siteNav={'), `${file} passes siteNav`).toBe(true);
      expect(page.includes('<CinematicNav'), `${file} renders the one bar`).toBe(true);
    }
  });
});

describe('PRD §5.2 — mutual disclosure once a connection is accepted', () => {
  it('opens phone and email by default, so acceptance reveals them to both sides', () => {
    const collection = read('src/cms/collections/participants.ts');
    expect(collection.includes("{ name: 'phone', type: 'checkbox', defaultValue: true }")).toBe(true);
    expect(collection.includes("{ name: 'email', type: 'checkbox', defaultValue: true }")).toBe(true);
    const repo = read('src/infrastructure/payload/payload-participant-session.ts');
    expect(repo.includes('phone: row.contactPrefs?.phone !== false')).toBe(true);
    expect(repo.includes('email: row.contactPrefs?.email !== false')).toBe(true);
    const profile = read('src/app/(frontend)/[locale]/me/profile/page.tsx');
    expect(profile.includes('prefs.phone === true'), 'the profile must not read the old opt-in default').toBe(false);
    expect(profile.includes('prefs.email === true')).toBe(false);
  });

  it('still reveals nothing before acceptance', () => {
    const service = read('src/features/networking/services/connection-service.ts');
    const gate = "(connection.status !== 'accepted' && connection.status !== 'muted')";
    expect(service.split(gate).length - 1).toBeGreaterThanOrEqual(2);
    const policy = read('src/app/(frontend)/[locale]/(site)/privacy/page.tsx');
    expect(policy.includes('הדדית, לשני הצדדים')).toBe(true);
  });
});

describe('PRD §4.1 — the banner and pop-up reach every page', () => {
  it('mounts the live channels once, in the locale layout', () => {
    const layout = read('src/app/(frontend)/[locale]/layout.tsx');
    expect(layout.includes('<SiteSpotlight locale={locale as Locale} />')).toBe(true);
    expect(layout.includes('<Suspense fallback={null}>'), 'streamed, never blocking the page').toBe(true);
    /* No page mounts its own copy any more — one layout, no duplicates. */
    for (const file of [
      'src/app/(frontend)/[locale]/page.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/page.tsx',
      'src/app/(frontend)/[locale]/events/[slug]/me/page.tsx',
    ]) {
      expect(read(file).includes('ConferenceSpotlight'), `${file} has no private copy`).toBe(false);
    }
  });
});

describe('the bell and the messages page are one inbox at two sizes', () => {
  const route = read('src/app/(frontend)/[locale]/me/notifications/route.ts');
  const page = read('src/app/(frontend)/[locale]/me/messages/page.tsx');
  const bell = read('src/features/notifications/components/nav-bell.tsx');

  it('decide where a note leads with one shared rule', () => {
    expect(route.includes('feedItemHref(entry.type, locale, slug)')).toBe(true);
    expect(page.includes('feedItemHref(notification.type, locale, slug)')).toBe(true);
    expect(route.includes('networking#requests'), 'no private copy of the rule in the route').toBe(false);
  });

  it('show the same kinds of news', () => {
    expect(route.includes('newsworthyInLocale(feed, locale)')).toBe(true);
    expect(page.includes('newsworthyInLocale(notifications, locale)')).toBe(true);
    expect(page.includes('listMyAnnouncements'), 'the page no longer drops networking notes').toBe(false);
  });

  it('lead from "new messages" in the bell to the conversations, and from each into its chat', () => {
    const center = read('src/features/notifications/components/notification-center.tsx');
    expect(bell.includes('/me/messages#conversations')).toBe(true);
    expect(center.includes('id="conversations"')).toBe(true);
    expect(page.includes('href: `/${locale}/me/chat/${preview.connectionId}`')).toBe(true);
    expect(page.includes('myConversations(connections)')).toBe(true);
  });

  it('make every feed note a link, and share one read state', () => {
    const center = read('src/features/notifications/components/notification-center.tsx');
    expect(center.includes('href={notice.href}')).toBe(true);
    /* The bell and the page read the same per-device mark. */
    for (const file of [bell, center]) {
      expect(file.includes("from './read-state'")).toBe(true);
    }
    const state = read('src/features/notifications/components/read-state.ts');
    expect(state.includes("SEEN_KEY = 'netaim-bell-seen'"), 'the mark the bell always kept').toBe(true);
  });

  it('shelve every note by its type, never by its words', () => {
    const links = read('src/features/notifications/services/feed-links.ts');
    expect(links.includes("type.startsWith('networking.')")).toBe(true);
    expect(links.includes("type.startsWith('registration.')")).toBe(true);
    expect(links.includes("type.endsWith('.activity') ? 'conference' : 'system'")).toBe(true);
    expect(page.includes('categoryOf(notification.type)')).toBe(true);
    /* The per-conference copy of the page is gone; one centre. */
    expect(read('src/app/(frontend)/[locale]/events/[slug]/me/messages/page.tsx').includes('redirect(`/${locale}/me/messages`)')).toBe(true);
  });
});

describe('an address becomes an account exactly once', () => {
  const action = read('src/app/(frontend)/[locale]/events/[slug]/register/actions.ts');
  const identity = read('src/features/registration/services/participant-identity-service.ts');
  const repo = read('src/infrastructure/payload/payload-registration.ts');
  const form = read('src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx');

  it('refuses a taken address before a code is ever sent', () => {
    const request = action.slice(action.indexOf('requestCodeAction'));
    const check = request.indexOf('emailHasAccount(details.email)');
    const send = request.indexOf('beginEmailVerification(');
    expect(check).toBeGreaterThan(-1);
    expect(check, 'the question is asked before the code goes out').toBeLessThan(send);
    expect(request.includes("refuse('exists')")).toBe(true);
  });

  it('asks the account store, not a guess', () => {
    expect(identity.includes('export const emailHasAccount')).toBe(true);
    expect(identity.includes('credentialsByEmail(address)')).toBe(true);
  });

  it('asks at the end of step one, when the address was just typed', () => {
    const request = read('src/app/(frontend)/[locale]/events/[slug]/register/actions.ts');
    expect(request.includes('export const checkEmailAvailableAction')).toBe(true);
    /* Throttled, and a store that blinks never blocks a stranger. */
    expect(request.includes("checkRateLimit('email-check', email)")).toBe(true);
    expect(request.includes("return 'unknown'")).toBe(true);

    const forward = form.slice(form.indexOf('const goForward'), form.indexOf('const goBack'));
    expect(forward.includes('checkEmailAvailableAction(address)')).toBe(true);
    /* Local rules first: an address that is not one is not worth asking about. */
    expect(forward.indexOf('checkStepOne()')).toBeLessThan(forward.indexOf('checkEmailAvailableAction'));
    /* Taken means the step does not advance. */
    const taken = forward.slice(forward.indexOf("answer === 'taken'"));
    expect(taken.indexOf('return;')).toBeLessThan(taken.indexOf('setStep(2)'));
  });

  it('sends the person to the door they already have', () => {
    expect(form.includes("exists: { step: 1 }"), 'a notice, not a field error').toBe(true);
    expect(form.includes('labels.existsSignIn')).toBe(true);
    expect(form.includes('labels.existsReset')).toBe(true);
  });

  it('never files a second live place for the same person and conference', () => {
    const register = repo.slice(repo.indexOf('register: async'), repo.indexOf('setStatus: async'));
    expect(register.includes("{ status: { not_equals: 'cancelled' } }")).toBe(true);
    /* And it returns the place they hold rather than creating another. */
    expect(register.indexOf('if (held)')).toBeLessThan(register.indexOf("collection: 'registrations',\n      data: {"));
  });

  it('keeps the contact channels a person opened for themselves', () => {
    const register = repo.slice(repo.indexOf('register: async'), repo.indexOf('setStatus: async'));
    expect(register.includes('...(priorRow?.contactPrefs ?? {})')).toBe(true);
    expect(
      register.includes('contactPrefs: { directory: participant.directory === true }'),
      'the whole preference set must not be overwritten',
    ).toBe(false);
  });
});
