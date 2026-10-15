import type { SVGProps } from 'react';
import type { SpeakerVM } from '../types';
import { IconCoffee, IconGathering, IconUsers } from '../ui/icons';

/*
 * The one picture a plain activity carries wherever it is drawn as a
 * band — the programme, the personal schedule, the hour's own line: a
 * cup for a break, people together for a panel. Kept in one place so
 * the screens never disagree on what a panel looks like.
 */
export const BandIcon = ({ type, ...props }: SVGProps<SVGSVGElement> & { type: string }) =>
  type === 'gathering' ? <IconGathering {...props} /> : <IconCoffee {...props} />;

/*
 * Who leads a band — a panel's host, the voice of a welcome. Names, and
 * a small face beside a name only where one was uploaded: no initials
 * standing in for a missing photo, no card, nothing to open. A person
 * here is a credit on the line, not a speaker to read about.
 */
export const BandHosts = ({ speakers }: { speakers: SpeakerVM[] }) => {
  if (speakers.length === 0) return null;
  const anyFace = speakers.some((speaker) => speaker.photoUrl);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      {anyFace ? null : <IconUsers className="size-3.5 flex-none text-[var(--x-faint)]" />}
      {speakers.map((speaker) => (
        <span key={speaker.id} className="inline-flex min-w-0 items-center gap-1.5">
          {speaker.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={speaker.photoUrl}
              alt=""
              width={22}
              height={22}
              loading="lazy"
              className="size-[22px] flex-none rounded-full object-cover"
            />
          ) : null}
          <span className="truncate">{speaker.name}</span>
        </span>
      ))}
    </span>
  );
};
