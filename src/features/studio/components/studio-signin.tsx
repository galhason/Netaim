import Link from 'next/link';
import type { Locale } from '@/config/locales';
import { STUDIO_MESSAGES } from '../constants/navigation';

/*
 * The one sign-in doorway, shared by every Studio surface: the visitor
 * is asked to enter before any creative environment opens.
 */
interface StudioSignInProps {
  locale: Locale;
}

/*
 * Studio access is a role on the platform account (Identity
 * Architecture §1): the door sends the visitor to the one platform
 * sign-in; the Studio opens by grant, not by a separate login.
 */
const StudioSignIn = ({ locale }: StudioSignInProps) => (
  <main
    id="main-content"
    className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-4 px-6"
  >
    <span aria-hidden="true" className="block h-px w-16 bg-accent" />
    <h1 className="font-display text-3xl font-medium">
      {STUDIO_MESSAGES.title[locale]}
    </h1>
    <p className="text-text-secondary">{STUDIO_MESSAGES.signInRequired[locale]}</p>
    <Link
      href={`/${locale}/me`}
      className="inline-flex min-h-12 items-center font-medium underline decoration-current/40 underline-offset-8"
    >
      {STUDIO_MESSAGES.signInAction[locale]}
    </Link>
  </main>
);

export default StudioSignIn;
