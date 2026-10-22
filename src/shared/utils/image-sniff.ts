/*
 * What a file's first bytes say it is — not what its name or the
 * browser claim.
 *
 * Only the three formats a person may send as a photograph are
 * recognised: JPEG, PNG and WebP. Everything else is null, an SVG
 * included: an SVG is a document that can carry a script, and a
 * participant's "photo" that runs code on the platform's own domain is
 * how a guest account becomes an administrator's session.
 */
export type SniffedImage = 'image/jpeg' | 'image/png' | 'image/webp';

export const IMAGE_EXTENSION: Record<SniffedImage, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const sniffImageType = (data: Uint8Array): SniffedImage | null => {
  const starts = (bytes: number[], at = 0) => bytes.every((byte, i) => data[at + i] === byte);
  if (starts([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
};
