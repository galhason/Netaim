import { getPayload } from 'payload';
import config from '@payload-config';
import type { User } from '@/payload-types';
import type {
  StudioCreator,
  StudioIdentityGateway,
} from '@/features/studio/types/creator';

export const toStudioCreator = (user: {
  id: string | number;
  name?: string | null;
  email: string;
}): StudioCreator => ({
  id: String(user.id),
  name: user.name?.trim() ? user.name : user.email,
  email: user.email,
});

/*
 * The Payload implementation of the Studio identity gateway. Sessions
 * resolve through Payload auth; the product receives only the
 * StudioCreator model.
 */
export const payloadIdentityGateway: StudioIdentityGateway = {
  currentCreator: async (headers) => {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers });
    return user ? toStudioCreator(user as User) : null;
  },
};
