'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Locale } from '@/config/locales';
import type { ResolvedSpeaker, SpeakerCandidate } from '@/features/speakers';
import { createSpeakerAction, speakerWordsAction, updateSpeakerAction, type SpeakerWords } from './actions';

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
  edit: locale === 'he' ? 'עריכה' : 'Edit',
  save: locale === 'he' ? 'שמירה' : 'Save',
  editLead:
    locale === 'he'
      ? 'הפרטים כפי שיוצגו בתוכנייה, בשתי השפות. שורה באנגלית שנשארת ריקה מציגה את העברית.'
      : 'The details as the programme shows them, in both languages. An empty English row shows the Hebrew.',
  editFull: locale === 'he' ? 'עריכה מלאה (כולל תמונה)' : 'Full edit (with photo)',
  editingErr: locale === 'he' ? 'השמירה נכשלה. נסו שוב.' : 'Could not save. Try again.',
  loadingErr: locale === 'he' ? 'לא ניתן היה לטעון את הפרטים.' : 'Could not load the details.',
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
  'w-full rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.5)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-faint)] outline-none focus:border-[var(--c-bronze)]';

const EMPTY_WORDS: SpeakerWords = { name: '', jobTitle: '', company: '', bio: '' };

const LangTag = ({ children }: { children: string }) => (
  <span className="grid w-9 flex-none place-items-center rounded-md bg-[rgba(255,255,255,0.06)] text-[10px] font-semibold text-[var(--c-text-faint)]">
    {children}
  </span>
);

/*
 * One field, both languages, stacked — the wizard's own Pair, in
 * miniature: a tag on the side says which language the row is.
 */
const WordPair = ({
  label,
  he,
  en,
  onHe,
  onEn,
  rows,
  placeholder,
}: {
  label: string;
  he: string;
  en: string;
  onHe: (value: string) => void;
  onEn: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) => {
  const control = (value: string, onChange: (value: string) => void, dir: 'rtl' | 'ltr') =>
    rows ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} dir={dir} placeholder={placeholder} className={`${field} resize-y`} />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} dir={dir} placeholder={placeholder} className={field} />
    );
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-[var(--c-text-soft)]">{label}</span>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-stretch gap-1.5">
          <LangTag>עב</LangTag>
          {control(he, onHe, 'rtl')}
        </div>
        <div className="flex items-stretch gap-1.5">
          <LangTag>EN</LangTag>
          {control(en, onEn, 'ltr')}
        </div>
      </div>
    </div>
  );
};

/*
 * The speaker's details, rewritten in place — the same words the roster
 * page edits, without leaving the activity. The chip redraws from what
 * the server saved, so the list never shows words that were not kept.
 */
const SpeakerEditor = ({
  slug,
  locale,
  speaker,
  onSaved,
  onClose,
}: {
  slug: string;
  locale: Locale;
  speaker: ResolvedSpeaker;
  onSaved: (speaker: ResolvedSpeaker) => void;
  onClose: () => void;
}) => {
  const t = T(locale);
  const [he, setHe] = useState<SpeakerWords>(EMPTY_WORDS);
  const [en, setEn] = useState<SpeakerWords>(EMPTY_WORDS);
  const [link, setLink] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    speakerWordsAction({ slug, id: speaker.id }).then((words) => {
      if (!alive) return;
      if (!words) {
        setError(t.loadingErr);
        return;
      }
      setHe(words.he);
      setEn(words.en);
      setLink(words.link);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [slug, speaker.id, t.loadingErr]);

  const patch = (set: (value: SpeakerWords) => void, current: SpeakerWords, key: keyof SpeakerWords) =>
    (value: string) => set({ ...current, [key]: value });

  const save = () => {
    setError('');
    startTransition(async () => {
      const saved = await updateSpeakerAction({ slug, id: speaker.id, contentLocale: locale, he, en, link });
      if (!saved) {
        setError(t.editingErr);
        return;
      }
      onSaved(saved);
    });
  };

  const rosterHref = `/studio/conference/${encodeURIComponent(slug)}/speakers#speaker-${speaker.id}`;

  return (
    <div className="mt-2 flex flex-col gap-2.5 rounded-lg border border-[var(--c-line)] bg-[rgba(7,19,36,0.35)] p-3">
      <p className="text-xs text-[var(--c-text-soft)]">{t.editLead}</p>
      <WordPair label={t.fName} he={he.name} en={en.name} onHe={patch(setHe, he, 'name')} onEn={patch(setEn, en, 'name')} placeholder={speaker.name} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <WordPair label={t.fJob} he={he.jobTitle} en={en.jobTitle} onHe={patch(setHe, he, 'jobTitle')} onEn={patch(setEn, en, 'jobTitle')} placeholder={speaker.jobTitle} />
        <WordPair label={t.fCompany} he={he.company} en={en.company} onHe={patch(setHe, he, 'company')} onEn={patch(setEn, en, 'company')} placeholder={speaker.company} />
      </div>
      <WordPair label={t.fBio} he={he.bio} en={en.bio} onHe={patch(setHe, he, 'bio')} onEn={patch(setEn, en, 'bio')} rows={3} />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={t.fLink} dir="ltr" className={field} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !loaded}
          onClick={save}
          className="rounded-lg bg-[var(--c-bronze)] px-4 py-1.5 text-sm font-medium text-[var(--c-on-accent)] disabled:opacity-40"
        >
          {t.save}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
        >
          {t.cancel}
        </button>
        <a
          href={rosterHref}
          target="_blank"
          rel="noreferrer"
          className="ms-auto text-xs text-[var(--c-text-faint)] underline-offset-2 hover:text-[var(--c-text)] hover:underline"
        >
          {t.editFull}
        </a>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
};

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
  const [editing, setEditing] = useState<string | null>(null);

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

  const replace = (speaker: ResolvedSpeaker) => {
    setSelected((prev) => prev.map((s) => (s.id === speaker.id ? speaker : s)));
    setEditing(null);
  };

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
              className="rounded-xl border border-[var(--c-line)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
            >
              <div className="flex items-center gap-3">
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
                  onClick={() => setEditing(editing === s.id ? null : s.id)}
                  aria-expanded={editing === s.id}
                  className="flex-none rounded-md px-2 py-1 text-xs text-[var(--c-text-soft)] hover:text-[var(--c-text)]"
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  aria-label={t.remove}
                  className="flex-none rounded-md px-2 py-1 text-xs text-[var(--c-text-faint)] hover:text-rose-300"
                >
                  ✕
                </button>
              </div>
              {editing === s.id ? (
                <SpeakerEditor
                  slug={slug}
                  locale={locale}
                  speaker={s}
                  onSaved={replace}
                  onClose={() => setEditing(null)}
                />
              ) : null}
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
          <div className="mb-3 flex gap-1 rounded-lg bg-[rgba(7,19,36,0.5)] p-1 text-sm">
            {(['user', 'external'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                  tab === key
                    ? 'bg-[var(--c-bronze)] font-medium text-[var(--c-on-accent)]'
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
                  className="rounded-lg bg-[var(--c-bronze)] px-4 py-1.5 text-sm font-medium text-[var(--c-on-accent)] disabled:opacity-40"
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
