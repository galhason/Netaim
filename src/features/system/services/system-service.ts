import { systemUpdateRepository } from '@/infrastructure';
import type { SystemUpdate, SystemUpdateInput } from '../types/system-update';

/*
 * The system page's record. Reading is for every Netaim role; writing is
 * the developer's — both are asked by the Studio actions before they
 * call in here, and the collection itself is closed to everyone else.
 *
 * The current version is the version of the newest release: the page
 * says what is running by saying what was last released, so publishing
 * a note is also what moves the number.
 */
export const listSystemUpdates = (): Promise<SystemUpdate[]> =>
  systemUpdateRepository.list().catch(() => []);

export interface SystemSummary {
  currentVersion: string | null;
  lastReleasedAt: string | null;
  total: number;
}

export const summarizeSystem = (updates: readonly SystemUpdate[]): SystemSummary => {
  const newest = updates[0];
  return {
    currentVersion: newest?.version ?? null,
    lastReleasedAt: newest?.releasedAt ?? null,
    total: updates.length,
  };
};

export const publishSystemUpdate = (input: SystemUpdateInput, publishedById: string): Promise<SystemUpdate | null> =>
  systemUpdateRepository.create(input, publishedById).catch(() => null);

export const editSystemUpdate = (id: string, input: SystemUpdateInput): Promise<SystemUpdate | null> =>
  systemUpdateRepository.update(id, input).catch(() => null);

export const removeSystemUpdate = (id: string): Promise<boolean> =>
  systemUpdateRepository.remove(id).catch(() => false);
