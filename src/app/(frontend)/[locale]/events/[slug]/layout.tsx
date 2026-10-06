import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isSupportedLocale } from '@/config/locales';
import { TeamPreviewNote } from '@/features/conference';
import { conferenceDoor } from '@/features/conference/services/conference-door';

interface ConferenceLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}

/*
 * Every page of a conference, beneath one reminder.
 *
 * While the Studio keeps a conference to the Netaim team, a team member
 * browsing it sees a small "team preview" pill on every page, with the
 * way to the switch that opens it. Everyone else never reaches the
 * children: each page asks the door itself and returns the "being
 * prepared" page in its place — a layout that drops its children does
 * not stop them being rendered, so the lock cannot live here.
 */
const ConferenceLayout = async ({ children, params }: ConferenceLayoutProps) => {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) {
    notFound();
  }
  const door = await conferenceDoor(slug);
  if (!door.staffOnly || !door.open) {
    return children;
  }
  return (
    <>
      {children}
      <TeamPreviewNote locale={locale} slug={slug} />
    </>
  );
};

/* Who is looking decides what is drawn; never prerendered or shared. */
export const dynamic = 'force-dynamic';

export default ConferenceLayout;
