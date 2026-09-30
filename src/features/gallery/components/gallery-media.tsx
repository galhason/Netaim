import Image from 'next/image';
import type { GalleryEntry, GalleryFile } from '../types/gallery';
import { formatDuration } from '../utils/compose';

/*
 * The picture a tile, the hero or the lightbox shows for one entry: the
 * photograph itself, or — for a film — its still. Laid out at the file's
 * own proportions when the library knows them, so a tall photograph is
 * a tall tile and nothing is cropped; a 4:3 frame, filled, when it does
 * not. next/image serves a size for the slot (AVIF/WebP where the
 * browser takes it), never the original, and only once it scrolls near.
 */
interface GalleryPictureProps {
  file: GalleryFile;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

export const hasSize = (file: GalleryFile | undefined): file is GalleryFile & { width: number; height: number } =>
  Boolean(file && typeof file.width === 'number' && typeof file.height === 'number' && file.width > 0 && file.height > 0);

export const GalleryPicture = ({ file, alt, sizes, priority = false, className = '' }: GalleryPictureProps) =>
  hasSize(file) ? (
    <Image
      src={file.url}
      alt={alt}
      width={file.width}
      height={file.height}
      sizes={sizes}
      priority={priority}
      className={`block h-auto w-full ${className}`}
    />
  ) : (
    <span className="relative block aspect-[4/3] w-full">
      <Image src={file.url} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
    </span>
  );

/* A film's frame in a grid: its still, or its own first frame when it has none. */
export const FilmStill = ({ entry, sizes }: { entry: GalleryEntry; sizes: string }) =>
  entry.poster ? (
    <GalleryPicture file={entry.poster} alt="" sizes={sizes} />
  ) : (
    <video
      aria-hidden="true"
      tabIndex={-1}
      muted
      playsInline
      preload="metadata"
      className="block aspect-video w-full bg-[var(--x-forest)] object-cover"
      src={`${entry.file.url}#t=0.1`}
    />
  );

/* The round play mark and, when known, the running time. */
export const PlayMark = ({ size = 'md', duration }: { size?: 'md' | 'lg'; duration?: number }) => {
  const text = formatDuration(duration);
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-0 m-auto grid place-items-center rounded-full border-2 border-[var(--x-on-forest)] bg-[rgb(0_0_0/0.28)] text-[var(--x-on-forest)] backdrop-blur-[2px] transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none ${
          size === 'lg' ? 'size-20' : 'size-12'
        }`}
      >
        <svg viewBox="0 0 24 24" className={size === 'lg' ? 'size-8 translate-x-[2px]' : 'size-5 translate-x-[1px]'} fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      {text ? (
        <span
          dir="ltr"
          className="absolute bottom-3 start-3 rounded-full bg-[rgb(0_0_0/0.55)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--x-on-forest)]"
        >
          {text}
        </span>
      ) : null}
    </>
  );
};
