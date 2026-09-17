import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/*
 * Where colour is allowed to live.
 *
 * The brand is declared once, at the top of globals.css, as a block of
 * `--nt-*` custom properties; every design language below it (the
 * landing, the participant pages, the Lounge, the community, the
 * Studio console) renames those values into its own vocabulary, and
 * every component asks for a name. That is the whole system, and it
 * only works while nobody writes a colour down a second time.
 *
 * It is a rule that decays silently: one `text-[#2b6aa3]` pasted into a
 * component still looks right on the day it is written, and is simply
 * missed when the brand changes. Two hundred and forty-nine of them had
 * accumulated before this test existed. So the rule is checked rather
 * than remembered.
 */
const read = (path: string): string => readFileSync(path, 'utf8');
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const sourceFiles = (pattern: string): string[] =>
  execSync(`grep -rl -E -e '${pattern}' --include=*.tsx --include=*.ts src || true`, {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

/*
 * The two files that are allowed to write a colour out in full, each
 * for a reason that cannot be designed away.
 */
const VENDOR_SHEET = 'src/shared/constants/vendor-marks.ts';
const EMAIL_LAYOUT = 'src/notification-engine/templates/email-layout.ts';

describe('no component writes a colour down', () => {
  it('has no hex literal anywhere in src, outside the two files that may', () => {
    const offenders = sourceFiles('#[0-9a-fA-F]{3,8}')
      .filter((f) => f !== VENDOR_SHEET && f !== EMAIL_LAYOUT)
      .map((f) => `${f}: ${[...new Set(read(f).match(HEX) ?? [])].join(', ')}`);
    expect(offenders).toEqual([]);
  });

  /*
   * A vendor's logo is the one colour we must NOT take from the brand —
   * a Google mark repainted in Netaim navy is the wrong mark — so those
   * values live together, named after their owner.
   */
  it('keeps other companies colours in the vendor sheet', () => {
    const sheet = read(VENDOR_SHEET);
    expect(sheet).toContain('whatsappGreen');
    expect(sheet).toContain('googleBlue');
  });
});

describe('the brand is declared once', () => {
  const css = read('src/styles/globals.css');
  const start = css.indexOf(':root {');
  const brandBlock = css.slice(start, css.indexOf('\n}', start));
  const rest = css.slice(0, start) + css.slice(css.indexOf('\n}', start));

  it('writes every hex inside the brand block and nowhere else in the stylesheet', () => {
    expect(rest.match(HEX) ?? []).toEqual([]);
  });

  it('declares the five brand colours the brand sheet gives', () => {
    for (const [token, value] of [
      ['--nt-navy', '#173f73'],
      ['--nt-blue', '#2a90c8'],
      ['--nt-green', '#159a4b'],
      ['--nt-yellow', '#ffd21c'],
      ['--nt-orange', '#f9a11b'],
    ]) {
      expect(brandBlock, token).toContain(`${token}: ${value};`);
    }
  });

  it('declares the neutrals and the radius scale the brand sheet gives', () => {
    for (const [token, value] of [
      ['--nt-bg', '#f7f8fa'],
      ['--nt-surface', '#ffffff'],
      ['--nt-ink', '#172033'],
      ['--nt-ink-soft', '#667085'],
      ['--nt-border', '#e6eaf0'],
      ['--nt-border-strong', '#d6dce5'],
      ['--nt-r-sm', '8px'],
      ['--nt-r-md', '10px'],
      ['--nt-r-lg', '16px'],
      ['--nt-r-xl', '20px'],
    ]) {
      expect(brandBlock, token).toContain(`${token}: ${value};`);
    }
  });

  /*
   * A scope that renames a token that does not exist resolves to
   * nothing, and the element it styles goes transparent — a failure
   * that no type checker and no build can see.
   */
  it('never renames a brand token that was never declared', () => {
    const declared = new Set(
      [...brandBlock.matchAll(/(--nt-[a-z0-9-]+):/g)].map((m) => m[1]),
    );
    const used = new Set([...css.matchAll(/var\((--nt-[a-z0-9-]+)/g)].map((m) => m[1]));
    expect([...used].filter((token) => !declared.has(token))).toEqual([]);
  });

  it('never lets a component reach for a brand token that was never declared', () => {
    const declared = new Set(
      [...brandBlock.matchAll(/(--nt-[a-z0-9-]+):/g)].map((m) => m[1]),
    );
    const missing = new Set<string>();
    for (const file of sourceFiles('--nt-')) {
      for (const match of read(file).matchAll(/var\((--nt-[a-z0-9-]+)/g)) {
        if (!declared.has(match[1]!)) missing.add(`${file}: ${match[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});

/*
 * The email is the one place the brand has to be transcribed, because
 * a mail client cannot read a custom property. Transcriptions drift.
 */
describe('the email carries the same brand as the site', () => {
  const brand = read('src/styles/globals.css');
  const value = (token: string): string =>
    brand.match(new RegExp(`${token}:\\s*(#[0-9a-f]{3,8})`))?.[1] ?? 'missing';

  it('matches the tokens it copies, colour for colour', () => {
    const palette = read(EMAIL_LAYOUT);
    for (const [key, token] of [
      ['ground', '--nt-bg'],
      ['surface', '--nt-surface'],
      ['ink', '--nt-ink'],
      ['soft', '--nt-ink-soft'],
      ['faint', '--nt-ink-faint'],
      ['line', '--nt-border'],
      ['primary', '--nt-navy'],
      ['primaryWash', '--nt-navy-wash'],
      ['navy', '--nt-dark'],
    ] as const) {
      expect(palette, `${key} should be ${token}`).toContain(
        `${key}: '${value(token)}'`,
      );
    }
  });
});

/*
 * One typeface. The product used to set the Studio in one face, the
 * participant pages in another and the landing in a third, which read
 * as three products wearing the same logo.
 */
describe('the product speaks in one voice', () => {
  it('loads Heebo, and only Heebo, in both roots', () => {
    for (const layout of [
      'src/app/(frontend)/[locale]/layout.tsx',
      'src/app/(studio)/layout.tsx',
    ]) {
      const source = read(layout);
      /* The prose explains which faces were dropped; the code must not load them. */
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(source, layout).toContain("import { Heebo } from 'next/font/google'");
      expect(code, layout).not.toContain('Frank_Ruhl_Libre');
      expect(code, layout).not.toContain('Rubik');
    }
  });

  it('resolves the display face to the body face', () => {
    expect(read('src/styles/globals.css')).toContain('--font-display: var(--font-body)');
  });
});
