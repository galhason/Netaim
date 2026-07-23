import {
  CONFERENCE_ACTS,
  type ConferenceAct,
} from '../constants/conference-acts';

/*
 * Act composition (Experience Engine v2): pure functions that read and
 * rewrite the flat scene order through the lens of Acts. Membership is
 * static by scene id; an Act's position is where its scenes currently
 * sit. Chrome scenes (members of no Act) keep their place at the edges.
 * Every impossible operation returns null — the action refuses quietly
 * (docs/Experience-Engine-V2.md).
 */
export interface ActScene {
  id: string;
  hidden?: boolean;
}

export interface ActBlock<T extends ActScene> {
  id: string;
  scenes: T[];
  hidden: boolean;
}

const memberIds = (acts: readonly ConferenceAct[]): Set<string> =>
  new Set(acts.flatMap((act) => act.scenes));

/*
 * The journey as the map shows it: blocks ordered by where each Act's
 * scenes first appear, each block's scenes in their current order. An
 * Act with no scene present is omitted; an Act is hidden only when
 * every member is.
 */
export const actBlocks = <T extends ActScene>(
  scenes: readonly T[],
  acts: readonly ConferenceAct[] = CONFERENCE_ACTS,
): ActBlock<T>[] => {
  const blocks: ActBlock<T>[] = [];
  const byAct = new Map<string, T[]>();
  const order: string[] = [];
  for (const scene of scenes) {
    const act = acts.find((entry) => entry.scenes.includes(scene.id));
    if (!act) {
      continue;
    }
    if (!byAct.has(act.id)) {
      byAct.set(act.id, []);
      order.push(act.id);
    }
    byAct.get(act.id)?.push(scene);
  }
  for (const id of order) {
    const members = byAct.get(id) ?? [];
    blocks.push({
      id,
      scenes: members,
      hidden: members.every((scene) => scene.hidden === true),
    });
  }
  return blocks;
};

/*
 * Rebuilds the flat order from reordered blocks: chrome scenes seen
 * before any Act scene stay leading, the rest stay trailing — their
 * placement is declared by their packages, never by position.
 */
const rebuild = <T extends ActScene>(
  scenes: readonly T[],
  blocks: readonly ActBlock<T>[],
  acts: readonly ConferenceAct[],
): T[] => {
  const members = memberIds(acts);
  const leading: T[] = [];
  const trailing: T[] = [];
  let seenAct = false;
  for (const scene of scenes) {
    if (members.has(scene.id)) {
      seenAct = true;
      continue;
    }
    (seenAct ? trailing : leading).push(scene);
  }
  return [...leading, ...blocks.flatMap((block) => block.scenes), ...trailing];
};

export const moveAct = <T extends ActScene>(
  scenes: readonly T[],
  actId: string,
  direction: -1 | 1,
  acts: readonly ConferenceAct[] = CONFERENCE_ACTS,
): T[] | null => {
  const blocks = actBlocks(scenes, acts);
  const index = blocks.findIndex((block) => block.id === actId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= blocks.length) {
    return null;
  }
  const next = [...blocks];
  const moving = next[index];
  const neighbor = next[target];
  if (!moving || !neighbor) {
    return null;
  }
  next[index] = neighbor;
  next[target] = moving;
  return rebuild(scenes, next, acts);
};

export const setActHidden = <T extends ActScene>(
  scenes: readonly T[],
  actId: string,
  hidden: boolean,
  acts: readonly ConferenceAct[] = CONFERENCE_ACTS,
): T[] | null => {
  const act = acts.find((entry) => entry.id === actId);
  if (!act || !scenes.some((scene) => act.scenes.includes(scene.id))) {
    return null;
  }
  return scenes.map((scene) =>
    act.scenes.includes(scene.id)
      ? { ...scene, hidden: hidden ? true : undefined }
      : scene,
  );
};

/*
 * A scene swap that honors the map: the scene trades places with its
 * neighbor inside the same Act. Crossing an Act border is the Act's
 * move, not the scene's.
 */
export const moveSceneWithinAct = <T extends ActScene>(
  scenes: readonly T[],
  sceneId: string,
  direction: -1 | 1,
  acts: readonly ConferenceAct[] = CONFERENCE_ACTS,
): T[] | null => {
  const blocks = actBlocks(scenes, acts);
  const block = blocks.find((entry) =>
    entry.scenes.some((scene) => scene.id === sceneId),
  );
  if (!block) {
    return null;
  }
  const index = block.scenes.findIndex((scene) => scene.id === sceneId);
  const target = index + direction;
  if (target < 0 || target >= block.scenes.length) {
    return null;
  }
  const reordered = [...block.scenes];
  const moving = reordered[index];
  const neighbor = reordered[target];
  if (!moving || !neighbor) {
    return null;
  }
  reordered[index] = neighbor;
  reordered[target] = moving;
  const next = blocks.map((entry) =>
    entry.id === block.id ? { ...entry, scenes: reordered } : entry,
  );
  return rebuild(scenes, next, acts);
};
