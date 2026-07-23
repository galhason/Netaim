import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';

/*
 * The Phase 2 demo, locked as a test: a brand-new Experience that
 * exists only as a JSON document — different scene order, a different
 * hero, a conference scene guesting in an opening composition — parses
 * through the declarative gate and renders fully through the one
 * Runtime, with zero experience-specific code.
 */
interface LinkMockProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | { pathname?: string };
  children: ReactNode;
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: LinkMockProps) => (
    <a href={typeof href === 'string' ? href : (href.pathname ?? '')} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...rest }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} {...rest} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined }),
}));

import '@/scenes';
import { ExperienceStage, parseExperienceDescriptor } from '@/experience-runtime';

const document = (): unknown =>
  JSON.parse(readFileSync('content/experiences/showcase.json', 'utf8'));

describe('the declarative gate', () => {
  it('accepts the showcase document', () => {
    const experience = parseExperienceDescriptor(document());
    expect(experience).not.toBeNull();
    expect(experience?.scenes).toHaveLength(7);
    expect(experience?.dna).toEqual({ tone: 'innovation', texture: 'dust' });
  });

  it('rejects a document with an unknown tone', () => {
    const raw = document() as { dna: { tone: string } };
    raw.dna.tone = 'neon';
    expect(parseExperienceDescriptor(raw)).toBeNull();
  });

  it('rejects a document with an invalid lifecycle', () => {
    const raw = document() as { lifecycle: string };
    raw.lifecycle = 'forever';
    expect(parseExperienceDescriptor(raw)).toBeNull();
  });

  it('drops a malformed scene but keeps the experience playing', () => {
    const raw = document() as { scenes: unknown[] };
    raw.scenes.push({ type: 'opening-story' });
    const experience = parseExperienceDescriptor(raw);
    expect(experience?.scenes).toHaveLength(7);
  });
});

describe('the showcase experience', () => {
  it('renders fully through the Runtime in the document order', () => {
    const experience = parseExperienceDescriptor(document());
    expect(experience).not.toBeNull();
    if (!experience) {
      return;
    }
    const markup = renderToString(
      <ExperienceStage experience={experience} locale="he" />,
    );
    const hero = markup.indexOf('מקובץ אחד');
    const moments = markup.indexOf('הפעם הרגעים מגיעים קודם');
    const story = markup.indexOf('הסיפור מוקרן אחרי הרגעים');
    const quote = markup.indexOf('והבמה אחת');
    const closing = markup.indexOf('אותו רנטיים. חוויה חדשה.');
    expect(hero).toBeGreaterThan(-1);
    expect(moments).toBeGreaterThan(hero);
    expect(story).toBeGreaterThan(moments);
    expect(quote).toBeGreaterThan(story);
    expect(closing).toBeGreaterThan(quote);
  });
});
