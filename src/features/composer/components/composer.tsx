'use client';

import { useMemo, useReducer, useState, useTransition } from 'react';
import { MotionConfig } from 'motion/react';
import { FALLBACK_LOCALE, type Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import { registerExperienceScenes } from '@/features/experience';
import { saveComposerAction } from '@/app/(studio)/studio/(classic)/actions';
import type { ComposerAction, ComposerState } from '../types/composer';
import { composerReducer } from '../state/composer-reducer';
import { COMPOSER_MESSAGES } from '../constants/messages';
import { DEFAULT_IDENTITY } from '../constants/fields';
import ComposerTimeline from './composer-timeline';
import ComposerStage from './composer-stage';
import ComposerPanel from './composer-panel';

registerExperienceScenes();

interface ComposerProps {
  eventSlug: string;
  scenesByLocale: Record<Locale, SceneData[]>;
}

const Composer = ({ eventSlug, scenesByLocale }: ComposerProps) => {
  const [state, dispatch] = useReducer(composerReducer, {
    scenesByLocale,
    locale: FALLBACK_LOCALE,
    device: 'desktop',
    selectedSceneId: null,
    identity: { ...DEFAULT_IDENTITY },
  } satisfies ComposerState);

  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [pending, startTransition] = useTransition();

  const scenes = state.scenesByLocale[state.locale];

  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === state.selectedSceneId) ?? null,
    [scenes, state.selectedSceneId],
  );

  /*
   * Content edits mark the draft dirty; selection and device framing do
   * not. Save persists the current locale's scene content.
   */
  const trackedDispatch = (action: ComposerAction) => {
    if (action.type !== 'select' && action.type !== 'setDevice') {
      setStatus('idle');
    }
    dispatch(action);
  };

  const handleSave = () => {
    const payload = scenes.map((scene) => ({
      id: scene.id,
      content: scene.content,
    }));
    startTransition(async () => {
      await saveComposerAction(eventSlug, state.locale, payload);
      setStatus('saved');
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-text-secondary">
            {status === 'saved'
              ? COMPOSER_MESSAGES.saved[state.locale]
              : COMPOSER_MESSAGES.localDraft[state.locale]}
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex min-h-9 items-center rounded-lg bg-brand px-5 text-sm font-medium text-brand-contrast transition-opacity disabled:opacity-60"
          >
            {pending
              ? COMPOSER_MESSAGES.saving[state.locale]
              : COMPOSER_MESSAGES.save[state.locale]}
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
          <ComposerTimeline
            scenes={scenes}
            selectedSceneId={state.selectedSceneId}
            locale={state.locale}
            dispatch={trackedDispatch}
          />
          <ComposerStage
            scenes={scenes}
            eventSlug={eventSlug}
            locale={state.locale}
            device={state.device}
            selectedSceneId={state.selectedSceneId}
            dispatch={trackedDispatch}
          />
          <ComposerPanel
            scene={selectedScene}
            identity={state.identity}
            locale={state.locale}
            dispatch={trackedDispatch}
          />
        </div>
      </div>
    </MotionConfig>
  );
};

export default Composer;
