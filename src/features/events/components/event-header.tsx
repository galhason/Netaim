import { useTranslations } from 'next-intl';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/config/locales';
import { chooseLocaleAction } from '@/features/account/actions/choose-locale';
import type { EventNavigationItem } from '../types/event-experience';
import LogoMark from './logo-mark';

interface EventHeaderProps {
  brandName: string;
  navigation: EventNavigationItem[];
  locale: Locale;
  slug: string;
  onMedia: boolean;
}

const EventHeader = ({
  brandName,
  navigation,
  locale,
  slug,
  onMedia,
}: EventHeaderProps) => {
  const t = useTranslations('common');

  return (
    <header
      className={`absolute inset-x-0 top-0 z-10 ${
        onMedia ? 'text-on-media' : 'text-text-primary'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-5 md:px-12">
        <a
          href={`/${locale}/events/${slug}`}
          className="flex items-center gap-3 font-display text-xl font-medium tracking-wide"
        >
          <span>{brandName}</span>
          <LogoMark />
        </a>
        {navigation.length > 0 ? (
          <nav
            aria-label={t('mainNavigation')}
            className="hidden items-center gap-8 text-sm md:flex"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="opacity-75 transition-opacity hover:opacity-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="flex items-center gap-2 text-sm">
          {SUPPORTED_LOCALES.map((supportedLocale, index) => (
            <span key={supportedLocale} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="opacity-40">
                  |
                </span>
              ) : null}
              {/*
                * A saved language preference outranks navigation, so the
                * switch has to change the preference rather than link past
                * it — otherwise the middleware would send the visitor back.
                */}
              <form action={chooseLocaleAction} className="flex">
                <input
                  type="hidden"
                  name="next"
                  value={`/${supportedLocale}/events/${slug}`}
                />
                <button
                  type="submit"
                  name="to"
                  value={supportedLocale}
                  aria-current={supportedLocale === locale ? 'true' : undefined}
                  className={
                    supportedLocale === locale
                      ? 'inline-flex min-h-11 cursor-pointer items-center font-medium text-accent'
                      : 'inline-flex min-h-11 cursor-pointer items-center opacity-85 transition-opacity hover:opacity-100'
                  }
                >
                  {LOCALE_LABELS[supportedLocale]}
                </button>
              </form>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
};

export default EventHeader;
