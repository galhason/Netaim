import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { importMap } from './admin/importMap';

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

interface PayloadLayoutProps {
  children: ReactNode;
}

/*
 * Break-glass only (Identity Build Brief WP7): the database panel is a
 * developer tool. In production it does not exist unless explicitly
 * re-enabled with PAYLOAD_ADMIN=true for an emergency.
 */
const adminEnabled = (): boolean =>
  process.env.NODE_ENV !== 'production' ||
  process.env.PAYLOAD_ADMIN === 'true';

const PayloadLayout = ({ children }: PayloadLayoutProps) => {
  if (!adminEnabled()) {
    notFound();
  }
  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  );
};

export default PayloadLayout;
