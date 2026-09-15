/*
 * What this device has read.
 *
 * The bell has always kept one number in localStorage — the moment the
 * panel was last opened — and treated everything newer as fresh. The
 * notifications centre reads the very same number, so "3 unread" in
 * the bar and "3 unread" on the page are one count, and "mark all as
 * read" on the page clears the badge in the bar. Opening a single note
 * adds its id to a small set, so the rest stay unread.
 *
 * Per device, deliberately: a person reads on their phone in the
 * hallway and on a laptop at the desk, and neither should silently
 * clear the other. Nothing here reaches the server.
 */
export const SEEN_KEY = 'netaim-bell-seen';
const READ_KEY = 'netaim-notices-read';
const READ_CAP = 500;
const CHANGE_EVENT = 'netaim:notices';

export interface ReadState {
  seenAt: number;
  readIds: ReadonlySet<string>;
}

const EMPTY: ReadState = { seenAt: 0, readIds: new Set() };

export const readState = (): ReadState => {
  if (typeof window === 'undefined') {
    return EMPTY;
  }
  try {
    const seenAt = Number(window.localStorage.getItem(SEEN_KEY)) || 0;
    const raw = window.localStorage.getItem(READ_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return {
      seenAt,
      readIds: new Set(Array.isArray(ids) ? ids.map(String) : []),
    };
  } catch {
    return EMPTY;
  }
};

const announce = () => {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* nothing listens in this environment */
  }
};

export const markAllRead = (): void => {
  try {
    window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    window.localStorage.removeItem(READ_KEY);
  } catch {
    /* private mode — the state simply does not persist */
  }
  announce();
};

export const markRead = (id: string): void => {
  try {
    const current = [...readState().readIds];
    if (!current.includes(id)) {
      current.push(id);
    }
    window.localStorage.setItem(
      READ_KEY,
      JSON.stringify(current.slice(-READ_CAP)),
    );
  } catch {
    /* private mode */
  }
  announce();
};

export const isUnread = (
  item: { id: string; at: string | null },
  state: ReadState,
): boolean => {
  if (!item.at) {
    return false;
  }
  const at = Date.parse(item.at);
  return !Number.isNaN(at) && at > state.seenAt && !state.readIds.has(item.id);
};

/* Both tabs and both components stay in step. */
export const subscribeReadState = (listener: () => void): (() => void) => {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
};

/*
 * When it happened, the way a person says it: minutes and hours for
 * today, "yesterday" with the hour, then the date.
 */
export const noticeTimeLabel = (
  iso: string | null,
  locale: 'he' | 'en',
  now: number = Date.now(),
): string => {
  if (!iso) {
    return '';
  }
  const at = Date.parse(iso);
  if (Number.isNaN(at)) {
    return '';
  }
  const he = locale === 'he';
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) {
    return he ? 'עכשיו' : 'just now';
  }
  if (minutes < 60) {
    return he ? `לפני ${minutes} דקות` : `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24 && new Date(at).getDate() === new Date(now).getDate()) {
    return he ? `לפני ${hours} שעות` : `${hours} h ago`;
  }
  const time = new Intl.DateTimeFormat(he ? 'he-IL' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(at);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (new Date(at).toDateString() === yesterday.toDateString()) {
    return he ? `אתמול, ${time}` : `Yesterday, ${time}`;
  }
  const day = new Intl.DateTimeFormat(he ? 'he-IL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(new Date(at).getFullYear() !== new Date(now).getFullYear()
      ? { year: 'numeric' }
      : {}),
  }).format(at);
  return `${day}, ${time}`;
};
