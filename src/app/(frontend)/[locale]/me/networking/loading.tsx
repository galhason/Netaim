/*
 * The community, sketched — shown for the beat while the server
 * assembles the real room. Each block sits exactly where its real
 * counterpart will: the dark entrance, a rail of circles, a row of
 * cards, a grid. No spinner: a page that shows its own shape loads
 * calmly; a page that shows a wheel admits it has none.
 */
const pulse = 'animate-pulse rounded-3xl bg-[var(--n-navy)]/8';

const NetworkingLoading = () => (
  <main id="main-content" className="community min-h-dvh bg-[var(--n-bg)] pb-28 md:pb-16">
    <div className="px-3 pt-3 md:px-6 md:pt-6">
      <div className="mx-auto h-80 max-w-6xl animate-pulse rounded-[2rem] bg-[var(--n-navy)]/90 md:h-96" />
    </div>
    <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-10 px-6">
      <div>
        <div className={`${pulse} h-6 w-48`} />
        <div className="mt-4 flex gap-5 overflow-hidden">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex w-[5.5rem] flex-none flex-col items-center gap-2 md:w-24">
              <div className="size-16 animate-pulse rounded-full bg-[var(--n-navy)]/8 md:size-20" />
              <div className={`${pulse} h-3 w-14`} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={`${pulse} h-36`} />
        ))}
      </div>
      <div className={`${pulse} h-16`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={`${pulse} h-48`} />
        ))}
      </div>
    </div>
  </main>
);

export default NetworkingLoading;
