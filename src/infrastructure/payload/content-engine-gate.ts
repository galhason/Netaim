/*
 * The Content Engine's own doors.
 *
 * Payload brings a panel, a REST API and a GraphQL API for every
 * collection. The platform uses none of them: the Studio and the public
 * site talk to Payload in-process, through the local API, with the
 * access rules of the actor. The one door the browser needs is the file
 * door of the media collection, `GET /api/media/file/<name>`, which
 * serves every image on the site.
 *
 * In production the panel and both APIs stay shut unless a developer
 * explicitly opens them with CONTENT_ENGINE_ADMIN=true; the file door
 * stays open. A shut door answers 404, as if it were never there.
 */
export const contentEngineShut = (): boolean =>
  process.env.NODE_ENV === 'production' && process.env.CONTENT_ENGINE_ADMIN !== 'true';

const FILE_DOOR = ['media', 'file'] as const;
const READ_METHODS = new Set(['GET', 'HEAD']);

export const isFileDoor = (method: string, slug: readonly string[] | undefined): boolean =>
  READ_METHODS.has(method.toUpperCase()) &&
  Array.isArray(slug) &&
  slug.length === FILE_DOOR.length + 1 &&
  slug[0] === FILE_DOOR[0] &&
  slug[1] === FILE_DOOR[1] &&
  typeof slug[2] === 'string' &&
  slug[2].length > 0;

export const restDoorOpen = (method: string, slug: readonly string[] | undefined): boolean =>
  !contentEngineShut() || isFileDoor(method, slug);

const NOT_FOUND_STATUS = 404;

export const shutDoor = (): Response =>
  new Response(null, { status: NOT_FOUND_STATUS, headers: { 'Cache-Control': 'no-store' } });
