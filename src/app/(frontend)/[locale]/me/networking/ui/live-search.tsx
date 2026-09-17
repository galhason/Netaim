'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/*
 * Live search as progressive enhancement — the one deliberate island
 * of JavaScript on this page, and it changes no law.
 *
 * The form below is the same GET form the page has always had: a real
 * <form>, a named <input>, the same query parameters (?q, with ?org,
 * ?conf, ?open riding along untouched), and Enter still submits. With
 * no JavaScript, that is exactly what runs. With it, typing waits out
 * a 300ms debounce and then walks the SAME road on the reader's
 * behalf: the URL is replaced in a React transition, the server
 * re-filters, and the server-rendered directory swaps in place. There
 * is no second search implementation — no participant list in the
 * browser, no client-side filtering, nothing to drift from the truth.
 *
 * Staleness cannot win: each keystroke cancels the previous timer, and
 * the transition always carries the latest URL, so typing `g`,`ga`,
 * `gal` lands on `gal` no matter how the network reorders itself.
 * While the server thinks, the field shows a small spinner and the
 * directory dims through a CSS :has() rule — the layout never jumps.
 */
const DEBOUNCE_MS = 300;

interface LiveSearchProps {
  basePath: string;
  he: boolean;
  q?: string;
  org?: string;
  conf?: string;
  open?: string;
  joined: { slug: string; title: string }[];
  copy: {
    label: string;
    placeholder: string;
    clear: string;
    submit: string;
    allConferences: string;
  };
}

const LiveSearch = ({
  basePath,
  he,
  q,
  org,
  conf,
  open,
  joined,
  copy,
}: LiveSearchProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(q ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /*
   * The URL stays the source of truth. When it changes under us —
   * back/forward, a filter chip, a fresh render — the field follows,
   * except while the person is mid-thought in it.
   */
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setValue(q ?? '');
    }
  }, [q]);

  const urlWith = (
    next: Partial<Record<'q' | 'conf', string | undefined>>,
  ): string => {
    const merged: Record<string, string | undefined> = {
      q: value,
      org,
      conf,
      open,
      ...next,
    };
    const search = new URLSearchParams();
    for (const [key, entry] of Object.entries(merged)) {
      if (entry) {
        search.set(key, entry);
      }
    }
    const suffix = search.toString();
    return `${basePath}${suffix ? `?${suffix}` : ''}`;
  };

  const go = (url: string) => {
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  };

  const onType = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      go(urlWith({ q: next.trim() || undefined }));
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      method="get"
      data-pending={isPending ? 'true' : undefined}
      id="live-search"
      onSubmit={(event) => {
        /* Enter works — it just takes the fast road when JS is here. */
        event.preventDefault();
        clearTimeout(timer.current);
        go(urlWith({ q: value.trim() || undefined }));
      }}
      className="flex flex-col gap-3 rounded-3xl bg-[var(--n-card)] p-3 shadow-[0_14px_44px_rgba(23,32,51,0.08)] ring-1 ring-[var(--n-hair)]/70 sm:flex-row sm:items-center"
    >
      {org ? <input type="hidden" name="org" value={org} /> : null}
      {open ? <input type="hidden" name="open" value={open} /> : null}
      <label className="relative flex-1">
        <span className="sr-only">{copy.label}</span>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(event) => onType(event.target.value)}
          placeholder={copy.placeholder}
          className="min-h-12 w-full rounded-full border border-[var(--n-hair)] bg-white pe-20 ps-5 text-sm transition-colors focus:border-[var(--n-purple)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute inset-y-0 end-1.5 my-auto flex h-9 items-center gap-0.5">
          {value ? (
            <button
              type="button"
              aria-label={copy.clear}
              onClick={() => {
                clearTimeout(timer.current);
                setValue('');
                go(urlWith({ q: undefined }));
                inputRef.current?.focus();
              }}
              className="grid size-9 place-items-center rounded-full text-[var(--n-faint)] transition-colors hover:bg-[var(--n-navy)]/5 hover:text-[var(--n-ink)]"
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
          ) : null}
          <button
            type="submit"
            aria-label={copy.submit}
            className="grid size-9 place-items-center rounded-full text-[var(--n-faint)] transition-colors hover:bg-[var(--n-purple)]/10 hover:text-[var(--n-purple)]"
          >
            {isPending ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-[var(--n-purple)]/30 border-t-[var(--n-purple)]"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            )}
          </button>
        </span>
      </label>
      {joined.length > 1 ? (
        <label className="flex-none">
          <span className="sr-only">{he ? 'כנס' : 'Conference'}</span>
          <select
            name="conf"
            value={conf ?? ''}
            onChange={(event) =>
              go(urlWith({ conf: event.target.value || undefined }))
            }
            className="min-h-12 w-full rounded-full border border-[var(--n-hair)] bg-white px-4 text-sm sm:w-auto"
          >
            <option value="">{copy.allConferences}</option>
            {joined.map((conference) => (
              <option key={conference.slug} value={conference.slug}>
                {conference.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </form>
  );
};

export default LiveSearch;
