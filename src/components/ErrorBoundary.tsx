import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isChunkLoadFailed?: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, isChunkLoadFailed: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorStr = String(error?.message || error).toLowerCase();
    const isChunkLoadFailed = errorStr.includes('failed to fetch dynamically imported module') || 
                              errorStr.includes('loading chunk') ||
                              errorStr.includes('dynamically imported');
    return { hasError: true, error, isChunkLoadFailed };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.name}:`, error, errorInfo);
    
    if (this.state.isChunkLoadFailed) {
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
      if (this.state.isChunkLoadFailed) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-neutral-200/80 m-4 shadow-sm">
            <div className="relative w-12 h-12 mb-5">
              <div className="absolute inset-0 rounded-full border-2 border-neutral-100"></div>
              <div className="absolute inset-0 rounded-full border-2 border-t-neutral-900 animate-spin"></div>
            </div>
            <h3 className="text-xs font-black text-neutral-800 uppercase tracking-widest mb-1">
              Synchronizing Workspace
            </h3>
            <p className="text-[11px] text-neutral-400 font-bold tracking-tight text-center max-w-xs leading-normal">
              Loading updated workspace components. Please wait a brief moment...
            </p>
          </div>
        );
      }

      return (
        <div className="p-8 bg-red-50 text-red-900 rounded-3xl border border-red-200 m-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong in {this.props.name}</h2>
          <p className="text-sm font-mono bg-white/50 p-4 rounded-xl border border-red-100 overflow-auto whitespace-pre-wrap">
            {this.state.error?.toString()}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, isChunkLoadFailed: false })}
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
