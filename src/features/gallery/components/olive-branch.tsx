/*
 * The branch the organisation's pages wear in their corners: drawn in
 * the current colour, so it takes whatever quiet tone its place gives
 * it, and hidden from screen readers — it decorates, it says nothing.
 */
export const OliveBranch = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false" className={className} fill="none">
    <path d="M18 206C62 158 104 112 204 22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    {[
      [44, 176, -38],
      [62, 156, 28],
      [78, 140, -40],
      [96, 122, 26],
      [112, 106, -42],
      [130, 88, 24],
      [146, 72, -44],
      [164, 56, 22],
      [180, 42, -46],
    ].map(([x, y, r], index) => (
      <ellipse
        key={index}
        cx={x}
        cy={y}
        rx="19"
        ry="6.5"
        transform={`rotate(${r} ${x} ${y}) translate(${index % 2 === 0 ? -14 : 14} 0)`}
        fill="currentColor"
        opacity={index % 3 === 0 ? 0.55 : 0.8}
      />
    ))}
  </svg>
);
