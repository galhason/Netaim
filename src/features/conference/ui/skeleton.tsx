import { surface } from './kit';

/*
 * Loading placeholders that hold the exact shape of what is coming, so the
 * page never jumps when data arrives. Calm shimmer, not spinners.
 */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={`block animate-pulse rounded-md bg-[var(--x-line)] ${className}`}
  />
);

export const ActivityCardSkeleton = () => (
  <div className={`${surface} border border-[var(--x-line)] p-5 md:p-6`}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="mt-3 h-6 w-3/4" />
    <Skeleton className="mt-2 h-4 w-full" />
    <Skeleton className="mt-1.5 h-4 w-2/3" />
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-9 w-24 rounded-[var(--x-r-field)]" />
    </div>
  </div>
);

export const TimelineSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <ol className="relative flex flex-col gap-4">
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 top-3 start-[54px] w-px bg-[var(--x-line)] sm:start-[62px]"
    />
    {Array.from({ length: rows }, (_, i) => (
      <li
        key={i}
        className="relative grid grid-cols-[46px_18px_1fr] items-start gap-2 sm:grid-cols-[54px_18px_1fr] sm:gap-3"
      >
        <Skeleton className="mt-4 h-4 w-10" />
        <span className="relative flex justify-center pt-[22px]">
          <span className="size-2.5 rounded-full bg-[var(--x-line)] ring-4 ring-[var(--x-bg)]" />
        </span>
        <ActivityCardSkeleton />
      </li>
    ))}
  </ol>
);

export const SidebarSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className={`${surface} border border-[var(--x-line)] p-5`}>
      <Skeleton className="mx-auto h-4 w-28" />
      <div className="mt-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 21 }, (_, i) => (
          <Skeleton key={i} className="mx-auto size-6 rounded-full" />
        ))}
      </div>
    </div>
    <div className={`${surface} border border-[var(--x-line)] p-5`}>
      <Skeleton className="h-5 w-24" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  </div>
);
