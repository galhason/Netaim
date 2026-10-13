'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/config/locales';
import {
  centred,
  clamp,
  coverScale,
  outputSize,
  sourceRect,
  zoomAbout,
  type Placement,
  type Size,
} from '../utils/crop-image';

/*
 * A picture someone sends is rarely the picture the page needs: a
 * phone photo three metres wide, a face in one corner, a landscape
 * where a portrait goes. So between choosing a file and keeping it
 * stands this: the picture inside a frame of the shape the page will
 * draw, dragged and zoomed until the frame holds what matters, and
 * only that part kept — scaled to what a screen will ever show.
 *
 * Shared by the Lounge (a participant's own photo) and the Studio (a
 * speaker's), so it dresses in the brand's own tokens, which both
 * chromes rename but never remove.
 */
interface Props {
  file: File;
  /* Width over height of the kept picture; 1 is a portrait's square. */
  aspect?: number;
  /* The kept picture's long side, in pixels. */
  longest?: number;
  locale: Locale;
  onDone: (file: File) => void;
  onCancel: () => void;
}

const COPY = {
  title: { he: 'חיתוך התמונה', en: 'Crop the photo' },
  hint: { he: 'גררו את התמונה כדי למקם אותה במסגרת, והשתמשו בסרגל כדי להתקרב.', en: 'Drag the photo to place it in the frame; use the slider to zoom.' },
  zoom: { he: 'התקרבות', en: 'Zoom' },
  keep: { he: 'חיתוך ושמירה', en: 'Crop and keep' },
  asIs: { he: 'להשאיר כמו שהיא', en: 'Keep as it is' },
  cancel: { he: 'ביטול', en: 'Cancel' },
  working: { he: 'חותך…', en: 'Cropping…' },
  unreadable: { he: 'לא הצלחנו לקרוא את התמונה; היא תועלה כפי שהיא.', en: 'The picture could not be read; it will be kept as it is.' },
};

const FRAME_LONG = 320;
const MAX_ZOOM = 4;

/* A kept picture is a JPEG unless the original had transparency to lose. */
const outputType = (file: File): 'image/png' | 'image/jpeg' =>
  file.type === 'image/png' ? 'image/png' : 'image/jpeg';

const ImageCropper = ({ file, aspect = 1, longest = 1200, locale, onDone, onCancel }: Props) => {
  const frame = useMemo<Size>(
    () =>
      aspect >= 1
        ? { width: FRAME_LONG, height: Math.round(FRAME_LONG / aspect) }
        : { width: Math.round(FRAME_LONG * aspect), height: FRAME_LONG },
    [aspect],
  );
  /*
   * The object URL lives exactly as long as the effect: made on mount,
   * revoked on cleanup. Memoising it would hand a second mount (React
   * runs effects twice in development) a URL the first cleanup had
   * already revoked, and the picture would never load.
   */
  const [url, setUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [image, setImage] = useState<Size | null>(null);
  const [place, setPlace] = useState<Placement | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [working, setWorking] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; at: Placement } | null>(null);
  const keepButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const made = URL.createObjectURL(file);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  useEffect(() => {
    keepButton.current?.focus();
  }, [image]);

  const onLoad = () => {
    const el = imageRef.current;
    if (!el) return;
    const size = { width: el.naturalWidth, height: el.naturalHeight };
    setImage(size);
    setPlace(centred(size, frame, coverScale(size, frame)));
  };

  const minScale = image ? coverScale(image, frame) : 1;

  const move = useCallback(
    (next: Placement) => {
      if (image) setPlace(clamp(image, frame, next));
    },
    [image, frame],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!place) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, at: place };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    move({ ...d.at, x: d.at.x + (event.clientX - d.x), y: d.at.y + (event.clientY - d.y) });
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!image || !place) return;
    const box = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
    const scale = Math.min(minScale * MAX_ZOOM, Math.max(minScale, place.scale * factor));
    setPlace(zoomAbout(image, frame, place, scale, { x: event.clientX - box.left, y: event.clientY - box.top }));
  };
  const onZoom = (value: number) => {
    if (!image || !place) return;
    setPlace(zoomAbout(image, frame, place, value));
  };

  const keep = async () => {
    const el = imageRef.current;
    if (!el || !image || !place) return;
    setWorking(true);
    try {
      const source = sourceRect(frame, place);
      const size = outputSize(frame, source, longest);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      context.drawImage(el, source.sx, source.sy, source.sw, source.sh, 0, 0, size.width, size.height);
      const type = outputType(file);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
      if (!blob) throw new Error('no blob');
      const stem = file.name.replace(/\.[^.]+$/, '') || 'photo';
      onDone(new File([blob], `${stem}.${type === 'image/png' ? 'png' : 'jpg'}`, { type }));
    } catch {
      onDone(file);
    } finally {
      setWorking(false);
    }
  };

  const transform = place
    ? `translate(${place.x}px, ${place.y}px) scale(${place.scale})`
    : undefined;

  /*
   * Drawn at the body, not where it is used: a card that animates in
   * carries a transform, and a transform makes `fixed` mean "fixed to
   * this card" — the dialog would open inside the card and be cut off
   * at its edge.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nt-crop-title"
      className="fixed inset-0 z-[120] grid place-items-center bg-[var(--nt-dark)]/70 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[400px] rounded-[var(--nt-r-xl)] bg-[var(--nt-surface)] p-5 text-[var(--nt-ink)] shadow-[var(--nt-shadow-float)]">
        <h2 id="nt-crop-title" className="font-display text-lg font-bold">
          {COPY.title[locale]}
        </h2>
        <p className="mt-1 text-sm text-[var(--nt-ink-soft)]">{COPY.hint[locale]}</p>

        <div className="mt-4 flex justify-center">
          <div
            className="relative touch-none select-none overflow-hidden rounded-[var(--nt-r-md)] bg-[var(--nt-dark)] ring-1 ring-[var(--nt-border-strong)]"
            style={{ width: frame.width, height: frame.height, cursor: place ? 'grab' : 'default' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={url}
              alt=""
              draggable={false}
              onLoad={onLoad}
              onError={() => setUnreadable(true)}
                className="absolute left-0 top-0 max-w-none origin-top-left"
                style={{ transform, visibility: place ? 'visible' : 'hidden' }}
              />
            ) : null}
            {aspect === 1 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
              />
            ) : null}
          </div>
        </div>

        {unreadable ? (
          <p className="mt-3 text-sm text-[var(--nt-ink-soft)]">{COPY.unreadable[locale]}</p>
        ) : (
          <label className="mt-4 flex items-center gap-3 text-sm text-[var(--nt-ink-soft)]">
            <span className="flex-none">{COPY.zoom[locale]}</span>
            <input
              type="range"
              min={minScale}
              max={minScale * MAX_ZOOM}
              step={minScale / 100}
              value={place?.scale ?? minScale}
              onChange={(event) => onZoom(Number(event.target.value))}
              disabled={!place}
              className="w-full accent-[var(--nt-green)]"
            />
          </label>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-[var(--nt-r-pill)] px-4 text-sm font-medium text-[var(--nt-ink-soft)] transition-colors hover:bg-[var(--nt-raise)]"
          >
            {COPY.cancel[locale]}
          </button>
          <button
            type="button"
            onClick={() => onDone(file)}
            className="min-h-10 rounded-[var(--nt-r-pill)] border border-[var(--nt-border-strong)] px-4 text-sm font-medium transition-colors hover:bg-[var(--nt-raise)]"
          >
            {COPY.asIs[locale]}
          </button>
          {unreadable ? null : (
            <button
              ref={keepButton}
              type="button"
              onClick={() => void keep()}
              disabled={!place || working}
              className="min-h-10 rounded-[var(--nt-r-pill)] bg-[var(--nt-green)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {working ? COPY.working[locale] : COPY.keep[locale]}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ImageCropper;
