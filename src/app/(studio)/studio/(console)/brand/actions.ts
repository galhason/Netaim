'use server';

import { revalidatePath } from 'next/cache';
import { setSiteBrand } from '@/features/events';
import { requireCapability } from '@/features/studio';

/*
 * Setting the site's logo.
 *
 * Two fields, both optional, both clearable: an empty value is stored
 * as null, which restores the artwork shipped with the build rather
 * than emptying the header. The gate is re-derived here as every
 * console action does (Identity Architecture §4) — the screen above
 * proves only that a grant exists — and it is the same capability the
 * rest of the site's composition is edited under, because the logo is
 * the site's chrome, not an organization setting.
 */
export const saveBrandAction = async (formData: FormData): Promise<void> => {
  if ((await requireCapability('experiences:manage')) === null) {
    return;
  }
  const chosen = (name: string): string | null => {
    const value = String(formData.get(name) ?? '').trim();
    return value === '' ? null : value;
  };
  await setSiteBrand({
    logo: chosen('logo'),
    logoOnDark: chosen('logoOnDark'),
  });
  /*
   * The logo is in the chrome of every Studio screen as well as every
   * public one, and the chrome is rendered by a layout — so the whole
   * Studio tree is refreshed, not just this page.
   */
  revalidatePath('/studio', 'layout');
};
