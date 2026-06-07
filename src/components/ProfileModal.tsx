import React, { useMemo } from 'react';
import { UserAccount, ActivityLog, UserRole, Artwork, UserPermissions } from '../types';
import { X, Mail, Shield, Award, Briefcase, Activity, CheckCircle } from 'lucide-react';

interface ProfileModalProps {
  user: UserAccount;
  logs: ActivityLog[];
  artworks: Artwork[];
  permissions: UserPermissions;
  salesCount: number;
  inventoryCount: number;
  onClose: () => void;
  onClearCache: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
  user, 
  logs, 
  artworks, 
  salesCount, 
  inventoryCount, 
  onClose, 
  onClearCache 
}) => {
  // Branch statistics & valuation insights
  const branchArtworks = useMemo(() => {
    const userBranch = user.branch || 'Main Gallery';
    return artworks.filter(a => 
      userBranch === 'All' || userBranch === 'Main' || !a.currentBranch || a.currentBranch.toLowerCase() === userBranch.toLowerCase()
    );
  }, [artworks, user]);

  const totalManagedValue = useMemo(() => {
    return branchArtworks.reduce((sum, a) => sum + (a.price || 0), 0);
  }, [branchArtworks]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-[0_24px_64px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-neutral-950 rounded-lg flex items-center justify-center text-sm font-black text-white">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none">{user.name || user.fullName}</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* User Basic Info */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 py-1.5 border-b border-slate-100">
              <span className="font-bold flex items-center gap-1.5"><Mail size={12} className="opacity-60" /> Email</span>
              <span className="font-black text-slate-700">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500 py-1.5 border-b border-slate-100">
              <span className="font-bold flex items-center gap-1.5">📍 Branch</span>
              <span className="font-black text-slate-700">{user.branch || 'Main Gallery'}</span>
            </div>
          </div>

          {/* Stats & Analysis Section */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stats & Analysis</h3>
            
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Briefcase size={12} className="text-slate-400" /> Branch Inventory</span>
                <span className="font-black text-slate-800">{branchArtworks.length} pieces</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-500 flex items-center gap-1.5">₱ Branch Valuation</span>
                <span className="font-black text-emerald-600">{formatCurrency(totalManagedValue)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Award size={12} className="text-slate-400" /> Sales Closed</span>
                <span className="font-black text-slate-800">{salesCount} deals</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-500 flex items-center gap-1.5">🎨 Art Registered</span>
                <span className="font-black text-slate-800">{inventoryCount} pieces</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Activity size={12} className="text-slate-400" /> Authorized Action Logs</span>
                <span className="font-black text-slate-800">{logs.length} entries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-end">
          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
            Artflow Ledger v1
          </span>
        </div>

      </div>
    </div>
  );
};

export default ProfileModal;
