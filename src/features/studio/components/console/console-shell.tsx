import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import ConsoleSidebar from './console-sidebar';

/*
 * The Studio's one frame, as the approved reference: a quiet navy
 * sidebar carrying every menu, and the stage on its side — whatever
 * page the director enters, only the center changes.
 */
interface ConsoleShellProps {
  locale: Locale;
  userName: string;
  breadcrumb: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const ConsoleShell = ({
  locale,
  userName,
  breadcrumb,
  actions,
  children,
}: ConsoleShellProps) => (
  <div className="console flex min-h-dvh flex-col bg-[var(--c-void)] font-body text-[var(--c-text)] md:grid md:grid-cols-[200px_1fr]">
    <ConsoleSidebar locale={locale} />

    <div className="flex min-h-0 min-w-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--c-line)] px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--c-text-soft)]">
          {breadcrumb}
        </div>
        <div className="ms-auto flex items-center gap-3">
          <span className="text-sm text-[var(--c-text-soft)]">{userName}</span>
          {actions}
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  </div>
);

export default ConsoleShell;
