import type { Locale } from '@/config/locales';
import { chooseLocaleAction } from '../actions/choose-locale';
import { ACCOUNT_UI } from '../constants/account-ui';

/*
 * One language control, two moments: a choice made while opening the
 * account, and a switch on the profile that changes it for good. Both are
 * plain form controls — no client JavaScript, and both keep the pill
 * shape of the lounge.
 */
const LANGUAGE_OPTIONS = ['he', 'en'] as const;

const labelFor = (option: Locale, locale: Locale): string =>
  option === 'he'
    ? ACCOUNT_UI.languageHebrew[locale]
    : ACCOUNT_UI.languageEnglish[locale];

const PILL =
  'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border px-5 text-sm transition-colors';

const IDLE =
  'border-[var(--l-hair)] bg-white text-[var(--l-soft)] hover:border-[var(--l-bronze)]';

const ACTIVE =
  'border-[var(--l-bronze)] bg-[var(--l-bronze)]/12 font-medium text-[var(--l-ink)]';

/* Registration: the choice travels with the rest of the account form. */
export const LanguageRadioGroup = ({ locale }: { locale: Locale }) => (
  <fieldset>
    <legend className="mb-1.5 block text-xs font-medium text-[var(--l-soft)]">
      {ACCOUNT_UI.languageLabel[locale]}
    </legend>
    <div className="flex gap-2">
      {LANGUAGE_OPTIONS.map((option) => (
        <label key={option} className="flex flex-1">
          <input
            type="radio"
            name="preferredLocale"
            value={option}
            defaultChecked={option === locale}
            className="peer sr-only"
          />
          <span
            className={`${PILL} ${IDLE} peer-checked:border-[var(--l-bronze)] peer-checked:bg-[var(--l-bronze)]/12 peer-checked:font-medium peer-checked:text-[var(--l-ink)] peer-focus-visible:border-[var(--l-bronze)]`}
          >
            {labelFor(option, locale)}
          </span>
        </label>
      ))}
    </div>
    <span className="mt-1.5 block text-xs text-[var(--l-faint)]">
      {ACCOUNT_UI.languageChoiceHint[locale]}
    </span>
  </fieldset>
);

/* Profile: pressing a pill saves the language and reloads this page in it. */
export const LanguageSwitchForm = ({
  locale,
  next,
}: {
  locale: Locale;
  next: string;
}) => (
  <form action={chooseLocaleAction} className="flex gap-2">
    <input type="hidden" name="next" value={next} />
    {LANGUAGE_OPTIONS.map((option) => (
      <button
        key={option}
        type="submit"
        name="to"
        value={option}
        aria-pressed={option === locale}
        className={`${PILL} ${option === locale ? ACTIVE : IDLE}`}
      >
        {labelFor(option, locale)}
      </button>
    ))}
  </form>
);
