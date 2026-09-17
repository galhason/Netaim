'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@/config/locales';
import { formatTimeLabel } from '@/shared';

/*
 * A conversation that keeps up with itself.
 *
 * What was here before re-rendered the whole page every twelve seconds
 * and hoped. It was slow enough that both people reached for reload,
 * which is the exact moment a chat stops being a chat — and each tick
 * re-read the thread and re-stamped it as read, so an idle tab wrote to
 * the database all afternoon.
 *
 * This asks a small question instead — "anything after message N?" —
 * every few seconds, and immediately whenever the tab comes back to the
 * front, which is when a person actually wants to know. Sending posts
 * to the same door and draws the bubble from what the server wrote
 * back, so the sender's own words never wait for the next tick and
 * never carry an id or a time the server did not agree to.
 *
 * The list is seeded from the server render, so the first paint is
 * complete and the thread is readable before this file runs at all.
 */
const IDLE_MS = 3000;

/* Backing off after a failure keeps a dropped connection from hammering. */
const MAX_BACKOFF_MS = 30000;

export interface ChatLine {
  id: string;
  body: string;
  mine: boolean;
  createdAt?: string;
  pending?: boolean;
}

interface ChatLiveProps {
  connectionId: string;
  locale: Locale;
  initial: ChatLine[];
  /*
   * The same send, as a plain form post. It is what runs when this file
   * has not loaded or has failed to: the box still works, the page just
   * reloads around it. Nothing below reaches for it once JavaScript is
   * running — the submit handler stops the post first.
   */
  fallback: (formData: FormData) => Promise<void>;
  text: {
    empty: string;
    placeholder: string;
    send: string;
    closed: string;
    failed: string;
  };
}

const lastRealId = (lines: ChatLine[]): string => {
  let highest = 0;
  for (const line of lines) {
    if (line.pending) {
      continue;
    }
    const value = Number(line.id);
    if (Number.isFinite(value) && value > highest) {
      highest = value;
    }
  }
  return String(highest);
};

const ChatLive = ({
  connectionId,
  locale,
  initial,
  fallback,
  text,
}: ChatLiveProps) => {
  const [lines, setLines] = useState<ChatLine[]>(initial);
  const [closed, setClosed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const bottom = useRef<HTMLDivElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  /*
   * Reading back through a long thread and being yanked to the newest
   * message is worse than missing it. Only follow the conversation when
   * the reader is already at the end of it.
   */
  const atBottom = useRef(true);

  const endpoint = `/${locale}/me/chat/${connectionId}/messages`;

  const absorb = useCallback((incoming: ChatLine[]) => {
    if (incoming.length === 0) {
      return;
    }
    setLines((current) => {
      const known = new Set(current.map((line) => line.id));
      const fresh = incoming.filter((line) => !known.has(line.id));
      return fresh.length === 0 ? current : [...current, ...fresh];
    });
  }, []);

  /* One poll. Returns false when the conversation has ended. */
  const poll = useCallback(async (): Promise<boolean> => {
    const after = lastRealId(lines);
    const response = await fetch(`${endpoint}?after=${after}`, {
      cache: 'no-store',
    });
    if (response.status === 410) {
      setClosed(true);
      return false;
    }
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const data = (await response.json()) as { messages?: ChatLine[] };
    absorb(data.messages ?? []);
    return true;
  }, [absorb, endpoint, lines]);

  useEffect(() => {
    if (closed) {
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let backoff = IDLE_MS;

    const run = async () => {
      if (stopped || document.visibilityState !== 'visible') {
        return;
      }
      try {
        const alive = await poll();
        setFailed(false);
        backoff = IDLE_MS;
        if (!alive) {
          stopped = true;
          return;
        }
      } catch {
        setFailed(true);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }
      if (!stopped) {
        timer = setTimeout(run, backoff);
      }
    };

    /*
     * Coming back to the tab is the moment the answer matters most, so
     * it asks at once rather than waiting out the interval.
     */
    const wake = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        void run();
      }
    };

    timer = setTimeout(run, IDLE_MS);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, [closed, poll]);

  useEffect(() => {
    if (atBottom.current) {
      bottom.current?.scrollIntoView({ block: 'end' });
    }
  }, [lines]);

  const onScroll = () => {
    const node = scroller.current;
    if (node) {
      atBottom.current =
        node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    }
  };

  const send = async (body: string) => {
    const temporary = `pending-${body.length}-${lines.length}`;
    setLines((current) => [
      ...current,
      { id: temporary, body, mine: true, pending: true },
    ]);
    atBottom.current = true;
    setSending(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
        cache: 'no-store',
      });
      if (response.status === 410) {
        setClosed(true);
        setLines((current) => current.filter((line) => line.id !== temporary));
        return;
      }
      if (!response.ok) {
        throw new Error(String(response.status));
      }
      const data = (await response.json()) as { message?: ChatLine };
      setLines((current) => [
        ...current.filter((line) => line.id !== temporary),
        ...(data.message ? [data.message] : []),
      ]);
      setFailed(false);
    } catch {
      /*
       * The bubble is removed and the words are handed back to the box.
       * A message shown as sent that never arrived is the one failure a
       * chat must not have.
       */
      setLines((current) => current.filter((line) => line.id !== temporary));
      setDraft(body);
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto px-5 py-6"
      >
        {lines.length === 0 ? (
          <p className="m-auto rounded-2xl bg-white px-5 py-4 text-sm text-[var(--l-soft)] shadow-[0_10px_30px_rgba(23,32,51,0.06)]">
            {text.empty}
          </p>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className={`flex ${line.mine ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-[0_6px_18px_rgba(23,32,51,0.07)] transition-opacity ${
                  line.mine
                    ? 'rounded-ee-md bg-[var(--l-navy)] text-white'
                    : 'rounded-es-md bg-white'
                } ${line.pending ? 'opacity-60' : ''}`}
              >
                <span className="block whitespace-pre-wrap break-words">
                  {line.body}
                </span>
                <span
                  className={`mt-1 block text-[10px] ${
                    line.mine ? 'text-white/55' : 'text-[var(--l-faint)]'
                  }`}
                >
                  {line.pending
                    ? '…'
                    : formatTimeLabel(line.createdAt ?? '', locale)}
                </span>
              </span>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <footer className="sticky bottom-0 border-t border-[var(--l-hair)] bg-[var(--l-bg)]/95 backdrop-blur">
        {closed ? (
          <p className="mx-auto max-w-2xl px-5 py-4 text-sm text-[var(--l-soft)]">
            {text.closed}
          </p>
        ) : (
          <form
            action={fallback}
            onSubmit={(event) => {
              event.preventDefault();
              const body = draft.trim();
              if (!body || sending) {
                return;
              }
              setDraft('');
              void send(body);
            }}
            className="mx-auto flex max-w-2xl items-end gap-2 px-5 py-4"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="connectionId" value={connectionId} />
            <textarea
              name="body"
              rows={1}
              required
              maxLength={2000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                /* Enter sends; Shift+Enter is a new line. */
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={text.placeholder}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-[var(--l-hair)] bg-white px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              className="inline-flex min-h-12 items-center rounded-2xl bg-[var(--l-navy)] px-6 text-sm font-medium text-white transition-colors hover:bg-[var(--nt-dark)] disabled:opacity-50"
            >
              {text.send}
            </button>
          </form>
        )}
        {failed && !closed ? (
          <p className="mx-auto max-w-2xl px-5 pb-3 text-xs text-[var(--x-full)]">
            {text.failed}
          </p>
        ) : null}
      </footer>
    </>
  );
};

export default ChatLive;
