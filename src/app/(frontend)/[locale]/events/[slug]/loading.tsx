import { getTranslations } from 'next-intl/server';

const EventLoading = async () => {
  const t = await getTranslations('common');

  return <p role="status">{t('loading')}</p>;
};

export default EventLoading;
