interface IconProps {
  className?: string;
}

const base = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className,
});

export const IconChevron = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconScroll = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="8.5" y="3" width="7" height="12" rx="3.5" />
    <path d="M12 6v2.5M12 18l-2-2.4M12 18l2 2.4M12 18v3" />
  </svg>
);
