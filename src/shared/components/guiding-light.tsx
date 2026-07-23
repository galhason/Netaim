'use client';

import { useMemo } from 'react';
import { useScroll } from 'motion/react';
import { GUIDING_TONES, type GuidingTone } from '../utils/guiding-tones';
import ShaderCanvas from './shader-canvas';

/*
 * The Guiding Light — Hason's global motion signature. One soft,
 * motivated light source lives over the whole page: it begins above the
 * viewport, and as the visitor scrolls they walk through it — it drifts
 * to the side, sinks, and hands one scene to the next, so the lighting
 * changes before the content does. It never flashes, never pulses hard,
 * never draws a visible beam; the movement is slow enough that nobody
 * consciously notices it. Every conference keeps the identical movement
 * and owns only the temperature — its atmosphere preset from the CMS.
 * Without WebGL the CSS glow layer beneath carries a still version.
 */
const GUIDING_FRAGMENT = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scroll;

const vec3 TONE = vec3(__TONE__);

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

float dust(vec2 uv, float scale, float rise, float t) {
  vec2 p = uv * scale + vec2(0.0, -t * rise);
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float seed = hash(cell);
  if (seed < 0.86) {
    return 0.0;
  }
  vec2 center = vec2(hash(cell + vec2(1.3, 7.1)), hash(cell + vec2(4.7, 2.9)));
  center = 0.15 + 0.7 * center;
  float d = length(f - center);
  float radius = 0.024 + 0.032 * seed;
  float twinkle = 0.6 + 0.4 * sin(t * (0.35 + seed) + seed * 6.2831);
  return smoothstep(radius, 0.0, d) * twinkle;
}

vec2 lightCenter(float s, float t) {
  float x = 0.42 * sin(6.2831 * s * 0.7 + 0.6);
  float y = 0.55 - 1.1 * s;
  vec2 drift = vec2(sin(t * 0.03), cos(t * 0.024)) * 0.03;
  return vec2(x, y) + drift;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time;

  vec2 center = lightCenter(u_scroll, t);
  float d2 = dot(p - center, p - center);
  float fog = fbm(p * 1.6 + vec2(t * 0.012, t * 0.008));

  float pool = exp(-d2 * 3.2) * 0.3;
  float halo = exp(-d2 * 0.8) * 0.12;

  vec2 floorCenter = vec2(center.x * 0.8, -0.58);
  float dFloor = dot(p - floorCenter, p - floorCenter);
  float reflection = exp(-dFloor * 2.4) * 0.07;

  float light = (pool + halo) * (0.6 + 0.4 * fog) + reflection;
  float breath = 0.9 + 0.1 * sin(t * 0.045);

  float motes = dust(p, 11.0, 0.03, t) * 0.12;

  vec3 warmNeutral = vec3(0.75, 0.72, 0.66);
  vec3 coolAir = vec3(0.35, 0.48, 0.68);
  vec3 deepNavy = vec3(0.06, 0.11, 0.2);
  vec3 flow = mix(TONE, warmNeutral, smoothstep(0.12, 0.42, u_scroll));
  flow = mix(flow, coolAir, smoothstep(0.42, 0.72, u_scroll));
  flow = mix(flow, deepNavy, smoothstep(0.72, 0.98, u_scroll));

  vec3 color = TONE * light * breath
    + mix(vec3(1.0), TONE, 0.5) * motes
    + flow * 0.045;
  float alpha = clamp(light * 1.1 * breath + motes + 0.05, 0.0, 0.6);

  gl_FragColor = vec4(color, alpha);
}
`;

interface GuidingLightProps {
  tone?: GuidingTone;
}

const GuidingLight = ({ tone = 'bronze' }: GuidingLightProps) => {
  const { scrollYProgress } = useScroll();
  const fragment = useMemo(
    () => GUIDING_FRAGMENT.replace('__TONE__', GUIDING_TONES[tone]),
    [tone],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[4]"
    >
      <div className="cine-darkness-glow cine-breath absolute inset-0" />
      <ShaderCanvas
        fragment={fragment}
        progress={scrollYProgress}
        className="absolute inset-0 size-full"
      />
    </div>
  );
};

export default GuidingLight;
