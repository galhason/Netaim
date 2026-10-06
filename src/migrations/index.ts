import * as migration_20260821_063558 from './20260821_063558';
import * as migration_20260822_103950 from './20260822_103950';
import * as migration_20260822_123832 from './20260822_123832';
import * as migration_20260822_141455 from './20260822_141455';
import * as migration_20260823_173813 from './20260823_173813';
import * as migration_20260915_102537_email_verifications from './20260915_102537_email_verifications';
import * as migration_20260915_122225_hero_video from './20260915_122225_hero_video';
import * as migration_20260916_190000_site_logo from './20260916_190000_site_logo';
import * as migration_20260924_090000_single_published_conference from './20260924_090000_single_published_conference';
import * as migration_20260924_140000_prague_timezone from './20260924_140000_prague_timezone';
import * as migration_20260925_090000_restore_single_published_index from './20260925_090000_restore_single_published_index';
import * as migration_20260926_120000_activity_archive_and_immutable_audit from './20260926_120000_activity_archive_and_immutable_audit';
import * as migration_20260927_120000_venue_fact_icons from './20260927_120000_venue_fact_icons';
import * as migration_20260929_120000_participant_country from './20260929_120000_participant_country';
import * as migration_20260929_160000_conference_preview_section from './20260929_160000_conference_preview_section';
import * as migration_20260929_200000_gallery_items from './20260929_200000_gallery_items';
import * as migration_20260930_090000_gallery_submissions from './20260930_090000_gallery_submissions';
import * as migration_20261003_090000_gallery_placement from './20261003_090000_gallery_placement';
import * as migration_20261005_090000_registration_media_consent from './20261005_090000_registration_media_consent';
import * as migration_20261006_090000_developer_role_and_system_updates from './20261006_090000_developer_role_and_system_updates';

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
  {
    up: migration_20260916_190000_site_logo.up,
    down: migration_20260916_190000_site_logo.down,
    name: '20260916_190000_site_logo'
  },
  {
    up: migration_20260924_090000_single_published_conference.up,
    down: migration_20260924_090000_single_published_conference.down,
    name: '20260924_090000_single_published_conference',
  },
  {
    up: migration_20260924_140000_prague_timezone.up,
    down: migration_20260924_140000_prague_timezone.down,
    name: '20260924_140000_prague_timezone',
  },
  {
    up: migration_20260925_090000_restore_single_published_index.up,
    down: migration_20260925_090000_restore_single_published_index.down,
    name: '20260925_090000_restore_single_published_index',
  },
  {
    up: migration_20260926_120000_activity_archive_and_immutable_audit.up,
    down: migration_20260926_120000_activity_archive_and_immutable_audit.down,
    name: '20260926_120000_activity_archive_and_immutable_audit',
  },
  {
    up: migration_20260927_120000_venue_fact_icons.up,
    down: migration_20260927_120000_venue_fact_icons.down,
    name: '20260927_120000_venue_fact_icons',
  },
  {
    up: migration_20260929_120000_participant_country.up,
    down: migration_20260929_120000_participant_country.down,
    name: '20260929_120000_participant_country',
  },
  {
    up: migration_20260929_160000_conference_preview_section.up,
    down: migration_20260929_160000_conference_preview_section.down,
    name: '20260929_160000_conference_preview_section',
  },
  {
    up: migration_20260929_200000_gallery_items.up,
    down: migration_20260929_200000_gallery_items.down,
    name: '20260929_200000_gallery_items',
  },
  {
    up: migration_20260930_090000_gallery_submissions.up,
    down: migration_20260930_090000_gallery_submissions.down,
    name: '20260930_090000_gallery_submissions',
  },
  {
    up: migration_20261003_090000_gallery_placement.up,
    down: migration_20261003_090000_gallery_placement.down,
    name: '20261003_090000_gallery_placement',
  },
  {
    up: migration_20261005_090000_registration_media_consent.up,
    down: migration_20261005_090000_registration_media_consent.down,
    name: '20261005_090000_registration_media_consent',
  },
  {
    up: migration_20261006_090000_developer_role_and_system_updates.up,
    down: migration_20261006_090000_developer_role_and_system_updates.down,
    name: '20261006_090000_developer_role_and_system_updates',
  },
];
