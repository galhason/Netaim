import type { ContentSource } from '@/features/events/types/event-experience';

export const chooseContentSource = (
  demoEnabled: boolean,
  demo: ContentSource,
  live: ContentSource,
): ContentSource => (demoEnabled ? demo : live);
