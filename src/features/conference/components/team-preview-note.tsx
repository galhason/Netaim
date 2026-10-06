import type { Locale } from '@/config/locales';
import { withBasePath } from '@/config/site';
import { PREPARING_COPY } from '../constants/preparing-copy';

/*
 * The one reminder a team member gets while looking at a conference
 * that only the team can see: a small pill at the foot of the screen,
 * and the way to the Studio switch that opens it to everyone.
 *
 * A plain anchor: the Studio is another root layout.
 */
interface TeamPreviewNoteProps {
  locale: Locale;
  slug: string;
}

const TeamPreviewNote = ({ locale, slug }: TeamPreviewNoteProps) => (
  <aside
    aria-label={PREPARING_COPY.teamPreview[locale]}
    className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 print:hidden"
  >
    <p className="pointer-events-auto inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-[var(--nt-dark)] px-4 py-2 text-[13px] text-[var(--nt-surface)] shadow-[var(--nt-shadow-lift)]">
      <span className="inline-flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--nt-orange)]" />
        {PREPARING_COPY.teamPreview[locale]}
      </span>
      <span>{PREPARING_COPY.teamPreviewNote[locale]}</span>
      <a
        href={withBasePath(`/studio/conference/${encodeURIComponent(slug)}/settings`)}
        className="rounded font-semibold text-[var(--nt-accent-on-dark-soft)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nt-orange)]"
      >
        {PREPARING_COPY.openToAll[locale]}
      </a>
    </p>
  </aside>
);

export default TeamPreviewNote;
