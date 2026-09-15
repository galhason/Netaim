import * as migration_20260821_063558 from './20260821_063558';
import * as migration_20260822_103950 from './20260822_103950';
import * as migration_20260822_123832 from './20260822_123832';
import * as migration_20260822_141455 from './20260822_141455';
import * as migration_20260823_173813 from './20260823_173813';
import * as migration_20260915_102537_email_verifications from './20260915_102537_email_verifications';
import * as migration_20260915_122225_hero_video from './20260915_122225_hero_video';

export const migrations = [
  {
    up: migration_20260821_063558.up,
    down: migration_20260821_063558.down,
    name: '20260821_063558',
  },
  {
    up: migration_20260822_103950.up,
    down: migration_20260822_103950.down,
    name: '20260822_103950',
  },
  {
    up: migration_20260822_123832.up,
    down: migration_20260822_123832.down,
    name: '20260822_123832',
  },
  {
    up: migration_20260822_141455.up,
    down: migration_20260822_141455.down,
    name: '20260822_141455',
  },
  {
    up: migration_20260823_173813.up,
    down: migration_20260823_173813.down,
    name: '20260823_173813',
  },
  {
    up: migration_20260915_102537_email_verifications.up,
    down: migration_20260915_102537_email_verifications.down,
    name: '20260915_102537_email_verifications',
  },
  {
    up: migration_20260915_122225_hero_video.up,
    down: migration_20260915_122225_hero_video.down,
    name: '20260915_122225_hero_video'
  },
];
