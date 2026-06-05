import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkLoadFailed?: boolean;
}

class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
    isChunkLoadFailed: false
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    const errorStr = String(error?.message || error).toLowerCase();
    const isChunkLoadFailed = errorStr.includes('failed to fetch dynamically imported module') || 
                              errorStr.includes('loading chunk') ||
                              errorStr.includes('dynamically imported');
    return { hasError: true, error, isChunkLoadFailed };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
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

  private handleReset = () => {
    try {
      // Clear most likely causes of persistent crashes
      localStorage.clear();
      sessionStorage.clear();
      
      // Attempt to clear IndexedDB if possible (Supabase/Firestore)
      if (window.indexedDB && window.indexedDB.databases) {
        window.indexedDB.databases().then(dbs => {
          dbs.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        }).finally(() => {
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } catch (e) {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.state.isChunkLoadFailed) {
        return (
          <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center p-6 z-[9999]">
            <div className="text-center space-y-6 max-w-sm px-6 animate-in fade-in duration-300">
              <div className="relative w-16 h-16 mx-auto">
                {/* Modern premium spinner */}
                <div className="absolute inset-0 rounded-full border-[3px] border-neutral-800"></div>
                <div className="absolute inset-0 rounded-full border-[3px] border-t-white animate-spin"></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                  Synchronizing Workspace
                </h2>
                <p className="text-neutral-400 text-xs font-semibold leading-relaxed">
                  A new secure workspace update is ready. Downloading updated components...
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="fixed inset-0 bg-neutral-50 flex items-center justify-center p-6 z-[9999]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 border border-neutral-100 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-rose-500 shadow-sm">
              <AlertCircle size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-neutral-900 mb-4 tracking-tight leading-tight">
              Oops! Something went wrong.
            </h2>
            
            <p className="text-neutral-500 mb-8 text-sm font-medium leading-relaxed px-4">
              The application encountered an unexpected error. This usually happens due to a synchronization delay or a temporary connection issue.
            </p>

            <div className="bg-neutral-50 rounded-2xl p-4 mb-8 text-left border border-neutral-100 overflow-hidden">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Diagnostic Info</p>
               <p className="text-[11px] font-mono text-neutral-600 truncate">
                 {this.state.error?.message || 'Unknown Runtime Error'}
               </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-4 bg-neutral-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-900/10 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Try Refresh
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-4 bg-white text-neutral-600 border border-neutral-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Reset & Fix
              </button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-neutral-100">
                <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-widest">Artisflow Secure Recovery Protocol</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
