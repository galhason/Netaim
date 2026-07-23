import { PLATFORM_ROLES, ROLES, type Grant, type Role } from '@/auth';
import type {
  AddTeamMemberInput,
  TeamMember,
  TeamRepository,
} from '@/features/studio/types/team';
import type { User } from '@/payload-types';
import { actorContext } from './payload-context';

/*
 * Team management runs entirely under the acting creator: the users
 * collection's own access (scopedMembers) and the guardGrants hook
 * enforce who may see and assign what — this adapter never bypasses
 * them.
 */
const toMember = (user: User): TeamMember => ({
  id: String(user.id),
  name: user.name ?? '',
  email: user.email,
  roles: ((user.grants ?? []) as Grant[]).map((grant) => grant.role),
});

const requireActor = async () => {
  const context = await actorContext();
  if (!context) {
    throw new Error('Sign-in required');
  }
  return context;
};

const isRole = (value: string): value is Role =>
  (ROLES as readonly string[]).includes(value);

export const payloadTeamRepository: TeamRepository = {
  listMembers: async () => {
    const { payload, user } = await requireActor();
    const result = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user,
      sort: 'name',
      limit: 100,
    });
    return result.docs.map(toMember);
  },

  addMember: async (input: AddTeamMemberInput) => {
    const { payload, user, organizationId } = await requireActor();
    if (!isRole(input.role)) {
      throw new Error('Unknown role');
    }
    const grant = PLATFORM_ROLES.includes(input.role)
      ? { role: input.role }
      : { role: input.role, organization: organizationId };
    const created = await payload.create({
      collection: 'users',
      overrideAccess: false,
      user,
      data: {
        name: input.name,
        email: input.email,
        password: input.password,
        grants: [grant],
      },
    });
    return toMember(created);
  },

  updateMemberName: async (id, name) => {
    const { payload, user } = await requireActor();
    await payload.update({
      collection: 'users',
      id: Number(id),
      overrideAccess: false,
      user,
      data: { name },
    });
  },
};
