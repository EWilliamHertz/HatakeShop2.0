import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    const msg = error?.message || String(error);
    const isChunkError =
      msg.includes('is not a valid JavaScript MIME type') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('error loading dynamically imported module');

    if (isChunkError) {
      const storageKey = 'chunk_reload_guard';
      const now = Date.now();
      const lastReload = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
      if (now - lastReload > 10000) {
        sessionStorage.setItem(storageKey, String(now));
        window.location.reload();
        return;
      }
    }
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error);
      const isChunkError =
        msg.includes('is not a valid JavaScript MIME type') ||
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk');

      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl w-full">
            <h1 className="text-2xl font-bold mb-4 text-rose-500">
              {isChunkError ? 'New Update Available' : 'Something went wrong.'}
            </h1>
            <p className="text-slate-400 text-sm mb-4">
              {isChunkError
                ? 'A new version of Hatake.Shop was deployed. Please reload the page to load the latest components.'
                : 'An unexpected application error occurred.'}
            </p>
            {!isChunkError && (
              <pre className="text-sm bg-slate-950 p-4 rounded overflow-auto border border-slate-800 text-rose-400">
                {this.state.error && this.state.error.toString()}
                {'\n'}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
