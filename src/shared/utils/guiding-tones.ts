/*
 * The Guiding Light's atmosphere presets: every conference keeps the
 * identical movement and owns only the temperature. Plain constants —
 * consumed by the CMS schema on the server and by the client shader.
 */
export const GUIDING_TONES = {
  bronze: '0.788, 0.631, 0.365',
  innovation: '0.62, 0.74, 0.92',
  daylight: '0.92, 0.94, 0.97',
  morning: '0.95, 0.82, 0.6',
  nature: '0.55, 0.78, 0.6',
  stage: '0.9, 0.72, 0.4',
} as const;

export type GuidingTone = keyof typeof GUIDING_TONES;

export const GUIDING_TONE_KEYS = Object.keys(GUIDING_TONES) as GuidingTone[];

export const isGuidingTone = (value: string): value is GuidingTone =>
  value in GUIDING_TONES;

const toRgb = (glsl: string): string =>
  glsl
    .split(',')
    .map((channel) => Math.round(Number(channel.trim()) * 255))
    .join(' ');

export const GUIDING_TONE_RGB = Object.fromEntries(
  Object.entries(GUIDING_TONES).map(([tone, value]) => [tone, toRgb(value)]),
) as Record<GuidingTone, string>;
