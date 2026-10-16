import type { Locale } from '@/config/locales';

/*
 * A speaker's words in one language — name, job title, organisation and
 * a few lines — as the roster page and the speaker library both edit
 * them. Field names carry the language (`name_he`, `bio_en`), so one
 * form holds both columns and the action writes each to its locale.
 * English left empty shows the Hebrew on the site, so the English
 * fields say so.
 */
const t = (he: string, en: string): Record<Locale, string> => ({ he, en });

const UI = {
  name: t('שם', 'Name'),
  jobTitle: t('תפקיד', 'Job title'),
  company: t('ארגון', 'Organization'),
  bio: t('כמה מילים', 'Short bio'),
  he: t('עברית', 'Hebrew'),
  en: t('אנגלית', 'English'),
  enHint: t('ריק = הטקסט העברי', 'Empty = the Hebrew text'),
};

const INPUT = 'w-full rounded-md border border-[var(--c-line)] bg-[rgba(7,19,36,0.55)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-bronze)]';
const LABEL = 'mb-1 block text-[11px] font-medium tracking-[0.08em] text-[var(--c-text-soft)]';

export interface SpeakerWordValues {
  name?: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
}

const SpeakerWordsFields = ({
  locale,
  lang,
  values,
  placeholders,
}: {
  locale: Locale;
  lang: Locale;
  values: SpeakerWordValues;
  placeholders?: SpeakerWordValues;
}) => {
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  return (
    <div className="rounded-md border border-[var(--c-line)] p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-xs font-semibold text-[var(--c-text)]">{UI[lang][locale]}</h4>
        {lang === 'en' ? <span className="text-[10px] text-[var(--c-text-faint)]">{UI.enHint[locale]}</span> : null}
      </div>
      <div className="grid gap-2">
        <label className="block">
          <span className={LABEL}>{UI.name[locale]}</span>
          <input name={`name_${lang}`} dir={dir} defaultValue={values.name ?? ''} placeholder={placeholders?.name} className={INPUT} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>{UI.jobTitle[locale]}</span>
            <input name={`jobTitle_${lang}`} dir={dir} defaultValue={values.jobTitle ?? ''} placeholder={placeholders?.jobTitle} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>{UI.company[locale]}</span>
            <input name={`company_${lang}`} dir={dir} defaultValue={values.company ?? ''} placeholder={placeholders?.company} className={INPUT} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>{UI.bio[locale]}</span>
          <textarea name={`bio_${lang}`} dir={dir} rows={3} defaultValue={values.bio ?? ''} placeholder={placeholders?.bio} className={`${INPUT} resize-y`} />
        </label>
      </div>
    </div>
  );
};

export default SpeakerWordsFields;
