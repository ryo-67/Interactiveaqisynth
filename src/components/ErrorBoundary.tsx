// ErrorBoundary (2026-10-12) — what stands between one thrown error and a blank page. Without it any throw in a render or an effect unmounted everything and left the page's dark background (BUG-59 was one); with it the page is replaced by the Fallback screen, which says so and offers a reload.
// A class, the one in the codebase: React has no hook for catching a render error, only getDerivedStateFromError and componentDidCatch. It catches what React can (render, effects, lifecycles), not event handlers or promises, which fail on their own without unmounting anything.
import React from "react";

export class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error("[App] The page stopped:", error, info.componentStack);
  }

  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
