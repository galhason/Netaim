'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/*
 * The schedule keeps itself current. Every few minutes — and the moment
 * the guest returns to the tab — the server view is re-fetched, so an
 * activity that has just ended quietly leaves the list and the next one
 * moves to the top without anyone reaching for reload.
 */
const AutoRefresh = ({ everyMs = 180000 }: { everyMs?: number }) => {
  const router = useRouter();

  useEffect(() => {
    const tick = () => router.refresh();
    const timer = window.setInterval(tick, everyMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router, everyMs]);

  return null;
};

export default AutoRefresh;
