import { getTranslations } from 'next-intl/server';

const LocaleNotFound = async () => {
  const t = await getTranslations('common');

  return (
    <main id="main-content">
      <h1>{t('notFound')}</h1>
    </main>
  );
};

export default LocaleNotFound;
