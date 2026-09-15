import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    /*
     * `scripts/` holds maintenance commands an operator runs by hand,
     * and their output *is* their product — a database report nobody
     * reads is worth nothing.
     *
     * `no-console` exists to keep debugging output out of the running
     * application, which is a different thing entirely. Writing the same
     * lines through `process.stdout.write` would satisfy the linter and
     * change nothing, so the exception is stated instead of dodged. It
     * is scoped to this folder and nowhere else; the rule still bites
     * everywhere it was meant to.
     */
    files: ['scripts/**/*.mjs', 'scripts/**/*.js', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    ignores: ['.next/', 'node_modules/', 'src/payload-types.ts', 'src/migrations/'],
  },
];

export default config;
