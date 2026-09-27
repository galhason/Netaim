'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit } from '@/features/access';
import {
  addSponsor,
  moveSponsor,
  removeSponsor,
  updateSponsor,
} from '@/features/sponsors';
import { actorFor } from '@/features/studio/services/studio-auth';
import { publishedEvent, publishedSponsors } from '@/shared/cache/publish';

/*
 * The partners strip: who the conference shows at the foot of its page.
 *
 * Every action is gated on `events:manage` for this conference, so a
 * supervisor can shape the strip as freely as an admin — a partner is
 * not a person, an activity or a conference, and removing one from the
 * strip destroys nothing but a logo's place on a page.
 */
const page = (slug: string) => `/studio/conference/${encodeURIComponent(slug)}/partners`;
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '').trim();

/* A link a visitor will click: http(s) only, and '' when it is not one. */
const website = (raw: string): string => {
  if (raw === '') {
    return '';
  }
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

const changed = (slug: string) => {
  publishedEvent(slug);
  publishedSponsors();
  revalidatePath(page(slug));
};

export const addPartnerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor) {
    return;
  }
  const name = text(formData, 'name');
  const logoId = text(formData, 'logoId');
  /*
   * A partner is a name first. The logo is its picture, and the site
   * writes the name in type when there is none — but a name is what the
   * record is called by, and the collection will not save one without.
   * Sent back to the form with a word, not to an error page.
   */
  if (!name) {
    redirect(`${page(slug)}?notice=name-required`);
  }
  const created = await addSponsor(slug, {
    name,
    tier: 'partner',
    website: website(text(formData, 'website')) || undefined,
    ...(logoId ? { logoId } : {}),
  });
  await audit(actor, 'content.partnerSaved', slug, { partner: created.id, name, created: true }, name);
  changed(slug);
  redirect(`${page(slug)}?notice=added#partner-${created.id}`);
};

export const updatePartnerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  const name = text(formData, 'name');
  if (!name) {
    redirect(`${page(slug)}?notice=name-required#partner-${id}`);
  }
  await updateSponsor(id, {
    name,
    website: website(text(formData, 'website')),
    ...(formData.has('logoId') ? { logoId: text(formData, 'logoId') } : {}),
  });
  await audit(actor, 'content.partnerSaved', slug, { partner: id, name }, name);
  changed(slug);
  redirect(`${page(slug)}?notice=saved#partner-${id}`);
};

export const removePartnerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  await removeSponsor(id);
  await audit(actor, 'content.partnerRemoved', slug, { partner: id, name: text(formData, 'name') }, text(formData, 'name'));
  changed(slug);
  redirect(`${page(slug)}?notice=removed`);
};

export const movePartnerAction = async (formData: FormData) => {
  const slug = text(formData, 'slug');
  const id = text(formData, 'id');
  const direction = text(formData, 'direction') === 'up' ? 'up' : 'down';
  const actor = slug ? await actorFor('events:manage', slug) : null;
  if (!actor || !id) {
    return;
  }
  const order = await moveSponsor(slug, id, direction);
  await audit(actor, 'content.partnersReordered', slug, { partner: id, direction, order: order.map((item) => item.name || item.id).join(' → ') });
  changed(slug);
  redirect(`${page(slug)}#partner-${id}`);
};
