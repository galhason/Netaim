'use client';

import { useRef, useState, useTransition } from 'react';
import type { Locale } from '@/config/locales';
import SessionCover from '@/features/cinematic/components/session-cover';
import { uploadActivityImageAction } from './actions';

export interface MediaOption {
  id: string;
  url: string;
  alt?: string;
}

interface Props {
  locale: Locale;
  slug: string;
  seed: string;
  initial?: MediaOption;
  library: MediaOption[];
}

const T = (locale: Locale) => ({
  title: locale === 'he' ? 'תמונת הפעילות' : 'Activity cover',
  lead:
    locale === 'he'
      ? 'התמונה שתופיע בכרטיס בעמוד הבית ובתוכנית. אפשר להעלות תמונה, לבחור אחת מהספרייה, או להשאיר ריק.'
      : 'The image on the landing-page card and in the programme. Upload one, pick one from the library, or leave it empty.',
  auto:
    locale === 'he'
      ? 'ללא תמונה — הכרטיס יקבל כריכה מעוצבת אוטומטית, כמו בתצוגה כאן.'
      : 'No image — the card gets a designed cover automatically, as previewed here.',
  upload: locale === 'he' ? 'העלאת תמונה' : 'Upload an image',
  uploading: locale === 'he' ? 'מעלה…' : 'Uploading…',
  library: locale === 'he' ? 'בחירה מהספרייה' : 'Choose from library',
  close: locale === 'he' ? 'סגירה' : 'Close',
  remove: locale === 'he' ? 'הסרת התמונה' : 'Remove image',
  empty:
    locale === 'he'
      ? 'הספרייה עדיין ריקה. העלו תמונה ראשונה והיא תישמר גם לפעילויות הבאות.'
      : 'The library is still empty. Upload one and it stays available for the next activities.',
  failed:
    locale === 'he'
      ? 'ההעלאה נכשלה. נסו קובץ תמונה עד 10MB.'
      : 'Upload failed. Try an image file up to 10MB.',
});

const btn =
  'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--c-line)] px-3.5 py-2 text-sm text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-line-strong)] hover:text-[var(--c-text)] disabled:cursor-not-allowed disabled:opacity-50';

const ActivityImagePicker = ({ locale, slug, seed, initial, library }: Props) => {
  const t = T(locale);
  const [selected, setSelected] = useState<MediaOption | undefined>(initial);
  const [pool, setPool] = useState<MediaOption[]>(library);
  const [browsing, setBrowsing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File) => {
    setFailed(false);
    const body = new FormData();
    body.set('slug', slug);
    body.set('file', file);
    start(async () => {
      const media = await uploadActivityImageAction(body);
      if (!media) {
        setFailed(true);
        return;
      }
      setPool((current) => [media, ...current.filter((m) => m.id !== media.id)]);
      setSelected(media);
      setBrowsing(false);
    });
  };

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[var(--c-text)]">
        {t.title}
      </span>
      <p className="mb-3 text-xs text-[var(--c-text-faint)]">{t.lead}</p>

      <input type="hidden" name="imageId" value={selected?.id ?? ''} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-[16/11] w-full flex-none overflow-hidden rounded-xl border border-[var(--c-line)] bg-[rgba(6,10,16,0.5)] sm:w-56">
          {selected ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={selected.url}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <SessionCover seed={seed} />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <label className={btn}>
              {pending ? t.uploading : t.upload}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={pending}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => setBrowsing((open) => !open)}
              className={btn}
            >
              {browsing ? t.close : t.library}
            </button>
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(undefined)}
                className={`${btn} text-[var(--c-text-faint)]`}
              >
                {t.remove}
              </button>
            ) : null}
          </div>

          {failed ? (
            <p className="text-xs text-rose-300" role="alert">
              {t.failed}
            </p>
          ) : null}
          {!selected && !failed ? (
            <p className="text-xs text-[var(--c-text-faint)]">{t.auto}</p>
          ) : null}

          {browsing ? (
            pool.length === 0 ? (
              <p className="text-xs text-[var(--c-text-faint)]">{t.empty}</p>
            ) : (
              <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded-xl border border-[var(--c-line)] p-2 sm:grid-cols-4">
                {pool.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setBrowsing(false);
                    }}
                    aria-label={item.alt ?? ''}
                    className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition-colors ${
                      selected?.id === item.id
                        ? 'border-[var(--c-bronze)]'
                        : 'border-[var(--c-line)] hover:border-[var(--c-line-strong)]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActivityImagePicker;
