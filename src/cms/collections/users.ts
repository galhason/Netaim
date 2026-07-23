import { APIError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload';
import {
  ROLES,
  PLATFORM_ROLES,
  organizationsWithPermission,
  relationshipId,
  type Grant,
} from '@/auth';
import { anyGrantWith, scopedMembers } from '../access';

/*
 * Grant integrity is a business rule, not UI validation: non-platform
 * managers may only assign grants inside organizations they manage and
 * may never assign platform roles. The first user (bootstrap, no actor)
 * passes through so the platform can be initialized.
 */
const guardGrants: CollectionBeforeValidateHook = ({ req, data }) => {
  const grants = (data?.grants ?? []) as Grant[];

  for (const grant of grants) {
    const organization = relationshipId(grant.organization);
    if (!PLATFORM_ROLES.includes(grant.role) && organization == null) {
      throw new APIError('Non-platform grants require an organization', 400);
    }
  }

  if (!req.user) {
    return data;
  }

  const actorGrants = ((req.user as { grants?: Grant[] | null }).grants ??
    []) as Grant[];
  const actorScope = organizationsWithPermission(actorGrants, 'members:manage');

  if (actorScope.all) {
    return data;
  }

  for (const grant of grants) {
    if (PLATFORM_ROLES.includes(grant.role)) {
      throw new APIError('Only platform owners may assign platform roles', 403);
    }
    const organization = relationshipId(grant.organization);
    const allowed = actorScope.organizations.some(
      (o) => String(o) === String(organization),
    );
    if (!allowed) {
      throw new APIError(
        'Grants may only be assigned within organizations you manage',
        403,
      );
    }
  }

  return data;
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    group: 'Platform',
    useAsTitle: 'email',
  },
  hooks: {
    beforeValidate: [guardGrants],
  },
  access: {
    read: scopedMembers('members:manage'),
    create: anyGrantWith('members:manage'),
    update: scopedMembers('members:manage'),
    delete: scopedMembers('members:manage'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'grants',
      type: 'array',
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: ROLES.map((role) => ({ label: role, value: role })),
        },
        {
          name: 'organization',
          type: 'relationship',
          relationTo: 'organizations',
        },
        {
          name: 'event',
          type: 'relationship',
          relationTo: 'events',
        },
      ],
    },
  ],
};
