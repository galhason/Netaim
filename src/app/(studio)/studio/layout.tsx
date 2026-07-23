import type { ReactNode } from 'react';
import {
  getStudioCreator,
  getStudioLocale,
  StudioSignIn,
} from '@/features/studio';

/*
 * The Studio is one place now — the Console is its face. This layout
 * only guards the door: it resolves the signed-in creator per request
 * and must never be prerendered without a database.
 */
export const dynamic = 'force-dynamic';

interface StudioLayoutProps {
  children: ReactNode;
}

const StudioLayout = async ({ children }: StudioLayoutProps) => {
  const locale = await getStudioLocale();
  const creator = await getStudioCreator();

  if (!creator) {
    return <StudioSignIn locale={locale} />;
  }

  return children;
};

export default StudioLayout;
