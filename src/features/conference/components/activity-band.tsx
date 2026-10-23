import type { SVGProps } from 'react';
import type { Locale } from '@/config/locales';
import type { SpeakerVM } from '../types';
import { IconCoffee, IconGathering, IconPin, IconUsers } from '../ui/icons';

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

export const PANEL_WORDS = {
  moderator: { he: 'מנחה הפאנל', en: 'Panel moderator' },
  members: { he: 'חברי הפאנל', en: 'Panel members' },
} as const;

/*
 * The quiet line under a band's name: who leads it and where. A panel
 * that seats members says so — its host is named as the moderator, and
 * the members follow on a line of their own, credited the same way.
 * Without members the line is exactly what it always was.
 */
export const BandLine = ({
  speakers,
  panelists = [],
  place,
  locale,
}: {
  speakers: SpeakerVM[];
  panelists?: SpeakerVM[];
  place?: string;
  locale: Locale;
}) => {
  const panel = panelists.length > 0;
  if (speakers.length === 0 && !panel && !place) return null;
  const line = 'mt-1 flex min-w-0 flex-wrap items-center gap-y-0.5 text-[11px] text-[var(--x-soft)]';
  return (
    <>
      {speakers.length > 0 || place ? (
        <span className={`${line} gap-x-3`}>
          {speakers.length > 0 ? (
            panel ? (
              <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5">
                <BandHosts speakers={speakers} />
                <span className="text-[var(--x-faint)]">· {PANEL_WORDS.moderator[locale]}</span>
              </span>
            ) : (
              <BandHosts speakers={speakers} />
            )
          ) : null}
          {place ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <IconPin className="size-3.5 flex-none text-[var(--x-faint)]" />
              <span className="truncate">{place}</span>
            </span>
          ) : null}
        </span>
      ) : null}
      {panel ? (
        <span className={`${line} gap-x-2`}>
          <span className="flex-none font-medium text-[var(--x-ink)]">{PANEL_WORDS.members[locale]}:</span>
          <BandHosts speakers={panelists} />
        </span>
      ) : null}
    </>
  );
};
