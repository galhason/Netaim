import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

/*
 * The bar's "programme" is the participant's agenda.
 *
 * It pointed at the WordPress listing for a while, and a participant who
 * followed it arrived somewhere they could read the programme but not
 * register for any of it -- in English, whatever language they came
 * from, because the edge collapses every locale onto that one page.
 * This renders the bar, in both languages, and reads the link off the
 * markup rather than off the source.
 */
const where: { pathname: string } = { pathname: '/he' };

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => where.pathname,
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined, refresh: () => undefined }),
}));

const { default: ConferenceBar } = await import(
  '@/features/conference/components/conference-bar'
);

const programmeLink = (markup: string): string =>
  markup.match(/<a[^>]*data-nt-dest="program"[^>]*>/)?.[0] ?? '';

const render = (locale: 'he' | 'en', pathname: string, slug: string | null = 'ntaym-2026') => {
  where.pathname = pathname;
  return renderToString(
    <ConferenceBar locale={locale} slug={slug} viewer={null} brand="Netaim" />,
  );
};

describe('the bar leads a participant to the agenda', () => {
  it('in Hebrew, to the Hebrew agenda', () => {
    const link = programmeLink(render('he', '/he/events/ntaym-2026/my-activities'));
    expect(link).toContain('href="/he/events/ntaym-2026/agenda"');
  });

  it('in English, to the English agenda', () => {
    const link = programmeLink(render('en', '/en/events/ntaym-2026/my-activities'));
    expect(link).toContain('href="/en/events/ntaym-2026/agenda"');
  });

  it('never to the WordPress listing, in either language', () => {
    for (const locale of ['he', 'en'] as const) {
      const link = programmeLink(render(locale, `/${locale}`));
      expect(link, locale).not.toContain('/events/program/');
      expect(link, locale).not.toContain('%D7%AA%D7%95%D7%9B%D7%A0%D7%99%D7%AA');
      expect(link, locale).not.toMatch(/\/program\b/);
    }
  });

  /*
   * A WordPress address can never be "current" on the platform, which is
   * why the old link never lit up. The agenda can, and does.
   */
  it('marks the programme as the current page on the agenda', () => {
    const link = programmeLink(render('he', '/he/events/ntaym-2026/agenda'));
    expect(link).toContain('is-current');
    expect(link).toContain('aria-current="page"');
  });

  it('does not mark it elsewhere', () => {
    const link = programmeLink(render('he', '/he/events/ntaym-2026/my-activities'));
    expect(link).not.toContain('is-current');
  });

  it('leaves it out when no conference is open', () => {
    expect(programmeLink(render('he', '/he', null))).toBe('');
  });
});
