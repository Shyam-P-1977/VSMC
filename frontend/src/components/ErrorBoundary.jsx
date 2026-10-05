import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button, Card } from './ui';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center shadow-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/50">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-red-700 dark:text-red-400">Something went wrong</h2>
            <p className="mb-6 text-sm text-red-600/80 dark:text-red-400/80">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700 text-white border-none">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
