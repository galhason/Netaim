'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import type { Locale } from '@/config/locales';
import { LOUNGE_UI } from '../../constants/lounge-ui';

/*
 * My Pass: one floating button, one tap, full-screen QR. Apple Wallet
 * energy — clean, immediate, done (Esc or tap closes).
 */
const PASS_QR_SIZE = 232;

interface MyPassProps {
  locale: Locale;
  qrValue: string;
  name: string;
  detailLine: string;
}

const MyPass = ({ locale, qrValue, name, detailLine }: MyPassProps) => {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2.5 rounded-2xl bg-[var(--l-navy)] px-5 py-3.5 text-sm font-medium text-white shadow-[0_14px_40px_rgba(14,27,46,0.35)] transition-transform hover:-translate-y-0.5"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <path d="M13.5 13.5h3v3h-3zM17.5 17.5h3v3h-3z" />
        </svg>
        {LOUNGE_UI.myPass[locale]}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={LOUNGE_UI.myPass[locale]}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white"
        >
          <p className="text-xs tracking-[0.28em] text-[var(--l-faint)]">
            {LOUNGE_UI.myPass[locale].toUpperCase()}
          </p>
          <div className="rounded-3xl border border-[var(--l-hair)] p-7 shadow-[0_20px_60px_rgba(35,40,47,0.1)]">
            <QRCode value={qrValue} size={PASS_QR_SIZE} />
          </div>
          <div className="text-center">
            <p className="font-display text-2xl text-[var(--l-ink)]">{name}</p>
            <p className="mt-1 text-sm text-[var(--l-soft)]">{detailLine}</p>
            <p className="mt-3 text-xs text-[var(--l-faint)]">
              {LOUNGE_UI.passCaption[locale]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-[var(--l-hair)] px-7 py-2.5 text-sm text-[var(--l-soft)] transition-colors hover:border-[var(--l-bronze)] hover:text-[var(--l-ink)]"
          >
            {LOUNGE_UI.close[locale]}
          </button>
        </div>
      ) : null}
    </>
  );
};

export default MyPass;
