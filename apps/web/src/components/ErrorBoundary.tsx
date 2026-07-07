import React from 'react';

/**
 * Top-level error boundary — Luminous Engine fallback. When any subtree
 * throws, we show a legible light-mode card with the error message.
 */
type State = { error: Error | null };

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[portfolio] render error caught at boundary:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen grid place-items-center px-4 surface text-ink">
        <div className="tier-3 ambient-float-lg max-w-lg w-full p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 text-red-700 grid place-items-center font-bold text-xl">!</div>
          <h2 className="mt-4 font-display text-xl tracking-tight">Something broke on render.</h2>
          <p className="mt-2 text-sm text-ink-soft">
            The page hit a runtime error before it could finish loading. The
            details are below — open the browser console for a full stack trace.
          </p>
          <pre className="mt-4 text-left text-[11px] leading-relaxed text-red-700 whitespace-pre-wrap break-words surface-low rounded-xl p-3 max-h-48 overflow-auto">
            {error.name}: {error.message}
          </pre>
          <button
            onClick={this.reset}
            className="btn-primary mt-6 mx-auto"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
