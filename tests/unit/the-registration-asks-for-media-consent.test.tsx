import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Consent to photography and media use, asked on the registration form.
 *
 * The box sits right after the networking question and is required:
 * the form will not send without it, the server refuses a submission
 * without it before any code is sent, and a pending registration that
 * carries no answer is not completed on an assumption. What is stored
 * is the moment of the person's own yes, on their registration — never
 * a default, never something an admin can set. "Read more" opens the
 * full wording over the form, in the visitor's language.
 */
const redirects: string[] = [];
const sent = vi.fn();
const registered = vi.fn();
const confirmed = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirects.push(url);
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('@/features/access', () => ({ checkRateLimit: async () => ({ ok: true }) }));
vi.mock('@/features/account', () => ({ scheduleConflictFor: async () => null }));
vi.mock('@/features/conference/services/conference-door', () => ({ mayEnterConference: async () => true }));
vi.mock('@/shared/cache/publish', () => ({ publishedDirectory: () => undefined }));
vi.mock('@/features/registration', async () => {
  const { isLatinName } = await import('@/features/registration/schemas/latin-name');
  const { isStrongPassword } = await import('@/features/registration/schemas/password');
  const { parseRegisterForm } = await import('@/features/registration/schemas/register-form');
  return {
    isLatinName,
    isStrongPassword,
    parseRegisterForm,
    emailHasAccount: async () => false,
    passwordHashFor: () => 'hashed',
    beginEmailVerification: async (...args: unknown[]) => {
      sent(...args);
      return { ok: true, delivered: true };
    },
    confirmEmailVerification: async () => confirmed(),
    registerForEvent: async (...args: unknown[]) => {
      registered(...args);
      return { outcome: 'confirmed', participantId: '7', registrationId: '9' };
    },
    establishSession: async () => undefined,
    applyPasswordHash: async () => undefined,
    reissueEmailVerification: async () => ({ ok: true, delivered: true }),
    signInWithPassword: async () => ({ ok: false }),
  };
});
/* The dialog is drawn into the page body; on the server, in place. */
vi.mock('react-dom', async (original) => ({
  ...(await original<typeof import('react-dom')>()),
  createPortal: (node: ReactNode) => node,
}));

const { requestCodeAction, confirmCodeAction } = await import(
  '@/app/(frontend)/[locale]/events/[slug]/register/actions'
);
const { parseRegisterForm } = await import('@/features/registration/schemas/register-form');
const { REGISTRATION_MESSAGES } = await import('@/features/registration/constants/messages');
const { default: MediaConsentDialog } = await import(
  '@/features/registration/components/media-consent-dialog'
);

const FORM = 'src/app/(frontend)/[locale]/events/[slug]/register/register-form.tsx';
const PAGE = 'src/app/(frontend)/[locale]/events/[slug]/register/page.tsx';
const read = (file: string) => readFileSync(file, 'utf8');
const HEBREW = /[֐-׿]/;
const words = REGISTRATION_MESSAGES.public;

const filled = (overrides: Record<string, string | null> = {}) => {
  const data = new FormData();
  const fields: Record<string, string | null> = {
    slug: 'ntaym-2026',
    locale: 'he',
    firstName: 'Dana',
    lastName: 'Levi',
    email: 'dana@example.com',
    phone: '050-1234567',
    password: 'Strong-Passw0rd!',
    passwordConfirm: 'Strong-Passw0rd!',
    organization: 'Netaim',
    role: 'Teacher',
    country: 'IL',
    dietary: 'ללא',
    directory: 'on',
    mediaConsent: 'on',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) {
      data.set(key, value);
    }
  }
  return data;
};

beforeEach(() => {
  redirects.length = 0;
  sent.mockClear();
  registered.mockClear();
  confirmed.mockReset();
});

describe('the words', () => {
  it('says the short consent beside the box, in Hebrew and in English, exactly', () => {
    expect(words.mediaConsent.he).toBe('אני מאשר/ת צילום ושימוש בתמונות ובסרטונים שבהם אני מופיע/ה.');
    expect(words.mediaConsent.en).toBe(
      'I consent to photography and to the use of photographs and video in which I appear.',
    );
    expect(words.mediaConsentReadMore).toEqual({ he: 'קרא עוד', en: 'Read more' });
  });

  it('keeps the full wording behind "read more", and adds no claim of its own', () => {
    expect(words.mediaConsentTitle).toEqual({
      he: 'הסכמה לצילום ולשימוש בתכנים',
      en: 'Photography & Media Consent',
    });
    expect(words.mediaConsentBody.he).toEqual([
      'במהלך הכנס עשויים להתבצע צילום תמונות, וידאו והקלטות.',
      'בהרשמה לכנס אני מאשר/ת כי ייתכן שאופיע בתיעוד המצולם, ומסכים/ה לשימוש בתמונות ובסרטונים שבהם אני מופיע/ה לצורכי תיעוד, פרסום וקידום פעילות נטעים, לרבות באתר האינטרנט, ברשתות החברתיות ובחומרים שיווקיים של נטעים.',
    ]);
    expect(words.mediaConsentBody.en).toEqual([
      'Photography, video and other recordings may take place during the conference.',
      'By registering for the conference, I acknowledge that I may appear in photographs or video recordings and consent to the use of such content for documenting, promoting and communicating Netaim’s activities, including on the website, social media and Netaim’s promotional materials.',
    ]);
    expect(words.mediaConsentAffirm.he).toBe(
      'אני מאשר/ת את האמור לעיל ומסכים/ה לצילום ולשימוש בתכנים שבהם אני מופיע/ה.',
    );
    expect(words.mediaConsentAffirm.en).toBe(
      'I agree to the above and consent to being photographed and to the use of media in which I appear.',
    );
  });

  it('keeps each language to itself', () => {
    const english = [
      words.mediaConsent.en,
      words.mediaConsentReadMore.en,
      words.mediaConsentTitle.en,
      ...words.mediaConsentBody.en,
      words.mediaConsentAffirm.en,
      words.mediaConsentClose.en,
      words.mediaConsentRequired.en,
    ];
    for (const line of english) {
      expect(line).not.toMatch(HEBREW);
    }
    expect(words.mediaConsentRequired.he).toMatch(HEBREW);
  });

  it('hands every one of them to the form, in the page’s language', () => {
    const page = read(PAGE);
    for (const key of [
      'mediaConsent',
      'mediaConsentReadMore',
      'mediaConsentTitle',
      'mediaConsentBody',
      'mediaConsentAffirm',
      'mediaConsentClose',
      'mediaConsentRequired',
    ]) {
      expect(page).toContain(`m.public.${key}[lang]`);
    }
  });
});

describe('the box on the form', () => {
  const form = read(FORM);

  it('comes right after the networking question and before the button', () => {
    const networking = form.indexOf('id="reg-directory"');
    const media = form.indexOf('id="reg-mediaConsent"');
    const submit = form.indexOf('key="submit"');
    expect(networking).toBeGreaterThan(-1);
    expect(media).toBeGreaterThan(networking);
    expect(submit).toBeGreaterThan(media);
    /* Nothing else is asked between the two. */
    expect(form.slice(networking, media)).not.toMatch(/<(input|select|textarea)\b(?![^>]*type="hidden")[^>]*id="reg-(?!directory|mediaConsent)/);
  });

  it('is a native checkbox with its own label, unticked to start with', () => {
    expect(form).toMatch(/id="reg-mediaConsent"\s+name="mediaConsent"\s+type="checkbox"\s+required/);
    expect(form).toContain('htmlFor="reg-mediaConsent"');
    expect(form).toContain('mediaConsent: false,');
  });

  it('opens the full wording from a real button outside the label, which never ticks the box', () => {
    const label = form.slice(form.indexOf('htmlFor="reg-mediaConsent"'));
    const closing = label.indexOf('</label>');
    const button = label.indexOf('aria-haspopup="dialog"');
    expect(button).toBeGreaterThan(closing);
    expect(form).toMatch(/type="button"\s+aria-haspopup="dialog"\s+onClick=\{\(\) => setConsentOpen\(true\)\}/);
  });

  it('is required on the client: the second step does not send without it', () => {
    expect(form).toContain("if (!values.mediaConsent) errors.mediaConsent = labels.mediaConsent.required;");
    /* A server refusal lands under the box, on the second step. */
    expect(form).toContain("mediaConsent: { step: 2, field: 'mediaConsent' }");
    expect(form).toContain('<FieldError id="err-mediaConsent" text={fieldErrors.mediaConsent} />');
  });

  it('travels with the first step, like the networking answer, so going back loses nothing', () => {
    expect(form).toContain('<input type="hidden" name="mediaConsent" value="on" />');
  });

  it('leaves the networking question as it was: optional, unrequired, its own answer', () => {
    const networking = form.slice(form.indexOf('id="reg-directory"'), form.indexOf('id="reg-directory"') + 200);
    expect(networking).not.toContain('required');
    expect(form).not.toMatch(/errors\.directory\s*=/);
  });
});

describe('the server, where the rule binds', () => {
  it('refuses a registration without the consent, before any code is sent, and keeps what was typed', async () => {
    const state = await requestCodeAction({ error: null }, filled({ mediaConsent: null }));
    expect(state.error).toBe('mediaConsent');
    expect(state.values).toMatchObject({
      firstName: 'Dana',
      email: 'dana@example.com',
      organization: 'Netaim',
      directory: true,
      mediaConsent: false,
    });
    expect(sent).not.toHaveBeenCalled();
    expect(redirects).toEqual([]);
  });

  it('does not take any value but the tick for a yes', async () => {
    const state = await requestCodeAction({ error: null }, filled({ mediaConsent: 'yes' }));
    expect(state.error).toBe('mediaConsent');
    expect(sent).not.toHaveBeenCalled();
  });

  it('sends the code when the consent is given, carrying it to the registration', async () => {
    await expect(requestCodeAction({ error: null }, filled())).rejects.toThrow('NEXT_REDIRECT');
    expect(redirects[0]).toContain('/he/events/ntaym-2026/register?verify=');
    const details = (sent.mock.calls[0]?.[3] as { details: Record<string, unknown> }).details;
    expect(details.mediaConsent).toBe(true);
    expect(details.directory).toBe(true);
  });

  it('leaves the networking answer optional, exactly as before', async () => {
    await expect(requestCodeAction({ error: null }, filled({ directory: null }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    const details = (sent.mock.calls[0]?.[3] as { details: Record<string, unknown> }).details;
    expect(details.directory).toBe(false);
    expect(details.mediaConsent).toBe(true);
  });

  it('parses only an explicit yes', () => {
    expect(parseRegisterForm(filled({ name: 'Dana Levi', mediaConsent: null })).success).toBe(false);
    const parsed = parseRegisterForm(filled({ name: 'Dana Levi' }));
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.mediaConsent).toBe(true);
  });

  const code = (email = 'dana@example.com') => {
    const data = new FormData();
    data.set('slug', 'ntaym-2026');
    data.set('locale', 'en');
    data.set('email', email);
    data.set('code', '123456');
    return data;
  };

  it('completes the registration with the consent once the code is confirmed', async () => {
    confirmed.mockReturnValue({
      ok: true,
      pending: {
        passwordHash: 'hashed',
        details: { name: 'Dana Levi', email: 'dana@example.com', directory: false, mediaConsent: true },
      },
    });
    await expect(confirmCodeAction(code())).rejects.toThrow('NEXT_REDIRECT');
    expect(registered).toHaveBeenCalledTimes(1);
    expect((registered.mock.calls[0]?.[2] as { mediaConsent: boolean }).mediaConsent).toBe(true);
    expect(redirects[0]).toBe('/en/events/ntaym-2026/register?outcome=confirmed');
  });

  it('does not complete a pending registration that carries no answer — the form is filled again', async () => {
    confirmed.mockReturnValue({
      ok: true,
      pending: { passwordHash: 'hashed', details: { name: 'Dana Levi', email: 'dana@example.com', directory: true } },
    });
    await expect(confirmCodeAction(code())).rejects.toThrow('NEXT_REDIRECT');
    expect(registered).not.toHaveBeenCalled();
    expect(redirects[0]).toBe('/en/events/ntaym-2026/register?error=expired');
  });
});

describe('what is kept', () => {
  it('records the moment of the person’s own yes on their registration, and nothing otherwise', () => {
    const adapter = read('src/infrastructure/payload/payload-registration.ts');
    expect(adapter).toContain('mediaConsentAt: participant.mediaConsent === true ? submittedAt : undefined');
  });

  it('cannot be set or changed from the admin or the API', () => {
    const collection = read('src/cms/collections/registrations.ts');
    const field = collection.slice(collection.indexOf("name: 'mediaConsentAt'"));
    expect(field).toMatch(/create: \(\) => false,\s+update: \(\) => false/);
    expect(field).toContain('readOnly: true');
  });

  it('adds the column without backfilling anyone', () => {
    const migration = read('src/migrations/20261005_090000_registration_media_consent.ts');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "media_consent_at" timestamp(3) with time zone');
    expect(migration).not.toMatch(/UPDATE\s+"registrations"/);
    expect(read('src/migrations/index.ts')).toContain("name: '20261005_090000_registration_media_consent'");
  });
});

describe('"read more"', () => {
  /* The page body the dialog is drawn into — on the server, a stand-in. */
  beforeAll(() => {
    vi.stubGlobal('document', { body: {} });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const dialog = (locale: 'he' | 'en') =>
    renderToString(
      <MediaConsentDialog
        locale={locale}
        onClose={() => undefined}
        returnFocusTo={{ current: null }}
        title={words.mediaConsentTitle[locale]}
        paragraphs={words.mediaConsentBody[locale]}
        affirm={words.mediaConsentAffirm[locale]}
        closeLabel={words.mediaConsentClose[locale]}
      />,
    );

  it('opens the Hebrew wording in a right-to-left dialog', () => {
    const html = dialog('he');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('הסכמה לצילום ולשימוש בתכנים');
    expect(html).toContain('במהלך הכנס עשויים להתבצע צילום תמונות, וידאו והקלטות.');
    expect(html).toContain('אני מאשר/ת את האמור לעיל');
    expect(html).toContain('aria-label="סגירה"');
  });

  it('opens the English wording in a left-to-right dialog', () => {
    const html = dialog('en');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('Photography &amp; Media Consent');
    expect(html).toContain('Photography, video and other recordings may take place during the conference.');
    expect(html).toContain('I agree to the above');
    expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(HEBREW);
  });

  it('is named by its title and described by its text', () => {
    const html = dialog('en');
    const labelled = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const described = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(labelled && html.includes(`id="${labelled}"`)).toBe(true);
    expect(described && html.includes(`id="${described}"`)).toBe(true);
  });

  it('can be closed: by its button, by the backdrop and by Escape, returning the focus', () => {
    const html = dialog('en');
    expect(html.match(/aria-label="Close"/g)?.length).toBe(2);
    expect(html).toContain('>Close</button>');
    const source = read('src/features/registration/components/media-consent-dialog.tsx');
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain("event.key === 'Tab'");
    expect(source).toContain('opener?.focus()');
    /* It fits a phone: never taller than the screen, its text scrolls. */
    expect(source).toContain('max-h-[calc(100dvh-2rem)]');
    expect(source).toContain('overflow-y-auto');
  });
});
