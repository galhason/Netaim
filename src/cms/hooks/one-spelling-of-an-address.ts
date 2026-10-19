import type { CollectionBeforeValidateHook } from 'payload';

/*
 * One spelling of an address.
 *
 * An email address is matched by exact text everywhere a person is
 * looked up — at the door, by the recovery link, by the registration
 * form asking whether the address is taken. Every one of those lower-
 * cases what the person typed; an account whose address was saved with
 * a capital letter was therefore an account nobody could find. The
 * person asked for a sign-in link, the screen said one was on its way,
 * and nothing was ever sent.
 *
 * The spelling is settled once, on the way into the row, whoever is
 * writing it: the registration form, the recovery flow, the Studio, a
 * Payload admin editing by hand. The lookups keep lower-casing their
 * side; this makes sure the row agrees.
 */
export const oneSpellingOfAnAddress: CollectionBeforeValidateHook = ({ data }) => {
  if (data && typeof data.email === 'string') {
    return { ...data, email: data.email.trim().toLowerCase() };
  }
  return data;
};
