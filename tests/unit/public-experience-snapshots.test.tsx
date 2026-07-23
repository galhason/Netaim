import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';

/*
 * Visual contract of the public experiences (Constitution v2, Phase 2
 * DoD): the server-rendered markup of both public experiences is locked
 * by snapshot. Any migration of the composition model must leave these
 * snapshots untouched — zero visual change for visitors.
 *
 * Next.js runtime pieces are replaced by their plain HTML equivalents so
 * the trees render outside the framework; the substitution is identical
 * before and after any refactor, so the comparison stays honest.
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
import {
  buildOpeningDescriptor,
  fallbackOpeningContent,
} from '@/features/opening';
import {
  buildConferenceDescriptor,
  fallbackConference,
} from '@/features/cinematic';

const FIXED_YEAR_PATTERN = /© \d{4}/g;

const stable = (markup: string): string =>
  markup.replace(FIXED_YEAR_PATTERN, '© YEAR');

describe('public experience markup', () => {
  it('renders the opening experience exactly as locked', () => {
    const markup = renderToString(
      <ExperienceStage
        experience={buildOpeningDescriptor(fallbackOpeningContent('he'))}
        locale="he"
      />,
    );
    expect(stable(markup)).toMatchSnapshot();
  });

  it('renders the opening experience in English exactly as locked', () => {
    const markup = renderToString(
      <ExperienceStage
        experience={buildOpeningDescriptor(fallbackOpeningContent('en'))}
        locale="en"
      />,
    );
    expect(stable(markup)).toMatchSnapshot();
  });

  it('renders the conference experience exactly as locked', () => {
    const markup = renderToString(
      <ExperienceStage
        experience={buildConferenceDescriptor(fallbackConference('he'))}
        locale="he"
      />,
    );
    expect(stable(markup)).toMatchSnapshot();
  });

  it('renders the conference experience in English exactly as locked', () => {
    const markup = renderToString(
      <ExperienceStage
        experience={buildConferenceDescriptor(fallbackConference('en'))}
        locale="en"
      />,
    );
    expect(stable(markup)).toMatchSnapshot();
  });
});
