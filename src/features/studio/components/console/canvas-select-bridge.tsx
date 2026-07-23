'use client';

import { useEffect } from 'react';

/*
 * The canvas half of direct on-canvas editing: inside the preview
 * iframe, a click on any scene becomes a message to the workspace —
 * which opens that scene in the inspector. Links inside the preview
 * stop navigating (the canvas is a stage, not a browser); Ctrl/⌘-click
 * keeps the real navigation for whoever needs it.
 */
export const CANVAS_SELECT_SOURCE = 'hason-canvas-select';

const HOVER_STYLE = `
[data-scene-type] { cursor: default; }
[data-scene-type]:hover {
  outline: 1px dashed rgba(201, 169, 110, 0.55);
  outline-offset: -1px;
}
`;

const CanvasSelectBridge = () => {
  useEffect(() => {
    if (window.parent === window) {
      return;
    }
    const style = document.createElement('style');
    style.textContent = HOVER_STYLE;
    document.head.appendChild(style);

    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const scene = target?.closest('[data-scene-type]');
      if (!scene) {
        return;
      }
      if (target?.closest('a')) {
        event.preventDefault();
      }
      window.parent.postMessage(
        {
          source: CANVAS_SELECT_SOURCE,
          sceneId: scene.getAttribute('data-scene-id') ?? '',
          sceneType: scene.getAttribute('data-scene-type') ?? '',
        },
        window.location.origin,
      );
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      style.remove();
    };
  }, []);

  return null;
};

export default CanvasSelectBridge;
