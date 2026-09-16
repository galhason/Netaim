/*
 * The brand, drawn.
 *
 * Every chrome on the platform used to spell the name in type — one
 * `<span>` per header, per footer, per shell. A logo is not a word, and
 * replacing the word in nine places independently is how a brand ends
 * up with nine versions of itself. So the picture lives here, and every
 * surface asks for it the same way.
 *
 * It degrades on purpose. Given no image the component renders the text
 * mark exactly as those surfaces did before, which is what happens when
 * an operator clears the logo in the Studio, and what a mail client
 * shows before the reader allows remote images.
 */
interface BrandMarkProps {
  /* The name, in the reader's own script. Alt text, and the fallback. */
  brand: string;
  /* The logo for *this* background. Absent or empty renders the text. */
  src?: string | null;
  /*
   * Drawn height, in pixels. Width follows the artwork's own
   * proportions, because the Studio may hold a logo of any shape.
   */
  height?: number;
  /* Classes for the text mark, so a fallback still looks like the place it is in. */
  textClassName?: string;
  className?: string;
}

const BrandMark = ({
  brand,
  src,
  height = 36,
  textClassName = '',
  className = '',
}: BrandMarkProps) => {
  if (!src) {
    return <span className={`${textClassName} ${className}`.trim()}>{brand}</span>;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element --
     * the logo may be a file uploaded through the Studio, whose
     * dimensions are unknown at build time; the optimizer needs them. */
    <img
      src={src}
      alt={brand}
      style={{ height: `${height}px` }}
      className={`w-auto max-w-full object-contain ${className}`.trim()}
    />
  );
};

export default BrandMark;
