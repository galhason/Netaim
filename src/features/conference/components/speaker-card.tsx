'use client';

import type { Locale } from '@/config/locales';
import type { SpeakerVM } from '../types';
import { Avatar } from '../ui/kit';
import { IconArrow, IconLink } from '../ui/icons';

/*
 * A speaker inside an activity: portrait, identity, a short bio and the
 * door to their (future) profile. Registered speakers link to their
 * profile; external ones show only what the conference authored.
 */
const SpeakerCard = ({
  speaker,
  locale,
}: {
  speaker: SpeakerVM;
  locale: Locale;
}) => {
  const role = [speaker.role, speaker.company].filter(Boolean).join(' · ');
  return (
    <div className="rounded-[var(--x-r-field)] border border-[var(--x-line)] bg-[var(--x-raise)] p-4">
      <div className="flex items-start gap-3.5">
        <Avatar name={speaker.name} url={speaker.photoUrl} size={52} ring={false} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-bold text-[var(--x-ink)]">
            {speaker.name}
          </p>
          {role ? (
            <p className="text-sm text-[var(--x-soft)]">{role}</p>
          ) : null}
        </div>
      </div>
      {speaker.bio ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--x-soft)]">
          {speaker.bio}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        {speaker.registered ? (
          <a
            href={`/${locale}/speakers/${speaker.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--x-primary)] hover:text-[var(--x-primary-strong)]"
          >
            {locale === 'he' ? 'צפייה בפרופיל' : 'View profile'}
            <IconArrow className="size-4 rtl:-scale-x-100" />
          </a>
        ) : (
          <span />
        )}
        {speaker.links && speaker.links.length > 0 ? (
          <span className="flex items-center gap-1.5">
            {speaker.links.slice(0, 4).map((link, i) => (
              <a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={link.label ?? 'link'}
                className="grid size-8 place-items-center rounded-lg border border-[var(--x-line)] bg-[var(--x-surface)] text-[var(--x-soft)] transition-colors hover:text-[var(--x-primary)]"
              >
                <IconLink className="size-4" />
              </a>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default SpeakerCard;
