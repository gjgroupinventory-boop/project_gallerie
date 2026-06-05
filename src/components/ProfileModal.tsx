
import React from 'react';
import { UserAccount, ActivityLog, UserRole, Artwork, UserPermissions, ArtworkStatus } from '../types';
import { X, Mail, Shield, Clock, Award, Briefcase, Activity } from 'lucide-react';
import { useMemo } from 'react';

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

const ProfileModal: React.FC<ProfileModalProps> = ({ user, logs, artworks, permissions, salesCount, inventoryCount, onClose, onClearCache }) => {
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (!log.artworkId) return true; // System logs or non-artwork logs are visible
      
      const art = artworks.find(a => a.id === log.artworkId);
      if (!art) return true; // If artwork is deleted, we show the log (or maybe false? defaulting to true for now)

      // View Control Permissions
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (art.status === ArtworkStatus.RESERVED) {
        const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (art.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (art.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }

      return true;
    });
  }, [logs, artworks, permissions]);

  const imageDiagnostics = useMemo(() => {
    const offenders = artworks
      .filter(art => typeof art.imageUrl === 'string' && art.imageUrl.length > 0)
      .map(art => {
        const src = art.imageUrl || '';
        const isBase64 = src.startsWith('data:image');
        const approxBytes = isBase64
          ? Math.max(0, Math.floor((src.length - (src.indexOf(',') + 1)) * 0.75))
          : src.length;

        return {
          id: art.id,
          title: art.title,
          code: art.code,
          currentBranch: art.currentBranch,
          sourceType: isBase64 ? 'Base64' : 'URL',
          approxBytes
        };
      })
      .sort((a, b) => b.approxBytes - a.approxBytes);

    const base64Count = offenders.filter(item => item.sourceType === 'Base64').length;
    const totalApproxBytes = offenders.reduce((sum, item) => sum + item.approxBytes, 0);

    return {
      totalWithImages: offenders.length,
      base64Count,
      totalApproxBytes,
      topOffenders: offenders.slice(0, 5)
    };
  }, [artworks]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-none border border-neutral-250 shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
        
        {/* Banner with professional pattern background */}
        <div className="relative h-28 bg-neutral-950 overflow-hidden border-b border-neutral-200">
          <div className="absolute inset-0 opacity-15">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-neutral-500 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-neutral-400 rounded-full blur-3xl" />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-none border border-white/10 transition-all hover:scale-105 active:scale-95"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-8 pb-8 relative">
          {/* Avatar Monogram - Sharp square shape */}
          <div className="absolute -top-10 left-8 w-20 h-20 bg-white rounded-none p-1 shadow-md border border-neutral-200">
            <div className="w-full h-full bg-neutral-950 rounded-none flex items-center justify-center text-2xl font-black text-white tracking-tight">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          {/* User Details & Action Header */}
          <div className="pt-14 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-neutral-950 tracking-tight leading-none uppercase">{user.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center space-x-1.5 text-neutral-500 font-medium">
                  <Mail size={13} className="opacity-60" />
                  <span>{user.email}</span>
                </div>
                <span className="hidden md:inline text-neutral-300">|</span>
                <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 text-neutral-800 text-[10px] font-black uppercase tracking-wider border border-neutral-200 rounded-none">
                  {user.role}
                </span>
              </div>
            </div>
            
            {/* Troubleshooting Button */}
            <div>
              <button
                onClick={() => {
                  if (window.confirm("This will clear local data and refresh the page. Use this if you are experiencing sync issues. Continue?")) {
                    onClearCache();
                  }
                }}
                className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 text-neutral-800 text-[10px] font-black uppercase tracking-widest rounded-none border border-neutral-200 transition-all active:scale-98 flex items-center gap-2"
              >
                <Activity size={12} className="text-neutral-500" />
                Reset Local Data
              </button>
            </div>
          </div>

          {/* Stat Cards - Square Layout with Aspect Ratio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <StatCard 
              label="Session ID" 
              value={user.id.toUpperCase()} 
              icon={<Shield size={16}/>} 
              color="text-neutral-950" 
            />
            {user.role === UserRole.BRANCH_USER || user.role === UserRole.ADMIN ? (
              <StatCard 
                label="Sales Closed" 
                value={salesCount} 
                icon={<Award size={16}/>} 
                color="text-neutral-700" 
              />
            ) : (
              <StatCard 
                label="Art Registered" 
                value={inventoryCount} 
                icon={<Briefcase size={16}/>} 
                color="text-neutral-700" 
              />
            )}
            <StatCard 
              label="System Logs" 
              value={logs.length} 
              icon={<Activity size={16}/>} 
              color="text-neutral-700" 
            />
          </div>

          {/* Recent Authorized Activity */}
          <div className="mt-8 space-y-3">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] flex items-center">
              <Clock size={12} className="mr-2 text-neutral-400" /> Recent Authorized Activity
            </h3>
            <div className="bg-neutral-50 border border-neutral-200 rounded-none">
              <div className="max-h-40 overflow-y-auto divide-y divide-neutral-200 scrollbar-thin">
                {filteredLogs.length > 0 ? filteredLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                    <div>
                      <p className="text-xs font-bold text-neutral-950">{log.action}</p>
                      <p className="text-[10px] text-neutral-500 font-medium mt-0.5">{log.details || 'System event'}</p>
                    </div>
                    <time className="text-[9px] font-bold text-neutral-400">{new Date(log.timestamp).toLocaleDateString()}</time>
                  </div>
                )) : (
                  <div className="p-6 text-center">
                    <p className="text-xs font-medium text-neutral-400 italic">No activity logs recorded for this session.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Load Diagnostics */}
          <div className="mt-8 space-y-3">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] flex items-center">
              <Activity size={12} className="mr-2 text-neutral-400" /> Image Load Diagnostics
            </h3>

            <div className="bg-neutral-50 border border-neutral-200 rounded-none p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniStat label="With Images" value={imageDiagnostics.totalWithImages} />
                <MiniStat label="Base64 Sources" value={imageDiagnostics.base64Count} />
                <MiniStat label="Approx Payload" value={formatBytes(imageDiagnostics.totalApproxBytes)} />
              </div>

              {imageDiagnostics.topOffenders.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {imageDiagnostics.topOffenders.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 rounded-none bg-white border border-neutral-200 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-950 truncate uppercase">{item.title}</p>
                        <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">
                          {item.code || 'No Code'} {item.currentBranch ? `• ${item.currentBranch}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-neutral-950">{formatBytes(item.approxBytes)}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">{item.sourceType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-medium text-neutral-400 italic">No loaded image records to inspect.</p>
              )}
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-8 pt-6 border-t border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[9px] font-bold text-neutral-400 uppercase tracking-[0.15em]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted Personnel Connection</span>
            </div>
            <button className="text-[10px] font-black text-neutral-500 hover:text-neutral-950 transition-colors uppercase tracking-widest">
              Security Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => {
  const isSessionId = label.toLowerCase().includes('session');
  return (
    <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-none flex flex-col justify-between aspect-square hover:bg-neutral-100 hover:border-neutral-300 transition-all select-none group">
      <div className={`p-2 bg-white border border-neutral-200 shadow-sm w-fit rounded-none transition-transform group-hover:scale-105 ${color}`}>
        {icon}
      </div>
      <div className="mt-4 flex-1 flex flex-col justify-end">
        <p className={`font-black text-neutral-950 leading-tight ${isSessionId ? 'break-all text-[9.5px] font-mono leading-normal select-all' : 'text-3xl'}`}>
          {value}
        </p>
        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1.5">{label}</p>
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-none bg-white border border-neutral-200 px-3 py-2">
    <p className="text-base font-black text-neutral-950 leading-tight">{value}</p>
    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{label}</p>
  </div>
);

export default ProfileModal;
