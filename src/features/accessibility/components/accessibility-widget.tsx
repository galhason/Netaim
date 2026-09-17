'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Locale } from '@/config/locales';

/*
 * The accessibility button (IS 5568 / service-accessibility regulations)
 * — the floating control Israeli law-conscious sites carry, and the EAA
 * expects: one obvious place where a visitor adapts the site to their
 * eyes and hands, without asking anyone.
 *
 * Every adjustment is a class on <html>, styled in globals.css, and
 * remembered in localStorage so it holds across pages and visits on
 * this device. Nothing here talks to the server, and the panel itself
 * is keyboard-first: real buttons, aria-pressed states, Escape closes.
 *
 * The adjustments are honest: text scaling rides the rem root so the
 * whole layout scales; contrast strengthens the site's own color
 * tokens rather than slapping a filter on the page (a filter on the
 * root breaks fixed positioning); stop-motion kills animations,
 * transitions and the hero video.
 */
interface A11ySettings {
  font: 0 | 1 | 2;
  contrast: boolean;
  motion: boolean;
  links: boolean;
  readable: boolean;
}

const DEFAULTS: A11ySettings = {
  font: 0,
  contrast: false,
  motion: false,
  links: false,
  readable: false,
};

const KEY = 'netaim-a11y';

const readSettings = (): A11ySettings => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<A11ySettings>;
    return {
      font: parsed.font === 1 || parsed.font === 2 ? parsed.font : 0,
      contrast: parsed.contrast === true,
      motion: parsed.motion === true,
      links: parsed.links === true,
      readable: parsed.readable === true,
    };
  } catch {
    return DEFAULTS;
  }
};

const applySettings = (settings: A11ySettings) => {
  const root = document.documentElement;
  root.classList.toggle('a11y-font-1', settings.font === 1);
  root.classList.toggle('a11y-font-2', settings.font === 2);
  root.classList.toggle('a11y-contrast', settings.contrast);
  root.classList.toggle('a11y-no-motion', settings.motion);
  root.classList.toggle('a11y-links', settings.links);
  root.classList.toggle('a11y-readable', settings.readable);
  if (settings.motion) {
    document
      .querySelectorAll('video')
      .forEach((video) => video.pause());
  }
};

const COPY = {
  open: { he: 'תפריט נגישות', en: 'Accessibility menu' },
  title: { he: 'נגישות', en: 'Accessibility' },
  font: { he: 'הגדלת טקסט', en: 'Larger text' },
  fontLevels: { he: ['רגיל', '110%', '125%'], en: ['Normal', '110%', '125%'] },
  contrast: { he: 'ניגודיות מוגברת', en: 'Higher contrast' },
  motion: { he: 'עצירת אנימציות', en: 'Stop animations' },
  links: { he: 'הדגשת קישורים', en: 'Underline links' },
  readable: { he: 'גופן קריא', en: 'Readable font' },
  reset: { he: 'איפוס הגדרות', en: 'Reset settings' },
  statement: { he: 'הצהרת נגישות', en: 'Accessibility statement' },
  close: { he: 'סגירה', en: 'Close' },
} as const;

const rowBtn =
  'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-start text-sm text-[var(--nt-ink)] transition-colors hover:bg-[var(--nt-ink)]/5 aria-pressed:bg-[var(--nt-ink)] aria-pressed:text-white';

const AccessibilityWidget = ({ locale }: { locale: Locale }) => {
  const he = locale === 'he';
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);

  useEffect(() => {
    const stored = readSettings();
    setSettings(stored);
    applySettings(stored);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const update = (next: A11ySettings) => {
    setSettings(next);
    applySettings(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode — the choice simply lives for this page-view */
    }
  };

  const pick = (entry: { he: string; en: string }): string =>
    he ? entry.he : entry.en;

  return (
    <div className="fixed bottom-20 start-4 z-[90] md:bottom-6">
      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[-1] cursor-default"
          />
          <div
            role="dialog"
            aria-label={pick(COPY.title)}
            className="absolute bottom-16 start-0 w-72 rounded-2xl border border-[var(--nt-ink)]/10 bg-white p-3 text-[var(--nt-ink)] shadow-[0_24px_64px_rgba(23,32,51,0.35)]"
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <p className="text-sm font-semibold">{pick(COPY.title)}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={pick(COPY.close)}
                className="grid size-9 place-items-center rounded-full text-[var(--nt-ink-soft)] transition-colors hover:bg-[var(--nt-ink)]/5 hover:text-[var(--nt-ink)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                update({
                  ...settings,
                  font: ((settings.font + 1) % 3) as 0 | 1 | 2,
                })
              }
              aria-pressed={settings.font > 0}
              className={rowBtn}
            >
              {pick(COPY.font)}
              <span className="text-xs font-semibold tabular-nums">
                {(he ? COPY.fontLevels.he : COPY.fontLevels.en)[settings.font]}
              </span>
            </button>
            <button
              type="button"
              onClick={() => update({ ...settings, contrast: !settings.contrast })}
              aria-pressed={settings.contrast}
              className={rowBtn}
            >
              {pick(COPY.contrast)}
              <span aria-hidden="true">{settings.contrast ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => update({ ...settings, motion: !settings.motion })}
              aria-pressed={settings.motion}
              className={rowBtn}
            >
              {pick(COPY.motion)}
              <span aria-hidden="true">{settings.motion ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => update({ ...settings, links: !settings.links })}
              aria-pressed={settings.links}
              className={rowBtn}
            >
              {pick(COPY.links)}
              <span aria-hidden="true">{settings.links ? '✓' : ''}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                update({ ...settings, readable: !settings.readable })
              }
              aria-pressed={settings.readable}
              className={rowBtn}
            >
              {pick(COPY.readable)}
              <span aria-hidden="true">{settings.readable ? '✓' : ''}</span>
            </button>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--nt-ink)]/10 pt-2">
              <button
                type="button"
                onClick={() => update(DEFAULTS)}
                className="min-h-10 rounded-full px-3 text-xs text-[var(--nt-ink-soft)] transition-colors hover:bg-[var(--nt-ink)]/5 hover:text-[var(--nt-ink)]"
              >
                {pick(COPY.reset)}
              </button>
              <Link
                href={`/${locale}/accessibility`}
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-full px-3 text-xs font-medium text-[var(--nt-navy)] underline-offset-4 transition-colors hover:underline"
              >
                {pick(COPY.statement)}
              </Link>
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={pick(COPY.open)}
        aria-expanded={open}
        className="grid size-12 place-items-center rounded-full bg-[var(--nt-ink)] text-white shadow-[0_10px_30px_rgba(23,32,51,0.45)] ring-2 ring-white/80 transition-transform hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {/* the universal-access figure */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="4.5" r="1.9" />
          <path d="M4.5 8.5c2.5.8 5 1.2 7.5 1.2s5-.4 7.5-1.2" />
          <path d="M12 9.7v4l-2.6 6M12 13.7l2.6 6" />
        </svg>
      </button>
    </div>
  );
};

export default AccessibilityWidget;
