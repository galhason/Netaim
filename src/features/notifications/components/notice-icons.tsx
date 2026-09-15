import type { SVGProps } from 'react';
import type { NoticeIcon } from '../services/feed-links';

/*
 * The glyphs of the notification centre — one stroke weight, one
 * grid, drawn in the same hand as the conference icon set so a note
 * in the bar and a note on the page read as the same kind of thing.
 */
const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5" />
    <path d="M13.7 20.5a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconCalendarNote = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

export const IconTicket = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v2a2 2 0 0 0 0 4v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2 2 0 0 0 0-4z" />
    <path d="M10 7v10" strokeDasharray="1.5 2.2" />
  </svg>
);

export const IconPersonPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="10" cy="8.5" r="3.4" />
    <path d="M3.5 19.5c.6-3.4 3.2-5.4 6.5-5.4 1.3 0 2.5.3 3.5.9M18 13v6M15 16h6" />
  </svg>
);

export const IconHandshake = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="8.5" cy="8.5" r="3" />
    <circle cx="16.5" cy="9.5" r="2.4" />
    <path d="M2.5 19c.6-3.2 2.9-5 6-5s5.4 1.8 6 5M14.8 18.5c.4-2 1.6-3.2 3.2-3.2 1.4 0 2.4.9 2.7 2.7" />
    <path d="M16 5.5l1.2 1.2L19.5 4.5" />
  </svg>
);

export const IconMeeting = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M20 11.5c0 4.1-3.6 7-8 7-1 0-2-.15-2.9-.44L4.5 19.5l1.3-3.4A6.7 6.7 0 0 1 4 11.5c0-4.1 3.6-7 8-7s8 2.9 8 7z" />
    <path d="M9 11.5h6" />
  </svg>
);

export const IconMegaphone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" />
    <path d="M16.5 9.5a3.5 3.5 0 0 1 0 5M19 7.5a7 7 0 0 1 0 9" />
  </svg>
);

export const IconSettingsDot = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
  </svg>
);

export const IconCheckAll = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3.5 12.5l4 4L15 9M11 16.5l1.5 1.5L21 9.5" />
  </svg>
);

export const NoticeGlyph = ({
  icon,
  className,
}: {
  icon: NoticeIcon;
  className?: string;
}) => {
  const props = { className };
  switch (icon) {
    case 'calendar':
      return <IconCalendarNote {...props} />;
    case 'ticket':
      return <IconTicket {...props} />;
    case 'person-plus':
      return <IconPersonPlus {...props} />;
    case 'handshake':
      return <IconHandshake {...props} />;
    case 'meeting':
      return <IconMeeting {...props} />;
    default:
      return <IconMegaphone {...props} />;
  }
};
