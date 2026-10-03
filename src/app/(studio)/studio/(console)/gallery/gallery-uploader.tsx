'use client';

import { startTransition, useId, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';

/*
 * Photos and films into the gallery, several at a time.
 *
 * Each file goes up through the media library's own upload — the same
 * formats, the same limits, the same refusals as every other media
 * field in the Studio — and the ones that arrive are then added to the
 * gallery together, in the order they were chosen, in the grid chosen
 * beside the button. Nothing is lost on a refusal: what was refused is
 * named, and what arrived is still added.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  upload: t('העלאת תמונות וסרטונים', 'Upload photos and films'),
  hint: t('אפשר לבחור כמה קבצים יחד · תמונות עד 10MB, סרטונים עד 200MB', 'Choose several at once · photos up to 10MB, films up to 200MB'),
  into: t('אל:', 'Into:'),
  story: t('הרשת הראשית', 'The main grid'),
  more: t('בהמשך העמוד', 'Further down'),
  progress: t('מעלים {i} מתוך {n}…', 'Uploading {i} of {n}…'),
  adding: t('מוסיפים לגלריה…', 'Adding to the gallery…'),
  refused: t('לא הועלו:', 'Not uploaded:'),
  reasons: {
    denied: t('אין הרשאה', 'not allowed'),
    type: t('פורמט לא נתמך', 'format not supported'),
    size: t('גדול מדי', 'too large'),
    missing: t('קובץ ריק', 'empty file'),
    failed: t('ההעלאה נכשלה', 'upload failed'),
  } as Record<string, Record<Locale, string>>,
};

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm';

interface GalleryUploaderProps {
  slug: string;
  locale: Locale;
  action: (formData: FormData) => Promise<void>;
}

const GalleryUploader = ({ slug, locale, action }: GalleryUploaderProps) => {
  const input = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [placement, setPlacement] = useState<'story' | 'more'>('story');
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [refused, setRefused] = useState<{ name: string; reason: string }[]>([]);

  const onFiles = async (list: FileList | null) => {
    const files = list ? [...list] : [];
    if (files.length === 0) {
      return;
    }
    setRefused([]);
    const ids: string[] = [];
    const failed: { name: string; reason: string }[] = [];
    for (const [index, file] of files.entries()) {
      setProgress({ i: index + 1, n: files.length });
      const body = new FormData();
      body.set('file', file);
      try {
        const response = await fetch(withBasePath('/studio/media/upload'), { method: 'POST', body });
        const outcome = (await response.json()) as { ok: true; media: { id: string } } | { ok: false; reason: string };
        if (outcome.ok) {
          ids.push(outcome.media.id);
        } else {
          failed.push({ name: file.name, reason: outcome.reason });
        }
      } catch {
        failed.push({ name: file.name, reason: 'failed' });
      }
    }
    setProgress(null);
    setRefused(failed);
    if (input.current) {
      input.current.value = '';
    }
    if (ids.length > 0) {
      setAdding(true);
      const data = new FormData();
      data.set('slug', slug);
      data.set('placement', placement);
      data.set('mediaIds', ids.join(','));
      startTransition(() => action(data));
    }
  };

  const busy = progress !== null || adding;
  const fill = (template: string, values: Record<string, number>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          aria-disabled={busy}
          className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-[var(--c-bronze)] px-4 text-sm font-semibold text-[var(--c-on-accent)] hover:bg-[var(--c-bronze-hover)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--c-bronze)] ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {busy ? (progress ? fill(UI.progress[locale], progress) : UI.adding[locale]) : UI.upload[locale]}
          <input
            ref={input}
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT}
            disabled={busy}
            className="sr-only"
            onChange={(event) => onFiles(event.currentTarget.files)}
          />
        </label>
        <fieldset className="flex items-center gap-1 text-sm" disabled={busy}>
          <legend className="sr-only">{UI.into[locale]}</legend>
          <span aria-hidden="true" className="text-[var(--c-text-soft)]">{UI.into[locale]}</span>
          {(['story', 'more'] as const).map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" name="upload-placement" value={value} checked={placement === value} onChange={() => setPlacement(value)} className="peer sr-only" />
              <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--c-line-strong)] px-3 text-[var(--c-text-soft)] peer-checked:border-[var(--c-bronze)] peer-checked:text-[var(--c-bronze)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--c-bronze)]">
                {UI[value][locale]}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <p className="text-[11px] text-[var(--c-text-faint)]">{UI.hint[locale]}</p>
      {refused.length > 0 ? (
        <p role="alert" className="text-xs text-[var(--c-bronze)]">
          {UI.refused[locale]}{' '}
          {refused.map((item) => `${item.name} (${UI.reasons[item.reason]?.[locale] ?? UI.reasons.failed![locale]})`).join(', ')}
        </p>
      ) : null}
    </div>
  );
};

export default GalleryUploader;
