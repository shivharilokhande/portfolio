import React from 'react';

/**
 * SafeCanvas — section-level error boundary for WebGL/Canvas components.
 *
 *   If the wrapped subtree throws (e.g. "Error creating WebGL context."
 *   on Brave Shields or browsers with WebGL disabled), we silently
 *   render the `fallback` instead of bringing down the whole page.
 */
type State = { error: Error | null };

export default class SafeCanvas extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(err: Error) {
    // eslint-disable-next-line no-console
    console.warn('[SafeCanvas] suppressed:', err.message);
  }
  render() {
    if (this.state.error) return <>{this.props.fallback ?? null}</>;
    return this.props.children;
  }
}

/** Synchronous detector: does this browser allow a WebGL context? */
export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
