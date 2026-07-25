/*
 * The cover a card wears when no photograph has been uploaded yet.
 *
 * Rather than an empty gradient, every activity gets a drawn cover from
 * the conference's own world — a lit stage, an auditorium, a screen, a
 * microphone, a panel, a room listening. The palette and the motif are
 * derived from the activity id, so a card always looks the same, the
 * rail never repeats itself twice in a row, and nothing has to be
 * authored for the page to look finished.
 */

interface Palette {
  from: string;
  to: string;
  ink: string;
}

const PALETTES: Palette[] = [
  { from: '#1d2c4e', to: '#0b1120', ink: '#8fa9f2' },
  { from: '#0f3339', to: '#08151b', ink: '#5fd2c4' },
  { from: '#2c1c40', to: '#120d1f', ink: '#b78bf0' },
  { from: '#3a2716', to: '#160f09', ink: '#efab63' },
  { from: '#391725', to: '#160a10', ink: '#ef7f9d' },
  { from: '#1b2c35', to: '#0a1117', ink: '#7fb8d6' },
];

/* Stable, cheap and evenly spread — the same id always lands the same. */
const hashOf = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

type MotifKey = 'stage' | 'seats' | 'waves' | 'screen' | 'panel' | 'mic';

const MOTIFS: MotifKey[] = ['stage', 'seats', 'waves', 'screen', 'panel', 'mic'];

/* Four voices on a stage, at the height each one sits. */
const PANEL_SEATS: [number, number][] = [
  [62, 92],
  [134, 62],
  [206, 104],
  [262, 74],
];

const Motif = ({ motif }: { motif: MotifKey }) => {
  switch (motif) {
    /* Two beams meeting on a lit floor. */
    case 'stage':
      return (
        <g>
          <path d="M88 -30 L26 214 L136 214 Z" fillOpacity="0.16" fill="currentColor" />
          <path d="M236 -30 L192 214 L306 214 Z" fillOpacity="0.11" fill="currentColor" />
          <ellipse cx="160" cy="206" rx="118" ry="22" fillOpacity="0.14" fill="currentColor" />
          <path d="M-10 178 H330" strokeOpacity="0.3" />
        </g>
      );

    /* Rows of an auditorium, curving away from the stage. */
    case 'seats':
      return (
        <g strokeOpacity="0.34">
          {[0, 1, 2, 3, 4].map((row) => (
            <path
              key={row}
              d={`M-20 ${268 - row * 32} Q160 ${196 - row * 32} 340 ${268 - row * 32}`}
            />
          ))}
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4, 5, 6].map((seat) => (
              <circle
                key={`${row}-${seat}`}
                cx={26 + seat * 45}
                cy={252 - row * 32 - Math.abs(3 - seat) * 4.5}
                r="5"
                fill="currentColor"
                fillOpacity="0.16"
                stroke="none"
              />
            )),
          )}
        </g>
      );

    /* A voice carrying across the room. */
    case 'waves':
      return (
        <g strokeOpacity="0.3">
          {[34, 68, 102, 136, 170, 204].map((r) => (
            <circle key={r} cx="34" cy="194" r={r} />
          ))}
          <circle cx="34" cy="194" r="9" fill="currentColor" fillOpacity="0.5" stroke="none" />
        </g>
      );

    /* The screen everyone is looking at. */
    case 'screen':
      return (
        <g strokeOpacity="0.34">
          <rect x="62" y="34" width="196" height="120" rx="8" />
          <path d="M84 68 H182 M84 90 H222 M84 112 H154" strokeOpacity="0.24" />
          <path d="M160 154 V186 M124 186 H196" />
        </g>
      );

    /* A conversation between people on a stage. */
    case 'panel':
      return (
        <g strokeOpacity="0.3">
          <path d="M62 92 L134 62 L206 104 L262 74" />
          {PANEL_SEATS.map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="13" fill="currentColor" fillOpacity="0.18" />
              <path d={`M${cx - 20} ${cy + 46} q20 -26 40 0`} strokeOpacity="0.22" />
            </g>
          ))}
          <path d="M-10 176 H330" strokeOpacity="0.22" />
        </g>
      );

    /* The instrument of the whole day. */
    case 'mic':
    default:
      return (
        <g strokeOpacity="0.34">
          <rect x="145" y="34" width="30" height="62" rx="15" />
          <path d="M152 52 H168 M152 66 H168 M152 80 H168" strokeOpacity="0.22" />
          <path d="M124 84 a36 36 0 0 0 72 0" />
          <path d="M160 120 V158 M132 158 H188" />
          <path d="M-10 190 H330" strokeOpacity="0.16" />
        </g>
      );
  }
};

interface SessionCoverProps {
  /* Anything stable about the activity — its id is ideal. */
  seed: string;
  className?: string;
}

const SessionCover = ({ seed, className }: SessionCoverProps) => {
  const h = hashOf(seed || 'netaim');
  const palette = PALETTES[h % PALETTES.length]!;
  const motif = MOTIFS[Math.floor(h / PALETTES.length) % MOTIFS.length]!;
  const gid = `cover-${h.toString(36)}`;

  return (
    <svg
      viewBox="0 0 320 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`absolute inset-0 size-full ${className ?? ''}`}
      style={{ color: palette.ink }}
    >
      <defs>
        <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={`${gid}-glow`} cx="50%" cy="18%" r="72%">
          <stop offset="0%" stopColor={palette.ink} stopOpacity="0.26" />
          <stop offset="100%" stopColor={palette.ink} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="220" fill={`url(#${gid}-bg)`} />
      <rect width="320" height="220" fill={`url(#${gid}-glow)`} />

      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <Motif motif={motif} />
      </g>
    </svg>
  );
};

export default SessionCover;
