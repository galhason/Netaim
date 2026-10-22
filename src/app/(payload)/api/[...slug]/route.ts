import config from '@payload-config';
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes';
import { restDoorOpen, shutDoor } from '@/infrastructure/payload/content-engine-gate';

type RestArgs = { params: Promise<{ slug?: string[] }> };
type RestHandler = (request: Request, args: RestArgs) => Promise<Response>;

/*
 * Only the media file door is open in production; every other REST
 * call answers 404 (see content-engine-gate).
 */
const gated =
  (handler: RestHandler): RestHandler =>
  async (request, args) => {
    const { slug } = await args.params;
    return restDoorOpen(request.method, slug) ? handler(request, args) : shutDoor();
  };

export const GET = gated(REST_GET(config));
export const POST = gated(REST_POST(config));
export const DELETE = gated(REST_DELETE(config));
export const PATCH = gated(REST_PATCH(config));
export const PUT = gated(REST_PUT(config));
export const OPTIONS = gated(REST_OPTIONS(config));
