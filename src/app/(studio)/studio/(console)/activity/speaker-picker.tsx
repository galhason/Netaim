'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Locale } from '@/config/locales';
import type { ResolvedSpeaker, SpeakerCandidate } from '@/features/speakers';
import { createSpeakerAction } from './actions';

interface Props {
  slug: string;
  locale: Locale;
  candidates: SpeakerCandidate[];
  initial?: ResolvedSpeaker[];
  onCountChange?: (count: number) => void;
}

const T = (locale: Locale) => ({
  lead:
    locale === 'he'
      ? 'הוסיפו דובר אחד או יותר. בחרו משתמש קיים במערכת, או צרו דובר חיצוני.'
      : 'Add one or more speakers. Pick an existing user, or create an external speaker.',
  add: locale === 'he' ? 'הוספת דובר' : 'Add speaker',
  tabUser: locale === 'he' ? 'משתמש קיים' : 'Existing user',
  tabExternal: locale === 'he' ? 'דובר חיצוני' : 'External speaker',
  search: locale === 'he' ? 'חיפוש לפי שם או חברה…' : 'Search by name or company…',
  noMatches: locale === 'he' ? 'לא נמצאו משתמשים תואמים.' : 'No matching users.',
  registered: locale === 'he' ? 'משתמש רשום' : 'Registered user',
  external: locale === 'he' ? 'דובר חיצוני' : 'External speaker',
  fName: locale === 'he' ? 'שם מלא' : 'Full name',
  fJob: locale === 'he' ? 'תפקיד' : 'Job title',
  fCompany: locale === 'he' ? 'חברה / ארגון' : 'Company',
  fBio: locale === 'he' ? 'ביוגרפיה קצרה' : 'Short bio',
  fLink: locale === 'he' ? 'קישור (LinkedIn, אתר…)' : 'Link (LinkedIn, site…)',
  create: locale === 'he' ? 'הוספה' : 'Add',
  cancel: locale === 'he' ? 'ביטול' : 'Cancel',
  remove: locale === 'he' ? 'הסרה' : 'Remove',
  empty: locale === 'he' ? 'לא נבחרו דוברים עדיין.' : 'No speakers selected yet.',
  addingErr:
    locale === 'he' ? 'לא ניתן היה להוסיף. נסו שוב.' : 'Could not add. Try again.',
});

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

const subtitle = (s: {
  jobTitle?: string;
  company?: string;
}): string => [s.jobTitle, s.company].filter(Boolean).join(' · ');

const Avatar = ({
  url,
  name,
  size = 34,
}: {
  url?: string;
  name: string;
  size?: number;
}) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      className="flex-none rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid flex-none place-items-center rounded-full bg-[var(--c-bronze)]/20 text-xs font-semibold text-[var(--c-bronze)]"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );

const Badge = ({
  registered,
  locale,
}: {
  registered: boolean;
  locale: Locale;
}) => {
  const t = T(locale);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        registered
          ? 'bg-emerald-400/12 text-emerald-300'
          : 'bg-[rgba(255,255,255,0.06)] text-[var(--c-text-soft)]'
      }`}
    >
      <span aria-hidden="true">{registered ? '🟢' : '⚪'}</span>
      {registered ? t.registered : t.external}
    </span>
  );
};

const field =
  'w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)] outline-none focus:border-[var(--c-bronze)]';

const SpeakerPicker = ({
  slug,
  locale,
  candidates,
  initial = [],
  onCountChange,
}: Props) => {
  const t = T(locale);
  const [selected, setSelected] = useState<ResolvedSpeaker[]>(initial);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'user' | 'external'>('user');
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // external form
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [link, setLink] = useState('');

  useEffect(() => onCountChange?.(selected.length), [selected, onCountChange]);

  const selectedAccountIds = useMemo(
    () => new Set(selected.map((s) => s.accountId).filter(Boolean)),
    [selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter((c) => !selectedAccountIds.has(c.accountId))
      .filter(
        (c) =>
          q === '' ||
          c.name.toLowerCase().includes(q) ||
          (c.company ?? '').toLowerCase().includes(q) ||
          (c.jobTitle ?? '').toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [candidates, query, selectedAccountIds]);

  const add = (speaker: ResolvedSpeaker | null) => {
    if (!speaker) {
      setError(t.addingErr);
      return;
    }
    setSelected((prev) =>
      prev.some((s) => s.id === speaker.id) ? prev : [...prev, speaker],
    );
  };

  const pickUser = (candidate: SpeakerCandidate) => {
    setError('');
    startTransition(async () => {
      const speaker = await createSpeakerAction({
        slug,
        contentLocale: locale,
        mode: 'linked',
        accountId: candidate.accountId,
      });
      add(speaker);
    });
  };

  const createExternal = () => {
    if (!name.trim()) return;
    setError('');
    startTransition(async () => {
      const speaker = await createSpeakerAction({
        slug,
        contentLocale: locale,
        mode: 'external',
        name,
        jobTitle,
        company,
        bio,
        socialLinks: link.trim() ? [{ url: link.trim() }] : undefined,
      });
      add(speaker);
      if (speaker) {
        setName('');
        setJobTitle('');
        setCompany('');
        setBio('');
        setLink('');
        setOpen(false);
      }
    });
  };

  const remove = (id: string) =>
    setSelected((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--c-text-soft)]">{t.lead}</p>

      {/* Hidden inputs — one per selected speaker, submitted with the form */}
      {selected.map((s) => (
        <input key={s.id} type="hidden" name="speakerId" value={s.id} />
      ))}

      {/* Selected chips */}
      {selected.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--c-line)] px-4 py-5 text-center text-sm text-[var(--c-text-faint)]">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {selected.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
            >
              <Avatar url={s.photoUrl} name={s.name} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-[var(--c-text)]">
                    {s.name}
                  </span>
                  <Badge registered={s.isRegistered} locale={locale} />
                </span>
                {subtitle(s) ? (
                  <span className="block truncate text-xs text-[var(--c-text-soft)]">
                    {subtitle(s)}
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label={t.remove}
                className="flex-none rounded-md px-2 py-1 text-xs text-[var(--c-text-faint)] hover:text-rose-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--c-line)] px-3.5 py-2 text-sm text-[var(--c-text)] hover:border-[var(--c-bronze)]"
        >
          + {t.add}
        </button>
      ) : (
        <div className="rounded-xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] p-3">
          {/* Tabs */}
          <div className="mb-3 flex gap-1 rounded-lg bg-[rgba(6,10,16,0.5)] p-1 text-sm">
            {(['user', 'external'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                  tab === key
                    ? 'bg-[var(--c-bronze)] font-medium text-[#161006]'
                    : 'text-[var(--c-text-soft)] hover:text-[var(--c-text)]'
                }`}
              >
                {key === 'user' ? t.tabUser : t.tabExternal}
              </button>
            ))}
          </div>

          {tab === 'user' ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search}
                className={field}
              />
              <ul className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-2 py-6 text-center text-sm text-[var(--c-text-faint)]">
                    {t.noMatches}
                  </li>
                ) : (
                  filtered.map((c) => (
                    <li key={c.accountId}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => pickUser(c)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-50"
                      >
                        <Avatar url={c.photoUrl} name={c.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--c-text)]">
                            {c.name}
                          </span>
                          {subtitle(c) ? (
                            <span className="block truncate text-xs text-[var(--c-text-soft)]">
                              {subtitle(c)}
                            </span>
                          ) : null}
                        </span>
                        <span aria-hidden="true" className="text-xs">
                          🟢
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.fName}
                className={field}
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder={t.fJob}
                  className={field}
                />
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t.fCompany}
                  className={field}
                />
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.fBio}
                rows={2}
                className={`${field} resize-y`}
              />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={t.fLink}
                className={field}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || !name.trim()}
                  onClick={createExternal}
                  className="rounded-lg bg-[var(--c-bronze)] px-4 py-1.5 text-sm font-medium text-[#161006] disabled:opacity-40"
                >
                  {t.create}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-2 text-xs text-rose-300">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SpeakerPicker;
