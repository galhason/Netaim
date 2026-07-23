'use client';

import { motion } from 'motion/react';
import type { Locale } from '@/config/locales';
import type { SceneData } from '@/experience-engine';
import { sceneItem } from '@/features/experience';
import type {
  ComposerAction,
  ExperienceIdentityDraft,
} from '../types/composer';
import {
  CHAPTER_LABELS,
  IDENTITY_DIMENSIONS,
  SCENE_FIELDS,
} from '../constants/fields';
import { COMPOSER_MESSAGES } from '../constants/messages';
import { getAtPath } from '../utils/content-path';

interface ComposerPanelProps {
  scene: SceneData | null;
  identity: ExperienceIdentityDraft;
  locale: Locale;
  dispatch: (action: ComposerAction) => void;
}

const fieldId = (sceneId: string, path: string) =>
  `composer-${sceneId}-${path.replace(/\./g, '-')}`;

const ComposerPanel = ({
  scene,
  identity,
  locale,
  dispatch,
}: ComposerPanelProps) => {
  if (!scene) {
    return (
      <motion.aside
        key="identity"
        initial="hidden"
        animate="visible"
        variants={sceneItem}
        className="flex h-full flex-col gap-6 overflow-y-auto border-s border-border ps-4"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-widest text-text-secondary">
            {COMPOSER_MESSAGES.identity?.[locale]}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            {COMPOSER_MESSAGES.identityHint?.[locale]}
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {IDENTITY_DIMENSIONS.map((dimension) => (
            <label key={dimension.id} className="flex flex-col gap-1.5">
              <span className="text-xs tracking-widest text-text-secondary">
                {dimension.label[locale]}
              </span>
              <select
                value={identity[dimension.id]}
                onChange={(event) =>
                  dispatch({
                    type: 'setIdentity',
                    dimension: dimension.id,
                    value: event.target.value,
                  })
                }
                className="min-h-11 border-b border-border bg-transparent py-1.5 font-medium outline-none"
              >
                {dimension.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-auto pt-4 text-xs leading-relaxed text-text-secondary">
          {COMPOSER_MESSAGES.selectPrompt?.[locale]}
        </p>
      </motion.aside>
    );
  }

  const fields = SCENE_FIELDS[scene.type] ?? [];
  const chapter = CHAPTER_LABELS[scene.type]?.[locale] ?? scene.type;

  return (
    <motion.aside
      key={scene.id}
      initial="hidden"
      animate="visible"
      variants={sceneItem}
      className="flex h-full flex-col gap-6 overflow-y-auto border-s border-border ps-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-widest text-text-secondary">
          {chapter}
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="sr-only">
            {COMPOSER_MESSAGES.chapterName?.[locale]}
          </span>
          <input
            type="text"
            value={scene.title}
            onChange={(event) =>
              dispatch({
                type: 'rename',
                sceneId: scene.id,
                title: event.target.value,
              })
            }
            className="border-b border-border bg-transparent py-1 font-display text-xl font-medium outline-none"
          />
        </label>
      </div>
      <div className="flex flex-col gap-5">
        {fields.map((field) => {
          const id = fieldId(scene.id, field.path);
          const value = getAtPath(scene.content, field.path);
          const update = (next: string) =>
            dispatch({
              type: 'updateField',
              sceneId: scene.id,
              path: field.path,
              value: next,
            });

          return (
            <div key={field.path} className="flex flex-col gap-1.5">
              <label
                htmlFor={id}
                className="text-xs tracking-widest text-text-secondary"
              >
                {field.label[locale]}
              </label>
              {field.kind === 'textarea' ? (
                <textarea
                  id={id}
                  value={value}
                  rows={3}
                  onChange={(event) => update(event.target.value)}
                  className="resize-y border-b border-border bg-transparent py-1.5 leading-relaxed outline-none"
                />
              ) : (
                <input
                  id={id}
                  type="text"
                  value={value}
                  onChange={(event) => update(event.target.value)}
                  className="border-b border-border bg-transparent py-1.5 outline-none"
                />
              )}
              {field.kind === 'image' ? (
                <p className="text-xs text-text-secondary">
                  {COMPOSER_MESSAGES.mediaHint?.[locale]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.aside>
  );
};

export default ComposerPanel;
