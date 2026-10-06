'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import {
  CONFERENCE_SECTIONS,
  CONTENT_EDITOR_UI as UI,
  HIGHLIGHT_ICONS,
  HIGHLIGHT_ICON_LABELS,
  VENUE_FACT_ICONS,
  VENUE_FACT_ICON_LABELS,
  type ConferenceSection,
  type SectionField,
  type SectionMedia,
} from '@/features/studio/constants/conference-sections';
import {
  publishConferenceAction,
  saveConferenceSectionAction,
  setSectionVisibilityAction,
  type SectionSaveInput,
} from './actions';

/* ------------------------------------------------------------------ */

export interface MediaItem {
  id: string;
  url: string;
  alt: string;
  filename: string;
  mimeType?: string;
  posterUrl?: string;
}

export interface FactRow {
  icon: string;
  he: { label: string; description: string };
  en: { label: string; description: string };
}

export interface HighlightRow {
  icon: string;
  imageId: string;
  he: { title: string; description: string };
  en: { title: string; description: string };
}

export interface EditorValues {
  he: Record<string, string>;
  en: Record<string, string>;
  shared: Record<string, string>;
  facts: FactRow[];
  highlights: HighlightRow[];
}

export type PublishState = 'published' | 'pending' | 'never';

interface EditorProps {
  slug: string;
  locale: Locale;
  initial: EditorValues;
  media: MediaItem[];
  publishState: PublishState;
  blockers: number;
  siteLinks: { hub: string; info: string };
  composition: { scene: string; hidden: boolean; variant?: string; density?: string; emphasis?: string }[];
}

type SectionStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 900;

const isVideo = (item: MediaItem): boolean => Boolean(item.mimeType?.startsWith('video/'));

const INPUT =
  'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none transition-colors placeholder:text-[var(--c-text-faint)] focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';
const BTN =
  'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[var(--c-line-strong)] px-3 text-sm text-[var(--c-text)] transition-colors hover:border-[var(--c-bronze)] hover:text-[var(--c-bronze)] disabled:opacity-50';
const BTN_PRIMARY =
  'inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] transition-colors hover:bg-[var(--c-bronze-hover)] disabled:opacity-50';

/* ------------------------------------------------------------------ */

const ConferenceContentEditor = ({
  slug,
  locale,
  initial,
  media: library,
  publishState: initialPublishState,
  blockers,
  siteLinks,
  composition: initialComposition,
}: EditorProps) => {
  const he = locale === 'he';
  const t = (entry: Record<Locale, string>) => entry[locale];

  const [values, setValues] = useState<EditorValues>(initial);
  const [media, setMedia] = useState<MediaItem[]>(library);
  const [selected, setSelected] = useState<string>(CONFERENCE_SECTIONS[0]?.id ?? 'identity');
  const [status, setStatus] = useState<Record<string, SectionStatus>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const [publishState, setPublishState] = useState<PublishState>(initialPublishState);
  const [publishNote, setPublishNote] = useState<string | null>(null);
  const [composition, setComposition] = useState(initialComposition);
  const [, startTransition] = useTransition();
  const [publishing, setPublishing] = useState(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latest = useRef(values);
  latest.current = values;

  const section = useMemo(
    () => CONFERENCE_SECTIONS.find((entry) => entry.id === selected) ?? CONFERENCE_SECTIONS[0]!,
    [selected],
  );

  /* ---- saving ---------------------------------------------------- */

  const payloadFor = useCallback(
    (entry: ConferenceSection, current: EditorValues): SectionSaveInput => {
      const keys = new Set(entry.fields.map((field) => field.key));
      const sharedKeys = new Set([
        ...entry.fields.filter((field) => !field.localized).map((field) => field.key),
        ...entry.media.map((item) => item.key),
      ]);
      const only = (source: Record<string, string>, allowed: Set<string>) =>
        Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key)));
      return {
        slug,
        section: entry.id,
        he: only(current.he, keys),
        en: only(current.en, keys),
        shared: only(current.shared, sharedKeys),
        ...(entry.special === 'facts' ? { facts: current.facts } : {}),
        ...(entry.special === 'highlights' ? { highlights: current.highlights } : {}),
      };
    },
    [slug],
  );

  const flush = useCallback(
    (sectionId: string) => {
      const entry = CONFERENCE_SECTIONS.find((item) => item.id === sectionId);
      if (!entry) return;
      clearTimeout(timers.current[sectionId]);
      setStatus((held) => ({ ...held, [sectionId]: 'saving' }));
      startTransition(async () => {
        const outcome = await saveConferenceSectionAction(payloadFor(entry, latest.current));
        if (outcome.ok) {
          setStatus((held) => (held[sectionId] === 'saving' ? { ...held, [sectionId]: 'saved' } : held));
          setSavedAt((held) => ({ ...held, [sectionId]: outcome.savedAt }));
          setPublishState((held) => (held === 'never' ? 'never' : 'pending'));
          setPublishNote(null);
        } else {
          setStatus((held) => ({ ...held, [sectionId]: 'error' }));
        }
      });
    },
    [payloadFor],
  );

  const touch = useCallback(
    (sectionId: string) => {
      setStatus((held) => ({ ...held, [sectionId]: 'dirty' }));
      clearTimeout(timers.current[sectionId]);
      timers.current[sectionId] = setTimeout(() => flush(sectionId), AUTOSAVE_MS);
    },
    [flush],
  );

  const flushAll = useCallback(() => {
    for (const [id, state] of Object.entries(status)) {
      if (state === 'dirty' || state === 'error') flush(id);
    }
  }, [flush, status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        flushAll();
      }
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (Object.values(status).some((state) => state === 'dirty' || state === 'saving')) {
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [flushAll, status]);

  /* ---- value setters --------------------------------------------- */

  const setText = (lang: 'he' | 'en' | 'shared', key: string, value: string) => {
    setValues((held) => ({ ...held, [lang]: { ...held[lang], [key]: value } }));
    touch(section.id);
  };
  const setFacts = (facts: FactRow[]) => {
    setValues((held) => ({ ...held, facts }));
    touch('venue');
  };
  const setHighlights = (highlights: HighlightRow[]) => {
    setValues((held) => ({ ...held, highlights }));
    touch('highlights');
  };

  /* ---- publishing ------------------------------------------------ */

  const publish = async () => {
    flushAll();
    setPublishing(true);
    setPublishNote(null);
    try {
      /* Let a pending autosave land first. */
      await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_MS + 300));
      const outcome = await publishConferenceAction(slug);
      if (outcome.ok) {
        setPublishState('published');
        setPublishNote(t(UI.publishDone));
      } else {
        setPublishNote(
          `${t(UI.publishBlocked)}${outcome.blockers ? ` (${outcome.blockers})` : ''}`,
        );
      }
    } finally {
      setPublishing(false);
    }
  };

  /* ---- completeness ---------------------------------------------- */

  const completeness = (entry: ConferenceSection): { he: boolean; en: boolean } => {
    const keys = entry.fields.filter((field) => field.localized && field.onSite).map((field) => field.key);
    if (keys.length === 0) return { he: true, en: true };
    return {
      he: keys.every((key) => (values.he[key] ?? '').trim() !== ''),
      en: keys.every((key) => (values.en[key] ?? '').trim() !== ''),
    };
  };

  /* ---- visibility on the platform page ---------------------------- */

  const sceneHidden = (scene?: string) =>
    Boolean(scene && composition.find((entry) => entry.scene === scene)?.hidden);
  const toggleScene = (scene: string) => {
    const next = composition.some((entry) => entry.scene === scene)
      ? composition.map((entry) => (entry.scene === scene ? { ...entry, hidden: !entry.hidden } : entry))
      : [...composition, { scene, hidden: true }];
    setComposition(next);
    startTransition(async () => {
      await setSectionVisibilityAction({ slug, composition: next });
    });
  };

  /* ---- render ---------------------------------------------------- */

  const sectionStatus = status[section.id] ?? 'idle';
  const statusText: Record<SectionStatus, string> = {
    idle: '',
    dirty: t(UI.unsaved),
    saving: t(UI.saving),
    saved: `${t(UI.saved)}${savedAt[section.id] ? ` · ${new Date(savedAt[section.id]!).toLocaleTimeString(he ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}`,
    error: t(UI.saveFailed),
  };

  return (
    <div className="grid min-h-0 gap-0 md:grid-cols-[240px_1fr]">
      {/* section rail */}
      <aside className="border-b border-[var(--c-line)] md:border-b-0 md:border-e">
        <p className="px-4 pt-4 text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
          {t(UI.sections)}
        </p>
        <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
          {CONFERENCE_SECTIONS.map((entry) => {
            const done = completeness(entry);
            const active = entry.id === section.id;
            const state = status[entry.id];
            return (
              <li key={entry.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSelected(entry.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors ${
                    active
                      ? 'bg-[var(--c-panel)] text-[var(--c-text)]'
                      : 'text-[var(--c-text-soft)] hover:bg-[var(--c-panel)] hover:text-[var(--c-text)]'
                  }`}
                >
                  <span className="truncate">{t(entry.label)}</span>
                  <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                    {state === 'saving' || state === 'dirty' ? (
                      <span className="size-1.5 animate-pulse rounded-full bg-[var(--c-bronze)]" />
                    ) : null}
                    <span
                      title={done.he ? t(UI.completeness) : t(UI.missingHe)}
                      className={`size-2 rounded-full ${done.he ? 'bg-[var(--c-live)]' : 'bg-[var(--c-line-strong)]'}`}
                    />
                    <span
                      title={done.en ? t(UI.completeness) : t(UI.missingEn)}
                      className={`size-2 rounded-full ${done.en ? 'bg-[var(--c-live)]' : 'bg-[var(--c-line-strong)]'}`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hidden px-4 pb-4 text-[11px] text-[var(--c-text-faint)] md:block">{t(UI.shortcuts)}</p>
      </aside>

      {/* the section */}
      <section className="min-w-0 p-4 md:p-6">
        {/* publish bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--c-line)] bg-[var(--c-panel)] px-4 py-3">
          <span
            className={`size-2.5 rounded-full ${
              publishState === 'published' ? 'bg-[var(--c-live)]' : publishState === 'pending' ? 'bg-[var(--c-bronze)]' : 'bg-[var(--c-line-strong)]'
            }`}
            aria-hidden="true"
          />
          <span className="text-sm text-[var(--c-text)]">
            {publishState === 'published' ? t(UI.published) : publishState === 'pending' ? t(UI.pendingPublish) : t(UI.neverPublished)}
          </span>
          {publishNote ? <span className="text-xs text-[var(--c-text-soft)]">{publishNote}</span> : null}
          <span className="ms-auto flex flex-wrap items-center gap-2">
            <a href={siteLinks.hub} target="_blank" rel="noreferrer" className={BTN}>
              {t(UI.viewOnSite)}
            </a>
            <button
              type="button"
              onClick={publish}
              disabled={publishing || (publishState === 'never' && blockers > 0)}
              title={publishState === 'never' && blockers > 0 ? t(UI.publishBlocked) : undefined}
              className={BTN_PRIMARY}
            >
              {publishing ? t(UI.publishing) : publishState === 'never' ? t(UI.publishFirst) : t(UI.publish)}
            </button>
          </span>
        </div>

        <header className="mb-4 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-[var(--c-text)]">{t(section.label)}</h2>
            <p className="mt-1 text-sm text-[var(--c-text-soft)]">{t(section.description)}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              aria-live="polite"
              className={
                sectionStatus === 'error'
                  ? 'text-[var(--c-danger-text)]'
                  : sectionStatus === 'saved'
                    ? 'text-[var(--c-live)]'
                    : 'text-[var(--c-text-soft)]'
              }
            >
              {statusText[sectionStatus]}
            </span>
            {sectionStatus === 'dirty' || sectionStatus === 'error' ? (
              <button type="button" onClick={() => flush(section.id)} className={BTN}>
                {t(UI.saveNow)}
              </button>
            ) : null}
          </div>
        </header>

        {section.fields.some((field) => field.localized) ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {(['he', 'en'] as const).map((lang) => (
              <div key={lang} className="rounded-lg border border-[var(--c-line)] p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--c-text)]">{t(lang === 'he' ? UI.he : UI.en)}</h3>
                  {lang === 'en' ? <span className="text-[11px] text-[var(--c-text-faint)]">{t(UI.enFallback)}</span> : null}
                </div>
                <div className="flex flex-col gap-3">
                  {section.fields
                    .filter((field) => field.localized)
                    .map((field) => (
                      <FieldInput
                        key={`${lang}-${field.key}`}
                        field={field}
                        lang={lang}
                        uiLocale={locale}
                        value={values[lang][field.key] ?? ''}
                        placeholder={lang === 'en' ? values.he[field.key] ?? '' : ''}
                        onChange={(value) => setText(lang, field.key, value)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {section.fields.some((field) => !field.localized) ? (
          <div className="mt-5 grid gap-3 rounded-lg border border-[var(--c-line)] p-4 sm:grid-cols-2">
            {section.fields
              .filter((field) => !field.localized)
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  lang="shared"
                  uiLocale={locale}
                  value={values.shared[field.key] ?? ''}
                  onChange={(value) => setText('shared', field.key, value)}
                />
              ))}
          </div>
        ) : null}

        {section.media.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.media.map((slot) => (
              <MediaField
                key={slot.key}
                slot={slot}
                uiLocale={locale}
                media={media}
                value={values.shared[slot.key] ?? ''}
                onChange={(id) => setText('shared', slot.key, id)}
                onUploaded={(item) => setMedia((held) => [item, ...held])}
              />
            ))}
          </div>
        ) : null}

        {section.special === 'facts' ? (
          <FactsEditor uiLocale={locale} facts={values.facts} onChange={setFacts} />
        ) : null}

        {section.special === 'highlights' ? (
          <HighlightsEditor
            uiLocale={locale}
            cards={values.highlights}
            media={media}
            onChange={setHighlights}
            onUploaded={(item) => setMedia((held) => [item, ...held])}
          />
        ) : null}

        {section.scene ? (
          <label className="mt-6 flex items-center gap-2 text-xs text-[var(--c-text-soft)]">
            <input
              type="checkbox"
              checked={!sceneHidden(section.scene)}
              onChange={() => toggleScene(section.scene!)}
              className="size-4 accent-[var(--c-bronze)]"
            />
            {t(UI.visibleOnPlatform)}
          </label>
        ) : null}

        {section.id === 'venue' ? (
          <p className="mt-4 text-xs text-[var(--c-text-faint)]">
            <a href={siteLinks.info} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[var(--c-bronze)]">
              {t(UI.viewOnSite)} →
            </a>
          </p>
        ) : null}
      </section>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const FieldInput = ({
  field,
  lang,
  uiLocale,
  value,
  placeholder,
  onChange,
}: {
  field: SectionField;
  lang: 'he' | 'en' | 'shared';
  uiLocale: Locale;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) => {
  const dir = lang === 'he' ? 'rtl' : lang === 'en' ? 'ltr' : undefined;
  const label = (
    <span className="flex items-center gap-2">
      {field.label[uiLocale]}
      {field.onSite ? (
        <span className="rounded-sm bg-[rgba(255,255,255,0.06)] px-1 text-[9px] tracking-[0.08em] text-[var(--c-text-faint)]">
          {UI.onSite[uiLocale]}
        </span>
      ) : null}
    </span>
  );
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {field.kind === 'textarea' ? (
        <textarea
          dir={dir}
          rows={field.rows ?? 4}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${INPUT} resize-y`}
        />
      ) : (
        <input
          dir={field.kind === 'url' ? 'ltr' : dir}
          type={field.kind === 'url' ? 'url' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={INPUT}
        />
      )}
      {field.hint ? <span className="mt-1 block text-[11px] text-[var(--c-text-faint)]">{field.hint[uiLocale]}</span> : null}
    </label>
  );
};

/* ------------------------------------------------------------------ */

const upload = async (file: File): Promise<MediaItem | null> => {
  const body = new FormData();
  body.set('file', file);
  try {
    const response = await fetch(withBasePath('/studio/media/upload'), { method: 'POST', body });
    const outcome = (await response.json()) as { ok: true; media: MediaItem } | { ok: false };
    return outcome.ok ? outcome.media : null;
  } catch {
    return null;
  }
};

const Thumb = ({ item, className = '' }: { item: MediaItem; className?: string }) => {
  const still = isVideo(item) ? item.posterUrl : item.url;
  return still ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={still} alt={item.alt || item.filename} className={`h-full w-full object-cover ${className}`} />
  ) : (
    <span className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-[var(--c-text-faint)]">
      {item.filename}
    </span>
  );
};

const MediaLibrary = ({
  uiLocale,
  media,
  kind,
  onPick,
  onUploaded,
  onClose,
}: {
  uiLocale: Locale;
  media: MediaItem[];
  kind: 'image' | 'video';
  onPick: (id: string) => void;
  onUploaded: (item: MediaItem) => void;
  onClose: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const items = media.filter((item) => (kind === 'video' ? isVideo(item) : !isVideo(item)));
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const item = await upload(file);
    setBusy(false);
    if (item) {
      onUploaded(item);
      onPick(item.id);
    }
  };
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-[var(--c-line)] bg-[var(--c-deep)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--c-line)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">{UI.library[uiLocale]}</h3>
          <label className={`${BTN} ms-auto cursor-pointer`}>
            {busy ? '…' : UI.upload[uiLocale]}
            <input
              type="file"
              accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/*'}
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
          <button type="button" onClick={onClose} className={BTN}>
            {UI.close[uiLocale]}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              title={item.alt || item.filename}
              className="aspect-square overflow-hidden rounded-md border-2 border-transparent bg-black/30 transition-colors hover:border-[var(--c-line-strong)]"
            >
              <Thumb item={item} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MediaField = ({
  slot,
  uiLocale,
  media,
  value,
  onChange,
  onUploaded,
}: {
  slot: SectionMedia;
  uiLocale: Locale;
  media: MediaItem[];
  value: string;
  onChange: (id: string) => void;
  onUploaded: (item: MediaItem) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = media.find((item) => item.id === value);
  return (
    <div className="rounded-lg border border-[var(--c-line)] p-3">
      <span className={LABEL}>
        <span className="flex items-center gap-2">
          {slot.label[uiLocale]}
          {slot.onSite ? (
            <span className="rounded-sm bg-[rgba(255,255,255,0.06)] px-1 text-[9px] tracking-[0.08em] text-[var(--c-text-faint)]">
              {UI.onSite[uiLocale]}
            </span>
          ) : null}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block aspect-[16/10] w-full overflow-hidden rounded-md border border-dashed border-[var(--c-line-strong)] bg-black/30 text-xs text-[var(--c-text-soft)] hover:border-[var(--c-bronze)]"
      >
        {current ? <Thumb item={current} /> : slot.kind === 'video' ? UI.chooseVideo[uiLocale] : UI.chooseImage[uiLocale]}
      </button>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <button type="button" onClick={() => setOpen(true)} className={BTN}>
          {current ? UI.library[uiLocale] : slot.kind === 'video' ? UI.chooseVideo[uiLocale] : UI.chooseImage[uiLocale]}
        </button>
        {current ? (
          <button type="button" onClick={() => onChange('')} className={BTN}>
            {UI.remove[uiLocale]}
          </button>
        ) : null}
      </div>
      {slot.hint ? <p className="mt-1 text-[11px] text-[var(--c-text-faint)]">{slot.hint[uiLocale]}</p> : null}
      {open ? (
        <MediaLibrary
          uiLocale={uiLocale}
          media={media}
          kind={slot.kind}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onUploaded={onUploaded}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */

const FactsEditor = ({
  uiLocale,
  facts,
  onChange,
}: {
  uiLocale: Locale;
  facts: FactRow[];
  onChange: (facts: FactRow[]) => void;
}) => {
  const rows = facts.length ? facts : [];
  const update = (index: number, patch: (row: FactRow) => FactRow) =>
    onChange(rows.map((row, at) => (at === index ? patch(row) : row)));
  return (
    <div className="mt-5 rounded-lg border border-[var(--c-line)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{UI.facts[uiLocale]}</h3>
        {rows.length < 4 ? (
          <button
            type="button"
            onClick={() => onChange([...rows, { icon: 'accessibility', he: { label: '', description: '' }, en: { label: '', description: '' } }])}
            className={BTN}
          >
            + {UI.addRow[uiLocale]}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-[var(--c-line)] p-3 lg:grid-cols-[140px_1fr_1fr_auto]">
            <label className="block">
              <span className={LABEL}>{UI.factIcon[uiLocale]}</span>
              <select value={row.icon} onChange={(event) => update(index, (r) => ({ ...r, icon: event.target.value }))} className={INPUT}>
                {VENUE_FACT_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {VENUE_FACT_ICON_LABELS[icon]?.[uiLocale] ?? icon}
                  </option>
                ))}
              </select>
            </label>
            {(['he', 'en'] as const).map((lang) => (
              <div key={lang} className="flex flex-col gap-2">
                <input
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                  value={row[lang].label}
                  placeholder={`${UI.factLabel[uiLocale]} · ${UI[lang][uiLocale]}`}
                  onChange={(event) => update(index, (r) => ({ ...r, [lang]: { ...r[lang], label: event.target.value } }))}
                  className={INPUT}
                />
                <input
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                  value={row[lang].description}
                  placeholder={`${UI.factDescription[uiLocale]} · ${UI[lang][uiLocale]}`}
                  onChange={(event) => update(index, (r) => ({ ...r, [lang]: { ...r[lang], description: event.target.value } }))}
                  className={INPUT}
                />
              </div>
            ))}
            <button type="button" onClick={() => onChange(rows.filter((_, at) => at !== index))} className={`${BTN} self-start`}>
              {UI.removeRow[uiLocale]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */

const EMPTY_CARD: HighlightRow = {
  icon: 'talks',
  imageId: '',
  he: { title: '', description: '' },
  en: { title: '', description: '' },
};

/*
 * The "what awaits you" cards: up to four, each an icon, a picture and
 * its words in both languages. One row per card, the two languages
 * side by side as everywhere else in the editor.
 */
const HighlightsEditor = ({
  uiLocale,
  cards,
  media,
  onChange,
  onUploaded,
}: {
  uiLocale: Locale;
  cards: HighlightRow[];
  media: MediaItem[];
  onChange: (cards: HighlightRow[]) => void;
  onUploaded: (item: MediaItem) => void;
}) => {
  const update = (index: number, patch: (card: HighlightRow) => HighlightRow) =>
    onChange(cards.map((card, at) => (at === index ? patch(card) : card)));
  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  const imageSlot = (index: number): SectionMedia => ({
    key: `highlight-${index}`,
    kind: 'image',
    label: UI.highlightImage,
  });
  return (
    <div className="mt-5 rounded-lg border border-[var(--c-line)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{UI.highlights[uiLocale]}</h3>
        {cards.length < 4 ? (
          <button type="button" onClick={() => onChange([...cards, EMPTY_CARD])} className={BTN}>
            + {UI.addRow[uiLocale]}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {cards.map((card, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-[var(--c-line)] p-3 lg:grid-cols-[150px_1fr_1fr_200px]">
            <div className="flex flex-col gap-2">
              <label className="block">
                <span className={LABEL}>{`${UI.highlightCard[uiLocale]} ${index + 1} · ${UI.factIcon[uiLocale]}`}</span>
                <select value={card.icon} onChange={(event) => update(index, (c) => ({ ...c, icon: event.target.value }))} className={INPUT}>
                  {HIGHLIGHT_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {HIGHLIGHT_ICON_LABELS[icon][uiLocale]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={BTN} aria-label="↑">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === cards.length - 1} className={BTN} aria-label="↓">
                  ↓
                </button>
                <button type="button" onClick={() => onChange(cards.filter((_, at) => at !== index))} className={BTN}>
                  {UI.removeRow[uiLocale]}
                </button>
              </div>
            </div>
            {(['he', 'en'] as const).map((lang) => (
              <div key={lang} className="flex flex-col gap-2">
                <input
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                  value={card[lang].title}
                  placeholder={`${UI.highlightTitle[uiLocale]} · ${UI[lang][uiLocale]}`}
                  onChange={(event) => update(index, (c) => ({ ...c, [lang]: { ...c[lang], title: event.target.value } }))}
                  className={INPUT}
                />
                <textarea
                  dir={lang === 'he' ? 'rtl' : 'ltr'}
                  rows={2}
                  value={card[lang].description}
                  placeholder={`${UI.highlightDescription[uiLocale]} · ${UI[lang][uiLocale]}`}
                  onChange={(event) => update(index, (c) => ({ ...c, [lang]: { ...c[lang], description: event.target.value } }))}
                  className={`${INPUT} resize-y`}
                />
              </div>
            ))}
            <MediaField
              slot={imageSlot(index)}
              uiLocale={uiLocale}
              media={media}
              value={card.imageId}
              onChange={(id) => update(index, (c) => ({ ...c, imageId: id }))}
              onUploaded={onUploaded}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConferenceContentEditor;
