import type { Metadata } from 'next';
import config from '@payload-config';
import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views';
import { importMap } from '../importMap';

interface NotFoundArgs {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export const generateMetadata = ({
  params,
  searchParams,
}: NotFoundArgs): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });

const AdminNotFoundPage = ({ params, searchParams }: NotFoundArgs) =>
  NotFoundPage({ config, params, searchParams, importMap });

export default AdminNotFoundPage;
