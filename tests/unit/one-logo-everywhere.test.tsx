import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/*
 * The logo, and the promise that goes with it.
 *
 * A brand mark is drawn in nine places — two navigation bars, two
 * footers, the sign-in header, the Studio rail and the head of every
 * outgoing message. The thing worth guarding is not that it appears;
 * it is that it is *one* mark, that it survives being absent, and that
 * a reader who never sees it still reads the name.
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/he',
}));

import { BRAND_LOGO, brandFor } from '@/config/brand';
import { BrandMark } from '@/shared';
import { renderEmailHtml } from '@/notification-engine';
import ExperienceNav from '@/features/conference/components/experience-nav';
import { SITE_NAV_LINKS } from '@/features/cinematic';

const read = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('the mark degrades to the name', () => {
  it('writes the name in type when there is no logo', () => {
    const markup = renderToString(
      <BrandMark brand="נטעים" textClassName="font-display" />,
    );
    expect(markup).toContain('נטעים');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('font-display');
  });

  it('draws the logo when there is one, and still says the name', () => {
    const markup = renderToString(
      <BrandMark brand="נטעים" src="/brand/netaim-lockup.png" />,
    );
    expect(markup).toContain('src="/brand/netaim-lockup.png"');
    /* The alt text is the brand: a blocked or broken image reads as the name. */
    expect(markup).toContain('alt="נטעים"');
  });
});

describe('the artwork the build ships', () => {
  it('exists on disk at every path the code names', () => {
    for (const path of Object.values(BRAND_LOGO)) {
      expect(existsSync(resolve(process.cwd(), 'public', path.slice(1)))).toBe(
        true,
      );
    }
  });

  /*
   * Two treatments, not one file used twice. A dark-green wordmark on a
   * navy bar is not a logo, and the only thing that catches a collapse
   * back to one file is a test that says they differ.
   */
  it('keeps the light and dark treatments apart', () => {
    expect(BRAND_LOGO.onDark).not.toBe(BRAND_LOGO.onLight);
    const dark = readFileSync(
      resolve(process.cwd(), 'public', BRAND_LOGO.onDark.slice(1)),
    );
    const light = readFileSync(
      resolve(process.cwd(), 'public', BRAND_LOGO.onLight.slice(1)),
    );
    expect(dark.equals(light)).toBe(false);
  });
});

describe('the navigation bar wears it', () => {
  const nav = (brandLogo?: string) =>
    renderToString(
      <ExperienceNav
        locale="he"
        links={SITE_NAV_LINKS}
        brand={brandFor('he')}
        registerHref="/he/events/x/register"
        meHref="/he/me"
        {...(brandLogo ? { brandLogo } : {})}
      />,
    );

  it('draws the logo it is given', () => {
    expect(nav('/brand/netaim-lockup-light.png')).toContain(
      'src="/brand/netaim-lockup-light.png"',
    );
  });

  it('falls back to the name when given none', () => {
    const markup = nav();
    expect(markup).not.toContain('<img');
    expect(markup).toContain(brandFor('he'));
  });
});

describe('an email carries it without depending on it', () => {
  it('puts the logo in the header with the name as its alt text', () => {
    const html = renderEmailHtml({
      locale: 'he',
      subject: 'ברוכים הבאים',
      body: 'שלום',
      logoUrl: 'https://netaim26.org/brand/netaim-lockup-light.png',
    });
    expect(html).toContain(
      'src="https://netaim26.org/brand/netaim-lockup-light.png"',
    );
    expect(html).toContain(`alt="${brandFor('he')}"`);
  });

  it('writes the name in type when no absolute URL was resolved', () => {
    const html = renderEmailHtml({
      locale: 'he',
      subject: 'ברוכים הבאים',
      body: 'שלום',
    });
    expect(html).not.toContain('<img');
    expect(html).toContain(brandFor('he'));
  });

  /*
   * A relative path in an email is a broken image: the client has no
   * site to resolve it against. The channel is the only place that can
   * know the deployment's origin, and this is the line that makes it.
   */
  it('builds the mail URL from the deployment origin', () => {
    const channel = read('src/infrastructure/email/smtp-channel.ts');
    expect(channel).toContain('NEXT_PUBLIC_SERVER_URL');
    expect(channel).toContain('${origin}${path}');
  });
});

describe('one source for the logo', () => {
  /*
   * The whole point of the Studio field is that the mark is set once.
   * A surface that reaches past it to the shipped constant would keep
   * showing the old logo after an operator replaced it — silently, and
   * only on that one surface.
   */
  const CHROME = [
    'src/features/conference/components/experience-nav.tsx',
    'src/features/cinematic/components/cinematic-nav.tsx',
    'src/features/cinematic/components/conference-footer.tsx',
    'src/features/opening/components/opening-nav.tsx',
    'src/features/opening/components/opening-footer.tsx',
    'src/features/registration/components/onboarding-shell.tsx',
  ];

  it('never hardcodes the artwork in a chrome component', () => {
    for (const path of CHROME) {
      const source = read(path);
      expect(source).not.toContain('BRAND_LOGO');
      expect(source).not.toContain('/brand/netaim');
    }
  });
});
