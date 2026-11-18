import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Something interrupted MediMitra
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We safely paused this view to protect your session. Please reload to continue.
            </p>
            <div className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs font-mono text-slate-700 dark:text-slate-300 break-words max-h-40 overflow-auto">
              {this.state.errorMessage}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload MediMitra
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
