import type { GlobalConfig } from 'payload';
import { isPublic, platformOnly } from '../access';

export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  admin: {
    group: 'Platform',
  },
  access: {
    read: isPublic,
    update: platformOnly('platform:manage'),
  },
  fields: [
    {
      name: 'platformName',
      type: 'text',
      required: true,
      localized: true,
    },
  ],
};
