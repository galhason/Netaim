import type { ReactNode } from 'react';
import {
  CONSOLE_UI,
  ConsoleShell,
  getStudioCreator,
  getStudioLocale,
} from '@/features/studio';

/*
 * The management areas live inside the same frame as everything else —
 * one Studio, one sidebar; their proven light worksheets sit on a
 * bright panel at the center of the dark stage.
 */
interface ClassicLayoutProps {
  children: ReactNode;
}

const ClassicLayout = async ({ children }: ClassicLayoutProps) => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  return (
    <ConsoleShell
      locale={locale}
      userName={creator?.name ?? ''}
      breadcrumb={
        <span className="font-medium text-[var(--c-text)]">
          {CONSOLE_UI.classicStudio[locale]}
        </span>
      }
    >
      <div className="h-full overflow-y-auto p-4">
        <div className="min-h-full rounded-xl bg-surface p-6 text-text-primary">
          {children}
        </div>
      </div>
    </ConsoleShell>
  );
};

export default ClassicLayout;
