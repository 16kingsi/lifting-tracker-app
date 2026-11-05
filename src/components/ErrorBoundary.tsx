import { Component, type ReactNode } from 'react';

// If something on a screen fails, React would otherwise remove the whole page and
// leave a blank dark screen. This shows a way out instead. Logged sets are already
// saved, so reloading loses nothing.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen notice">
        <h1 className="notice__title">Something went wrong</h1>
        <p className="notice__text">Your logged sets are saved. Reloading should fix this.</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
