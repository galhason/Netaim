import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  EVENT_PHASES,
  availableTransitions,
  canTransition,
  phaseIsOffAir,
  transitionEvent,
} from '@/event-engine';
import type { EventPhase } from '@/event-engine';
import type { EventSummary } from '@/features/events';

/*
 * Archiving a conference, from the Studio console.
 *
 * The button was there, it was wired, and it could not work for any
 * conference that has ever existed. Three separate things had to be true
 * at once, and all three were false:
 *
 *  1. `archived` was reachable from `completed` alone -- while nothing in
 *     the platform moves a conference out of `draft`. `phase` is written
 *     on create, on duplicate, and by the lifecycle engine; launching
 *     writes `_status` and never touches `phase`. So every conference in
 *     the database sits in `draft` for ever, and the only archive route
 *     started two phases past where any of them stand.
 *  2. The refusal was silent, and the audit entry was written anyway --
 *     so the trail recorded `event.archived` for conferences that were
 *     never archived.
 *  3. The console draws its cards at `/studio`, and the action
 *     revalidated `/studio/events`.
 *
 * This suite covers the first, which is the rule, and the service that
 * carries it out. The other two are a revalidation path and a conditional
 * audit; both are asserted where they can be -- in the source of the
 * action -- rather than pretended to be covered by a behavioural test.
 */

const capable = ['registration'] as const;

describe('a conference can be retired from wherever it stands', () => {
  /*
   * The guard that matters: not "archiving works from draft", which is
   * one case, but that no phase is a dead end. A phase added later
   * without an archive route fails here.
   */
  it('allows archiving from every phase', () => {
    for (const phase of EVENT_PHASES) {
      if (phase === 'archived') {
        continue;
      }
      expect(
        canTransition(phase, 'archived', capable),
        `a conference in ${phase} cannot be archived`,
      ).toBe(true);
    }
  });

  it('offers archiving as an available move from every phase', () => {
    for (const phase of EVENT_PHASES) {
      if (phase === 'archived') {
        continue;
      }
      expect(availableTransitions(phase, capable)).toContain('archived');
    }
  });

  it('does not offer archiving to a conference already archived', () => {
    expect(availableTransitions('archived', capable)).not.toContain('archived');
    expect(canTransition('archived', 'archived', capable)).toBe(false);
  });

  /*
   * Leaving the archive offers both destinations rather than guessing.
   * Restoring every conference to `completed` would claim that a draft
   * somebody abandoned had run and finished.
   */
  it('keeps archiving reversible, to draft or to completed', () => {
    expect(availableTransitions('archived', capable)).toEqual([
      'draft',
      'completed',
    ]);
    expect(canTransition('archived', 'completed', capable)).toBe(true);
    expect(canTransition('archived', 'draft', capable)).toBe(true);
  });

  /*
   * Opening the archive route must not have opened anything else. The
   * progression is still the progression, and the moves that were
   * impossible are still impossible.
   */
  it('leaves the progression exactly as it was', () => {
    expect(canTransition('draft', 'planning', capable)).toBe(true);
    expect(canTransition('preparation', 'live', capable)).toBe(true);
    expect(canTransition('live', 'completed', capable)).toBe(true);

    expect(canTransition('draft', 'live', capable)).toBe(false);
    expect(canTransition('live', 'draft', capable)).toBe(false);
    expect(canTransition('archived', 'live', capable)).toBe(false);
    expect(canTransition('completed', 'live', capable)).toBe(false);
  });

  it('still hides registration phases from a conference without it', () => {
    expect(availableTransitions('planning', [])).toEqual([
      'preparation',
      'archived',
    ]);
  });

  it('names archiving among the moves it offers on a refusal', () => {
    const result = transitionEvent('draft', 'live', []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.allowed).toEqual(['planning', 'archived']);
    }
  });
});

/* ------------------------------------------------------------------ */

describe('a retired conference is not on the air', () => {
  /*
   * The rule the Studio depends on: choosing to archive the conference
   * that is currently live takes it off the air in the same write. A
   * phase and a publication status that disagreed would leave the Studio
   * calling a conference read-only while the public site went on serving
   * it.
   *
   * It is stated on the phase rather than in the action, so it holds for
   * every way a conference can reach `archived`. The single place that
   * writes a phase consults it -- `setEventPhase` in
   * `payload-event-repository`, which writes `_status: 'draft'` alongside
   * the phase when this is true.
   */
  it('is true of archived and of nothing else', () => {
    expect(phaseIsOffAir('archived')).toBe(true);
    for (const phase of EVENT_PHASES) {
      if (phase === 'archived') {
        continue;
      }
      expect(
        phaseIsOffAir(phase),
        `${phase} must not take a conference off the air`,
      ).toBe(false);
    }
  });

  /*
   * Notably including `completed`: a conference that has finished is not
   * retired, and taking it off the air is a separate decision an operator
   * makes for themselves.
   */
  it('leaves a completed conference on the air', () => {
    expect(phaseIsOffAir('completed')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

/*
 * And the service, against a stand-in repository: the phase that every
 * real conference is actually in must reach the database.
 */
const conference: { phase: EventPhase } = { phase: 'draft' };
const written: EventPhase[] = [];
const launched: string[] = [];

vi.mock('@/infrastructure', () => ({
  eventRepository: {
    findEvent: async (slug: string) =>
      slug === 'missing'
        ? null
        : ({
            slug,
            phase: conference.phase,
            capabilities: ['registration'],
            launched: false,
            featured: false,
            atmosphere: 'warm',
          } as unknown as EventSummary),
    setEventPhase: async (_slug: string, phase: EventPhase) => {
      written.push(phase);
      return {} as unknown as EventSummary;
    },
    /*
     * An empty conference. It is deliberately bare: these cases are about
     * the archive, and a conference with nothing in it is held back by its
     * own readiness -- which is exactly the contrast being drawn.
     */
    getOpeningDraft: async () => ({
      composition: [],
      featured: false,
      atmosphere: 'warm',
      story: {},
      quote: {},
      venue: {},
      closing: {},
      moments: [],
      speakers: [],
      programDays: [],
    }),
    launchEvent: async (slug: string) => {
      launched.push(slug);
      return {} as unknown as EventSummary;
    },
  },
}));

/*
 * The launch review also asks about registration and the agenda. Neither
 * is what these cases are about, and both reach the database.
 */
vi.mock('@/features/registration/services/registration-settings-service', () => ({
  getRegistrationSettings: async () => null,
}));
vi.mock('@/features/program/services/program-service', () => ({
  listAgenda: async () => [],
}));

const { archiveEvent, restoreEvent } = await import(
  '@/features/events/services/event-management-service'
);
const { launchExperience, reviewLaunch } = await import(
  '@/features/events/services/launch-service'
);

describe('archiving a draft conference from the console', () => {
  it('writes the archived phase', async () => {
    conference.phase = 'draft';
    written.length = 0;

    const result = await archiveEvent('some-conference');

    expect(result).toEqual({ ok: true, phase: 'archived' });
    expect(
      written,
      'the phase never reached the repository: the button did nothing',
    ).toEqual(['archived']);
  });

  it('writes it from a live conference too', async () => {
    conference.phase = 'live';
    written.length = 0;

    const result = await archiveEvent('some-conference');

    expect(result.ok).toBe(true);
    expect(written).toEqual(['archived']);
  });

  /*
   * And refuses without writing, which is what the action now checks
   * before it puts anything in the audit trail.
   */
  it('refuses a conference that is already archived, and writes nothing', async () => {
    conference.phase = 'archived';
    written.length = 0;

    const result = await archiveEvent('some-conference');

    expect(result.ok).toBe(false);
    expect(written).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

/*
 * Two facts that decide whether archiving works, and that no behavioural
 * test in this file can reach: one lives in a repository that resolves
 * its acting creator from request cookies, the other in a server action.
 * Both are proven properly against real Postgres in
 * `tests/integration/archiving-takes-a-conference-off-the-air.int.test.ts`.
 * These are the cheap net underneath, and they are here because both
 * have already been wrong once.
 */
const sliceBetween = (source: string, from: string, to: string): string => {
  const start = source.indexOf(from);
  expect(start, `anchor not found: ${from}`).toBeGreaterThan(-1);
  /* Anchored to `start`, because an `indexOf(to)` that runs from zero can
   * return a position before it and hand back an empty string that
   * satisfies every assertion made about it. */
  const end = source.indexOf(to, start + from.length);
  expect(end, `closing anchor not found: ${to}`).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('the archive write reaches the document, not a draft of it', () => {
  /*
   * With drafts enabled, Payload skips the primary-row write entirely
   * when an update carries `draft: true` and records a version instead
   * (collections/operations/utilities/update.js:253). An archive saved
   * that way leaves the Studio calling a conference retired while the
   * public site goes on serving it -- which is exactly what happened.
   */
  it('does not save the phase change as a draft when it retires a conference', () => {
    const method = sliceBetween(
      readFileSync(
        'src/infrastructure/payload/payload-event-repository.ts',
        'utf8',
      ),
      'setEventPhase: async',
      '\n  updateEventDetails:',
    );
    /*
     * The *write* only. The read above it is a `payload.find` that
     * legitimately asks for the draft view, because the Studio works on
     * drafts -- an assertion over the whole method would fail on that
     * and say nothing about the archive.
     */
    const write = sliceBetween(method, 'payload.update(', '});');

    expect(method).toContain('phaseIsOffAir');
    expect(
      write,
      'the retiring write must carry the publication status, or the row stays published',
    ).toContain("_status: 'draft'");
    expect(
      /draft:\s*true/.test(write),
      'a `draft: true` here sends the archive to a version and never to the document',
    ).toBe(false);
  });

  /*
   * And the other side of it: the guard must still bite. A write that
   * went back to saving a draft is what it is for.
   */
  it('still recognises the write that caused the bug', () => {
    const regressed = `payload.update({ id, draft: true, data: { phase } });`;
    expect(/draft:\s*true/.test(regressed)).toBe(true);
  });
});

describe('the audit trail records only an archive that happened', () => {
  it('checks the transition before it writes the entry', () => {
    const body = sliceBetween(
      readFileSync('src/app/(studio)/studio/actions.ts', 'utf8'),
      'export const archiveEventAction',
      '\nexport const ',
    );

    const guard = body.indexOf('result.ok');
    const entry = body.indexOf("audit(actor, 'event.archived'");

    expect(guard, 'the action does not look at the result at all').toBeGreaterThan(-1);
    expect(entry, 'the audit entry is gone').toBeGreaterThan(-1);
    expect(
      guard,
      'the entry is written before the transition is known to have succeeded',
    ).toBeLessThan(entry);
    expect(
      body.split("audit(actor, 'event.archived'").length - 1,
      'more than one place writes this entry',
    ).toBe(1);
  });
});

/* ------------------------------------------------------------------ */

describe('a retired conference is not publishable', () => {
  /*
   * The route out of the archive is the lifecycle's own: archived →
   * draft, then readiness decides like it does for any other conference.
   * Archived → published is not a move, and the refusal lives in the
   * domain rather than in the button -- the Studio only stops offering
   * what the service would refuse anyway.
   */
  it('refuses to launch it, and does not reach the repository', async () => {
    conference.phase = 'archived';
    launched.length = 0;

    const outcome = await launchExperience('some-conference', 'he');

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(
        outcome.retired,
        'the refusal must say it is retired, not blame readiness',
      ).toBe(true);
    }
    expect(
      launched,
      'the publish reached the repository anyway',
    ).toEqual([]);
  });

  /*
   * The same conference, twice, differing only in its phase. Asserting
   * that an archived conference "cannot launch" on its own proves nothing
   * here -- the bare fixture is held back by readiness either way. What
   * proves the rule is that the readiness is identical and the verdict is
   * not.
   */
  it('refuses on the archive, not on readiness', async () => {
    conference.phase = 'archived';
    const retired = await launchExperience('some-conference', 'he');
    const retiredReview = await reviewLaunch('some-conference', 'he');

    conference.phase = 'draft';
    const plain = await launchExperience('some-conference', 'he');

    expect(retired.ok).toBe(false);
    expect(plain.ok).toBe(false);
    expect(retiredReview?.canLaunch).toBe(false);
    if (!retired.ok && !plain.ok) {
      expect(
        retired.blockers,
        'the two runs must differ in phase alone, or this proves nothing',
      ).toBe(plain.blockers);
      expect(retired.retired).toBe(true);
      expect(plain.retired).toBeUndefined();
    }
  });

  /*
   * And the other side: once restored, the archive no longer has anything
   * to say. The conference may still be held back by its own readiness --
   * an empty conference here is -- but it is judged on that and not on
   * having been retired, which is the distinction this whole change is
   * about.
   */
  it('stops being retired once it is restored', async () => {
    conference.phase = 'archived';
    written.length = 0;

    const restore = await restoreEvent('some-conference');
    expect(restore).toEqual({ ok: true, phase: 'draft' });
    expect(written).toEqual(['draft']);

    conference.phase = 'draft';
    launched.length = 0;
    const outcome = await launchExperience('some-conference', 'he');

    if (!outcome.ok) {
      expect(
        outcome.retired,
        'a restored conference is still being refused as retired',
      ).toBeUndefined();
    }
  });

  it('offers restoring only out of the archive', async () => {
    conference.phase = 'draft';
    written.length = 0;
    const fromDraft = await restoreEvent('some-conference');
    expect(
      fromDraft.ok,
      'draft to draft is not a move the lifecycle allows',
    ).toBe(false);
    expect(written).toEqual([]);
  });
});
