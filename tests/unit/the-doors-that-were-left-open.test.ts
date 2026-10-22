import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentEngineShut, isFileDoor, restDoorOpen } from '@/infrastructure/payload/content-engine-gate';
import { sniffImageType } from '@/shared/utils/image-sniff';
import { csvField, neutralizeFormula } from '@/shared/utils/csv';
import { redactForRecord, redactLinkTokens } from '@/notification-engine/redact';
import { createNotificationSender } from '@/notification-engine/notification-service';
import { boundedDetails, oneLine } from '@/features/registration/utils/profile-text';
import { PROFILE_LIMITS } from '@/features/registration/constants/profile-limits';
import { parseRegisterForm } from '@/features/registration/schemas/register-form';

/*
 * The doors that were left open — the first round of the October 2026
 * security review, one block per finding.
 */
const read = (file: string): string => readFileSync(file, 'utf8');

/* ---------- 1. a profile photo is an image, served as one ---------- */
describe('a profile photo', () => {
  const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const WEBP = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ');
  const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const HTML = new TextEncoder().encode('<!doctype html><script>alert(1)</script>');

  it('is recognised by its bytes, never by its name or the type the browser claims', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(HTML)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it('is stored under a name the server chooses, with the extension of what it is', () => {
    const service = read('src/features/registration/services/participant-me-service.ts');
    const body = service.slice(service.indexOf('export const updateMyPhoto'));
    expect(body).toContain('sniffImageType(');
    expect(body).toContain('name: `portrait-${participant.id}-${Date.now()}.${IMAGE_EXTENSION[type]}`');
  });

  it('and every media file is served sandboxed, never sniffed', () => {
    const config = read('next.config.ts');
    const rule = config.slice(config.indexOf("source: '/api/media/file/:path*'"));
    expect(rule).toContain("value: \"sandbox; default-src 'none'");
    expect(rule).toContain("key: 'X-Content-Type-Options', value: 'nosniff'");
  });
});

/* ---------- a single-use link is requested once ---------- */
describe('one request per click', () => {
  it('Payload\'s Critical-CH header is taken off every response, Accept-CH kept', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://netaim26.org');
    const { default: config } = await import('../../next.config');
    const rules = await config.headers!();
    const keys = rules.flatMap((rule) => rule.headers.map((header) => header.key.toLowerCase()));
    expect(keys).not.toContain('critical-ch');
    expect(keys).toContain('accept-ch');
    vi.unstubAllEnvs();
  });
});

/* ---------- 2. the Content Engine's own doors ---------- */
describe("the Content Engine's REST and GraphQL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('are shut in production, except the media file door', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CONTENT_ENGINE_ADMIN', '');
    expect(contentEngineShut()).toBe(true);
    expect(restDoorOpen('GET', ['media', 'file', 'portrait-1.jpg'])).toBe(true);
    expect(restDoorOpen('HEAD', ['media', 'file', 'portrait-1.jpg'])).toBe(true);
    expect(restDoorOpen('GET', ['events'])).toBe(false);
    expect(restDoorOpen('GET', ['participants', '1'])).toBe(false);
    expect(restDoorOpen('GET', ['media'])).toBe(false);
    expect(restDoorOpen('GET', ['media', 'file'])).toBe(false);
    expect(restDoorOpen('POST', ['media', 'file', 'x.jpg'])).toBe(false);
    expect(restDoorOpen('POST', ['users', 'login'])).toBe(false);
    expect(restDoorOpen('DELETE', ['media', '1'])).toBe(false);
    expect(restDoorOpen('GET', undefined)).toBe(false);
  });

  it('open only when a developer opens them, and in development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CONTENT_ENGINE_ADMIN', 'true');
    expect(restDoorOpen('GET', ['events'])).toBe(true);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CONTENT_ENGINE_ADMIN', '');
    expect(restDoorOpen('POST', ['users', 'login'])).toBe(true);
  });

  it('the file door is exactly one file name long', () => {
    expect(isFileDoor('GET', ['media', 'file', 'a.jpg'])).toBe(true);
    expect(isFileDoor('GET', ['media', 'file', ''])).toBe(false);
    expect(isFileDoor('GET', ['media', 'file', 'a', 'b'])).toBe(false);
    expect(isFileDoor('PUT', ['media', 'file', 'a.jpg'])).toBe(false);
  });

  it('every REST method and the GraphQL endpoint pass the gate', () => {
    const rest = read('src/app/(payload)/api/[...slug]/route.ts');
    for (const method of ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS']) {
      expect(rest).toContain(`export const ${method} = gated(REST_${method}(config));`);
    }
    const graphql = read('src/app/(payload)/api/graphql/route.ts');
    expect(graphql).toContain('contentEngineShut() ? Promise.resolve(shutDoor()) : graphql(request)');
    expect(read('src/app/(payload)/admin/[[...segments]]/page.tsx')).toContain('const adminBlocked = contentEngineShut;');
  });
});

/* ---------- 6. the outbox keeps a record, not a key ---------- */
describe('a sign-in link in the outbox', () => {
  const link = 'https://netaim26.org/he/enter?token=0123456789abcdef0123456789abcdef';

  it('keeps the address and loses the token', () => {
    expect(redactLinkTokens(`go: ${link} now`)).toBe('go: https://netaim26.org/he/enter?token=[redacted] now');
    expect(redactLinkTokens('/he/events/a/enter?x=1&token=abc#top')).toBe('/he/events/a/enter?x=1&token=[redacted]#top');
    expect(redactLinkTokens('no link here')).toBe('no link here');
  });

  it('is mailed whole and recorded redacted', async () => {
    const mailed: string[] = [];
    const recorded: string[] = [];
    const send = createNotificationSender(
      {
        enqueue: async (record: { body: string }) => {
          recorded.push(record.body);
        },
      } as never,
      {
        deliver: async (message: { body: string }) => {
          mailed.push(message.body);
          return 'sent';
        },
      } as never,
    );
    const message = { participantId: '1', eventSlug: '', type: 'participant.signin', locale: 'he', subject: 's', body: link, cta: { label: 'in', href: link } };
    expect(await send(message)).toBe('sent');
    expect(mailed).toEqual([link]);
    expect(recorded).toEqual(['https://netaim26.org/he/enter?token=[redacted]']);
    expect(redactForRecord(message).cta?.href).toBe('https://netaim26.org/he/enter?token=[redacted]');
  });

  it('is never retried — a redacted link opens nothing', () => {
    expect(read('src/infrastructure/payload/payload-notification.ts')).toContain("{ type: { not_equals: 'participant.signin' } },");
  });
});

/* ---------- 7. the development link stays in development ---------- */
describe('the link on the sign-in screen', () => {
  it('is read from the address bar in development only', () => {
    const page = read('src/app/(frontend)/[locale]/me/page.tsx');
    expect(page).toContain("const development = process.env.NODE_ENV !== 'production';");
    expect(page).toContain('const link = development ? linkParam : undefined;');
    expect(page).toContain('const detail = development ? detailParam : undefined;');
  });
});

/* ---------- 9. a profile field holds a real answer, not a megabyte ---------- */
describe('the size of a profile', () => {
  it('cuts what is too long and keeps one-line fields on one line', () => {
    const bounded = boundedDetails({
      name: `Dana\nLevi\t${'x'.repeat(500)}`,
      bio: `first line\nsecond line${'y'.repeat(5000)}`,
      organization: 'Netaim',
      links: [
        { label: 'a'.repeat(200), url: 'https://example.org' },
        { label: 'b', url: `https://example.org/${'z'.repeat(600)}` },
        { label: 'c', url: 'https://example.com' },
      ],
    });
    expect(bounded.name?.startsWith('Dana Levi x')).toBe(true);
    expect(Array.from(bounded.name ?? '').length).toBeLessThanOrEqual(PROFILE_LIMITS.name);
    expect(bounded.bio?.startsWith('first line\nsecond line')).toBe(true);
    expect(Array.from(bounded.bio ?? '').length).toBeLessThanOrEqual(PROFILE_LIMITS.bio);
    expect(bounded.organization).toBe('Netaim');
    expect(bounded.links).toEqual([{ label: 'a'.repeat(PROFILE_LIMITS.linkLabel), url: 'https://example.org' }]);
  });

  it('leaves a field the form did not ask about absent', () => {
    expect(boundedDetails({ name: 'Dana' })).toEqual({
      name: 'Dana',
      phone: undefined,
      organization: undefined,
      role: undefined,
      headline: undefined,
      dietary: undefined,
      accessibility: undefined,
      interests: undefined,
      bio: undefined,
      links: undefined,
    });
  });

  it('never splits a character in two', () => {
    expect(oneLine('😀'.repeat(5), 3)).toBe('😀😀😀');
  });

  it('is applied wherever a profile is saved, and at registration', () => {
    expect(read('src/features/registration/services/participant-me-service.ts')).toContain('boundedDetails(input),');
    const form = new FormData();
    form.set('name', 'x'.repeat(PROFILE_LIMITS.name + 1));
    form.set('email', 'dana@example.org');
    form.set('mediaConsent', 'on');
    expect(parseRegisterForm(form).success).toBe(false);
    form.set('name', 'Dana\nLevi');
    const parsed = parseRegisterForm(form);
    expect(parsed.success && parsed.data.name).toBe('Dana Levi');
  });
});

/* ---------- 10. an export is data, never a formula ---------- */
describe('a CSV field', () => {
  it('that would read as a formula is written as text', () => {
    expect(neutralizeFormula('=HYPERLINK("https://evil.example","click")')).toBe('\'=HYPERLINK("https://evil.example","click")');
    expect(neutralizeFormula('+cmd|calc!A1')).toBe("'+cmd|calc!A1");
    expect(neutralizeFormula('-2+3+cmd|calc!A1')).toBe("'-2+3+cmd|calc!A1");
    expect(neutralizeFormula('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(neutralizeFormula('\tleading tab')).toBe("'\tleading tab");
  });

  it('a telephone number, a negative number and plain words stay as they are', () => {
    expect(neutralizeFormula('+972 54-000-0000')).toBe('+972 54-000-0000');
    expect(neutralizeFormula('-12.5')).toBe('-12.5');
    expect(neutralizeFormula('Dana Levi')).toBe('Dana Levi');
  });

  it('is quoted, with its quotes doubled', () => {
    expect(csvField('a "b", c')).toBe('"a ""b"", c"');
    expect(csvField('=1+1')).toBe(`"'=1+1"`);
    expect(csvField(null)).toBe('""');
  });

  it('both Studio exports write every field through it', () => {
    expect(read('src/features/studio/services/studio-logistics.ts')).toContain('const cell = (value: string): string => csvField(value);');
    expect(read('src/app/(studio)/studio/(console)/history/export/route.ts')).toContain('const csvCell = csvField;');
  });
});
