import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

/*
 * Every .ts/.tsx file under src whose text matches — walked with Node
 * rather than handed to grep, which a Windows shell does not have.
 * Paths come back with forward slashes on every platform, so the
 * allow-list below compares the same way everywhere.
 */
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) ? [path.split('\\').join('/')] : [];
  });

const sourceFiles = (pattern: RegExp): string[] =>
  walk('src').filter((file) => pattern.test(read(file)));

/*
 * The two files that are allowed to write a colour out in full, each
 * for a reason that cannot be designed away.
 */
const VENDOR_SHEET = 'src/shared/constants/vendor-marks.ts';
const EMAIL_LAYOUT = 'src/notification-engine/templates/email-layout.ts';

/*
 * The two checks below read the whole source tree. On a slow disk that
 * can approach vitest's default five-second budget per test, and a
 * timeout reads like a broken rule rather than a slow one, so the
 * budget is stated instead of being left to chance.
 */
const TREE_WALK_MS = 20_000;

describe('no component writes a colour down', () => {
  it('has no hex literal anywhere in src, outside the two files that may', () => {
    const offenders = sourceFiles(/#[0-9a-fA-F]{3,8}/)
      .filter((f) => f !== VENDOR_SHEET && f !== EMAIL_LAYOUT)
      .map((f) => `${f}: ${[...new Set(read(f).match(HEX) ?? [])].join(', ')}`);
    expect(offenders).toEqual([]);
  }, TREE_WALK_MS);

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
    for (const file of sourceFiles(/--nt-/)) {
      for (const match of read(file).matchAll(/var\((--nt-[a-z0-9-]+)/g)) {
        if (!declared.has(match[1]!)) missing.add(`${file}: ${match[1]}`);
      }
    }
    expect([...missing]).toEqual([]);
  }, TREE_WALK_MS);
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
 * The site's faces. The product used to set the Studio in one face, the
 * participant pages in another and the landing in a third, which read
 * as three products wearing the same logo. It now wears the
 * organisation's own two, the ones its WordPress site is set in: Open
 * Sans for text, M PLUS Rounded 1c for the large headings — the same
 * in both roots, so a page here and a page there read as one site.
 */
describe('the product speaks in the site\'s voice', () => {
  it('loads the site\'s two faces, and only those, in both roots', () => {
    for (const layout of [
      'src/app/(frontend)/[locale]/layout.tsx',
      'src/app/(studio)/layout.tsx',
    ]) {
      const source = read(layout);
      /* The prose explains which faces were dropped; the code must not load them. */
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(source, layout).toContain("import { M_PLUS_Rounded_1c, Open_Sans } from 'next/font/google'");
      expect(code, layout).toContain("variable: '--font-body'");
      expect(code, layout).toContain("variable: '--font-display-face'");
      expect(code, layout).not.toContain('Heebo');
      expect(code, layout).not.toContain('Frank_Ruhl_Libre');
      expect(code, layout).not.toContain('Rubik');
    }
  });

  it('falls from the display face to the body face, for the Hebrew it lacks', () => {
    const css = read('src/styles/globals.css');
    expect(css).toContain('--font-display: var(--font-display-face), var(--font-body)');
    expect(css).not.toContain('--font-display: var(--font-body);');
  });
});
