/*
 * The day, sketched — shown for the beat while the server reads the
 * programme and the registrations. Each block sits where its real
 * counterpart will land: the title, the row of days, the card at the
 * top, the timeline with its spine, the sidebar. No spinner: a page
 * that shows its own shape loads calmly.
 */
const pulse = 'animate-pulse rounded-[var(--x-r-card)] bg-[var(--x-ink)]/[0.06]';

const ScheduleLoading = () => (
  <main
    id="main-content"
    aria-busy="true"
    className="mx-auto max-w-6xl px-5 pb-24 pt-8 md:px-10 md:pt-10"
  >
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className={`${pulse} h-3 w-24`} />
        <div className={`${pulse} mt-3 h-9 w-56`} />
        <div className={`${pulse} mt-3 h-4 w-80 max-w-full`} />
      </div>
      <div className="hidden gap-2 sm:flex">
        <div className={`${pulse} h-11 w-36`} />
        <div className={`${pulse} h-11 w-36`} />
      </div>
    </div>

    <div className="mt-8 flex gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className={`${pulse} h-16 w-40`} />
      ))}
    </div>

    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <div className={`${pulse} h-40`} />
        <div className={`${pulse} mt-8 h-5 w-40`} />
        <ol className="relative mt-4 flex flex-col gap-3">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 top-4 start-[54px] w-px bg-[var(--x-line-strong)]"
          />
          {Array.from({ length: 4 }, (_, index) => (
            <li
              key={index}
              className="grid grid-cols-[46px_18px_1fr] items-center gap-3"
            >
              <div className={`${pulse} h-4 w-10`} />
              <span className="flex justify-center">
                <span className="size-2.5 rounded-full bg-[var(--x-line-strong)]" />
              </span>
              <div className={`${pulse} h-[74px]`} />
            </li>
          ))}
        </ol>
      </div>
      <div className="hidden flex-col gap-4 lg:flex">
        <div className={`${pulse} h-56`} />
        <div className={`${pulse} h-40`} />
      </div>
    </div>
  </main>
);

export default ScheduleLoading;
