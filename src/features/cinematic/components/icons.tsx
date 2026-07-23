import type { ReactNode } from 'react';
import type { CinematicIcon } from '../types/cinematic';

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

export const IconScroll = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="8.5" y="3" width="7" height="12" rx="3.5" />
    <path d="M12 6v2.5M12 18l-2-2.4M12 18l2 2.4M12 18v3" />
  </svg>
);

export const IconChevronLeft = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconAccessibility = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="4.5" r="1.6" />
    <path d="M5 8.5c2.5 1 4.5 1.3 7 1.3s4.5-.3 7-1.3M12 9.8V15M12 15l-3.2 5M12 15l3.2 5" />
  </svg>
);

export const IconParking = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M9.5 16.5v-9h3a2.6 2.6 0 0 1 0 5.2H9.5" />
  </svg>
);

export const IconTransit = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="6" y="3.5" width="12" height="13" rx="2.5" />
    <path d="M6 12h12M9 20l1.5-3M15 20l-1.5-3" />
    <circle cx="9" cy="14" r="0.6" />
    <circle cx="15" cy="14" r="0.6" />
  </svg>
);

export const IconHotel = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M3 20h18M4.5 20V6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V20" />
    <path d="M9 8.5h2M13 8.5h2M9 12h2M13 12h2M10.5 20v-3.5h3V20" />
  </svg>
);

export const IconCalendar = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
  </svg>
);

export const IconPin = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 21s-6.5-5.4-6.5-10.2A6.3 6.3 0 0 1 12 4.5a6.3 6.3 0 0 1 6.5 6.3C18.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.8" r="2.1" />
  </svg>
);

export const IconPlay = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M6 4.5v15l13-7.5-13-7.5Z" />
  </svg>
);

export const IconUsers = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-3-4.9" />
  </svg>
);

export const IconBulb = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3Z" />
  </svg>
);

export const IconSprout = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M12 21v-8" />
    <path d="M12 13c0-3-2.4-5.4-5.4-5.4C6.6 10.6 9 13 12 13Z" />
    <path d="M12 12c0-3.4 2.6-6 6-6 0 3.4-2.6 6-6 6Z" />
  </svg>
);

export const IconTarget = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" />
  </svg>
);

const IconLeaf = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M11 20A7 7 0 0 1 4 13c0-4.5 3.4-8.4 9.5-9 1.2 6.4-.9 12.6-2.5 16Z" />
    <path d="M4.5 19.5c2.8-4 6-6.3 9.5-7.2" />
  </svg>
);

const IconCoffee = ({ className }: IconProps) => (
  <svg {...base(className)}>
    <path d="M5 9h11v4.5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
    <path d="M16 10.5h1.6a2.4 2.4 0 0 1 0 4.8H16" />
    <path d="M7.5 3.8v2.2M11 3.8v2.2" />
  </svg>
);

const GLYPHS = {
  accessibility: IconAccessibility,
  parking: IconParking,
  transit: IconTransit,
  hotel: IconHotel,
  leaf: IconLeaf,
  coffee: IconCoffee,
  scroll: IconScroll,
  chevron: IconChevronLeft,
} satisfies Record<CinematicIcon, (props: IconProps) => ReactNode>;

export const Glyph = ({
  icon,
  className,
}: {
  icon: CinematicIcon;
  className?: string;
}) => {
  const Component = GLYPHS[icon];
  return <Component className={className} />;
};
