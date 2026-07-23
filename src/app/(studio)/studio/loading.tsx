/*
 * Home loading: the shape of the three-question Home held by skeletons —
 * a calm placeholder, never a spinner (Studio-Visual-Language).
 */
const HomeLoading = () => (
  <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
    <div className="flex min-w-0 flex-1 flex-col gap-14">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-11 w-72" />
        <div className="skeleton h-5 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-14 w-44" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
    <div className="lg:w-80 lg:shrink-0">
      <div className="skeleton h-56 w-full rounded-lg" />
    </div>
  </div>
);

export default HomeLoading;
