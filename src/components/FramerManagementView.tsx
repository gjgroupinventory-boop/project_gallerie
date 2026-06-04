import React, { useState, useMemo } from 'react';
import { FramerRecord, Artwork, UserPermissions, ArtworkStatus } from '../types';
import {
  X,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Wrench,
  MapPin,
  Archive,
  ArrowRight,
  Calendar,
  AlertTriangle,
  Upload,
  Info,
  Building2,
  RotateCcw
} from 'lucide-react';

interface FramerManagementViewProps {
  framerRecords: FramerRecord[];
  artworks: Artwork[];
  branches: string[];
  onReturnFromFramer?: (id: string, branch: string) => void;
  onTransfer?: (ids: string[], targetBranch: string, attachments?: { itdrUrl?: string | string[] }) => void;
  onViewArtwork?: (id: string) => void;
  onDeleteFramerRecord?: (id: string) => void;
  permissions?: UserPermissions;
}

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/20 custom-scrollbar">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <h3 className="text-lg font-black text-neutral-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-600">
          <X size={20} />
        </button>
      </div>
      <div className="p-6 md:p-10">
        {children}
      </div>
    </div>
  </div>
);

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Yes, Confirm', isDangerous = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-neutral-100">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-900'}`}>
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-black text-neutral-900 leading-tight">{title}</h3>
          </div>
          <p className="text-sm text-neutral-600 font-medium leading-relaxed ml-1">{message}</p>
        </div>
        <div className="p-4 bg-neutral-50 flex items-center justify-end gap-3 border-t border-neutral-100">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            No, Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${isDangerous ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-neutral-900 hover:bg-black shadow-neutral-200'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const FramerManagementView: React.FC<FramerManagementViewProps> = ({ framerRecords, artworks = [], branches: availableBranches, onReturnFromFramer, onTransfer, onViewArtwork, onDeleteFramerRecord, permissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedArtist, setSelectedArtist] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<FramerRecord | null>(null);

  // Return Action State
  const [returnStrategy, setReturnStrategy] = useState<'original' | 'manual' | null>(null);
  const [returnBranch, setReturnBranch] = useState('');
  const [returnItdrUrl, setReturnItdrUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDangerous: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    isDangerous: false,
    onConfirm: () => { }
  });

  const requestConfirmation = (title: string, message: string, onConfirm: () => void, isDangerous = false, confirmLabel = 'Yes, Confirm') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmLabel,
      isDangerous,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSelectRecord = (record: FramerRecord) => {
    setSelectedRecord(record);
    const original = record.artworkSnapshot.currentBranch || availableBranches[0];
    setReturnBranch(original);
    setReturnStrategy('original');
    setReturnItdrUrl('');
  };

  const handleReturnAction = () => {
    if (!selectedRecord) return;
    
    if (returnStrategy === 'original') {
      if (onReturnFromFramer) onReturnFromFramer(selectedRecord.id, returnBranch);
    } else {
      if (onTransfer) {
        onTransfer([selectedRecord.artworkId], returnBranch, { itdrUrl: returnItdrUrl });
        // After starting a transfer, we resolve the record too
        if (onReturnFromFramer) onReturnFromFramer(selectedRecord.id, returnBranch);
      }
    }
    setSelectedRecord(null); // Close modal
  };

  const handleReturnItdrUpload = async (file?: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setReturnItdrUrl(objectUrl);
    } catch (error) {
      console.error('Failed to prepare IT/DR attachment:', error);
      setReturnItdrUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const activeRecords = useMemo(() => {
    const formalRecords = (framerRecords || []).filter(r => r.status !== 'Resolved');
    const formalRecordArtworkIds = new Set(formalRecords.map(r => r.artworkId));
    
    // Robust status matching helper
    const isStatus = (artStatus: string, target: ArtworkStatus) => {
        if (!artStatus) return false;
        const norm = artStatus.toLowerCase().replace(/_/g, ' ').trim();
        const targetNorm = target.toLowerCase().replace(/_/g, ' ').trim();
        return norm === targetNorm;
    };

    // Identify artworks that are in 'For Framing' status but lack a formal record
    const orphanedArtworks = (artworks || []).filter(art => {
      if (!isStatus(art.status, ArtworkStatus.FOR_FRAMING)) return false;
      
      // Check if it already has an active formal record
      return !formalRecordArtworkIds.has(art.id);
    });

    const uniqueOrphanedArtworks = Array.from(
      new Map(orphanedArtworks.map(art => [art.id, art])).values()
    );

    // Map orphaned artworks to 'virtual' framer records
    const virtualRecords: FramerRecord[] = uniqueOrphanedArtworks.map(art => ({
      id: `virtual-${art.id}`,
      artworkId: art.id,
      damageDetails: 'Marked for Framing (In Inventory)',
      sentDate: art.createdAt || new Date().toISOString(),
      artworkSnapshot: art,
      status: 'Open' as 'Open',
      remarks: 'Automated discovery: Artwork status set to For Framing in inventory without formal record.'
    }));

    return Array.from(
      new Map([...formalRecords, ...virtualRecords].map(record => [record.id, record])).values()
    );
  }, [framerRecords, artworks]);

  const branches = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.currentBranch))).sort()], [activeRecords]);
  const artists = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.artist))).sort()], [activeRecords]);


  // Dashboard Stats
  const stats = useMemo(() => {
    const total = activeRecords.length;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const recent = activeRecords.filter(r => new Date(r.sentDate) > thirtyDaysAgo).length;

    const branchCounts = activeRecords.reduce((acc, curr) => {
      acc[curr.artworkSnapshot.currentBranch] = (acc[curr.artworkSnapshot.currentBranch] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topBranch = Object.entries(branchCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, recent, topBranch };
  }, [activeRecords]);

  const filteredRecords = activeRecords.filter(record => {
    // Permission checks
    const canViewForFraming = permissions?.canViewForFraming ?? true;

    if (!canViewForFraming) return false;

    const matchesSearch =
      record.artworkSnapshot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.artworkSnapshot.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.damageDetails.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = selectedBranch === 'All' || record.artworkSnapshot.currentBranch === selectedBranch;
    const matchesArtist = selectedArtist === 'All' || record.artworkSnapshot.artist === selectedArtist;

    return matchesSearch && matchesBranch && matchesArtist;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">In Framing</h4>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
              <Wrench size={18} className="transition-all duration-300 group-hover:scale-115 group-hover:rotate-12" />
            </div>
          </div>
          <p className="text-3xl font-black text-neutral-900">{stats.total}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Active repairs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Recent Sends</h4>
            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <Clock size={18} className="transition-all duration-700 group-hover:scale-115 group-hover:rotate-[360deg]" />
            </div>
          </div>
          <p className="text-3xl font-black text-neutral-900">{stats.recent}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Last 30 days</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow group border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Top Branch</h4>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <MapPin size={18} className="transition-all duration-300 group-hover:scale-115 group-hover:translate-y-[-2px]" />
            </div>
          </div>
          <p className="text-lg font-black text-neutral-900 line-clamp-1" title={stats.topBranch}>{stats.topBranch}</p>
          <p className="text-xs text-neutral-500 mt-1 font-medium">Most active source</p>
        </div>
      </div>

      {/* Controls & Filters Container */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search framing records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-500 uppercase tracking-wider mr-2">
              <Filter size={14} />
              <span>Filters</span>
            </div>
            {[
              { value: selectedBranch, onChange: setSelectedBranch, options: branches, label: 'Branch' },
              { value: selectedArtist, onChange: setSelectedArtist, options: artists, label: 'Artist' }
            ].map((filter, idx) => (
              <select
                key={idx}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border-none rounded-lg text-sm text-neutral-600 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500/20 cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                {filter.options.map(o => <option key={o} value={o}>{o === 'All' ? (filter.label === 'Branch' ? 'All Branches' : `All ${filter.label}s`) : o}</option>)}
              </select>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-neutral-400 bg-white rounded-3xl border border-dashed border-neutral-200">
            <Wrench size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-neutral-600">No framing records found</p>
            <p className="text-sm text-neutral-400">Items sent for retouch/repair will appear here</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const liveArtwork = artworks.find(a => a.id === record.artworkId);
            const displayImage = liveArtwork?.imageUrl || record.artworkSnapshot.imageUrl;

            return (
              <div
                key={record.id}
                onClick={() => handleSelectRecord(record)}
                className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-1 relative"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  {onDeleteFramerRecord && (
                    <div
                      className="absolute top-3 left-3 z-10 p-2 bg-white/90 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded-lg cursor-pointer transition-colors shadow-sm border border-neutral-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestConfirmation(
                          'Delete Framer Record?',
                          'Are you sure you want to delete this record?',
                          () => onDeleteFramerRecord(record.id),
                          true,
                          'Yes, Delete'
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </div>
                  )}
                  <img
                    src={displayImage}
                    alt={record.artworkSnapshot.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm backdrop-blur-md bg-neutral-100 text-neutral-700 border-neutral-200">
                      FOR FRAMING
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-neutral-900/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs font-medium flex items-center gap-1">
                      <MapPin size={12} />
                      {record.artworkSnapshot.currentBranch}
                    </p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-3 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">{record.artworkSnapshot.code}</span>
                    <h4 className="text-lg font-bold text-neutral-900 leading-tight line-clamp-1 group-hover:text-neutral-600 transition-colors">{record.artworkSnapshot.title}</h4>
                    <p className="text-sm text-neutral-500 font-medium">by {record.artworkSnapshot.artist}</p>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 font-medium px-2 py-1 bg-neutral-50 rounded-md">
                        {new Date(record.sentDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <Modal title="Framer Record Details" onClose={() => setSelectedRecord(null)}>
          <div className="space-y-6">
            {/* Artwork Hero — Horizontal Layout */}
            <div className="flex gap-5">
              <div
                className="w-36 h-44 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 cursor-pointer hover:scale-[1.02] transition-transform duration-200 shadow-sm"
                onClick={() => onViewArtwork?.(selectedRecord.artworkId)}
              >
                <img
                  src={artworks.find(a => a.id === selectedRecord.artworkId)?.imageUrl || selectedRecord.artworkSnapshot.imageUrl}
                  alt={selectedRecord.artworkSnapshot.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    {selectedRecord.artworkSnapshot.code}
                  </span>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                    In Framing
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight truncate">
                  {selectedRecord.artworkSnapshot.title}
                </h2>
                <p className="text-sm text-slate-500 font-semibold mt-0.5">by {selectedRecord.artworkSnapshot.artist}</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-slate-500 font-medium">
                  <span>{selectedRecord.artworkSnapshot.year || 'Unknown'} · {selectedRecord.artworkSnapshot.medium || 'Unspecified'}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} />{selectedRecord.artworkSnapshot.currentBranch || 'Gallery'}</span>
                </div>
              </div>
            </div>

            {/* Inline Status Pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Sent Date</p>
                <p className="text-sm font-bold text-slate-900">{new Date(selectedRecord.sentDate).toLocaleDateString()}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Outbound to Framer</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-1">Status</p>
                <p className="text-sm font-bold text-slate-900">In Framing</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pending completion</p>
              </div>
            </div>

            {/* Repair Details */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench size={14} className="text-amber-500" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Repair Details</h4>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700 font-medium leading-relaxed">
                  {selectedRecord.damageDetails || 'No specific damage details provided.'}
                </p>
              </div>
            </div>

            {/* Attachment (if exists) */}
            {selectedRecord.attachmentUrl && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-sky-500" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Sent Attachment{Array.isArray(selectedRecord.attachmentUrl) && selectedRecord.attachmentUrl.length > 1 ? 's' : ''}</h4>
                  </div>
                </div>
                <div className={`${Array.isArray(selectedRecord.attachmentUrl) && selectedRecord.attachmentUrl.length > 1 ? 'grid grid-cols-2 gap-2 max-h-48 overflow-y-auto' : ''}`}>
                  {(Array.isArray(selectedRecord.attachmentUrl) ? selectedRecord.attachmentUrl : [selectedRecord.attachmentUrl]).map((url, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 max-h-48 flex items-center justify-center">
                      <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Return Strategy */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw size={14} className="text-slate-500" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Return Strategy</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setReturnStrategy('original');
                    setReturnBranch(selectedRecord.artworkSnapshot.currentBranch || availableBranches[0]);
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                    returnStrategy === 'original'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-2 shrink-0 ${returnStrategy === 'original' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-black tracking-tight text-sm">Return to Original</h5>
                        {returnStrategy === 'original' && <CheckCircle size={16} className="shrink-0 ml-2" />}
                      </div>
                      <p className={`mt-1 text-xs font-medium leading-relaxed ${returnStrategy === 'original' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Back to source branch
                      </p>
                      <p className={`mt-2 text-[10px] font-black uppercase tracking-wider ${returnStrategy === 'original' ? 'text-slate-300' : 'text-slate-400'}`}>
                        {selectedRecord.artworkSnapshot.currentBranch || 'Gallery'}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setReturnStrategy('manual')}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                    returnStrategy === 'manual'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-2 shrink-0 ${returnStrategy === 'manual' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <ArrowRight size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-black tracking-tight text-sm">Transfer to Another</h5>
                        {returnStrategy === 'manual' && <CheckCircle size={16} className="shrink-0 ml-2" />}
                      </div>
                      <p className={`mt-1 text-xs font-medium leading-relaxed ${returnStrategy === 'manual' ? 'text-slate-300' : 'text-slate-500'}`}>
                        Formal transfer with IT/DR
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Manual Transfer Details */}
            {returnStrategy === 'manual' && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 animate-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 block mb-2">Destination Branch</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all appearance-none"
                      value={returnBranch}
                      onChange={(e) => setReturnBranch(e.target.value)}
                    >
                      <option value="">Select Target Branch...</option>
                      {availableBranches.filter(b => b !== 'All').map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">IT/DR Required</span>
                  </div>

                  {returnItdrUrl ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-40">
                      <img src={returnItdrUrl} alt="ITDR" className="w-full h-full object-contain bg-white" />
                      <button
                        onClick={() => setReturnItdrUrl('')}
                        className="absolute top-2 right-2 p-2 bg-white text-slate-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="itdr-upload-dashboard"
                        onChange={async (e) => {
                          await handleReturnItdrUpload(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="itdr-upload-dashboard"
                        className="flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-slate-300 rounded-xl bg-white hover:border-slate-400 transition-all cursor-pointer group"
                      >
                        {isUploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
                        ) : (
                          <>
                            <Upload size={20} className="text-slate-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload IT/DR</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Info size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Permanent once confirmed</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const strategyLabel = returnStrategy === 'original' ? 'Original Branch' : returnBranch;
                    requestConfirmation(
                      'Confirm Return',
                      `Are you sure you want to finalize the return to ${strategyLabel || 'destination'}?`,
                      handleReturnAction,
                      false,
                      'Confirm Final Return'
                    );
                  }}
                  disabled={
                    !returnStrategy ||
                    (returnStrategy === 'manual' && (!returnBranch || !returnItdrUrl))
                  }
                  className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-slate-200 hover:bg-black active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Archive size={14} />
                  Confirm Return
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        confirmLabel={confirmState.confirmLabel}
        isDangerous={confirmState.isDangerous}
      />
    </div>
  );
};

export default FramerManagementView;
