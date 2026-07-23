'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/*
 * A quiet heartbeat: the thread re-reads itself every few seconds so a
 * conversation feels alive without a socket. Paused when the tab hides.
 */
const REFRESH_MS = 12000;

const ChatRefresh = () => {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    const timer = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
};

export default ChatRefresh;
