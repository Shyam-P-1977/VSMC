import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 m-4">
          <div className="max-w-md text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {this.state.error?.message || "An unexpected error occurred while rendering this component."}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-900 text-white text-sm font-semibold hover:bg-teal-800 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Screen
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Home className="w-4 h-4" />
                Back to Safety
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
