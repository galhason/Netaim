'use client';

import { useCallback, useEffect, useState } from 'react';

/*
 * Favourites are a private bookmark, not a registration — they belong to
 * the device, so the browser keeps them. One store shared by the program
 * cards, the activity drawer and the personal dashboard's counter, kept in
 * step through a single event so a star lit in one place lights everywhere.
 */
const KEY = 'hason-favorites';
const EVENT = 'hason-favorites-change';

const read = (): string[] => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
};

export interface FavoritesApi {
  ids: string[];
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
}

export const useFavorites = (): FavoritesApi => {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string): boolean => {
    const current = read();
    const on = !current.includes(id);
    const next = on ? [...current, id] : current.filter((v) => v !== id);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private browsing — the star still turns for this visit */
    }
    setIds(next);
    window.dispatchEvent(new Event(EVENT));
    return on;
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, ready, has, toggle };
};
