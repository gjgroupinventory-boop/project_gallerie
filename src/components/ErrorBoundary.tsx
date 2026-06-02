import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.name}:`, error, errorInfo);
    
    const errorStr = String(error?.message || error).toLowerCase();
    const isChunkLoadFailed = errorStr.includes('failed to fetch dynamically imported module') || 
                              errorStr.includes('loading chunk') ||
                              errorStr.includes('dynamically imported');

    if (isChunkLoadFailed) {
      const now = Date.now();
      const lastReloadRaw = sessionStorage.getItem('artisflow-chunk-reload-timestamp');
      const lastReload = lastReloadRaw ? Number(lastReloadRaw) : 0;
      
      if (now - lastReload > 15000) {
        sessionStorage.setItem('artisflow-chunk-reload-timestamp', String(now));
        console.warn('Resilient reload: Chunk fetch failure detected. Refreshing app bundle...');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 rounded-3xl border border-red-200 m-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong in {this.props.name}</h2>
          <p className="text-sm font-mono bg-white/50 p-4 rounded-xl border border-red-100 overflow-auto whitespace-pre-wrap">
            {this.state.error?.toString()}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
