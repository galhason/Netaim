import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Where the nav sends a guest who is already signed in.
 *
 * The nav renders the visitor's own name when it recognises them. That
 * is the moment a guest learns the site remembers them, so the one thing
 * that destination must never do is ask them to register.
 *
 * It did. `meHref` on the conference experience pointed at
 * `/[locale]/events/[slug]/me` — the lounge for one conference, which
 * redirects anyone without a registration for *that* conference to its
 * registration form. A visitor signed in to the platform but not joined
 * to the conference on the front page saw their name, clicked it, and
 * was asked to sign up.
 *
 * The rule is about the *descriptor*, which is cached and shared and
 * therefore knows nobody: a literal it carries may not name one
 * conference. Where a particular guest goes is decided per request and
 * travels on `SceneViewer.href` — that one may point at a lounge,
 * because by then we know they have joined it.
 */
const ROOTS = ['src'];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

/*
 * Only string literals are judged. `meHref={content.meHref}` passes a
 * value through and says nothing about where it points; the literal that
 * produced it is somewhere else in this same sweep.
 */
const LITERAL = /meHref\s*[:=]\s*[`'"]([^`'"]*)[`'"]/g;

describe('the nav destination for a signed-in guest', () => {
  const files = ROOTS.flatMap(walk);

  it('has literals to check, so the sweep is not vacuous', () => {
    const found = files.filter((file) =>
      LITERAL.test(readFileSync(file, 'utf8')),
    );
    LITERAL.lastIndex = 0;
    expect(found.length).toBeGreaterThan(3);
  });

  it('never points a signed-in guest at a single conference', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(LITERAL)) {
        const href = match[1] ?? '';
        /*
         * A scene package's placeholder default is not a destination —
         * it is what renders before real content arrives.
         */
        if (href === '' || href === '/') continue;
        if (href.includes('/events/')) {
          offenders.push(`${file} — meHref = ${href}`);
        }
      }
    }

    expect(
      offenders,
      'these send a signed-in guest into one conference, which will ask them to register if they have not joined it',
    ).toEqual([]);
  });
});
