'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createLogger } from '@/shared';

const log = createLogger('experience-engine');

interface SceneErrorBoundaryProps {
  sceneId: string;
  sceneType: string;
  fallback: ReactNode;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  failed: boolean;
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('Scene rendering failed', {
      sceneId: this.props.sceneId,
      sceneType: this.props.sceneType,
      error: error.message,
      componentStack: info.componentStack ?? '',
    });
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
