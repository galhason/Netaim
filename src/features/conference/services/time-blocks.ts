import type { SessionType } from '@/features/program/types/session';
import type { ActivityVM, TimeBlockVM } from '../types';

/* The programme's own order of kinds, as the filters list them. */
const FILTER_ORDER: SessionType[] = ['keynote', 'talk', 'workshop', 'tour'];

/*
 * The programme as hours: activities that start at the same moment on
 * the same day form one block, in the order of the day. The block's end
 * is the latest end among them, so "09:00–10:30" covers the longest
 * choice in the hour. A break stands in a block of its own — several
 * breaks at once would be one band. Pure: the same list in, the same
 * blocks out, so the page can regroup after every filter.
 */
export const timeBlocksOf = (activities: ActivityVM[]): TimeBlockVM[] => {
  const blocks = new Map<string, TimeBlockVM>();
  for (const activity of [...activities].sort((a, b) => a.startMs - b.startMs)) {
    const key = `${activity.dayKey}:${activity.startMs}`;
    const block = blocks.get(key);
    if (block) {
      block.activities.push(activity);
      block.endMs = Math.max(block.endMs, activity.endMs ?? activity.startMs);
      if (activity.endTime && (!block.endTime || (activity.endMs ?? 0) >= block.endMs)) {
        block.endTime = activity.endTime;
      }
      if (activity.registration === 'registered') block.registeredCount += 1;
      if (activity.type !== 'break') block.isBreak = false;
      continue;
    }
    blocks.set(key, {
      key,
      dayKey: activity.dayKey,
      time: activity.time ?? '',
      ...(activity.endTime ? { endTime: activity.endTime } : {}),
      startMs: activity.startMs,
      endMs: activity.endMs ?? activity.startMs,
      activities: [activity],
      registeredCount: activity.registration === 'registered' ? 1 : 0,
      kinds: [],
      isBreak: activity.type === 'break',
    });
  }
  const order: SessionType[] = [...FILTER_ORDER, 'break'];
  return [...blocks.values()].map((block) => {
    const present = new Set(block.activities.map((a) => a.type));
    return { ...block, kinds: order.filter((type) => present.has(type)) };
  });
};
