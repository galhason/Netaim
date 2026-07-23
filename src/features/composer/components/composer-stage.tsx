'use client';

import { useEffect, useRef } from 'react';
import {
  getTextDirection,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type Locale,
} from '@/config/locales';
import { ExperienceRenderer, type SceneData } from '@/experience-engine';
import type { ComposerAction, ComposerDevice } from '../types/composer';
import { DEVICE_LABELS, DEVICE_WIDTHS } from '../constants/messages';

const DEVICES: ComposerDevice[] = ['desktop', 'tablet', 'mobile'];

interface ComposerStageProps {
  scenes: SceneData[];
  eventSlug: string;
  locale: Locale;
  device: ComposerDevice;
  selectedSceneId: string | null;
  dispatch: (action: ComposerAction) => void;
}

const ComposerStage = ({
  scenes,
  eventSlug,
  locale,
  device,
  selectedSceneId,
  dispatch,
}: ComposerStageProps) => {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedSceneId || !frameRef.current) {
      return;
    }
    const target = frameRef.current.querySelector(
      `[id="${selectedSceneId}"]`,
    );
    target?.scrollIntoView({ block: 'start' });
  }, [selectedSceneId]);

  const width = DEVICE_WIDTHS[device];

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {DEVICES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => dispatch({ type: 'setDevice', device: entry })}
              aria-pressed={entry === device}
              className={`min-h-8 ${
                entry === device
                  ? 'font-medium text-accent'
                  : 'opacity-70 transition-opacity hover:opacity-100'
              }`}
            >
              {DEVICE_LABELS[entry][locale]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {SUPPORTED_LOCALES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => dispatch({ type: 'setLocale', locale: entry })}
              aria-pressed={entry === locale}
              className={`min-h-8 ${
                entry === locale
                  ? 'font-medium text-accent'
                  : 'opacity-70 transition-opacity hover:opacity-100'
              }`}
            >
              {LOCALE_LABELS[entry]}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface-raised elevation-soft">
        <div className="h-full overflow-y-auto" ref={frameRef}>
          <div
            dir={getTextDirection(locale)}
            lang={locale}
            className="mx-auto min-h-full bg-surface"
            style={width ? { maxWidth: width } : undefined}
          >
            <ExperienceRenderer
              scenes={scenes}
              context={{ locale, eventSlug }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposerStage;
