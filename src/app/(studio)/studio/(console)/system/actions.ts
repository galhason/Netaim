'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/features/access';
import { requireCapability } from '@/features/studio';
import {
  editSystemUpdate,
  publishSystemUpdate,
  readSystemUpdate,
  removeSystemUpdate,
  type SystemUpdateRefusal,
} from '@/features/system';
import { DEFAULT_VENUE_TIMEZONE } from '@/shared/utils/format-date';

/*
 * Writing the system page — the developer's alone.
 *
 * Every action asks for system:manage itself, from the database, before
 * it reads a field: the page hiding the form from everyone else is
 * manners, this is the rule. A refused note comes back to the form with
 * what was typed; a written one sends the page back with a word saying so.
 */
export interface SystemFormState {
  error?: SystemUpdateRefusal | 'failed' | 'forbidden';
  /* Bumped on every refusal, so the same refusal twice is still noticed. */
  attempt?: number;
}

const PAGE = '/studio/system';

/* Today on the organisation's clock — a note cannot be dated after it. */
const today = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_VENUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const refuse = (previous: SystemFormState, error: NonNullable<SystemFormState['error']>): SystemFormState => ({
  error,
  attempt: (previous.attempt ?? 0) + 1,
});

export const publishSystemUpdateAction = async (
  previous: SystemFormState,
  form: FormData,
): Promise<SystemFormState> => {
  const access = await requireCapability('system:manage');
  if (!access) {
    return refuse(previous, 'forbidden');
  }
  const read = readSystemUpdate(form, today());
  if (!read.ok) {
    return refuse(previous, read.reason);
  }
  const saved = await publishSystemUpdate(read.input, access.creator.id);
  if (!saved) {
    return refuse(previous, 'failed');
  }
  await audit(access.creator, 'system.updatePublished', undefined, {
    updateId: saved.id,
    version: saved.version,
  }, saved.title);
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=published`);
};

export const editSystemUpdateAction = async (
  previous: SystemFormState,
  form: FormData,
): Promise<SystemFormState> => {
  const access = await requireCapability('system:manage');
  if (!access) {
    return refuse(previous, 'forbidden');
  }
  const id = String(form.get('id') ?? '').trim();
  if (!/^\d{1,12}$/.test(id)) {
    return refuse(previous, 'failed');
  }
  const read = readSystemUpdate(form, today());
  if (!read.ok) {
    return refuse(previous, read.reason);
  }
  const saved = await editSystemUpdate(id, read.input);
  if (!saved) {
    return refuse(previous, 'failed');
  }
  await audit(access.creator, 'system.updateEdited', undefined, {
    updateId: saved.id,
    version: saved.version,
  }, saved.title);
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=saved`);
};

export const removeSystemUpdateAction = async (form: FormData): Promise<void> => {
  const access = await requireCapability('system:manage');
  if (!access) {
    redirect(PAGE);
  }
  const id = String(form.get('id') ?? '').trim();
  const removed = /^\d{1,12}$/.test(id) ? await removeSystemUpdate(id) : false;
  if (removed) {
    await audit(access.creator, 'system.updateRemoved', undefined, { updateId: id });
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?${removed ? 'done=removed' : 'error=failed'}`);
};
