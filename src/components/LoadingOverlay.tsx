import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, FileSpreadsheet, Database, Gavel, Image as ImageIcon, Plus, RefreshCw, X, File, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { Artwork, ImportFailedItem } from '../types';

interface LoadingOverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  progress?: {
    current: number;
    total: number;
  };
  skippedItems?: string[];
  summary?: {
    created: Artwork[];
    updated: Artwork[];
    failed: ImportFailedItem[];
  };
  onClose?: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, title = 'Processing Workflow', message, progress, skippedItems = [], summary, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'created' | 'updated' | 'failed'>('created');
  const [displayPercentage, setDisplayPercentage] = React.useState(0);
  const [displayCurrent, setDisplayCurrent] = React.useState(0);

  // High-performance catch-up animation
  React.useEffect(() => {
    if (progress && progress.total > 0) {
      const targetPercentage = Math.round((progress.current / progress.total) * 100);
      const targetCurrent = progress.current;

      let animationFrame: number;
      const animate = () => {
        let changed = false;
        
        setDisplayPercentage(prev => {
          if (prev < targetPercentage) {
            changed = true;
            const diff = targetPercentage - prev;
            const step = Math.max(1, Math.ceil(diff / 4)); 
            return Math.min(prev + step, targetPercentage);
          }
          if (prev > targetPercentage) {
            changed = true;
            return targetPercentage;
          }
          return prev;
        });

        setDisplayCurrent(prev => {
          if (prev < targetCurrent) {
            changed = true;
            const diff = targetCurrent - prev;
            const step = Math.max(1, Math.ceil(diff / 3)); 
            return Math.min(prev + step, targetCurrent);
          }
          if (prev > targetCurrent) {
            changed = true;
            return targetCurrent;
          }
          return prev;
        });

        if (changed) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    } else if (!progress) {
      setDisplayPercentage(0);
      setDisplayCurrent(0);
    }
  }, [progress]);

  if (!isVisible && !summary) return null;

  // Render Summary View if summary exists
  if (summary) {
    const { created, updated, failed } = summary;

    return createPortal(
      <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4 transition-all duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden border border-white/20">

          {/* Summary Header */}
          <div className="p-8 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">Sync Complete</h3>
              <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Database reconciliation summary</p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-neutral-100 rounded-xl transition-all group"
            >
              <X className="w-6 h-6 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                   <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Plus size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-emerald-900">{created.length}</h4>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">New Assets Created</p>
                </div>
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                   <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <RefreshCw size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-amber-900">{updated.length}</h4>
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Records Synchronized</p>
                </div>
                <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 space-y-2">
                   <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                      <ShieldAlert size={20} strokeWidth={2.5} />
                   </div>
                   <h4 className="text-2xl font-black text-rose-900">{failed.length}</h4>
                   <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Synchronization Failures</p>
                </div>
             </div>
             
             <div className="space-y-4">
                <h5 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] border-b border-neutral-100 pb-2">Recent Transformations</h5>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                   {[...created, ...updated].slice(0, 50).map((art, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 hover:bg-neutral-50 rounded-xl transition-all border border-transparent hover:border-neutral-100">
                         <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                            {art.imageUrl && <img src={art.imageUrl} className="w-full h-full object-cover" alt="" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{art.title}</p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{art.code} • {art.artist}</p>
                         </div>
                         <div className="px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200">
                            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-tighter">Verified</span>
                         </div>
                      </div>
                   ))}
                   {failed.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                         <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                            <X size={16} />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-rose-900 truncate">Failed Row {f.rowNumber}</p>
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider truncate">{f.reason}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-6 border-t border-neutral-100 bg-white flex justify-end">
            <button
              onClick={onClose}
              className="bg-neutral-900 text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Acknowledge Sync Result
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-md p-10 shadow-2xl border border-neutral-200 flex flex-col items-center gap-8 transform animate-in zoom-in-95 duration-300">
        
        {/* Brand Logo Header */}
        <div className="text-center space-y-1">
          <h4 className="text-xl font-serif italic text-neutral-900 tracking-tighter">Galerie Joaquin</h4>
          <p className="text-[8px] text-neutral-500 font-black uppercase tracking-[0.3em]">Inventory System</p>
        </div>

        {/* Enterprise Shield / Sync Indicator */}
        <div className="relative">
          <div className="w-16 h-16 bg-neutral-900 rounded-sm flex items-center justify-center text-white shadow-lg relative overflow-hidden group">
            <ShieldAlert size={28} className="text-white relative z-10 animate-[pulse_2s_infinite]" />
          </div>
          {displayPercentage === 100 && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow border border-white">
              <CheckCircle2 size={11} strokeWidth={3} className="animate-in zoom-in duration-300" />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-base font-bold text-neutral-900 tracking-tight">{title}</h3>
          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.25em] leading-relaxed max-w-[260px] mx-auto">
            {message || (displayPercentage <= 30 ? "Initializing workspace sequence..." :
             displayPercentage <= 60 ? "Synchronizing batch assets..." :
             displayPercentage <= 90 ? "Finalizing transaction manifests..." :
             "Transaction verified. Completing...")}
          </p>
        </div>

        {/* Sharp Progress Bar */}
        <div className="w-full space-y-4">
          <div className="h-1.5 w-full bg-neutral-100 rounded-none overflow-hidden border border-neutral-200 p-0">
            <div 
              className="h-full bg-neutral-900 transition-all duration-700 ease-out rounded-none relative"
              style={{ width: `${displayPercentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
            </div>
          </div>
          
          <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-1.5">
                <Loader2 size={11} className="text-neutral-900 animate-spin" />
                <span className="text-[9px] font-black text-neutral-900 tracking-[0.2em]">{displayPercentage}% {displayPercentage === 100 ? 'COMPLETE' : 'SYNCHRONIZING'}</span>
             </div>
             <div className="flex gap-1">
               {[30, 60, 90].map(step => (
                 <div key={step} className={`w-1.5 h-1.5 rounded-none transition-all duration-500 ${displayPercentage >= step ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
               ))}
             </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default LoadingOverlay;
