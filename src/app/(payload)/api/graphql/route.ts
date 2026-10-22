import config from '@payload-config';
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes';
import { contentEngineShut, shutDoor } from '@/infrastructure/payload/content-engine-gate';

/* Shut in production unless a developer opens it (see content-engine-gate). */
const graphql = GRAPHQL_POST(config);
const options = REST_OPTIONS(config);

export const POST = (request: Request): Promise<Response> =>
  contentEngineShut() ? Promise.resolve(shutDoor()) : graphql(request);

export const OPTIONS = (request: Request, args: { params: Promise<{ slug?: string[] }> }): Promise<Response> =>
  contentEngineShut() ? Promise.resolve(shutDoor()) : options(request, args);
