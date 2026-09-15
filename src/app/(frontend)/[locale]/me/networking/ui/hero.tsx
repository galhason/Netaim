import Link from 'next/link';
import type { Locale } from '@/config/locales';
import type { MyMeeting } from '@/features/networking';
import type { FellowParticipant } from '@/infrastructure';
import { Avatar, clock } from './shared';

/*
 * The entrance to the conference community.
 *
 * One dark rounded room floating on the cream page: an eyebrow, an
 * editorial statement with a single gold-accented line, one strong act
 * ("Discover people") and one quiet one, and the community's true
 * numbers underneath. The guest's own card stands at the composition's
 * end — small on purpose: this page is about the other people.
 *
 * Bilingual by construction, not by mirroring. One component, copy in
 * a single table the way every page here keeps it, and the layout
 * flips through logical properties and grid order alone — the text
 * column leads in the reading direction, the member card trails, and
 * nothing is hand-reversed. The decoration lives in one clipped,
 * absolutely-positioned layer that scales down on a phone and can
 * never sit over a word.
 *
 * Every number is computed and every link is real; the mock's "profile
 * views" does not exist in this system, so it does not exist here.
 */
const COPY = {
  eyebrow: { he: 'קהילת הכנס', en: 'NETWORKING' },
  titleA: { he: 'אנשי הכנס,', en: 'The people of the conference,' },
  titleB: { he: 'במקום אחד.', en: 'in one place.' },
  support: {
    he: 'גלו אנשים ששווה להכיר, ראו מה מחבר ביניכם, והתחילו שיחה לפני שהכנס נגמר.',
    en: 'Discover people worth meeting, see what connects you, and start a conversation before the conference ends.',
  },
  discover: { he: 'גילוי אנשים', en: 'Discover people' },
  myProfile: { he: 'הפרופיל שלי', en: 'My profile' },
  participants: { he: 'משתתפים', en: 'participants' },
  openToMeetings: { he: 'פתוחים לפגישות', en: 'open to networking' },
  openBadge: { he: 'פתוח/ה לפגישות', en: 'Open to networking' },
  connections: { he: 'קשרים', en: 'connections' },
  meetings: { he: 'פגישות', en: 'meetings' },
  edit: { he: 'עריכת הפרופיל', en: 'Edit profile' },
  nextMeeting: { he: 'הפגישה הבאה', en: 'Next meeting' },
  openMeeting: { he: 'לפגישה', en: 'Open' },
} as const;

interface HeroProps {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  participantCount: number;
  openCount: number;
  faces: FellowParticipant[];
  myself: {
    name: string;
    photoUrl?: string;
    line: string;
    open: boolean;
    connections: number;
    meetings: number;
  };
  nextMeeting: (MyMeeting & { slug: string }) | null;
}

const Sparkle = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="currentColor"
  >
    <path d="M12 2c.6 5.5 4.5 9.4 10 10-5.5.6-9.4 4.5-10 10-.6-5.5-4.5-9.4-10-10 5.5-.6 9.4-4.5 10-10Z" />
  </svg>
);

/* The little crowd: overlapping portraits, initials when there is no photo. */
const FaceCluster = ({ faces }: { faces: FellowParticipant[] }) =>
  faces.length === 0 ? null : (
    <ul aria-hidden="true" className="flex items-center">
      {faces.map((person, index) => (
        <li
          key={person.participantId}
          className="relative -ms-2.5 first:ms-0"
          style={{ zIndex: faces.length - index }}
        >
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
            <img
              src={person.photoUrl}
              alt=""
              className="size-9 rounded-full object-cover ring-2 ring-[#0d1226]"
            />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-white/12 font-display text-xs font-semibold text-white ring-2 ring-[#0d1226]">
              {person.name.slice(0, 1)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

const NetworkingHero = ({
  locale,
  he,
  num,
  participantCount,
  openCount,
  faces,
  myself,
  nextMeeting,
}: HeroProps) => (
  /* pt clears the site's fixed 88px navigation bar. */
  <section className="px-3 pt-[6.25rem] md:px-6 md:pt-[7rem]">
    <div className="relative mx-auto max-w-6xl rounded-[1.75rem] bg-[#0d1226] md:rounded-[2rem]">
      {/*
        * The moving backdrop — the conference itself, behind the words.
        * Muted, looping, decorative only (aria-hidden, no controls), and
        * held under a navy scrim so the statement stays the loudest
        * thing in the room. Clipped by the same radius as the card;
        * hidden entirely for guests who asked for reduced motion, who
        * get the original still atmosphere instead.
        */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-[1.75rem] motion-reduce:hidden md:rounded-[2rem]"
      >
        {/*
          * Two encodings of the same clip: H.264 for Safari and every
          * Chrome, VP9 for open-source Chromium builds that ship
          * without the proprietary codec. The browser takes the first
          * one it can actually play.
          */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="size-full object-cover"
        >
          <source src="/videos/networking-hero.mp4" type="video/mp4" />
          <source src="/videos/networking-hero.webm" type="video/webm" />
        </video>
        <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,18,38,0.72),rgba(13,18,38,0.6)_45%,rgba(13,18,38,0.82))]" />
      </div>
      {/*
        * The atmosphere, in its own clipped layer: a violet orb rising
        * from the trailing corner with one orbital outline, a soft glow
        * behind the title, three small stars. Sized down on a phone so
        * the sphere stays a horizon and never a backdrop to text.
        */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem] md:rounded-[2rem]"
      >
        <span className="absolute -bottom-24 end-[-4rem] size-[16rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,#5b4a9e,#241d4d_55%,#151033_75%)] opacity-90 md:-bottom-40 md:end-[-6rem] md:size-[26rem]" />
        <span className="absolute -bottom-28 end-[-5rem] size-[18rem] rounded-full border border-white/5 md:-bottom-44 md:end-[-7rem] md:size-[28rem]" />
        <span className="absolute -bottom-32 end-[-6rem] hidden size-[30rem] rounded-full border border-white/[0.03] md:block" />
        <span className="absolute -top-32 start-1/4 h-[24rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(128,103,216,0.22),transparent_70%)] blur-2xl" />
        <Sparkle className="absolute end-[30%] top-[22%] size-3 text-[var(--n-gold-soft)]/80" />
        <Sparkle className="absolute end-[12%] top-[55%] size-2 text-white/50" />
        <Sparkle className="absolute start-[55%] top-[70%] size-2 text-[var(--n-purple-soft)]/60" />
      </div>

      <div className="relative">
        {/*
          * No private top bar any more: the page wears the site's own
          * CinematicNav (rendered by the page, fixed above everything),
          * so the room starts straight at its statement.
          */}
        <div className="grid gap-5 p-4 pt-6 md:grid-cols-[1fr_16rem] md:items-start md:gap-6 md:px-8 md:py-7">
          {/*
            * The statement. Leads in the reading direction on both
            * locales. `min-w-0` matters: without it the grid track
            * refuses to shrink below the widest nowrap line inside
            * (the profile strip's counts), and at 320px the whole
            * page grows a horizontal scrollbar.
            */}
          <div className="min-w-0 max-w-xl text-white">
            <p
              className={`text-[11px] font-medium tracking-[0.24em] text-[var(--n-purple-soft)] ${
                he ? '' : 'uppercase'
              }`}
            >
              {COPY.eyebrow[locale]}
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.12] tracking-tight md:text-[2.75rem]">
              {COPY.titleA[locale]}
              <br />
              <span className="text-[var(--n-gold-soft)]">
                {COPY.titleB[locale]}
              </span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65 md:mt-4">
              {COPY.support[locale]}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 md:mt-6">
              <a
                href="#discovery"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--n-gold-soft)] px-6 text-sm font-semibold text-[#1b2436] transition-colors hover:bg-[#d8bb84] active:bg-[#cbae77] sm:flex-none"
              >
                {COPY.discover[locale]}
              </a>
              <Link
                href={`/${locale}/me/profile`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:flex-none"
              >
                {COPY.myProfile[locale]}
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 md:mt-6">
              <FaceCluster faces={faces} />
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-white/50"
                  />
                  {num(participantCount)} {COPY.participants[locale]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-[var(--n-green)]"
                  />
                  {num(openCount)} {COPY.openToMeetings[locale]}
                </span>
              </p>
            </div>

            {/*
              * The phone's version of the member card: one compact
              * strip, because on a small screen the community deserves
              * the height. Who you are stays one glance and one tap.
              */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 md:hidden">
              <Avatar name={myself.name} photoUrl={myself.photoUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {myself.name}
                </span>
                <span className="block truncate text-[11px] text-white/55">
                  {num(myself.connections)} {COPY.connections[locale]} ·{' '}
                  {num(myself.meetings)} {COPY.meetings[locale]}
                  {myself.open ? (
                    <span className="text-[var(--n-green)]">
                      {' '}
                      · {COPY.openBadge[locale]}
                    </span>
                  ) : null}
                </span>
              </span>
              <Link
                href={`/${locale}/me/profile?view=edit`}
                className="inline-flex min-h-9 flex-none items-center rounded-full border border-white/20 px-3.5 text-xs text-white transition-colors hover:bg-white/10"
              >
                {he ? 'עריכה' : 'Edit'}
              </Link>
            </div>
          </div>

          {/*
            * The member's corner, desktop only — a quiet utility that
            * trails the reading direction, never a second hero. Face,
            * line, availability, two real counts, and the door to edit.
            */}
          <div className="hidden min-w-0 flex-col gap-3 md:flex">
            <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[linear-gradient(135deg,var(--n-purple),var(--n-gold-soft))] p-[2px]">
                  <span className="block rounded-full bg-[#12182e] p-[2px]">
                    <Avatar
                      name={myself.name}
                      photoUrl={myself.photoUrl}
                      size="sm"
                    />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">
                    {myself.name}
                  </span>
                  {myself.line ? (
                    <span className="block truncate text-[11px] text-white/55">
                      {myself.line}
                    </span>
                  ) : null}
                </span>
              </div>
              {myself.open ? (
                <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--n-green)]">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-[var(--n-green)]"
                  />
                  {COPY.openBadge[locale]}
                </p>
              ) : null}
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-center">
                <div>
                  <dd className="font-display text-lg font-semibold tabular-nums text-white">
                    {num(myself.connections)}
                  </dd>
                  <dt className="text-[10px] text-white/55">
                    {COPY.connections[locale]}
                  </dt>
                </div>
                <div>
                  <dd className="font-display text-lg font-semibold tabular-nums text-white">
                    {num(myself.meetings)}
                  </dd>
                  <dt className="text-[10px] text-white/55">
                    {COPY.meetings[locale]}
                  </dt>
                </div>
              </dl>
              <Link
                href={`/${locale}/me/profile?view=edit`}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white transition-colors hover:bg-white/15"
              >
                {COPY.edit[locale]}
              </Link>
            </div>

            {nextMeeting ? (
              <div className="rounded-2xl bg-[#1d2440] p-4 ring-1 ring-white/10">
                <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--n-gold-soft)]">
                  {COPY.nextMeeting[locale]}
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <Avatar name={nextMeeting.otherName} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {nextMeeting.otherName}
                    </span>
                    <span className="block text-[11px] text-white/60">
                      {clock(nextMeeting.startsAt, locale)}
                      {nextMeeting.location ? ` · ${nextMeeting.location}` : ''}
                    </span>
                  </span>
                  <a
                    href="#meetings"
                    className="ms-auto inline-flex min-h-9 flex-none items-center rounded-full bg-[var(--n-purple)] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#6f57c8]"
                  >
                    {COPY.openMeeting[locale]}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default NetworkingHero;
