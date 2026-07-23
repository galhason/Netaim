'use client';

import { useState } from 'react';
import type { Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import type { ComposerAction } from '../types/composer';
import { CHAPTER_LABELS } from '../constants/fields';
import { COMPOSER_MESSAGES } from '../constants/messages';

interface ComposerTimelineProps {
  scenes: SceneData[];
  selectedSceneId: string | null;
  locale: Locale;
  dispatch: (action: ComposerAction) => void;
}

const ComposerTimeline = ({
  scenes,
  selectedSceneId,
  locale,
  dispatch,
}: ComposerTimelineProps) => {
  const [query, setQuery] = useState('');

  const visible = query
    ? scenes.filter((scene) =>
        scene.title.toLowerCase().includes(query.toLowerCase()),
      )
    : scenes;

  return (
    <nav
      aria-label={COMPOSER_MESSAGES.timeline?.[locale]}
      className="flex h-full flex-col gap-4 overflow-y-auto border-e border-border pe-4"
    >
      <p className="text-xs font-medium tracking-widest text-text-secondary">
        {COMPOSER_MESSAGES.timeline?.[locale]}
      </p>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={COMPOSER_MESSAGES.searchScenes?.[locale]}
        className="border-b border-border bg-transparent py-1.5 text-sm outline-none placeholder:text-text-secondary/60"
      />
      <ol className="flex flex-col">
        {visible.map((scene) => {
          const selected = scene.id === selectedSceneId;
          const chapter = CHAPTER_LABELS[scene.type]?.[locale] ?? scene.type;

          return (
            <li key={scene.id} className="border-b border-border/60">
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'select', sceneId: selected ? null : scene.id })
                }
                aria-current={selected ? 'true' : undefined}
                className={`flex min-h-12 w-full flex-col items-start gap-0.5 py-3 text-start transition-opacity ${
                  selected ? '' : 'opacity-75 hover:opacity-100'
                } ${scene.enabled ? '' : 'opacity-40'}`}
              >
                <span className="flex items-center gap-2">
                  {selected ? (
                    <span
                      aria-hidden="true"
                      className="block h-px w-4 bg-accent"
                    />
                  ) : null}
                  <span className="font-medium">{scene.title}</span>
                </span>
                <span className="text-xs text-text-secondary">
                  {chapter}
                  {scene.enabled
                    ? ''
                    : ` · ${COMPOSER_MESSAGES.hidden?.[locale]}`}
                </span>
              </button>
              {selected ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pb-3 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'move', sceneId: scene.id, direction: 'up' })
                    }
                    className="min-h-8 underline decoration-current/40 underline-offset-4 hover:decoration-current"
                  >
                    {COMPOSER_MESSAGES.moveUp?.[locale]}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'move',
                        sceneId: scene.id,
                        direction: 'down',
                      })
                    }
                    className="min-h-8 underline decoration-current/40 underline-offset-4 hover:decoration-current"
                  >
                    {COMPOSER_MESSAGES.moveDown?.[locale]}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'duplicate', sceneId: scene.id })
                    }
                    className="min-h-8 underline decoration-current/40 underline-offset-4 hover:decoration-current"
                  >
                    {COMPOSER_MESSAGES.duplicate?.[locale]}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'toggle', sceneId: scene.id })}
                    className="min-h-8 underline decoration-current/40 underline-offset-4 hover:decoration-current"
                  >
                    {scene.enabled
                      ? COMPOSER_MESSAGES.hide?.[locale]
                      : COMPOSER_MESSAGES.show?.[locale]}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-auto pt-4 text-xs leading-relaxed text-text-secondary">
        {COMPOSER_MESSAGES.localDraft?.[locale]}
      </p>
    </nav>
  );
};

export default ComposerTimeline;
