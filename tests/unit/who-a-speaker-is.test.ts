import { describe, expect, it } from 'vitest';
import { resolveSpeakerIdentity } from '@/features/speakers/services/speaker-identity';

/*
 * Who a speaker is, decided once.
 *
 * A roster entry may link a participant account and lend that account's
 * identity, or hold its own details for a guest with no account; any
 * field the producer typed on the entry overrides the account's for this
 * conference. That is one rule, and this suite pins it down where it
 * lives -- in the pure module both repositories now call -- rather than
 * through either of them.
 *
 * The case that started this: speaker #3, linked to a participant with a
 * name, a title, an organisation and a photo, and with every field of its
 * own left empty. The public API showed nobody.
 */

const photo = (url: string) => ({ id: 7, url, alt: 'portrait' });

const account = {
  id: 2,
  name: 'גל חסון',
  roleTitle: 'מנהל',
  orgName: 'נטעים',
  photo: photo('/api/media/file/gal.jpg'),
};

describe('a linked speaker with nothing typed on the entry', () => {
  it('is the account, in full', () => {
    const who = resolveSpeakerIdentity({ account });

    expect(who.name).toBe('גל חסון');
    expect(who.jobTitle).toBe('מנהל');
    expect(who.company).toBe('נטעים');
    expect(who.photo).toBe(account.photo);
  });

  it('treats a blank string as nothing typed', () => {
    const who = resolveSpeakerIdentity({
      name: '   ',
      jobTitle: '',
      company: null,
      account,
    });
    expect(who.name).toBe('גל חסון');
    expect(who.jobTitle).toBe('מנהל');
    expect(who.company).toBe('נטעים');
  });
});

describe('a per-conference override', () => {
  it('wins over the account, field by field', () => {
    const who = resolveSpeakerIdentity({
      name: 'ד"ר גל חסון',
      company: 'מכון ויצמן',
      account,
    });

    expect(who.name).toBe('ד"ר גל חסון');
    expect(who.company).toBe('מכון ויצמן');
    /* untouched fields still come from the account */
    expect(who.jobTitle).toBe('מנהל');
    expect(who.photo).toBe(account.photo);
  });

  it("uses the entry's own photo over the account's", () => {
    const own = photo('/api/media/file/stage.jpg');
    const who = resolveSpeakerIdentity({ photo: own, account });
    expect(who.photo).toBe(own);
  });

  /*
   * The exact failure a shallow query produces: the entry's `photo` is a
   * bare id because the fetch did not reach it. That is "no photo", and
   * the account's must still be allowed to win.
   */
  it('does not let an unpopulated photo id block the account photo', () => {
    const who = resolveSpeakerIdentity({ photo: 41, account });
    expect(who.photo).toBe(account.photo);
  });

  it('reads the legacy role field as a job title of last resort', () => {
    expect(
      resolveSpeakerIdentity({ role: 'מנחה', account }).jobTitle,
    ).toBe('מנחה');
    expect(
      resolveSpeakerIdentity({ role: 'מנחה', jobTitle: 'פרופסור', account })
        .jobTitle,
    ).toBe('פרופסור');
  });
});

describe('an external speaker', () => {
  it('is exactly what was typed, and nothing is invented', () => {
    const who = resolveSpeakerIdentity({
      name: 'ד"ר מאיה לוי',
      jobTitle: 'חוקרת בכירה',
      company: 'מכון ויצמן',
    });

    expect(who).toEqual({
      name: 'ד"ר מאיה לוי',
      jobTitle: 'חוקרת בכירה',
      company: 'מכון ויצמן',
      bio: undefined,
    });
    expect('photo' in who).toBe(false);
  });

  it('with nothing typed and no account is nobody', () => {
    expect(resolveSpeakerIdentity({}).name).toBe('');
  });
});

describe('an account that asked to be forgotten', () => {
  /*
   * The platform already keeps anonymized accounts out of the speaker
   * picker. Lending such an account's name to a page would undo that
   * request through a side door, so the rule lends nothing from it.
   */
  it('lends nothing', () => {
    const who = resolveSpeakerIdentity({
      account: { ...account, anonymizedAt: '2026-09-01T00:00:00.000Z' },
    });
    expect(who.name).toBe('');
    expect(who.jobTitle).toBeUndefined();
    expect('photo' in who).toBe(false);
  });

  it('but an override typed on the entry still stands', () => {
    const who = resolveSpeakerIdentity({
      name: 'דובר אורח',
      account: { ...account, anonymizedAt: '2026-09-01T00:00:00.000Z' },
    });
    expect(who.name).toBe('דובר אורח');
  });
});

describe('what the rule never returns', () => {
  it('carries no account id and no registration state', () => {
    const who = resolveSpeakerIdentity({ account }) as unknown as Record<string, unknown>;
    expect(who).not.toHaveProperty('accountId');
    expect(who).not.toHaveProperty('isRegistered');
    expect(who).not.toHaveProperty('account');
  });
});
