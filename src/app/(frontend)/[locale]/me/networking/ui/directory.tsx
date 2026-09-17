import Link from 'next/link';
import type { Locale } from '@/config/locales';
import type { FellowParticipant } from '@/infrastructure';
import { manageConnectionAction, platformConnectAction } from '../actions';
import LoadMoreLabel from './load-more';
import SafetyMenu from './safety-menu';
import {
  card,
  ghostBtn,
  listInterests,
  personLine,
  stateChip,
} from './shared';

/*
 * "All participants" — the community explorer.
 *
 * Where the bubbles curate, this section scales: a conference of four
 * hundred people renders twelve compact cards and a door that says
 * "עוד אנשים". The heading tells the truth twice — the real total, and
 * how much of it is on screen — and the door is a plain GET link
 * carrying every active query parameter plus a grown ?count, so search
 * and filters survive every press, no participant can repeat (one
 * stable ordering, sliced further each time), and a browser without
 * JavaScript walks exactly the same road via the #directory anchor.
 *
 * The cards are deliberately denser than the bubbles above: a face
 * with its availability dot, a name, a line of role and organization,
 * two interests, and where you stand. Enough to decide, small enough
 * to scan forty of them without fatigue.
 */
interface DirectoryProps {
  locale: Locale;
  he: boolean;
  num: (value: number) => string;
  isFiltered: boolean;
  totalCount: number;
  filteredCount: number;
  shown: FellowParticipant[];
  loadMoreHref: string | null;
  remaining: number;
  q?: string;
  org?: string;
  directorySlug: string;
  activeByOther: Map<string, 'pending' | 'accepted'>;
  pendingOutgoing: Map<string, { id: string; slug: string }>;
  clearHref: string;
}

/*
 * The bubbles' visual language at tile scale: the face is the anchor,
 * inside a thin ring whose color means something — green for an open
 * door, the section's soft purple otherwise — with the availability
 * dot on the rim. Never a random color per person.
 */
const CardAvatar = ({ person }: { person: FellowParticipant }) => (
  <span className="relative inline-block">
    <span
      className={`block rounded-full p-[2px] ${
        person.openToMeetings
          ? 'bg-[linear-gradient(135deg,var(--n-green),var(--n-green-soft))]'
          : 'bg-[linear-gradient(135deg,var(--n-purple-soft),var(--n-purple-soft))]'
      }`}
    >
      <span className="block rounded-full bg-[var(--n-bg)] p-[2px]">
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- participant portrait from the media API
          <img
            src={person.photoUrl}
            alt=""
            loading="lazy"
            className="size-14 rounded-full object-cover transition-transform duration-200 group-hover:scale-[1.03] md:size-16"
          />
        ) : (
          <span className="n-tile-avatar">
            {person.name.slice(0, 1)}
          </span>
        )}
      </span>
    </span>
    {person.openToMeetings ? (
      <span
        aria-hidden="true"
        className="n-open-dot"
      />
    ) : null}
  </span>
);

/* Interest pills: warm, neutral, nearly whispered. */
const tagPill =
  'n-meta-chip';

const ParticipantDirectory = ({
  locale,
  he,
  num,
  isFiltered,
  totalCount,
  filteredCount,
  shown,
  loadMoreHref,
  remaining,
  q,
  org,
  directorySlug,
  activeByOther,
  pendingOutgoing,
  clearHref,
}: DirectoryProps) => (
  <section id="directory" className="scroll-mt-24">
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="font-display text-xl font-semibold md:text-2xl">
        {isFiltered
          ? he
            ? 'תוצאות'
            : 'Results'
          : he
            ? 'כל המשתתפים'
            : 'All participants'}
        <span className="ms-2 text-sm font-normal tabular-nums text-[var(--n-faint)]">
          · {num(filteredCount)}
        </span>
      </h2>
      {isFiltered && filteredCount !== totalCount ? (
        <span className="text-xs tabular-nums text-[var(--n-faint)]">
          {he
            ? `מתוך ${num(totalCount)} בקהילה`
            : `of ${num(totalCount)} in the community`}
        </span>
      ) : null}
      {filteredCount > shown.length ? (
        <span className="ms-auto text-xs tabular-nums text-[var(--n-faint)]">
          {he
            ? `מוצגים ${num(shown.length)}`
            : `Showing ${num(shown.length)}`}
        </span>
      ) : null}
    </div>

    {shown.length === 0 ? (
      <div className={`${card} flex flex-col items-center gap-3 p-8 text-center`}>
        <p className="font-display text-lg font-semibold">
          {he ? 'לא נמצא אף אחד' : 'No people found'}
        </p>
        <p className="max-w-sm text-sm text-[var(--n-soft)]">
          {he
            ? 'נסו שם אחר, ארגון, תפקיד או תחום עניין.'
            : 'Try another name, organization, role or interest.'}
        </p>
        {q || org ? (
          <Link
            href={clearHref}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--n-hair)] bg-white px-5 text-sm font-medium transition-colors hover:border-[var(--n-purple)]"
          >
            {he ? 'ניקוי הסינון' : 'Clear the filters'}
          </Link>
        ) : null}
      </div>
    ) : (
      <>
        {/*
          * auto-fill, not fixed column counts: the tracks are only as
          * wide as a tile actually needs (~10rem), and as many of them
          * as fit are minted — so two search results sit shoulder to
          * shoulder instead of drifting to opposite ends of the row.
          */}
        <ul className="grid [grid-template-columns:repeat(auto-fill,minmax(10rem,1fr))] gap-x-2 gap-y-3 md:gap-x-3 md:gap-y-4">
          {shown.map((person, index) => {
            const state = activeByOther.get(person.participantId);
            const interests = listInterests(person.interests).slice(0, 2);
            const waiting = pendingOutgoing.get(person.participantId);
            return (
              <li
                key={person.participantId}
                id={`person-${person.participantId}`}
                className="scroll-mt-28"
              >
                {/*
                  * No frame, deliberately: the person stands on the
                  * page itself, like the bubbles above — the box went
                  * because a wall of white rectangles reads as a
                  * dashboard, and a field of faces reads as a room.
                  */}
                <article
                  className="lounge-rise group n-tile"
                  style={{ animationDelay: `${Math.min(index % 12, 8) * 35}ms` }}
                >
                  <span className="absolute end-1.5 top-1.5">
                    <SafetyMenu
                      locale={locale}
                      he={he}
                      participantId={person.participantId}
                      name={person.name}
                      slug={directorySlug}
                    />
                  </span>
                  <CardAvatar person={person} />
                  <h3 className="n-name">
                    {person.name}
                  </h3>
                  {personLine(person) ? (
                    <p className="w-full truncate text-[11px] text-[var(--n-soft)]">
                      {personLine(person)}
                    </p>
                  ) : null}
                  {interests.length > 0 ? (
                    <p className="mt-2 hidden flex-wrap justify-center gap-1 sm:flex">
                      {interests.map((interest) => (
                        <span key={interest} className={tagPill}>
                          {interest}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {person.openToMeetings ? (
                    <p className="n-open-note">
                      <span
                        aria-hidden="true"
                        className="size-1 rounded-full bg-[var(--n-green)]"
                      />
                      {he ? 'פתוח/ה לפגישות' : 'Open to networking'}
                    </p>
                  ) : null}

                  {state === 'accepted' ? (
                    /*
                     * Snug under the person's lines, not pushed to the
                     * tile's floor: friendship is part of who they are
                     * to you, not a footer.
                     */
                    <p className="mt-1.5">
                      <span className={stateChip}>
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-[var(--n-green)]"
                        />
                        {he ? 'חברים' : 'Connected'}
                      </span>
                    </p>
                  ) : state === 'pending' ? (
                    <div className="mt-auto flex flex-col items-center gap-1 pt-2.5">
                      <span className={stateChip}>
                        {he ? 'ממתין לאישור' : 'Pending'}
                      </span>
                      {waiting ? (
                        <form action={manageConnectionAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="slug" value={waiting.slug} />
                          <input
                            type="hidden"
                            name="connectionId"
                            value={waiting.id}
                          />
                          <input type="hidden" name="manage" value="withdraw" />
                          <button type="submit" className={ghostBtn}>
                            {he ? 'ביטול הבקשה' : 'Withdraw'}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <form
                      action={platformConnectAction}
                      className="mt-auto pt-2.5"
                    >
                      <input type="hidden" name="locale" value={locale} />
                      <input
                        type="hidden"
                        name="participantId"
                        value={person.participantId}
                      />
                      <button
                        type="submit"
                        className="n-pill-outline"
                      >
                        {he ? 'התחברות' : 'Connect'}
                      </button>
                    </form>
                  )}
                </article>
              </li>
            );
          })}
        </ul>

        {loadMoreHref ? (
          <p className="mt-4 text-center">
            <Link
              href={loadMoreHref}
              scroll={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--n-purple)]/8 px-7 text-sm font-medium text-[var(--n-ink)] ring-1 ring-[var(--n-purple)]/25 transition-colors hover:bg-[var(--n-purple)]/14 hover:ring-[var(--n-purple)]/45 active:bg-[var(--n-purple)]/20"
            >
              <LoadMoreLabel
                label={he ? 'עוד אנשים' : 'Show more people'}
                hint={
                  he
                    ? `· נותרו ${num(remaining)}`
                    : `· ${num(remaining)} remaining`
                }
              />
            </Link>
          </p>
        ) : filteredCount > 12 ? (
          <p className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-center text-xs text-[var(--n-faint)]">
            <span aria-hidden="true" className="text-[var(--n-green)]">
              ✓
            </span>
            {he ? 'ראיתם את כולם' : "You've seen everyone"}
          </p>
        ) : null}
      </>
    )}
  </section>
);

export default ParticipantDirectory;
