import {
  CONSOLE_UI,
  CSaveButton,
  CTextField,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';
import { createExperienceAction } from '../actions';

/*
 * Creating an experience is one quiet sentence, not a wizard: a name,
 * an optional date, and the workspace opens with everything waiting
 * (Experience DNA does the rest).
 */
const NewExperiencePage = async () => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.newExperience[locale]}
        </span>
      }
    >
      <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 px-6">
        <header>
          <h1 className="font-display text-3xl font-medium">
            {CONSOLE_UI.newExperience[locale]}
          </h1>
          <p className="mt-1 text-sm text-[var(--c-text-soft)]">
            {CONSOLE_UI.newExperienceSub[locale]}
          </p>
        </header>
        <form action={createExperienceAction} className="flex flex-col gap-4">
          <CTextField name="title" label={CONSOLE_UI.experienceName[locale]} />
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium tracking-[0.16em] text-[var(--c-text-faint)]">
              {CONSOLE_UI.experienceDate[locale]}
            </span>
            <input
              type="date"
              name="startsAt"
              className="w-full rounded-lg border border-[var(--c-line)] bg-[rgba(6,10,16,0.6)] px-3 py-2.5 text-sm text-[var(--c-text)] transition-colors focus:border-[var(--c-bronze)]/60 focus:outline-none"
            />
          </label>
          <CSaveButton label={CONSOLE_UI.createAndOpen[locale]} />
        </form>
      </div>
    </ConsoleShell>
  );
};

export default NewExperiencePage;
