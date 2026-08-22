import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';

/*
 * `nav-viewer.test.ts` guards the shape of the code — that the viewer
 * stays off the cached descriptor and that renderers stay synchronous.
 * Those are structural checks over source text, and structural checks
 * cannot tell whether the nav actually says the right thing.
 *
 * This renders it. Both states, and the transition between them, are
 * asserted against real markup.
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
  usePathname: () => '/he',
}));

import '@/scenes';
import { ExperienceStage } from '@/experience-runtime';
import { buildConferenceDescriptor, fallbackConference } from '@/features/cinematic';

const GUEST = 'דנה לוי';

/*
 * The descriptor is what gets cached and shared. Built once here on
 * purpose: every case below renders the same object, so anything that
 * differs between renders came from the render, not from the content.
 */
const descriptor = buildConferenceDescriptor(fallbackConference('he'), 'he');

const renderNav = (viewer: { name: string } | null): string => {
  const markup = renderToString(
    <ExperienceStage experience={descriptor} locale="he" viewer={viewer} />,
  );
  const header = markup.match(/<header[\s\S]*?<\/header>/)?.[0];
  expect(header, 'the experience rendered without a nav').toBeDefined();
  return header ?? '';
};

describe('the nav says who is looking', () => {
  it('asks a stranger to sign in or register', () => {
    const nav = renderNav(null);
    expect(nav).toContain('התחברות');
    expect(nav).toContain('הרשמה');
    expect(nav).not.toContain(GUEST);
  });

  it('greets a signed-in guest by name', () => {
    const nav = renderNav({ name: GUEST });
    expect(nav).toContain(GUEST);
  });

  it('never asks a signed-in guest to register', () => {
    /*
     * The symptom that started this: a guest who was signed in the whole
     * time was still shown a join button, so the site looked like it had
     * forgotten them.
     */
    const nav = renderNav({ name: GUEST });
    expect(nav).not.toContain('התחברות');
    expect(nav).not.toContain('הרשמה');
  });

  it('shows the initial when the name is only whitespace', () => {
    /* A blank name must not render an empty circle beside empty text. */
    const nav = renderNav({ name: '   ' });
    expect(nav).toContain('האזור האישי');
    expect(nav).toContain('·');
  });

  it('does not carry one guest into the next render', () => {
    /*
     * The leak this whole design exists to prevent. The descriptor is
     * shared and cached; if a name could settle anywhere inside it, the
     * next visitor would be served it. Rendering signed-in and then
     * signed-out against the same object is the direct test.
     */
    renderNav({ name: GUEST });
    const next = renderNav(null);
    expect(next).not.toContain(GUEST);
    expect(next).toContain('התחברות');
  });

  it('leaves the rest of the page identical either way', () => {
    /*
     * The viewer is nav context, not content. Everything below the
     * header must be byte-identical, or something outside the nav has
     * started depending on who is asking.
     */
    const body = (viewer: { name: string } | null): string =>
      renderToString(
        <ExperienceStage experience={descriptor} locale="he" viewer={viewer} />,
      ).replace(/<header[\s\S]*?<\/header>/, '');

    expect(body({ name: GUEST })).toBe(body(null));
  });
});
