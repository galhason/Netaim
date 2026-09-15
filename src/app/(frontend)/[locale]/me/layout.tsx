import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/*
 * The personal area's one job here: keep itself out of the indexes.
 *
 * Every page under /me answers for one signed-in person — their
 * profile, their connections, their conversations, their meetings.
 * None of it is public, and none of it should ever reach a search
 * engine's cache or a shared CDN copy. The pages are already dynamic
 * and cookie-bound (there is a test that enforces `force-dynamic`
 * across this tree), but a robots directive costs nothing and closes
 * the last door: a crawler that somehow receives one of these pages is
 * told, in the response itself, not to keep it.
 *
 * A layout rather than a per-page export, because the rule must hold
 * for pages that do not exist yet.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const MeLayout = ({ children }: { children: ReactNode }) => children;

export default MeLayout;
