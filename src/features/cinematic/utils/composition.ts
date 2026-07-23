import type { CompositionEntry } from '@/experience-runtime';
import { CONFERENCE_SCENE_SEQUENCE } from '../constants/cinematic-content';

/*
 * A stored composition predates every scene added since it was saved —
 * the Runtime would honestly append the strangers at the end. This pure
 * step completes an old composition instead: each authored scene the
 * composition never met is inserted at its authored slot (after its
 * nearest authored predecessor the composition knows), carrying its
 * authored visibility. The Runtime itself stays untouched
 * (docs/Experience-Engine-V2.md).
 */
export const completeComposition = (
  composition: readonly CompositionEntry[],
  sequence: readonly {
    id: string;
    hidden?: boolean;
  }[] = CONFERENCE_SCENE_SEQUENCE,
): CompositionEntry[] => {
  if (composition.length === 0) {
    return [];
  }
  const known = new Set(composition.map((entry) => entry.scene));
  const completed: CompositionEntry[] = [...composition];
  for (let index = 0; index < sequence.length; index += 1) {
    const authored = sequence[index];
    if (!authored || known.has(authored.id)) {
      continue;
    }
    let insertAt = 0;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const predecessor = sequence[cursor];
      if (!predecessor) {
        continue;
      }
      const position = completed.findIndex(
        (entry) => entry.scene === predecessor.id,
      );
      if (position >= 0) {
        insertAt = position + 1;
        break;
      }
    }
    completed.splice(insertAt, 0, {
      scene: authored.id,
      hidden: authored.hidden === true,
    });
    known.add(authored.id);
  }
  return completed;
};
