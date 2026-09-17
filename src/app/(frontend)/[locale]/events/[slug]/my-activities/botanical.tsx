/*
 * The brand's leaf, drawn once.
 *
 * Netaim means saplings, and the registration pages already carry a
 * faint botanical wash behind their text. The same forms return here,
 * at the same restraint: a page about time is information first, and
 * the leaves are allowed to sit only where nothing is read — the
 * corners of the page and the corner of one card.
 */
const Leaf = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 320 320"
    aria-hidden="true"
    className={`pointer-events-none absolute ${className}`}
    fill="var(--x-ok)"
  >
    <path d="M60 300c0-90 55-160 150-180-10 95-60 160-150 180Z" />
    <path d="M120 310c20-60 70-100 140-110-20 70-70 110-140 110Z" opacity=".6" />
    <path d="M40 320c-5-40 10-80 45-100 5 40-10 80-45 100Z" opacity=".5" />
    <path
      d="M60 300c30-70 80-120 150-180"
      fill="none"
      stroke="var(--x-ok)"
      strokeWidth="1.5"
      opacity=".35"
    />
  </svg>
);

/* Two leaves around the page: one high on the end side, one low on the start. */
export const PageLeaves = () => (
  <>
    <Leaf className="-end-20 top-16 hidden size-72 opacity-[0.10] md:block" />
    <Leaf className="-start-24 bottom-24 hidden size-64 opacity-[0.08] rtl:-scale-x-100 md:block" />
  </>
);

/*
 * A small sprig for the sidebar's lavender card — drawn in the accent
 * rather than the leaf green, so it belongs to the card it sits in.
 */
export const Sprig = ({ className = 'size-12' }: { className?: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className={className} fill="none">
    <path
      d="M24 44V20"
      stroke="var(--x-primary)"
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity=".7"
    />
    <path
      d="M24 30c-9 0-14-6-14-14 8 0 14 5 14 14Z"
      fill="var(--x-primary)"
      opacity=".35"
    />
    <path
      d="M24 24c0-9 6-14 14-14 0 8-5 14-14 14Z"
      fill="var(--x-primary)"
      opacity=".55"
    />
    <path
      d="M24 36c-6 0-10-4-10-10 6 0 10 4 10 10Z"
      fill="var(--x-primary)"
      opacity=".25"
    />
  </svg>
);

export default Leaf;
