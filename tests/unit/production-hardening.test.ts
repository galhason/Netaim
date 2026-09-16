import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The production compliance pass, locked.
 *
 * Four things were fixed on the way to launch, and each of them is the
 * kind of thing that quietly comes back: a stock-photo host that puts
 * an invented face beside a real name, a personal page that forgets to
 * tell crawlers to stay away, a link field that accepts `javascript:`,
 * and community actions with no ceiling on how fast one guest can
 * flood another.
 *
 * These cases are the memory of that pass. Each one fails loudly if the
 * protection is removed, which is the only way a fix from August is
 * still a fix in November.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const SOURCES = walk('src').map((file) => ({
  file: file.replace(/\\/g, '/'),
  text: readFileSync(file, 'utf8'),
}));

const read = (file: string): string =>
  SOURCES.find((entry) => entry.file.endsWith(file))?.text ?? '';

describe('no invented faces, no borrowed image hosts', () => {
  it('has no stock-photo host left anywhere in the source', () => {
    const offenders = SOURCES.filter(({ text }) =>
      /pravatar|picsum/.test(text),
    ).map(({ file }) => file);

    expect(
      offenders,
      'a portrait service beside a real participant name is a misrepresentation, and every such host is also a third-party request on a page that should make none',
    ).toEqual([]);
  });

  it('does not allow those hosts through the image policy either', () => {
    const config = readFileSync('next.config.ts', 'utf8');
    expect(/pravatar|picsum/.test(config)).toBe(false);
  });

  it('ships the local placeholder the fallbacks point at', () => {
    expect(
      existsSync('public/placeholder/scene.jpg'),
      'scenery falls back to a local frame; without the file the fallback is a broken image',
    ).toBe(true);
  });
});

describe('personal pages stay out of the indexes', () => {
  it('declares noindex for the whole personal area', () => {
    const layout = read('[locale]/me/layout.tsx');
    expect(layout, 'the /me layout should exist').not.toBe('');
    expect(layout.includes('robots')).toBe(true);
    expect(/index:\s*false/.test(layout)).toBe(true);
  });

  it('forbids the personal area and the Studio in robots.txt', () => {
    const robots = readFileSync('src/app/robots.ts', 'utf8');
    for (const forbidden of ['/he/me/', '/en/me/', '/studio', '/api/']) {
      expect(
        robots.includes(forbidden),
        `${forbidden} must be disallowed to crawlers`,
      ).toBe(true);
    }
  });

  it('never publishes a sitemap of localhost URLs', () => {
    const sitemap = readFileSync('src/app/sitemap.ts', 'utf8');
    expect(sitemap.includes('localhost')).toBe(true);
    expect(/return \[\]/.test(sitemap)).toBe(true);
  });
});

describe('a profile link cannot become a script', () => {
  it('stores links through the scheme validator', () => {
    const actions = read('[locale]/me/profile/actions.ts');
    expect(actions.includes('safeLink('), 'links must pass the validator').toBe(
      true,
    );
    expect(
      actions.includes("url.protocol === 'https:'"),
      'only http(s) may be stored — javascript: and data: are payloads',
    ).toBe(true);
  });
});

describe('community actions have a ceiling', () => {
  it('declares a policy for each floodable action', () => {
    const policy = readFileSync(
      'src/permission-engine/throttle/rate-limit.ts',
      'utf8',
    );
    for (const action of ['connection-request', 'chat-message', 'report']) {
      expect(
        policy.includes(`'${action}'`) || policy.includes(`${action}:`),
        `${action} needs a declared allowance`,
      ).toBe(true);
    }
  });

  it('enforces them in the services, not in the forms', () => {
    expect(
      read('services/connection-service.ts').includes(
        "checkRateLimit('connection-request'",
      ),
    ).toBe(true);
    expect(
      read('services/chat-service.ts').includes("checkRateLimit('chat-message'"),
    ).toBe(true);
    expect(
      read('services/safety-service.ts').includes("checkRateLimit('report'"),
    ).toBe(true);
  });

  it('never lets the throttle stand between a person and a block', () => {
    /*
     * The ordering matters more than the limit does. Someone being
     * harassed who has already filed reports today must still be able
     * to make the other person disappear — so the block is written
     * before the report's allowance is even consulted.
     */
    const safety = read('services/safety-service.ts');
    const blockAt = safety.indexOf('blockRepository.create');
    const throttleAt = safety.indexOf("checkRateLimit('report'");
    expect(blockAt).toBeGreaterThan(-1);
    expect(throttleAt).toBeGreaterThan(-1);
    expect(
      blockAt < throttleAt,
      'blocking must happen before the report throttle, never behind it',
    ).toBe(true);
  });
});

describe('the platform forgets on schedule', () => {
  it('declares the retention period in one place, with a default', () => {
    const service = read('services/retention-service.ts');
    expect(service, 'the retention service should exist').not.toBe('');
    expect(
      service.includes('DEFAULT_RETENTION_DAYS'),
      'the period a privacy policy promises must be checkable against one constant',
    ).toBe(true);
    expect(service.includes('RETENTION_DAYS')).toBe(true);
  });

  it('erases the conference collections that hold people', () => {
    const sweep = read('payload/payload-retention.ts');
    for (const collection of [
      'networking-chat-messages',
      'networking-connections',
      'networking-meetings',
      'notifications',
      'session-registrations',
      'registrations',
      'participants',
    ]) {
      expect(
        sweep.includes(collection),
        `${collection} holds personal data and must be part of the sweep`,
      ).toBe(true);
    }
  });

  it('never erases a conference on a guessed date', () => {
    /*
     * An event with no start and no end has no deadline, and the sweep
     * must leave it alone rather than invent one — the cost of guessing
     * wrong here is deleting people who are still coming.
     */
    const sweep = read('payload/payload-retention.ts');
    expect(sweep.includes('endsAt ?? row.startsAt ?? null')).toBe(true);
    expect(/return null;/.test(sweep)).toBe(true);
  });

  it('spares staff accounts deliberately, and says so in the report', () => {
    const sweep = read('payload/payload-retention.ts');
    expect(
      sweep.includes("collection: 'account-grants'"),
      'an account holding a Studio grant must be checked for, not left to a foreign key to refuse',
    ).toBe(true);
    expect(sweep.includes('accountsKept')).toBe(true);
  });

  it('closes the reporting endpoint when no secret is configured', () => {
    const route = read('api/retention/route.ts');
    expect(route.includes('RETENTION_SECRET')).toBe(true);
    expect(
      /if \(!secret\) \{[\s\S]*?return false;/.test(route),
      'without a secret the endpoint must refuse everyone, not allow everyone',
    ).toBe(true);
    expect(
      route.includes('timingSafeEqual'),
      'the secret comparison must not leak its answer through timing',
    ).toBe(true);
  });

  it('exposes no verb that can erase over HTTP', () => {
    /*
     * Erasure is a command an administrator runs by hand. An endpoint
     * that deletes is one leaked secret, one misconfigured proxy or one
     * copied cron line away from emptying a conference unasked — and
     * the request that did it cannot put the people back.
     */
    const route = read('api/retention/route.ts');
    expect(/export const POST/.test(route)).toBe(false);
    expect(/export const DELETE/.test(route)).toBe(false);
    expect(route.includes('purgeConferenceData')).toBe(false);
  });

  it('requires a named conference and an explicit confirmation', () => {
    const cli = readFileSync('scripts/retention.ts', 'utf8');
    expect(cli.includes('RETENTION_CONFIRM')).toBe(true);
    expect(
      /if \(!confirmed\)/.test(cli),
      'without --confirm the command must stop after describing what would go',
    ).toBe(true);
    expect(
      /if \(!slugArg\)/.test(cli),
      'the conference must be named; there is no "purge everything due"',
    ).toBe(true);
  });

  it('can record an erasure even though no person performed it', () => {
    /*
     * The audit repository used to coerce the actor id to a number
     * unconditionally, so a system actor produced NaN and the write
     * failed silently — leaving the one act that most needs a trail
     * without one. Found by running the sweep for real.
     */
    const audit = read('payload/payload-audit.ts');
    expect(audit.includes('Number.isFinite(Number(entry.actor.id))')).toBe(true);
  });
});

describe('a visitor who has not signed in is given no cookie', () => {
  /*
   * The reason there is no cookie banner on this site is that every
   * cookie it sets is strictly necessary and none of them exists before
   * a person signs in. That claim is only true while it is true — and
   * the way it silently stopped being true once was next-intl, which
   * mirrors the resolved language into a `NEXT_LOCALE` cookie of its own
   * and writes it to anonymous visitors. Nothing here reads that cookie;
   * the language lives in `participant_locale` and in the URL. So it is
   * switched off, and these cases are what keeps it off.
   */
  it('switches off the framework language cookie', () => {
    const routing = read('i18n/routing.ts');
    expect(routing, 'the routing config should exist').not.toBe('');
    expect(
      /localeCookie:\s*false/.test(routing),
      'next-intl writes NEXT_LOCALE to anonymous visitors unless it is disabled',
    ).toBe(true);
  });

  it('sets no cookie anywhere outside the identity service and the Studio', () => {
    /*
     * Every `cookies().set` in the codebase must be one of the three the
     * privacy policy declares. A fourth one appearing in a new feature
     * is exactly the drift this guards against.
     */
    const allowed = [
      'features/registration/services/participant-identity-service.ts',
      'features/studio/services/studio-locale.ts',
    ];
    const writers = SOURCES.filter(({ text }) =>
      /store\.set\(|cookieStore\.set\(/.test(text),
    )
      .map(({ file }) => file)
      .filter((file) => !allowed.some((known) => file.endsWith(known)));

    expect(
      writers,
      'a new cookie means the privacy policy and its count are out of date',
    ).toEqual([]);
  });

  it('declares exactly the three cookies it sets', () => {
    const policy = read('(site)/privacy/page.tsx');
    expect(policy.includes('שלוש בלבד')).toBe(true);
    expect(policy.includes('three, and only three')).toBe(true);
    expect(
      policy.includes('localStorage'),
      'what the browser keeps on the device is disclosed too, not only cookies',
    ).toBe(true);
  });
});

describe('the platform tells people what it does with them', () => {
  it('publishes a privacy policy and terms of use, in both languages', () => {
    for (const page of [
      '(site)/privacy/page.tsx',
      '(site)/terms/page.tsx',
      '(site)/accessibility/page.tsx',
    ]) {
      const text = read(page);
      expect(text, `${page} should exist`).not.toBe('');
      /*
       * Both languages in one component, from one copy table — the
       * convention this codebase uses everywhere, and the only way the
       * two versions cannot drift apart into saying different things
       * about the same data.
       */
      expect(text.includes('he:') && text.includes('en:')).toBe(true);
    }
  });

  it('reaches them from the footer of every page', () => {
    const footer = read('components/conference-footer.tsx');
    expect(footer.includes('/privacy')).toBe(true);
    expect(footer.includes('/terms')).toBe(true);
    expect(footer.includes('/accessibility')).toBe(true);
  });

  it('states the notice on the registration form itself', () => {
    /*
     * Section 11 of the Privacy Protection Law asks that a person be
     * told at collection time. A link in a footer is not collection
     * time; the moment before submitting the form is.
     */
    /*
     * The form is its own component now, so that a refusal can hand back
     * what was typed instead of emptying the page. The notice moved with
     * it — which is the point: it belongs beside the submit button, not
     * beside whichever file used to hold it.
     */
    const form = read('register/register-form.tsx');
    expect(form, 'the registration form component should exist').not.toBe('');
    expect(form.includes('/privacy')).toBe(true);
    expect(form.includes('/terms')).toBe(true);
  });

  it('quotes the retention period from the code, not from prose', () => {
    /*
     * The number a participant is promised and the number the deletion
     * command obeys must be one number. Reading it from the service is
     * what makes the promise checkable.
     */
    const policy = read('(site)/privacy/page.tsx');
    expect(policy.includes('retentionDays')).toBe(true);
    expect(policy.includes('@/features/privacy')).toBe(true);
  });
});

/*
 * The canvas is the live site, framed.
 *
 * The Studio does not draw a picture of the conference; it puts the
 * running site in an iframe beside the inspector, which is the whole
 * reason the workspace can be trusted to show what visitors will see.
 * `frame-ancestors 'none'` forbids that — including from this very
 * origin — and the canvas came up blank on the server with no error
 * anywhere. 'self' keeps every other site out, which is what the header
 * is for.
 */
describe('the frame policy lets the Studio frame its own site', () => {
  const config = readFileSync('next.config.ts', 'utf8');

  it("uses frame-ancestors 'self', never 'none'", () => {
    expect(config.includes(`"frame-ancestors 'self'"`)).toBe(true);
    expect(config.includes(`"frame-ancestors 'none'"`)).toBe(false);
  });

  it('keeps the legacy header in step', () => {
    expect(config.includes(`value: 'SAMEORIGIN'`)).toBe(true);
    expect(
      config.includes(`key: 'X-Frame-Options', value: 'DENY'`),
      'DENY blocks same-origin framing too',
    ).toBe(false);
  });
});

/*
 * The nightly copy, and the two ways it lies.
 *
 * A backup fails in silence twice over. It runs, exits zero and holds
 * nothing — a changed password, a renamed database, a full disk all
 * look like that from the outside. And it is never read back, so the
 * first restore is attempted on the worst night of the year.
 *
 * The script answers both: it reads its own dump before believing it,
 * and there is a restore that can be run on an ordinary Tuesday
 * without touching anything live. These cases hold that shape, because
 * a verification step is exactly the kind of thing a later "simplify"
 * removes.
 */
describe('the backup proves itself', () => {
  const backup = readFileSync('scripts/backup.sh', 'utf8');
  const restore = readFileSync('scripts/restore.sh', 'utf8');

  it('reads the dump back and insists on the tables that matter', () => {
    expect(backup).toContain('pg_restore --list');
    for (const table of ['participants', 'registrations', 'account_grants']) {
      expect(backup).toContain(table);
    }
  });

  it('throws away a dump that failed its own check', () => {
    /* Otherwise `restore.sh` would later pick the newest file — this one. */
    expect(backup).toContain('VERIFIED');
    expect(backup).toContain('rm -f "$DUMP"');
  });

  it('keeps a verified dump even when a later step fails', () => {
    expect(backup).toContain('[ "$VERIFIED" -eq 0 ]');
  });

  it('copies the media the database cannot regenerate', () => {
    expect(backup).toContain('media');
    expect(backup).toContain('rsync');
  });

  it('takes the credentials from the application, never its own copy', () => {
    expect(backup).toContain("grep -E '^DATABASE_URL='");
    expect(restore).toContain("grep -E '^DATABASE_URL='");
  });

  it('refuses to restore over the live database unless told by name', () => {
    expect(restore).toContain('--i-mean-the-live-database');
    expect(restore).toContain('hason_restore_test');
  });

  it('never prints a connection URL, because it carries the password', () => {
    /* The hint after a test restore used to echo $ADMIN_URL verbatim. */
    expect(restore.includes('say "Drop it when you are done:  psql')).toBe(
      false,
    );
  });

  it('is documented with the line that actually installs it', () => {
    const deploy = readFileSync('DEPLOY.md', 'utf8');
    expect(deploy).toContain('scripts/backup.sh');
    expect(deploy).toContain('0 3 * * *');
    expect(deploy).toContain('scripts/restore.sh');
  });
});
