import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Who a guest is shown to.
 *
 * The directory once read the `participants` collection for everyone
 * who was not blocked — no scope and no limit. A guest's name, employer,
 * role, interests and photograph were listed to strangers from other
 * public bodies, while the page told them their profile appeared "only
 * if you choose to show it".
 *
 * The answer then was to require an explicit tick, and it fixed the
 * leak by emptying the room: a profile row was created only by a form
 * most guests never opened, so a conference with a full programme
 * showed nobody at all, and each person waited to be the first.
 *
 * The rule now, and the three limits that make it defensible:
 *
 *  1. **Scope.** Only people taking part in *this* conference, and only
 *     to viewers taking part in it. This is the limit that fixed the
 *     original leak, and it has not moved.
 *  2. **Opt-in, asked at registration.** The client's PRD (§5.1)
 *     requires an explicit "yes": the question is on the registration
 *     form itself, so the room fills with people who chose it, and the
 *     answer lives on the account (`contactPrefs.directory`) where one
 *     change applies to every conference at once.
 *  3. **What a listing exposes stays narrow.** Name, role,
 *     organisation. Phone, email and WhatsApp stay closed until the
 *     person approves a connection — separate preferences, untouched.
 *
 * These cases fail if any of the three erodes: if a surface reads
 * participants unscoped again, if the opt-out stops being honoured, or
 * if contact channels start leaking into a listing.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const SOURCES = walk('src').map((file) => ({
  file,
  text: readFileSync(file, 'utf8'),
}));

describe('the people directory shows the room, and only the room', () => {
  it('has no unscoped platform-wide participant read left', () => {
    const offenders = SOURCES.filter(({ text }) =>
      /listPlatformParticipants|payloadListPlatformParticipants/.test(text),
    ).map(({ file }) => file);

    expect(
      offenders,
      'this read returned every participant on the platform, across organizations and regardless of consent',
    ).toEqual([]);
  });

  it('lists only people taking part in this conference', () => {
    const adapter = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-registration.ts'),
    );
    expect(adapter, 'the registration adapter should exist').toBeDefined();

    const body = adapter?.text ?? '';
    const directory = body.slice(body.indexOf('payloadListDirectoryParticipants'));

    /*
     * The scope, which is the limit that fixed the original leak: the
     * set of people is bounded by the conference before anything else
     * is read. An unbounded participants query here is the regression.
     */
    expect(
      directory.includes('participantsTakingPart(payload, eventId)'),
      'the directory must be bounded by who is taking part in this conference',
    ).toBe(true);
    expect(
      directory.includes('where: { id: { in: [...attending] } }'),
      'and the people read must be exactly that set',
    ).toBe(true);
  });

  it('lists only accounts that opted in, and drops blocked or anonymised accounts', () => {
    const rule = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-participation.ts'),
    );
    expect(rule, 'the participation module should exist').toBeDefined();
    const body = rule?.text ?? '';
    const listed = body.slice(body.indexOf('export const mayBeListed'));

    expect(
      listed.includes('contactPrefs?.directory === true'),
      'only a person who explicitly opted in may appear (PRD §5.1)',
    ).toBe(true);
    expect(listed.includes('blocked !== true')).toBe(true);
    expect(listed.includes('anonymizedAt')).toBe(true);

    /*
     * And the directory must go through it rather than reimplement it.
     * There is one reader now: the second one lived on the conference's
     * own networking page, which is exactly how the two came to
     * disagree about who was in the room.
     */
    const reader = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-registration.ts'),
    );
    expect(reader?.text.includes('mayBeListed')).toBe(true);

    const second = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-networking.ts'),
    );
    expect(
      second,
      'the second directory reader was retired and must not come back',
    ).toBeUndefined();
  });

  it('asks the guest, on the form, whether they want to be listed', () => {
    const messages = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('registration/constants/messages.ts'),
    );
    expect(
      messages?.text.includes('directoryQuestion'),
      'the opt-in question must exist in the registration copy (PRD §5.1)',
    ).toBe(true);

    const form = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('register/register-form.tsx'),
    );
    expect(
      form?.text.includes('name="directory"'),
      'the registration form must carry the directory opt-in checkbox',
    ).toBe(true);
    /*
     * The question reaches the form as a label rather than being read
     * from the copy table inside it — the component is a client one now,
     * and shipping the whole bilingual table to the browser to render
     * one sentence would be a strange way to ask it.
     */
    expect(form?.text.includes('labels.directoryQuestion')).toBe(true);
    const page = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('register/page.tsx'),
    );
    expect(page?.text.includes('m.public.directoryQuestion[lang]')).toBe(true);
  });

  it('keeps contact channels out of a listing', () => {
    /*
     * Being listed says name, role and organisation. The channels are a
     * separate decision the person makes per connection, and a listing
     * that started carrying them would turn one consent into another.
     */
    const rule = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('payload/payload-participation.ts'),
    );
    const listed = (rule?.text ?? '').slice(
      (rule?.text ?? '').indexOf('export const mayBeListed'),
    );
    for (const channel of ['whatsapp', 'phone', 'email']) {
      expect(
        listed.includes(channel),
        `being listed must not turn on ${channel}`,
      ).toBe(false);
    }
  });

  it('takes the conferences from the account, never from the request', () => {
    const page = SOURCES.find(({ file }) =>
      file.replace(/\\/g, '/').endsWith('me/networking/page.tsx'),
    );
    expect(page, 'the networking page should exist').toBeDefined();

    const text = page?.text ?? '';
    /*
     * A slug read from the query string would let a visitor name a
     * conference they have nothing to do with and read its directory.
     * The chosen conference is looked up inside `account.joined`.
     */
    expect(
      text.includes('account.joined.find('),
      'the chosen conference must be found within the account, not trusted from the URL',
    ).toBe(true);
    /*
     * The directory is now one conference — the site's own — rather than
     * a fan-out over everything the account holds. The slug still comes
     * from two places only: a conference found inside `account.joined`,
     * or the platform's active conference. Never the query string.
     */
    expect(text.includes('listDirectoryParticipants(directorySlug)')).toBe(
      true,
    );
    expect(
      text.includes('getActiveConferenceSlug('),
      'the fallback conference is the platform\u2019s own, not one the visitor named',
    ).toBe(true);
  });
});
