import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import StudioSidebar from './studio-sidebar';

interface StudioShellProps {
  locale: Locale;
  userName: string;
  children: ReactNode;
}

/*
 * The permanent Studio home: a quiet civic-ink rail (global navigation,
 * language, the creator) beside one calm content column. No top chrome,
 * no dashboard — the work fills the surface.
 */
const StudioShell = ({ locale, userName, children }: StudioShellProps) => (
  <div className="min-h-dvh bg-surface text-text-primary md:flex">
    <StudioSidebar locale={locale} userName={userName} />
    <div className="min-w-0 flex-1">
      <main
        id="main-content"
        className="rise mx-auto w-full max-w-6xl px-5 py-10 md:px-12 md:py-14"
      >
        {children}
      </main>
    </div>
  </div>
);

export default StudioShell;
