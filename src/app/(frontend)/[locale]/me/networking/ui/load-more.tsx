'use client';

import { useLinkStatus } from 'next/link';

/*
 * The label inside the "load more" link. `useLinkStatus` is the whole
 * trick: while the server renders the next slice, the arrow becomes a
 * small spinner — feedback without a loader taking over the page, and
 * without the link stopping being a link. With no JavaScript the
 * parent <a> simply navigates; this label then never spins, and loses
 * nothing.
 */
const LoadMoreLabel = ({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-[var(--n-purple)]/30 border-t-[var(--n-purple)]"
        />
      ) : (
        <span aria-hidden="true" className="text-[var(--n-purple)]">
          +
        </span>
      )}
      {label}
      <span className="text-xs text-[var(--n-faint)]">{hint}</span>
    </>
  );
};

export default LoadMoreLabel;
