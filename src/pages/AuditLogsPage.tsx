
import React, { useState, useMemo } from 'react';
import { ActivityLog, Artwork, UserPermissions, ArtworkStatus } from '../types';
import { Search, Shield, Clock, User, Download, Layers, ChevronDown, X, CheckSquare, Square } from 'lucide-react';

interface AuditLogsPageProps {
  logs: ActivityLog[];
  artworks: Artwork[];
  onViewArtwork: (id: string) => void;
  onDeleteLogs?: (ids: string[]) => void;
  permissions?: UserPermissions;
}

interface LogGroup {
  id: string;
  type: 'single' | 'group';
  logs: ActivityLog[];
  action: string;
  user: string;
  timestamp: string;
  batchName?: string;
}

const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs, artworks, onViewArtwork, onDeleteLogs, permissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('All Users');
  const [selectedGroup, setSelectedGroup] = useState<LogGroup | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  const permittedArtworks = React.useMemo(() => {
    return artworks.filter(art => {
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
  }, [artworks, permissions]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map(log => log.user || 'Unknown User'));
    return ['All Users', ...Array.from(users).sort()];
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    // Permission Check
    const artId = log.artworkId;
    if (artId) {
      const art = artworks.find(a => a.id === artId);
      if (art) {
        // If artwork exists, check if it is permitted
        if (!permittedArtworks.some(pa => pa.id === artId)) {
          return false;
        }
      }
      // If artwork does not exist (deleted?), we skip permission check for now or assume visible
      // However, if we want to be strict, we could check log.artworkSnapshot
    }

    // Check snapshot if available and relevant (optional strict check)
    if (log.artworkSnapshot) {
      // Apply similar permission logic to snapshot if needed
      // For now, we rely on current artwork state if it exists
      const snap = log.artworkSnapshot;
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (snap.status === ArtworkStatus.RESERVED) {
        const isAuction = (snap.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (snap.remarks || '').includes('[Reserved For Event:');
        if (isAuction && !canViewAuctioned) return false;
        if (isEvent && !canViewExhibit) return false;
        if (!isAuction && !isEvent && !canViewReserved) return false;
      } else if (snap.status === ArtworkStatus.FOR_FRAMING && !canViewForFraming) return false;
      else if (snap.status === ArtworkStatus.FOR_RETOUCH && !canViewBackToArtist) return false;
    }

    const art = permittedArtworks.find(a => a.id === log.artworkId) || log.artworkSnapshot;
    const matchesSearch = (
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      art?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art?.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesUser = selectedUser === 'All Users' || log.user === selectedUser;

    return matchesSearch && matchesUser;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const groupedLogs = useMemo(() => {
    const groups: LogGroup[] = [];
    // Helper to get batch name from details
    const getBatchInfo = (log: ActivityLog) => {
      if (log.action === 'Bulk Imported') {
        const m = log.details?.match(/batch \((.*?)\)/);
        return m ? m[1] : null;
      }
      if (log.action === 'Import Merge') {
        const m = log.details?.match(/from (.*)$/);
        return m ? m[1] : null;
      }
      return null;
    };

    const TIME_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes window for grouping

    filteredLogs.forEach(log => {
      const batchName = getBatchInfo(log);

      // Try to find an existing recent group to absorb this log
      // Only for Bulk Imported or Import Merge
      if (batchName) {
        const existingGroup = groups.find(g =>
          g.type === 'group' &&
          g.action === log.action &&
          g.user === log.user &&
          g.batchName === batchName &&
          Math.abs(new Date(g.timestamp).getTime() - new Date(log.timestamp).getTime()) < TIME_THRESHOLD_MS
        );

        if (existingGroup) {
          existingGroup.logs.push(log);
          return;
        }
      }

      // If no existing group found, create new entry
      if (batchName) {
        groups.push({
          id: `group-${log.id}`,
          type: 'group',
          logs: [log],
          action: log.action,
          user: log.user,
          timestamp: log.timestamp,
          batchName
        });
      } else {
        groups.push({
          id: log.id,
          type: 'single',
          logs: [log],
          action: log.action,
          user: log.user,
          timestamp: log.timestamp
        });
      }
    });

    return groups;
  }, [filteredLogs]);

  const handleSelectAll = () => {
    if (selectedLogIds.size === filteredLogs.length) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const handleSelectLog = (id: string) => {
    const newSelected = new Set(selectedLogIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogIds(newSelected);
  };

  const handleSelectGroup = (group: LogGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedLogIds);
    const groupLogIds = group.logs.map(l => l.id);
    const allSelected = groupLogIds.every(id => newSelected.has(id));

    groupLogIds.forEach(id => {
      if (allSelected) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    });
    setSelectedLogIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (!onDeleteLogs || selectedLogIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedLogIds.size} logs? This action cannot be undone.`)) {
      onDeleteLogs(Array.from(selectedLogIds));
      setSelectedLogIds(new Set());
    }
  };

  const exportAuditLogs = () => {
    const headers = ['Timestamp', 'Authorized User', 'Action', 'Artwork Ref', 'Details'];
    const rows = filteredLogs.map(log => {
      const art = artworks.find(a => a.id === log.artworkId) || log.artworkSnapshot;
      const isSystem = log.artworkId === 'SYS';
      return [
        log.timestamp,
        `"${log.user.replace(/"/g, '""')}"`,
        log.action,
        art ? `${art.code || '?'}: ${art.title || 'Unknown'}` : (isSystem ? 'SYSTEM' : 'Reference Deleted'),
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-md w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-neutral-100 rounded-sm">
                  <Layers className="text-neutral-700" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-neutral-900">{selectedGroup.action} Details</h2>
                  <p className="text-sm text-neutral-500 font-medium">Batch: {selectedGroup.batchName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-neutral-200 rounded-sm transition-colors">
                <X size={20} className="text-neutral-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-neutral-50 border-b border-neutral-100">
                    <th className="px-6 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
                    <th className="px-6 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {selectedGroup.logs.map(log => {
                    const art = artworks.find(a => a.id === log.artworkId) || log.artworkSnapshot;
                    const displayArt = art || (log.artworkSnapshot ? {
                      id: log.artworkId,
                      title: log.artworkSnapshot.title || 'Unknown',
                      code: log.artworkSnapshot.code || 'UNKNOWN',
                      imageUrl: log.artworkSnapshot.imageUrl || 'https://placehold.co/150',
                    } : null);
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-3 text-xs text-neutral-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-3">
                          {displayArt ? (
                            <div className="flex items-center space-x-3">
                              <img src={displayArt.imageUrl} className="w-8 h-8 rounded-md object-cover" />
                              <div>
                                <p className="text-sm font-bold text-neutral-900">{displayArt.title}</p>
                                <p className="text-[10px] text-neutral-500">{displayArt.code}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400">Reference Deleted</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-neutral-500">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
              <button onClick={() => setSelectedGroup(null)} className="px-6 py-2 bg-neutral-900 text-white rounded-md text-sm font-bold hover:bg-black transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-md shadow-sm relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-4 bottom-0 text-[6rem] font-serif italic font-normal text-white/[0.03] select-none pointer-events-none leading-none -mb-4">
          AUDIT
        </div>
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.25em] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>System Ledger</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight leading-tight">
            System <span className="font-serif italic text-white font-medium">Audit Ledger</span>
          </h1>
          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
            Immutable record of all user activities and inventory state changes.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1 md:flex-none">
            <div className="relative flex-1 md:flex-none md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search by action or art code..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-500/20 outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative flex-1 md:flex-none md:w-64">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-500/20 outline-none shadow-sm appearance-none font-medium text-neutral-700 cursor-pointer"
              >
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={16} />
            </div>
          </div>

          <button
            onClick={exportAuditLogs}
            className="flex items-center space-x-2 bg-white border border-neutral-200 text-neutral-700 px-6 py-2.5 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm font-bold group transform hover:-translate-y-0.5"
          >
            <Download size={18} className="group-hover:scale-110 transition-transform" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      {selectedLogIds.size > 0 && onDeleteLogs && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg text-neutral-900 pl-6 pr-4 py-3 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-5 z-40 animate-in slide-in-from-bottom-8 fade-in duration-300 border border-neutral-200/60 max-w-[90vw]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Selection</span>
            <span className="font-bold text-base leading-none">{selectedLogIds.size} Logs</span>
          </div>
          <div className="h-7 w-px bg-neutral-200/60 mx-1"></div>
          <button
            onClick={handleDeleteSelected}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-6 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <span>Delete Selected</span>
          </button>
          <button
            onClick={() => setSelectedLogIds(new Set())}
            className="p-1.5 hover:bg-neutral-100 rounded-sm text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
        <div className="">
          <table className="w-full text-left border-collapse min-w-[1000px]">
             <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="px-4 py-2.5 w-12">
                  <button onClick={handleSelectAll} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                    {selectedLogIds.size > 0 && selectedLogIds.size === filteredLogs.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Authorized User</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Action Executed</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork Reference</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {groupedLogs.map((group) => {
                if (group.type === 'group' && group.logs.length > 1) {
                  return (
                     <tr key={group.id} className="hover:bg-neutral-50 transition-colors group cursor-pointer bg-neutral-50/50" onClick={() => setSelectedGroup(group)}>
                      <td className="px-4 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleSelectGroup(group, e)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                          {group.logs.every(l => selectedLogIds.has(l.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-neutral-500">
                          <Clock size={14} className="opacity-50" />
                          <span className="text-xs font-medium">
                            {new Date(group.timestamp).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-sm bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-black text-neutral-600">
                            {(group.user || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-neutral-700">{group.user || 'Unknown User'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-tighter border flex items-center gap-1 w-fit ${group.action.includes('Import') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}>
                          <Layers size={10} />
                          {group.action} Group
                        </span>
                      </td>
                      <td className="px-4 py-1.5">
                        <span className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                          {group.logs.length} items processed
                        </span>
                      </td>
                      <td className="px-4 py-1.5">
                        <div className="flex items-center justify-between group-hover:text-indigo-600 transition-colors">
                          <p className="text-xs text-neutral-500 font-medium break-words max-w-lg xl:max-w-2xl">
                            Batch: {group.batchName}
                          </p>
                          <ChevronDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                        </div>
                      </td>
                    </tr>
                  );
                }

                const log = group.logs[0];
                const liveArt = artworks.find(a => a.id === log.artworkId);
                const snapshot = log.artworkSnapshot;
                const displayArt = liveArt || (snapshot ? {
                  id: log.artworkId,
                  title: snapshot.title || 'Unknown Title',
                  code: snapshot.code || 'UNKNOWN',
                  imageUrl: snapshot.imageUrl || 'https://via.placeholder.com/150',
                } : null);

                const isSystemLog = log.artworkId === 'SYS';

                return (
                   <tr key={log.id} className="hover:bg-neutral-50 transition-colors group">
                    <td className="px-4 py-1.5">
                      <button onClick={() => handleSelectLog(log.id)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                        {selectedLogIds.has(log.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-neutral-500">
                        <Clock size={14} className="opacity-50" />
                        <span className="text-xs font-medium">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <div
                        className="flex items-center space-x-2 cursor-pointer hover:bg-neutral-100 p-1.5 -ml-1.5 rounded-sm transition-colors group/user"
                        onClick={() => setSearchTerm(log.user || '')}
                        title="Filter by this user"
                      >
                        <div className="w-6 h-6 rounded-sm bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] font-black text-neutral-600 group-hover/user:bg-neutral-200 transition-colors">
                          {(log.user || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-neutral-700 group-hover/user:text-neutral-900 transition-colors">{log.user || 'Unknown User'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-tighter border cursor-pointer hover:shadow-sm transition-all hover:scale-105 active:scale-95 inline-block ${log.action.includes('Sale') ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' :
                            log.action.includes('Transferred') ? 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50' :
                              log.action.includes('Created') ? 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200' :
                                log.action.includes('Cancelled') ? 'bg-neutral-50 text-neutral-400 border-neutral-100 hover:bg-neutral-100 line-through decoration-neutral-400' :
                                  'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        onClick={() => setSearchTerm(log.action)}
                        title="Filter by this action"
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      {displayArt ? (
                        <div
                          className="flex items-center space-x-2 cursor-pointer hover:bg-neutral-100 p-1.5 -ml-1.5 rounded-sm transition-colors group/art"
                          onClick={() => liveArt ? onViewArtwork(liveArt.id) : null}
                          title={liveArt ? "View artwork details" : "Artwork no longer in inventory (Historical Record)"}
                        >
                          <img src={displayArt.imageUrl} className={`w-6 h-6 rounded-sm object-cover shadow-sm transition-all ${liveArt ? 'group-hover/art:ring-2 ring-neutral-300' : 'opacity-50 grayscale'}`} alt="" />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate transition-colors ${liveArt ? 'text-neutral-900 group-hover/art:text-neutral-900' : 'text-neutral-500 italic'}`}>{displayArt.title}</p>
                            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{displayArt.code}</p>
                          </div>
                        </div>
                      ) : isSystemLog ? (
                        <span className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                          <Shield size={12} />
                          SYSTEM
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Reference Deleted</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5">
                      <p className="text-xs text-neutral-600 leading-relaxed break-words max-w-lg xl:max-w-2xl" title={log.details}>
                        {log.details || '—'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-sm flex items-center justify-center text-neutral-200 mb-4 border border-neutral-100">
              <Shield size={32} />
            </div>
            <p className="text-neutral-400 font-bold text-sm">No activity logs match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
