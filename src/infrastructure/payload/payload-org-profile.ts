import type {
  OrganizationRepository,
  ProfileRepository,
} from '@/features/studio/types/creator';
import { actorContext } from './payload-context';

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

export const payloadOrganizationRepository: OrganizationRepository = {
  currentOrganization: async () => {
    const { payload, user, organizationId } = await requireActor();
    if (organizationId == null) {
      return null;
    }
    const organization = await payload.findByID({
      collection: 'organizations',
      id: organizationId,
      overrideAccess: false,
      user,
    });
    return { id: String(organization.id), name: organization.name };
  },

  renameOrganization: async (name) => {
    const { payload, user, organizationId } = await requireActor();
    if (organizationId == null) {
      throw new Error('No organization available for this creator');
    }
    await payload.update({
      collection: 'organizations',
      id: organizationId,
      overrideAccess: false,
      user,
      data: { name },
    });
  },
};

export const payloadProfileRepository: ProfileRepository = {
  updateName: async (name) => {
    const { payload, user } = await requireActor();
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: false,
      user,
      data: { name },
    });
  },
};
