import type { SVGProps } from 'react';

/*
 * One quiet line-icon set for the whole experience — 1.6 stroke, round
 * joins, sized by the caller. Decorative by default (aria-hidden); pass a
 * title only where the icon carries meaning on its own.
 */
const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 21s6.5-5.2 6.5-10A6.5 6.5 0 0 0 5.5 11c0 4.8 6.5 10 6.5 10Z" />
    <circle cx="12" cy="11" r="2.4" />
  </svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
    <circle cx="9.5" cy="8" r="3" />
    <path d="M21 19v-1a4 4 0 0 0-3-3.87M16.5 5.13A3 3 0 0 1 16.5 11" />
  </svg>
);
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </svg>
);
export const IconStar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 4l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z" />
  </svg>
);
export const IconStarFilled = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <path d="M12 4l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z" />
  </svg>
);
export const IconShare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
  </svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </svg>
);
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);
export const IconChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m10 6 6 6-6 6" />
  </svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconWait = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 4h10M7 20h10M8 4c0 4 8 5 8 8s-8 4-8 8" />
  </svg>
);
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 15l6-6M10.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M13.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
  </svg>
);
export const IconLive = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <circle cx="12" cy="12" r="5" />
  </svg>
);

/*
 * The kinds of activity, each with a shape of its own — so a type reads
 * at a glance and never by colour alone.
 */
export const IconMic = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" />
  </svg>
);
export const IconBulb = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M9 18.5h6M10 21h4M8.5 14.2A5.5 5.5 0 1 1 15.5 14.2c-.7.6-1 1.3-1 2.3h-5c0-1-.3-1.7-1-2.3Z" />
  </svg>
);
export const IconCoffee = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4.5 9.5h11v5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5v-5ZM15.5 11h1.5a2.5 2.5 0 0 1 0 5h-1.5M8 6.5V4.5M11 6.5V4.5" />
  </svg>
);
export const IconCompass = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </svg>
);
export const IconWarn = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 4.5 20.5 19h-17L12 4.5ZM12 10v4M12 16.5v.5" />
  </svg>
);
export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);
export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
