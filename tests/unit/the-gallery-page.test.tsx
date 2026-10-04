import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import type { GalleryEntry } from '@/features/gallery/types/gallery';

/*
 * The gallery page, rendered in both languages, and the ways to it.
 *
 * Rendered rather than read: the hero, the grid, the film
 * band and the closing invitation are drawn from a composed gallery and
 * checked on the markup — in Hebrew and in English, with no word of one
 * in the other — and the empty and film-less galleries are drawn too.
 * Then the address: /{locale}/events/{slug}/gallery, public, in both
 * bars, and never a link to the retired /program.
 */
const where: { pathname: string } = { pathname: '/he' };

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className, sizes, width, height }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={String(src)} alt={alt} className={className} sizes={sizes} width={width} height={height} />
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => where.pathname,
  useRouter: () => ({ push: () => undefined, prefetch: () => undefined, refresh: () => undefined }),
}));

const { GalleryExperience, GalleryHero, GalleryCta } = await import('@/features/gallery/components');
const { composeGallery } = await import('@/features/gallery/utils/compose');
const { default: ConferenceBar } = await import('@/features/conference/components/conference-bar');
const { siteNavLinks } = await import('@/features/cinematic');

const HEBREW = /[֐-׿]/;

const photo = (id: string, over: Partial<GalleryEntry> = {}): GalleryEntry => ({
  id,
  kind: 'image',
  file: { url: `/api/media/file/${id}.jpg`, width: 1200, height: 800 },
  alt: `Alt ${id}`,
  placement: 'story',
  order: 0,
  ...over,
});
const film: GalleryEntry = {
  id: 'v1',
  kind: 'video',
  file: { url: '/api/media/file/v1.mp4', mimeType: 'video/mp4' },
  poster: { url: '/api/media/file/still.jpg', width: 1600, height: 900 },
  alt: 'Alt film',
  durationSeconds: 134,
  placement: 'film',
  order: 5,
};

const page = (locale: 'he' | 'en', entries: GalleryEntry[]) => {
  const composition = composeGallery(entries);
  return renderToString(
    <main>
      <GalleryHero locale={locale} image={composition.hero} />
      <GalleryExperience locale={locale} composition={composition} />
      <GalleryCta locale={locale} slug="ntaym-2026" signedIn={false} shareAction={share} />
    </main>,
  );
};

const share = async () => ({ status: 'idle' as const });

const full = [photo('p1', { placement: 'hero' }), photo('p2'), photo('p3'), film, photo('p4')];

describe('the page in Hebrew', () => {
  const html = page('he', full);

  it('opens on the gallery’s name and line', () => {
    expect(html).toMatch(/<h1[^>]*>.*גלריה.*רגעים מנטעים.*<\/h1>/s);
    expect(html).toContain('שהופכים את נטעים לחוויה');
  });

  it('offers no filters: the gallery is one story, top to bottom', () => {
    for (const label of ['הכול', 'תמונות', 'וידאו', 'סינון הגלריה']) {
      expect(html).not.toContain(`>${label}<`);
    }
    expect(html).not.toContain('aria-pressed');
  });

  it('draws the grid, the film band and the closing invitation', () => {
    expect(html).toContain('/api/media/file/p2.jpg');
    expect(html).toContain('חיים בתנועה');
    expect(html).toContain('02:14');
    expect(html).toContain('יש לכם רגע מנטעים שתרצו לשתף?');
  });

  it('names every picture button for a screen reader', () => {
    expect(html).toContain('aria-label="פתיחת התמונה: Alt p2"');
    expect(html).toContain('aria-label="הפעלת הסרטון: חיים בתנועה"');
  });

  it('does not open the viewer until asked', () => {
    expect(html).not.toContain('role="dialog"');
  });
});

describe('the page in English', () => {
  const html = page('en', full);

  it('speaks English only', () => {
    expect(html).toContain('Moments from Netaim');
    expect(html).toContain('Have a Netaim moment you&#x27;d like to share?');
    expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(HEBREW);
  });
});

describe('the edges', () => {
  it('shows the empty state, and no grid, with nothing published', () => {
    const html = page('he', []);
    expect(html).toContain('הגלריה בדרך');
    expect(html).not.toContain('<ul aria-label');
    expect(html).not.toContain('gallery-film-title');
  });

  it('has no film band with no film', () => {
    const html = page('en', [photo('p1'), photo('p2')]);
    expect(html).not.toContain('gallery-film-title');
    expect(html).not.toContain('Life in Motion');
  });

  it('offers no filter row, whatever the gallery holds', () => {
    const html = page('en', [photo('p1'), photo('p2', { placement: 'more' }), film]);
    expect(html).not.toContain('aria-pressed');
    expect(html).not.toMatch(/>(All|Photos|Video)</);
  });

  it('still opens with a hero when there is no photograph', () => {
    const html = page('en', [film]);
    expect(html).toContain('<h1');
    expect(html).toContain('Moments from Netaim');
  });

  it('shows a tile for a picture whose size the library does not know', () => {
    const html = page('en', [photo('p1'), photo('p2', { file: { url: '/api/media/file/p2.jpg' } })]);
    expect(html).toContain('/api/media/file/p2.jpg');
    expect(html).toContain('aspect-[4/3]');
  });
});

describe('the closing invitation', () => {
  it('leads back to the agenda, never to /program', () => {
    for (const locale of ['he', 'en'] as const) {
      const html = renderToString(<GalleryCta locale={locale} slug="ntaym-2026" signedIn={false} shareAction={share} />);
      expect(html).toContain(`href="/${locale}/events/ntaym-2026/agenda"`);
      expect(html).not.toMatch(/\/program\b/);
    }
  });

  it('asks a visitor who is not signed in to sign in before sharing', () => {
    const he = renderToString(<GalleryCta locale="he" slug="ntaym-2026" signedIn={false} shareAction={share} />);
    expect(he).toContain('href="/he/me"');
    expect(he).toContain('התחברו כדי לשתף תמונה');
    const en = renderToString(<GalleryCta locale="en" slug="ntaym-2026" signedIn={false} shareAction={share} />);
    expect(en).toContain('Sign in to share a photo');
  });

  it('offers a signed-in participant to share a photo, in a small window opened only when asked', () => {
    const html = renderToString(<GalleryCta locale="he" slug="ntaym-2026" signedIn shareAction={share} />);
    expect(html).toContain('שתפו תמונה');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('href="/he/me"');
  });

  it('says the photo is reviewed before it appears', () => {
    const html = renderToString(<GalleryCta locale="en" slug="ntaym-2026" signedIn shareAction={share} />);
    expect(html).toContain('after approval by the Netaim team');
  });
});

describe('the ways to the gallery', () => {
  const bar = (locale: 'he' | 'en', pathname: string) => {
    where.pathname = pathname;
    return renderToString(<ConferenceBar locale={locale} slug="ntaym-2026" viewer={null} brand="Netaim" />);
  };
  const galleryLink = (markup: string) => markup.match(/<a[^>]*data-nt-dest="gallery"[^>]*>[^<]*<\/a>/)?.[0] ?? '';

  it('puts the gallery in the bar in Hebrew and in English, beside the programme', () => {
    const he = bar('he', '/he');
    expect(galleryLink(he)).toContain('href="/he/events/ntaym-2026/gallery"');
    expect(galleryLink(he)).toContain('>גלריה<');
    expect(he.indexOf('data-nt-dest="program"')).toBeLessThan(he.indexOf('data-nt-dest="gallery"'));
    const en = bar('en', '/en');
    expect(galleryLink(en)).toContain('href="/en/events/ntaym-2026/gallery"');
    expect(galleryLink(en)).toContain('>Gallery<');
  });

  it('marks the gallery current on the gallery page, and only there', () => {
    expect(galleryLink(bar('he', '/he/events/ntaym-2026/gallery'))).toContain('aria-current="page"');
    expect(galleryLink(bar('he', '/he/events/ntaym-2026/agenda'))).not.toContain('is-current');
  });

  it('leaves the rest of the bar as it was', () => {
    const he = bar('he', '/he');
    for (const dest of ['hub', 'speakers', 'program', 'info', 'networking', 'enter', 'register']) {
      expect(he, dest).toContain(`data-nt-dest="${dest}"`);
    }
    expect(he).toContain('href="/he/events/ntaym-2026/agenda"');
  });

  it('offers no gallery link when no conference is open', () => {
    where.pathname = '/he';
    const html = renderToString(<ConferenceBar locale="he" slug={null} viewer={null} brand="Netaim" />);
    expect(html).not.toContain('data-nt-dest="gallery"');
  });

  it('puts the gallery in the landing’s navigation too', () => {
    const link = siteNavLinks('en', 'ntaym-2026').find((entry) => entry.key === 'gallery');
    expect(link).toMatchObject({ href: '/en/events/ntaym-2026/gallery', label: 'Gallery' });
    expect(siteNavLinks('he', 'ntaym-2026').find((entry) => entry.key === 'gallery')?.label).toBe('גלריה');
    expect(siteNavLinks('he', null).map((entry) => entry.key)).toEqual(['home', 'networking']);
  });
});

describe('the address', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  const PAGE = 'src/app/(frontend)/[locale]/events/[slug]/(experience)/gallery/page.tsx';

  it('lives under the conference, where the edge already sends to the platform', () => {
    expect(read(PAGE)).toContain('GalleryExperience');
  });

  it('is public: it asks no one to sign in', () => {
    expect(read(PAGE)).not.toContain('requireParticipant');
  });

  it('is in the sitemap and not refused to crawlers', () => {
    expect(read('src/app/sitemap.ts')).toContain("'/gallery'");
    expect(read('src/app/robots.ts')).not.toContain('gallery');
  });

  it('declares its canonical and its other language, with no local port', () => {
    const source = read(PAGE);
    expect(source).toContain('canonical:');
    expect(source).toContain('languages:');
    expect(source).not.toContain(':3000');
  });

  it('introduces no link to the retired /program anywhere in the gallery', () => {
    const files = [
      PAGE,
      'src/features/gallery/components/gallery-cta.tsx',
      'src/features/gallery/components/gallery-experience.tsx',
      'src/features/gallery/components/gallery-hero.tsx',
      'src/features/gallery/components/gallery-film.tsx',
      'src/features/gallery/components/gallery-lightbox.tsx',
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/events\/[^'"`\s]*\/program\b|\/events\/program\//);
    }
  });
});
