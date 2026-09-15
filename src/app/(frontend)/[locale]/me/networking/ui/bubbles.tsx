import { RingedAvatar, TONE_TEXT, type ReasonTone } from './shared';
import type { FellowParticipant } from '@/infrastructure';

/*
 * The room, as people — the dominant surface of the page, on purpose.
 *
 * This is not decoration and not a carousel of thumbnails: it is the
 * page's primary interaction. Large ringed portraits, each carrying
 * its reason in words and in a color that means something — gold for a
 * room you shared, blue for a matching interest, pink for the same
 * organization, green for an open door, purple for plain discovery.
 * Never a percentage: the platform computes no "match score", and a
 * number it cannot defend would be a lie with decimals.
 *
 * On a phone the rail scrolls under the thumb; on desktop it breathes
 * into two loose rows. Tapping a face jumps to that person's card in
 * the directory below — discovery here, decision there, one anchor
 * apart and zero JavaScript between them.
 */
export interface Bubble {
  person: FellowParticipant;
  reason: string;
  tone: ReasonTone;
}

const PeopleBubbles = ({
  he,
  bubbles,
}: {
  he: boolean;
  bubbles: Bubble[];
}) => {
  if (bubbles.length === 0) {
    return null;
  }
  return (
    <section id="discovery" className="scroll-mt-24">
      <h2
        className={`mb-3.5 text-center font-display text-2xl font-semibold md:text-[1.7rem] ${
          he ? '' : 'tracking-wide'
        }`}
      >
        {he ? 'אנשים ששווה להכיר' : 'People worth meeting'}
      </h2>
      {/*
        * The rail's rhythm is the section: bubbles sized for a social
        * rail (64px on a phone, 72px up) rather than standalone cards,
        * spaced tightly enough that six to ten share a desktop row and
        * four lead a phone screen. A small room centers its few faces
        * and collapses around them — never two giants in a field.
        */}
      <ul className="-mx-4 flex snap-x gap-x-4 gap-y-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-x-5 md:overflow-visible md:px-0">
        {bubbles.map(({ person, reason, tone }, index) => (
          <li
            key={person.participantId}
            className="lounge-rise w-[4.75rem] flex-none snap-start md:w-[5.5rem]"
            style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
          >
            <a
              href={`#person-${person.participantId}`}
              className="group n-bubble-link"
            >
              <span className="transition-transform duration-200 group-hover:scale-105">
                <RingedAvatar
                  name={person.name}
                  photoUrl={person.photoUrl}
                  tone={tone}
                  open={person.openToMeetings}
                  dim="size-16 md:size-[4.5rem]"
                />
              </span>
              <span className="w-full">
                <span className="n-name-sm">
                  {person.name}
                </span>
                <span
                  className={`block truncate text-[10.5px] leading-tight ${TONE_TEXT[tone]}`}
                >
                  {reason}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PeopleBubbles;
