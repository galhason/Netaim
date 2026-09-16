import type { ReactNode } from 'react';
import type { Locale } from '@/config/locales';
import { getSiteBrand } from '@/features/events';
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
/*
 * The logo is resolved here rather than taken as a prop, for the same
 * reason the console shell resolves it: every classic screen renders
 * through this frame, and a prop is a chance to forget one.
 */
const StudioShell = async ({
  locale,
  userName,
  children,
}: StudioShellProps) => {
  const logo = await getSiteBrand().catch(() => null);
  return (
  <div className="min-h-dvh bg-surface text-text-primary md:flex">
    <StudioSidebar
      locale={locale}
      userName={userName}
      {...(logo ? { brandLogo: logo.onDark } : {})}
    />
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
};

export default StudioShell;
