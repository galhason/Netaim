import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
    /*
     * `src/**` is included because colocated tests existed and never
     * ran: registration-engine/schedule/conflict.test.ts sat outside
     * this glob and was silently skipped for the whole of its life.
     */
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
});
