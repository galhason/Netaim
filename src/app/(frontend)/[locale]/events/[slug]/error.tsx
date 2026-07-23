'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/shared';

const log = createLogger('events');

interface EventErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const EventError = ({ error, reset }: EventErrorProps) => {
  const t = useTranslations('common');

  useEffect(() => {
    log.error('Event experience failed to render', {
      error: error.message,
      digest: error.digest ?? '',
    });
  }, [error]);

  return (
    <div role="alert">
      <p>{t('error')}</p>
      <button type="button" onClick={reset}>
        {t('retry')}
      </button>
    </div>
  );
};

export default EventError;
