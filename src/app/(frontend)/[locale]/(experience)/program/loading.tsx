import { TimelineSkeleton, SidebarSkeleton } from '@/features/conference';

/*
 * The program's own loading shape: the hero frame, the day/filter rails
 * and the timeline all held in place so the page settles instead of
 * flashing. Rendered by Next while the server builds the real page.
 */
const ProgramLoading = () => (
  <main className="experience min-h-dvh">
    <header className="relative overflow-hidden border-b border-[var(--x-line)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-20%,#eeeffb_0%,#f6f7fb_55%,var(--x-bg)_100%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-28 md:px-10 md:pt-32">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
          <span className="h-3 w-24 animate-pulse rounded-full bg-[var(--x-line)]" />
          <span className="h-10 w-72 animate-pulse rounded-lg bg-[var(--x-line-strong)]" />
          <span className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--x-line)]" />
          <span className="mt-3 h-[52px] w-full max-w-2xl animate-pulse rounded-[var(--x-r-pill)] bg-[var(--x-line)]" />
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div className="flex gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <span
            key={i}
            className="h-14 w-24 animate-pulse rounded-2xl bg-[var(--x-line)]"
          />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_336px]">
        <TimelineSkeleton rows={4} />
        <SidebarSkeleton />
      </div>
    </div>
  </main>
);

export default ProgramLoading;
