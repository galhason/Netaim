import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import config from '@payload-config';
import { generatePageMetadata, RootPage } from '@payloadcms/next/views';
import { importMap } from '../importMap';

interface AdminPageArgs {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

/*
 * The Content Engine's own panel is an implementation detail
 * (Constitution v2 §7): blocked in production unless a developer
 * explicitly opts in via CONTENT_ENGINE_ADMIN=true. Editors live in
 * the Studio.
 */
const adminBlocked = (): boolean =>
  process.env.NODE_ENV === 'production' &&
  process.env.CONTENT_ENGINE_ADMIN !== 'true';

export const generateMetadata = ({
  params,
  searchParams,
}: AdminPageArgs): Promise<Metadata> => {
  if (adminBlocked()) {
    return Promise.resolve({});
  }
  return generatePageMetadata({ config, params, searchParams });
};

const AdminPage = ({ params, searchParams }: AdminPageArgs) => {
  if (adminBlocked()) {
    notFound();
  }
  return RootPage({ config, params, searchParams, importMap });
};

export default AdminPage;
