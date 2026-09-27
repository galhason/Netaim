import type { Locale } from '@/config/locales';
import ConsoleShell from './console-shell';

/*
 * What a screen shows to a person whose role does not open it. The
 * shell stays, so the person keeps the rail and can go where they may;
 * only the stage says no. One component, so every screen refuses in
 * the same voice.
 */
const DENIED = {
  he: 'המסך הזה לא פתוח לתפקיד שלך. אם נדרשת גישה — מנהל Netaim יכול להעניק אותה.',
  en: 'This screen is not open to your role. If you need access, a Netaim Admin can grant it.',
} as const;

const ConsoleDenied = ({ locale, title, userName = '' }: { locale: Locale; title: string; userName?: string }) => (
  <ConsoleShell
    locale={locale}
    userName={userName}
    breadcrumb={<span className="font-medium text-[var(--c-text)]">{title}</span>}
  >
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm text-[var(--c-text-soft)]">{DENIED[locale]}</p>
    </div>
  </ConsoleShell>
);

export default ConsoleDenied;
