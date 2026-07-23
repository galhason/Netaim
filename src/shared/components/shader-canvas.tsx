'use client';

import { useEffect, useRef } from 'react';
import type { MotionValue } from 'motion/react';

/*
 * The single WebGL primitive: a fullscreen fragment shader with a fixed
 * uniform contract (u_resolution, u_time, u_scroll) and all runtime care
 * handled once — DPR cap, one synchronous first frame so the canvas is
 * never an empty block, pause when offscreen (requestAnimationFrame
 * already stops in hidden tabs), context-loss recovery, a still frame
 * under reduced motion, and silent fallback when WebGL or shader
 * compilation is unavailable. The canvas is transparent until it draws,
 * so the CSS layers beneath always show through when the shader cannot.
 */

const MAX_DPR = 1.5;
const STILL_FRAME_TIME = 40;
const FRAME_STEP = 1 / 60;

const VERTEX_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

interface ShaderCanvasProps {
  fragment: string;
  progress?: MotionValue<number>;
  className?: string;
}

const ShaderCanvas = ({ fragment, progress, className }: ShaderCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!gl) {
      return;
    }

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vertex || !fragmentShader || !program) {
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const scrollLocation = gl.getUniformLocation(program, 'u_scroll');

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    let frame = 0;
    let elapsed = 0;
    let running = false;
    let lost = false;

    const resize = () => {
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (time: number) => {
      resize();
      const scroll = progressRef.current?.get() ?? 0;
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time);
      gl.uniform1f(scrollLocation, Math.min(Math.max(scroll, 0), 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      elapsed += FRAME_STEP;
      draw(elapsed);
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced || lost) {
        return;
      }
      running = true;
      frame = window.requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!running) {
        return;
      }
      running = false;
      window.cancelAnimationFrame(frame);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        start();
      } else {
        stop();
      }
    });
    observer.observe(canvas);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      stop();
    };
    const onContextRestored = () => {
      lost = false;
      draw(elapsed);
      start();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    const onResize = () => {
      draw(reduced ? STILL_FRAME_TIME : elapsed);
    };
    window.addEventListener('resize', onResize);

    draw(reduced ? STILL_FRAME_TIME : 0);
    start();

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
    };
  }, [fragment]);

  return <canvas ref={canvasRef} className={className} />;
};

export default ShaderCanvas;
