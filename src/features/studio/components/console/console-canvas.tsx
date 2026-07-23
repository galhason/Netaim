'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/config/locales';
import { CONSOLE_UI } from '../../constants/console';
import { CANVAS_SELECT_SOURCE } from './canvas-select-bridge';

/*
 * The canvas is the live site itself — the one Runtime, framed. No
 * screenshot, no re-implementation (Constitution v2 §1, §12). A manual
 * reload gives a fresh take after saving, and Director Mode lets the
 * whole Studio step aside: only the experience remains, until Esc.
 */
interface ConsoleCanvasProps {
  src: string;
  title: string;
  locale: Locale;
  /*
   * Direct on-canvas editing: a link template holding a {type} or {id}
   * token. When the preview reports a clicked scene, the workspace
   * navigates here — the click on the stage becomes the selection.
   */
  sceneLinkTemplate?: string;
}

const ConsoleCanvas = ({
  src,
  title,
  locale,
  sceneLinkTemplate,
}: ConsoleCanvasProps) => {
  const [take, setTake] = useState(0);
  const [director, setDirector] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!sceneLinkTemplate) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as {
        source?: string;
        sceneId?: string;
        sceneType?: string;
      } | null;
      if (!data || data.source !== CANVAS_SELECT_SOURCE) {
        return;
      }
      router.push(
        sceneLinkTemplate
          .replace('{type}', encodeURIComponent(data.sceneType ?? ''))
          .replace('{id}', encodeURIComponent(data.sceneId ?? '')),
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sceneLinkTemplate, router]);

  useEffect(() => {
    if (!director) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDirector(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [director]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-[var(--c-text-faint)]">
        <span>
          {sceneLinkTemplate
            ? CONSOLE_UI.canvasSelectHint[locale]
            : CONSOLE_UI.canvasNote[locale]}
        </span>
        <button
          type="button"
          onClick={() => setDirector(true)}
          className="ms-auto rounded-full border border-[var(--c-line-strong)] px-3 py-1.5 text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
        >
          {CONSOLE_UI.directorMode[locale]}
        </button>
        <button
          type="button"
          onClick={() => setTake((current) => current + 1)}
          className="rounded-full border border-[var(--c-line-strong)] px-3 py-1.5 text-[var(--c-text-soft)] transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-bronze)]"
        >
          {CONSOLE_UI.reload[locale]}
        </button>
      </div>
      <div
        className={
          director
            ? 'fixed inset-0 z-50 bg-[var(--c-void)]'
            : 'relative min-h-0 flex-1'
        }
      >
        <iframe
          key={take}
          src={src}
          title={title}
          className={
            director
              ? 'size-full'
              : 'size-full rounded-xl border border-[var(--c-line)] bg-[var(--c-deep)] shadow-[0_30px_90px_rgba(0,0,0,0.55)]'
          }
        />
        {director ? (
          <button
            type="button"
            onClick={() => setDirector(false)}
            className="fixed end-4 top-4 rounded-full border border-[var(--c-line-strong)] bg-[rgba(8,12,18,0.6)] px-4 py-2 text-xs tracking-wider text-[var(--c-text-soft)] backdrop-blur-sm transition-colors hover:border-[var(--c-bronze)]/50 hover:text-[var(--c-text)]"
          >
            {CONSOLE_UI.exitDirector[locale]}
          </button>
        ) : null}
        {director ? (
          <p className="pointer-events-none fixed bottom-5 start-1/2 -translate-x-1/2 text-[10px] tracking-[0.22em] text-[var(--c-text-faint)]">
            {CONSOLE_UI.directorHint[locale]}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ConsoleCanvas;
