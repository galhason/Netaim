'use client';

import { ShaderCanvas } from '@/shared';

/*
 * The hero's living environment: an empty hall the moment before people
 * arrive — warm projector beams sweeping slowly, haze breathing, dust
 * drifting through the light. Rendered as a translucent shader layer
 * over the photograph, so when WebGL is unavailable the photograph and
 * the CSS glow simply carry the frame alone.
 */
const HERO_ATMOSPHERE_FRAGMENT = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scroll;

const vec3 BRONZE = vec3(0.788, 0.631, 0.365);
const vec3 HAZE = vec3(0.35, 0.42, 0.55);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.1;
    amplitude *= 0.5;
  }
  return value;
}

float beam(vec2 p, vec2 origin, vec2 direction, float width) {
  vec2 toPoint = p - origin;
  float along = clamp(dot(toPoint, direction), 0.0, 2.4);
  vec2 projected = origin + direction * along;
  float distance = length(p - projected);
  float core = exp(-distance * distance / (width * width));
  float reach = smoothstep(2.4, 0.1, along);
  return core * reach;
}

float dust(vec2 uv, float scale, float rise, float t) {
  vec2 p = uv * scale + vec2(0.0, -t * rise);
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float seed = hash(cell);
  if (seed < 0.8) {
    return 0.0;
  }
  vec2 center = vec2(hash(cell + vec2(1.3, 7.1)), hash(cell + vec2(4.7, 2.9)));
  center = 0.15 + 0.7 * center;
  float d = length(f - center);
  float radius = 0.028 + 0.04 * seed;
  float twinkle = 0.55 + 0.45 * sin(t * (0.5 + seed * 1.5) + seed * 6.2831);
  return smoothstep(radius, 0.0, d) * twinkle;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time;

  vec2 drift = vec2(sin(t * 0.04), cos(t * 0.033)) * 0.02;
  vec2 camera = uv + drift;

  float fog = fbm(camera * 1.8 + vec2(t * 0.02, t * 0.01));

  vec2 originA = vec2(-0.5 + 0.14 * sin(t * 0.05), 0.85);
  vec2 directionA = normalize(vec2(0.3 + 0.09 * sin(t * 0.045), -1.0));
  vec2 originB = vec2(0.55 + 0.12 * cos(t * 0.038), 0.9);
  vec2 directionB = normalize(vec2(-0.24 + 0.08 * cos(t * 0.05), -1.0));

  float shafts = beam(camera, originA, directionA, 0.15) * 0.55;
  shafts += beam(camera, originB, directionB, 0.2) * 0.4;
  shafts *= 0.5 + 0.5 * fog;

  float motes = dust(camera, 10.0, 0.04, t) * 0.4;
  motes += dust(camera, 19.0, 0.07, t + 50.0) * 0.25;

  float haze = fog * 0.07;

  vec3 color = BRONZE * shafts + mix(vec3(1.0), BRONZE, 0.5) * motes + HAZE * haze;
  float alpha = clamp(shafts * 0.65 + motes + haze, 0.0, 0.8);
  alpha *= 1.0 - 0.6 * u_scroll;

  gl_FragColor = vec4(color, alpha);
}
`;

const HeroAtmosphere = () => (
  <ShaderCanvas
    fragment={HERO_ATMOSPHERE_FRAGMENT}
    className="absolute inset-0 size-full"
  />
);

export default HeroAtmosphere;
