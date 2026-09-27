/*
 * A URL another site can actually fetch.
 *
 * Media inside the platform is stored as `/api/media/file/x.jpg`, which
 * resolves against whatever origin is asking -- so WordPress asking for it
 * would look for the file on the WordPress host and find nothing. The
 * origin is therefore prepended before anything crosses the boundary.
 *
 * Idempotent on purpose: a value that is already absolute is returned
 * untouched, because media may come from object storage on its own domain
 * and prefixing that would break it.
 */
export const absoluteUrl = (
  url: string | undefined,
  origin: string,
): string | undefined => {
  if (!url) {
    return undefined;
  }
  /*
   * Anything with a scheme is already addressable. `//cdn.example/x.jpg`
   * counts too -- it is protocol-relative, not path-relative.
   */
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
    return url;
  }
  const base = origin.replace(/\/+$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
};
