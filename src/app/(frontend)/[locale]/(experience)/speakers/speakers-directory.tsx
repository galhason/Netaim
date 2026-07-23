'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/config/locales';
import {
  Avatar,
  SearchBar,
  FilterChips,
  EmptyState,
} from '@/features/conference';

export interface DirectorySpeaker {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  photoUrl?: string;
  isRegistered: boolean;
  sessionCount: number;
}

type FilterKey = 'all' | 'registered' | 'external';

const COPY = {
  searchPlaceholder: {
    he: 'חיפוש לפי שם, תפקיד או ארגון…',
    en: 'Search by name, role or organization…',
  },
  all: { he: 'הכול', en: 'All' },
  registered: { he: 'משתמשים רשומים', en: 'Registered' },
  external: { he: 'דוברים אורחים', en: 'Guests' },
  count: { he: 'דוברים', en: 'speakers' },
  registeredBadge: { he: 'משתמש רשום', en: 'Registered' },
  externalBadge: { he: 'דובר אורח', en: 'Guest speaker' },
  sessions: { he: 'פעילויות', en: 'sessions' },
  oneSession: { he: 'פעילות אחת', en: '1 session' },
  noSessions: { he: 'טרם שובץ', en: 'Not scheduled yet' },
  viewProfile: { he: 'צפייה בפרופיל', en: 'View profile' },
  emptyTitle: { he: 'לא נמצאו דוברים', en: 'No speakers found' },
  emptyHint: {
    he: 'נסו מונח חיפוש אחר או הסירו את הסינון.',
    en: 'Try a different search or clear the filter.',
  },
} as const;

const SpeakersDirectory = ({
  speakers,
  locale,
}: {
  speakers: DirectorySpeaker[];
  locale: Locale;
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const counts = useMemo(
    () => ({
      all: speakers.length,
      registered: speakers.filter((s) => s.isRegistered).length,
      external: speakers.filter((s) => !s.isRegistered).length,
    }),
    [speakers],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return speakers.filter((s) => {
      if (filter === 'registered' && !s.isRegistered) return false;
      if (filter === 'external' && s.isRegistered) return false;
      if (!q) return true;
      return [s.name, s.jobTitle, s.company]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [speakers, query, filter]);

  const filters = [
    { key: 'all', label: `${COPY.all[locale]} · ${counts.all}` },
    {
      key: 'registered',
      label: `${COPY.registered[locale]} · ${counts.registered}`,
    },
    { key: 'external', label: `${COPY.external[locale]} · ${counts.external}` },
  ];

  const sessionLine = (n: number) =>
    n === 0
      ? COPY.noSessions[locale]
      : n === 1
        ? COPY.oneSession[locale]
        : `${n} ${COPY.sessions[locale]}`;

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="md:flex-1">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={COPY.searchPlaceholder[locale]}
          />
        </div>
        <FilterChips
          filters={filters}
          active={filter}
          onSelect={(k) => setFilter(k as FilterKey)}
        />
      </div>

      <p className="mt-5 text-sm text-[var(--x-faint)]">
        {visible.length} {COPY.count[locale]}
      </p>

      {visible.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((speaker) => {
            const role = [speaker.jobTitle, speaker.company]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={speaker.id}>
                <Link
                  href={`/${locale}/speakers/${speaker.id}`}
                  className="group flex h-full flex-col rounded-[var(--x-r-card)] border border-[var(--x-line)] bg-[var(--x-surface)] p-5 shadow-[var(--x-shadow)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--x-primary)]/25 hover:shadow-[var(--x-shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--x-ring)]"
                >
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={speaker.name}
                      url={speaker.photoUrl}
                      size={60}
                      ring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-lg font-bold tracking-tight text-[var(--x-ink)]">
                        {speaker.name}
                      </h3>
                      {role ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-[var(--x-soft)]">
                          {role}
                        </p>
                      ) : null}
                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-[var(--x-r-pill)] px-2.5 py-1 text-xs font-medium ${
                          speaker.isRegistered
                            ? 'bg-[var(--x-ok-wash)] text-[var(--x-ok)]'
                            : 'bg-[#f0f1f4] text-[var(--x-soft)]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-block size-1.5 rounded-full ${
                            speaker.isRegistered
                              ? 'bg-[var(--x-ok)]'
                              : 'bg-[var(--x-faint)]'
                          }`}
                        />
                        {speaker.isRegistered
                          ? COPY.registeredBadge[locale]
                          : COPY.externalBadge[locale]}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--x-line)] pt-3.5">
                    <span className="text-xs font-medium text-[var(--x-faint)]">
                      {sessionLine(speaker.sessionCount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--x-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                      {COPY.viewProfile[locale]}
                      <span aria-hidden="true" className="rtl:-scale-x-100">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title={COPY.emptyTitle[locale]}
            hint={COPY.emptyHint[locale]}
          />
        </div>
      )}
    </div>
  );
};

export default SpeakersDirectory;
