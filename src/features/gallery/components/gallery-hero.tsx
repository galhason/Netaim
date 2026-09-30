import type { Locale } from '@/config/locales';
import { GALLERY_COPY } from '../constants/gallery-copy';
import type { GalleryEntry } from '../types/gallery';
import { GalleryPicture } from './gallery-media';
import { OliveBranch } from './olive-branch';

/*
 * The opening photograph, wide, with the page's name over it.
 *
 * The words sit on a shade that deepens toward them, so they read on
 * any photograph (white on the forest end of the shade is 12.8:1). With
 * no photograph yet the hero is the forest itself with a branch in its
 * corner — the page still opens, it just opens on the brand.
 */
const GalleryHero = ({ locale, image }: { locale: Locale; image?: GalleryEntry }) => {
  const words = GALLERY_COPY;
  return (
    <header className="relative isolate overflow-hidden bg-[var(--x-forest)] text-[var(--x-on-forest)]">
      {image ? (
        <div className="absolute inset-0 -z-20 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&>span]:h-full">
          <GalleryPicture file={image.file} alt="" sizes="100vw" priority />
        </div>
      ) : (
        <OliveBranch className="pointer-events-none absolute -end-8 -top-6 -z-10 size-72 text-[var(--x-on-forest)] opacity-[0.08] md:size-96" />
      )}
      {image ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--x-forest)_0%,rgb(11_58_29/0.72)_38%,rgb(11_58_29/0.2)_100%)] md:bg-[linear-gradient(to_right,rgb(11_58_29/0.9)_0%,rgb(11_58_29/0.62)_38%,rgb(11_58_29/0)_72%)]"
        />
      ) : null}
      <div className="mx-auto flex min-h-[340px] max-w-6xl flex-col justify-end px-5 pb-10 pt-24 text-center md:min-h-[440px] md:justify-center md:px-8 md:pb-16 md:pt-16 md:text-start">
        {/*
         * On a laptop the words keep to the physical left in both
         * languages, where the approved design puts them and where the
         * shade is deepest; the photograph's subject keeps the right.
         */}
        <div className="md:ml-0 md:mr-auto md:max-w-[34rem]">
          <h1 className="font-display leading-none">
            <span className="block text-5xl font-extrabold md:text-7xl">{words.eyebrow[locale]}</span>
            <span className="mt-3 block text-2xl font-bold md:text-4xl">{words.title[locale]}</span>
          </h1>
          <span aria-hidden="true" className="mx-auto mt-5 block h-[3px] w-12 rounded-full bg-[var(--x-accent)] md:mx-0" />
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[var(--x-on-forest-soft)] md:mx-0 md:text-lg">
            {words.lede[locale]}
          </p>
        </div>
      </div>
    </header>
  );
};

export default GalleryHero;
