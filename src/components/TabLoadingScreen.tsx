import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface TabLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const TabLoadingScreen: React.FC<TabLoadingScreenProps> = ({ 
  message = "Loading Module", 
  subMessage = "Synchronizing operational database"
}) => {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 relative overflow-hidden animate-in fade-in duration-500">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-neutral-900/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-[#2563eb]/5 rounded-full blur-[60px] pointer-events-none animate-pulse" />
      
      {/* Premium Glassmorphic Card Container */}
      <div className="bg-white/60 backdrop-blur-md border border-neutral-100/80 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_12px_40px_rgba(0,0,0,0.04)] ring-1 ring-black/5 relative z-10 flex flex-col items-center">
        
        {/* Dynamic Micro-animated Spinner */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-[3px] border-neutral-100 flex items-center justify-center" />
          <Loader2 
            size={36} 
            className="text-neutral-900 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
          />
          <div className="absolute -top-1 -right-1 bg-amber-500/10 text-amber-600 p-1 rounded-full animate-bounce duration-1000">
            <Sparkles size={12} />
          </div>
        </div>

        {/* Branding Elements */}
        <h3 className="text-xl font-serif italic text-neutral-900 tracking-tight mb-1">
          Galerie Joaquin
        </h3>
        
        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.3em] mb-4">
          Art Management System
        </p>

        {/* Informative Progress Text */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-neutral-800 tracking-tight animate-pulse">
            {message}...
          </p>
          <p className="text-[10px] text-neutral-400 font-semibold tracking-wide">
            {subMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TabLoadingScreen;
