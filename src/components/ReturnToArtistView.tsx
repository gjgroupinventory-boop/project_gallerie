import React, { useState, useMemo } from 'react';
import { ReturnRecord, Artwork, UserPermissions, ArtworkStatus, ReturnType, FramerRecord } from '../types';
import { normalizeReturnProofImages, serializeReturnProofImages } from '../utils/returnProofUtils';
import { Search, Filter, FileText, Package, X, MapPin, Tag, Clock, AlertCircle, Edit, Save, Upload, RotateCcw, Archive, Banknote, Trash2, Check, Wrench } from 'lucide-react';

interface ReturnToArtistViewProps {
  returnRecords: ReturnRecord[];
  artworks: Artwork[];
  branches: string[];
  onUpdateReturnRecord?: (id: string, updates: Partial<ReturnRecord>) => void;
  onReturnToGallery?: (id: string, branch: string) => Promise<boolean | void>;
  onBulkDeleteReturnRecords?: (ids: string[]) => void;
  onViewArtwork?: (id: string) => void;
  permissions?: UserPermissions;
  framerRecords?: FramerRecord[];
  onReturnFromFramer?: (id: string, branch: string) => void;
  onDeleteFramerRecord?: (id: string) => void;
  onTransfer?: (ids: string[], targetBranch: string, attachments?: { itdrUrl?: string | string[] }) => void;
}

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <h3 className="text-lg font-black text-neutral-900 tracking-tight">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-600">
          <X size={20} />
        </button>
      </div>
      <div className="p-8">
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
              {isDangerous ? <AlertCircle size={24} /> : <AlertCircle size={24} />}
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

const ReturnToArtistView: React.FC<ReturnToArtistViewProps> = ({ returnRecords = [], artworks = [], branches: availableBranches = [], onUpdateReturnRecord, onReturnToGallery, onBulkDeleteReturnRecords, permissions, onViewArtwork, framerRecords = [], onReturnFromFramer, onDeleteFramerRecord, onTransfer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [returnTargetBranch, setReturnTargetBranch] = useState<string>(''); // New State for Return Action
  const [selectedArtist, setSelectedArtist] = useState<string>('All');
  const [selectedMedium, setSelectedMedium] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'Artist Reclaim' | 'For Retouch' | 'For Framing'>('Artist Reclaim');
  const [activeStatModal, setActiveStatModal] = useState<'total' | 'recent' | 'value' | 'branch' | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit State
  const [isEditingProof, setIsEditingProof] = useState(false);
  const [editForm, setEditForm] = useState<{ referenceNumber: string; proofImages: string[] }>({ referenceNumber: '', proofImages: [] });
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

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
    if (!onBulkDeleteReturnRecords) return;
    requestConfirmation(
      'Delete Return Records?',
      `Are you sure you want to permanently delete ${selectedIds.size} return records? This action cannot be undone.`,
      () => {
        onBulkDeleteReturnRecords(Array.from(selectedIds));
        setSelectedIds(new Set());
      },
      true,
      'Yes, Delete'
    );
  };

  const handleSelectRecord = (record: ReturnRecord) => {
    setSelectedRecord(record);
    setReturnTargetBranch(record.artworkSnapshot.currentBranch || ''); // Default to previous branch
    setEditForm({
      referenceNumber: record.referenceNumber || '',
      proofImages: normalizeReturnProofImages(record.proofImage)
    });
    setIsEditingProof(false);
  };

  const handleSaveProof = () => {
    if (!selectedRecord || !onUpdateReturnRecord) return;

    const updates: Partial<ReturnRecord> = {
      referenceNumber: editForm.referenceNumber,
      proofImage: serializeReturnProofImages(editForm.proofImages)
    };

    onUpdateReturnRecord(selectedRecord.id, updates);

    // Update local state
    setSelectedRecord({ ...selectedRecord, ...updates });
    setIsEditingProof(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const processedImages = await Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1200;
          const maxH = 1200;
          const w = img.width;
          const h = img.height;
          const scale = Math.min(maxW / w, maxH / h, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const isPng = file.type === 'image/png';
          const mime = isPng ? 'image/png' : 'image/jpeg';
          resolve(isPng ? canvas.toDataURL(mime) : canvas.toDataURL(mime, 0.85));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      })));
      setEditForm(prev => ({ ...prev, proofImages: [...prev.proofImages, ...processedImages] }));
    } catch (err) {
      console.error('Error processing image:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const activeRecords = useMemo(() => {
    const formalRecords = returnRecords.filter(r => r.status !== 'Resolved');
    const formalRecordArtworkIds = new Set(formalRecords.map(r => r.artworkId));
    
    // Robust status matching helper
    const isStatus = (artStatus: string, target: ArtworkStatus) => {
        if (!artStatus) return false;
        const norm = artStatus.toLowerCase().replace(/_/g, ' ').trim();
        const targetNorm = target.toLowerCase().replace(/_/g, ' ').trim();
        return norm === targetNorm;
    };

    // Identify artworks that are in a 'Retouch' or 'Returned' status but lack a formal record
    const orphanedArtworks = (artworks || []).filter(art => {
      const isRetouch = isStatus(art.status, ArtworkStatus.FOR_RETOUCH);
      const isReturned = isStatus(art.status, ArtworkStatus.RETURNED);
      
      if (!isRetouch && !isReturned) return false;
      
      // Check if it already has an active formal record
      return !formalRecordArtworkIds.has(art.id);
    });

    const uniqueOrphanedArtworks = Array.from(
      new Map(orphanedArtworks.map(art => [art.id, art])).values()
    );

    // Map orphaned artworks to 'virtual' return records
    const virtualRecords: ReturnRecord[] = uniqueOrphanedArtworks.map(art => {
      const isRetouch = isStatus(art.status, ArtworkStatus.FOR_RETOUCH);
      return {
        id: `virtual-${art.id}`,
        artworkId: art.id,
        reason: isRetouch ? 'Marked for Retouch (In Inventory)' : 'Marked as Returned (In Inventory)',
        returnedBy: 'System Discovery',
        returnDate: art.createdAt || new Date().toISOString(),
        artworkSnapshot: art,
        returnType: (isRetouch ? 'For Retouch' : 'Artist Reclaim') as ReturnType,
        status: 'Open',
        remarks: `Automated discovery: Artwork status set to ${art.status} in inventory without formal record.`
      };
    });

    const returns = Array.from(
      new Map([...formalRecords, ...virtualRecords].map(record => [record.id, record])).values()
    );

    // Framer Records mapping
    const formalFramerRecords = (framerRecords || []).filter(r => r.status !== 'Resolved');
    const formalFramerRecordArtworkIds = new Set(formalFramerRecords.map(r => r.artworkId));

    const orphanedFramerArtworks = (artworks || []).filter(art => {
      if (!isStatus(art.status, ArtworkStatus.FOR_FRAMING)) return false;
      return !formalFramerRecordArtworkIds.has(art.id);
    });

    const uniqueOrphanedFramerArtworks = Array.from(
      new Map(orphanedFramerArtworks.map(art => [art.id, art])).values()
    );

    const virtualFramerRecords: FramerRecord[] = uniqueOrphanedFramerArtworks.map(art => ({
      id: `virtual-${art.id}`,
      artworkId: art.id,
      damageDetails: 'Marked for Framing (In Inventory)',
      sentDate: art.createdAt || new Date().toISOString(),
      artworkSnapshot: art,
      status: 'Open' as const,
      remarks: 'Automated discovery: Artwork status set to For Framing in inventory without formal record.'
    }));

    const framers = Array.from(
      new Map([...formalFramerRecords, ...virtualFramerRecords].map(record => [record.id, record])).values()
    );

    const mappedFramers: ReturnRecord[] = framers.map(f => ({
      id: f.id,
      artworkId: f.artworkId,
      reason: f.damageDetails,
      returnedBy: 'System Discovery',
      returnDate: f.sentDate,
      artworkSnapshot: f.artworkSnapshot,
      remarks: f.remarks,
      returnType: 'For Framing' as any, // Cast as ReturnType
      status: f.status === 'Open' ? 'Open' : 'Resolved',
      proofImage: f.attachmentUrl
    }));

    return [...returns, ...mappedFramers];
  }, [returnRecords, framerRecords, artworks]);
  const selectedRecordProofImages = normalizeReturnProofImages(selectedRecord?.proofImage);

  const branches = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.currentBranch))).sort()], [activeRecords]);
  const artists = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.artist))).sort()], [activeRecords]);
  const mediums = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.medium))).sort()], [activeRecords]);
  const sizes = useMemo(() => ['All', ...Array.from(new Set(activeRecords.map(r => r.artworkSnapshot.dimensions))).sort()], [activeRecords]);


  // Dashboard Stats & Lists
  const recentRecordsList = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return activeRecords
      .filter(r => new Date(r.returnDate) > thirtyDaysAgo)
      .sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
  }, [activeRecords]);

  const valueStats = useMemo(() => {
    const reclaimValue = activeRecords
      .filter(r => r.returnType === 'Artist Reclaim')
      .reduce((sum, r) => sum + (r.artworkSnapshot.price || 0), 0);
    const retouchValue = activeRecords
      .filter(r => r.returnType === 'For Retouch')
      .reduce((sum, r) => sum + (r.artworkSnapshot.price || 0), 0);
    const highValueReturns = [...activeRecords]
      .sort((a, b) => (b.artworkSnapshot.price || 0) - (a.artworkSnapshot.price || 0))
      .slice(0, 5);
    return { reclaimValue, retouchValue, highValueReturns };
  }, [activeRecords]);

  const branchStats = useMemo(() => {
    const counts: Record<string, { count: number; value: number; reclaim: number; retouch: number }> = {};
    activeRecords.forEach(r => {
      const br = r.artworkSnapshot.currentBranch || 'Unknown Branch';
      if (!counts[br]) {
        counts[br] = { count: 0, value: 0, reclaim: 0, retouch: 0 };
      }
      counts[br].count += 1;
      counts[br].value += r.artworkSnapshot.price || 0;
      if (r.returnType === 'Artist Reclaim') {
        counts[br].reclaim += 1;
      } else {
        counts[br].retouch += 1;
      }
    });
    return Object.entries(counts)
      .map(([branchName, stat]) => ({ branchName, ...stat }))
      .sort((a, b) => b.count - a.count);
  }, [activeRecords]);

  const stats = useMemo(() => {
    const total = activeRecords.length;
    const recent = recentRecordsList.length;

    // Total Value Calculation
    const totalValue = activeRecords.reduce((acc, curr) => acc + (curr.artworkSnapshot.price || 0), 0);

    const topBranch = branchStats[0]?.branchName || 'N/A';

    // Tab-Specific Stats
    const reclaimedCount = activeRecords.filter(r => r.returnType === 'Artist Reclaim').length;
    const retouchCount = activeRecords.filter(r => r.returnType === 'For Retouch').length;
    const framerCount = activeRecords.filter(r => r.returnType === ('For Framing' as any)).length;

    return { total, recent, totalValue, topBranch, reclaimedCount, retouchCount, framerCount };
  }, [activeRecords, recentRecordsList, branchStats]);


  const filteredRecords = activeRecords.filter(record => {
    // Permission checks
    const canViewAuctioned = permissions?.canViewAuctioned ?? true;
    const canViewExhibit = permissions?.canViewExhibit ?? true;
    const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

    if (!canViewBackToArtist) return false;

    const remarks = record.artworkSnapshot.remarks || '';
    const isAuction = remarks.includes('[Reserved For Auction:');
    const isEvent = remarks.includes('[Reserved For Event:');

    if (isAuction && !canViewAuctioned) return false;
    if (isEvent && !canViewExhibit) return false;
    // For general reserved items that are not auction/event specific, we might want to check canViewReserved
    // However, returned items are not necessarily "Reserved" status anymore, they are "Returned".
    // But if they originated from a restricted source, we might want to hide them.
    // Given the context, if it was reserved for auction/event, it's safer to hide it if the user can't see those.

    const matchesSearch =
      record.artworkSnapshot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.artworkSnapshot.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.referenceNumber && record.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBranch = selectedBranch === 'All' || record.artworkSnapshot.currentBranch === selectedBranch;
    const matchesArtist = selectedArtist === 'All' || record.artworkSnapshot.artist === selectedArtist;
    const matchesMedium = selectedMedium === 'All' || record.artworkSnapshot.medium === selectedMedium;
    const matchesSize = selectedSize === 'All' || record.artworkSnapshot.dimensions === selectedSize;

    // Tab Partitioning (MANDATORY)
    const matchesTab = record.returnType === activeTab;

    return matchesSearch && matchesBranch && matchesArtist && matchesMedium && matchesSize && matchesTab;
  });


  return (
    <div className="space-y-8 animate-in fade-in duration-500">




      {/* Controls & Filters Container */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
        {selectedIds.size > 0 && onBulkDeleteReturnRecords && (
          <div className="flex items-center justify-between bg-red-50 px-4 py-3 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                {selectedIds.size}
              </span>
              <span className="text-sm font-bold text-red-900">Items Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95"
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search returns (Title, Artist, Reason, IT/DR #)..."
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
              { value: selectedArtist, onChange: setSelectedArtist, options: artists, label: 'Artist' },
              { value: selectedMedium, onChange: setSelectedMedium, options: mediums, label: 'Medium' },
              { value: selectedSize, onChange: setSelectedSize, options: sizes, label: 'Size' }
            ].map((filter, idx) => (
              <select
                key={idx}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 bg-neutral-50 border-none rounded-lg text-sm text-neutral-600 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500/20 cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                {filter.options.map((o, optionIdx) => {
                  const normalizedValue = o || '';
                  const optionLabel = normalizedValue === 'All'
                    ? (filter.label === 'Branch' ? 'All Branches' : `All ${filter.label}s`)
                    : normalizedValue || `Unknown ${filter.label}`;

                  return (
                    <option
                      key={`${filter.label}-${normalizedValue || 'empty'}-${optionIdx}`}
                      value={normalizedValue}
                    >
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-2xl w-fit border border-neutral-200">
        <button
          onClick={() => setActiveTab('Artist Reclaim')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center gap-2 ${activeTab === 'Artist Reclaim'
            ? 'bg-red-600 text-white shadow-lg shadow-red-200 ring-1 ring-red-500'
            : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
            }`}
        >
          <RotateCcw size={16} />
          Returned (VOID)
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'Artist Reclaim' ? 'bg-red-700 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            {stats.reclaimedCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('For Retouch')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center gap-2 ${activeTab === 'For Retouch'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-1 ring-blue-500'
            : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
            }`}
        >
          <Wrench size={16} />
          For Retouch
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'For Retouch' ? 'bg-blue-700 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            {stats.retouchCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('For Framing')}
          className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center gap-2 ${activeTab === 'For Framing'
            ? 'bg-teal-600 text-white shadow-lg shadow-teal-200 ring-1 ring-teal-500'
            : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50'
            }`}
        >
          <Wrench size={16} />
          For Framing
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'For Framing' ? 'bg-teal-700 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            {stats.framerCount}
          </span>
        </button>
      </div>

      {/* Grid */}      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredRecords.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-neutral-400 bg-white rounded-3xl border border-dashed border-neutral-200">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-neutral-600">No return records found</p>
            <p className="text-sm text-neutral-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const liveArtwork = artworks.find(a => a.id === record.artworkId);
            let displayImage = liveArtwork?.imageUrl || record.artworkSnapshot.imageUrl;
            if (displayImage && displayImage.includes('picsum.photos')) {
              displayImage = '';
            }

            return (
              <div
                key={record.id}
                onClick={() => handleSelectRecord(record)}
                className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col h-full hover:-translate-y-0.5 relative"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                    <div
                      onClick={(e) => toggleSelection(record.id, e)}
                    >
                      <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center shadow-sm ${selectedIds.has(record.id) ? 'bg-red-600 border-red-600' : 'bg-white/90 border-neutral-200 hover:border-red-400'}`}>
                        {selectedIds.has(record.id) && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                    {((record.returnType === ('For Framing' as any) && onDeleteFramerRecord) || (record.returnType !== ('For Framing' as any) && onBulkDeleteReturnRecords)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestConfirmation(
                            record.returnType === ('For Framing' as any) ? 'Delete Framer Record?' : 'Delete Return Record?',
                            record.returnType === ('For Framing' as any) ? 'Are you sure you want to delete this framing record?' : 'Are you sure you want to delete this return record?',
                            () => record.returnType === ('For Framing' as any) ? (onDeleteFramerRecord && onDeleteFramerRecord(record.id)) : (onBulkDeleteReturnRecords && onBulkDeleteReturnRecords([record.id])),
                            true,
                            'Yes, Delete'
                          );
                        }}
                        className="w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded border border-neutral-200 shadow-sm transition-colors backdrop-blur-sm"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                    {((record.returnType === ('For Framing' as any) && onReturnFromFramer) || (record.returnType !== ('For Framing' as any) && onReturnToGallery)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetBranch = record.artworkSnapshot.currentBranch || 'Main Gallery';
                          requestConfirmation(
                            'Restore to Inventory?',
                            `Are you sure you want to return this artwork to ${targetBranch}?`,
                            async () => {
                              if (record.returnType === ('For Framing' as any)) {
                                if (onReturnFromFramer) onReturnFromFramer(record.id, targetBranch);
                              } else {
                                if (onReturnToGallery) {
                                  const ok = await onReturnToGallery(record.id, targetBranch);
                                  if (!ok) {
                                    alert("FAIL: Return operation rejected by system.");
                                  }
                                }
                              }
                            },
                            false,
                            'Yes, Restore'
                          );
                        }}
                        title={`Return to ${record.artworkSnapshot.currentBranch || 'Main Gallery'}`}
                        className="w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 shadow-sm transition-colors backdrop-blur-sm"
                      >
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={record.artworkSnapshot.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
                      <Package size={24} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border shadow-sm backdrop-blur-md ${
                      record.returnType === 'For Retouch'
                        ? 'bg-orange-100 text-orange-850 border-orange-200'
                        : record.returnType === ('For Framing' as any)
                          ? 'bg-teal-100 text-teal-850 border-teal-200'
                          : 'bg-neutral-900 text-white border-neutral-900'
                      }`}>
                      {record.returnType === 'For Retouch' ? 'RETOUCH' : record.returnType === ('For Framing' as any) ? 'FRAMING' : 'RETURNED'}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-neutral-900/80 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-[10px] font-medium flex items-center gap-1">
                      <MapPin size={10} />
                      {record.artworkSnapshot.currentBranch}
                    </p>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="mb-2 space-y-0.5">
                    <span className="text-[9px] font-black text-neutral-400 tracking-wider uppercase">{record.artworkSnapshot.code}</span>
                    <h4 className="text-xs font-bold text-neutral-900 leading-snug line-clamp-1 group-hover:text-neutral-600 transition-colors" title={record.artworkSnapshot.title}>{record.artworkSnapshot.title}</h4>
                    <p className="text-[10px] text-neutral-500 font-medium truncate">by {record.artworkSnapshot.artist}</p>
                  </div>

                  <div className="mt-auto pt-2.5 flex items-center justify-between border-t border-neutral-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-50 rounded border border-neutral-100 truncate">
                        {record.artworkSnapshot.medium}
                      </span>
                    </div>
                    <p className="text-xs font-black text-neutral-900 shrink-0">₱{record.artworkSnapshot.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <Modal title="Return Record Details" onClose={() => setSelectedRecord(null)}>
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-32 h-32 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100 shadow-sm">
                {(() => {
                  const liveArt = artworks.find(a => String(a.id) === String(selectedRecord.artworkId));
                  const imgUrl = liveArt?.imageUrl || selectedRecord.artworkSnapshot.imageUrl;
                  return imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={selectedRecord.artworkSnapshot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <Package size={32} />
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">{selectedRecord.artworkSnapshot.title}</h2>
                </div>
                <p className="text-lg text-neutral-500 font-medium mb-4">by {selectedRecord.artworkSnapshot.artist}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg tracking-wide">
                    {selectedRecord.artworkSnapshot.year}
                  </span>
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg tracking-wide">
                    {selectedRecord.artworkSnapshot.medium}
                  </span>
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg tracking-wide">
                    {selectedRecord.artworkSnapshot.dimensions}
                  </span>
                </div>
              </div>
            </div>

            {/* Return Information Box - Matched to Reference */}
            <div className={`rounded-2xl p-6 border ${
              selectedRecord.returnType === 'For Retouch' 
                ? 'bg-orange-50 border-orange-200' 
                : selectedRecord.returnType === ('For Framing' as any)
                  ? 'bg-teal-50/50 border-teal-200'
                  : 'bg-neutral-50 border-neutral-200'
            }`}>
              <h4 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${
                selectedRecord.returnType === 'For Retouch' 
                  ? 'text-orange-900' 
                  : selectedRecord.returnType === ('For Framing' as any)
                    ? 'text-teal-900'
                    : 'text-neutral-900'
              }`}>
                <FileText size={14} className={
                  selectedRecord.returnType === 'For Retouch' 
                    ? 'text-orange-600' 
                    : selectedRecord.returnType === ('For Framing' as any)
                      ? 'text-teal-600'
                      : 'text-neutral-600'
                } />
                {selectedRecord.returnType === 'For Retouch' 
                  ? 'RETOUCH INFORMATION' 
                  : selectedRecord.returnType === ('For Framing' as any)
                    ? 'FRAMING INFORMATION'
                    : 'RETURN INFORMATION'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 mb-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-neutral-500">
                    {selectedRecord.returnType === ('For Framing' as any) ? 'SENT DATE' : 'RETURN DATE'}
                  </label>
                  <p className="text-neutral-900 font-semibold">{new Date(selectedRecord.returnDate).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-neutral-500">PROCESSED BY</label>
                  <p className="text-neutral-900 font-semibold">{selectedRecord.returnedBy}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-neutral-500">
                  {selectedRecord.returnType === ('For Framing' as any) ? 'FRAMING DETAILS' : 'REASON FOR RETURN'}
                </label>
                <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                  <p className="text-neutral-900 font-medium italic">
                    "{selectedRecord.reason}"
                  </p>
                </div>
              </div>

              {selectedRecord.remarks && (
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-2 text-neutral-500">ADDITIONAL REMARKS</label>
                  <p className="text-neutral-700 text-sm">{selectedRecord.remarks}</p>
                </div>
              )}
            </div>

            {/* Return to Gallery Action - Available for all return records */}
            {((selectedRecord.returnType === ('For Framing' as any) && onReturnFromFramer) || (selectedRecord.returnType !== ('For Framing' as any) && onReturnToGallery)) && (
              <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-neutral-900 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <RotateCcw size={14} className="text-neutral-600" />
                      Restore to Inventory
                    </h4>
                    <p className="text-sm text-neutral-600 font-medium">Return this artwork to active inventory.</p>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Return To Branch</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                      <select
                        value={returnTargetBranch}
                        onChange={(e) => setReturnTargetBranch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/20"
                      >
                        {availableBranches && availableBranches.filter(b => b !== 'All').map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      requestConfirmation(
                        'Restore to Inventory?',
                        `Are you sure you want to return this artwork to ${returnTargetBranch}?`,
                        async () => {
                          if (selectedRecord.returnType === ('For Framing' as any)) {
                            if (onReturnFromFramer) onReturnFromFramer(selectedRecord.id, returnTargetBranch);
                            setSelectedRecord(null);
                          } else {
                            if (onReturnToGallery) {
                              const ok = await onReturnToGallery(selectedRecord.id, returnTargetBranch);
                              if (ok) {
                                setSelectedRecord(null); // Close modal
                              } else {
                                alert("FAIL: Return operation rejected by system. Check diagnostics above.");
                              }
                            }
                          }
                        },
                        false,
                        'Yes, Restore'
                      );
                    }}
                    className="px-6 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-lg shadow-neutral-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap h-[42px]"
                  >
                    <Archive size={16} />
                    Return to Gallery
                  </button>
                </div>
              </div>
            )}

            {/* Proof Section */}
            {(selectedRecord.referenceNumber || selectedRecord.proofImage || onUpdateReturnRecord) && (
              <div className="pt-2 border-t border-neutral-100 mt-6">
                <div className="flex items-center justify-between mb-4 mt-6">
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={14} />
                    PROOF OF RETURN (IT/DR)
                  </h4>
                  {onUpdateReturnRecord && !isEditingProof && (
                    <button
                      onClick={() => setIsEditingProof(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      <Edit size={12} />
                      Edit Proof
                    </button>
                  )}
                </div>

                {isEditingProof ? (
                  <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">


                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Proof Image</label>

                      <div className="space-y-3">
                        <label className={`
                                        flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-xl 
                                        bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 transition-all cursor-pointer group
                                        ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                                    `}>
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isUploading ? (
                              <div className="animate-spin text-neutral-500 mb-2"><Package size={24} /></div>
                            ) : (
                              <Upload className="w-8 h-8 mb-3 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                            )}
                            <p className="mb-1 text-sm text-neutral-500 font-medium group-hover:text-neutral-700">
                              {isUploading ? 'Processing...' : 'Click to upload proof'}
                            </p>
                            <p className="text-xs text-neutral-400">PNG, JPG (Max. 1200x1200px)</p>
                          </div>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        </label>

                        {editForm.proofImages.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {editForm.proofImages.map((proofImage, index) => (
                              <div key={`${proofImage}-${index}`} className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-white">
                                <img src={proofImage} alt={`Proof Preview ${index + 1}`} className="w-full h-48 object-contain bg-neutral-100/50" />
                                <div className="absolute inset-0 bg-neutral-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setEditForm(prev => ({ ...prev, proofImages: prev.proofImages.filter((_, imageIndex) => imageIndex !== index) }))}
                                    className="px-4 py-2 bg-neutral-900/90 backdrop-blur text-white rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-lg"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          setIsEditingProof(false);
                          setEditForm({
                            referenceNumber: selectedRecord.referenceNumber || '',
                            proofImages: normalizeReturnProofImages(selectedRecord.proofImage)
                          });
                        }}
                        className="px-4 py-2 text-neutral-500 font-bold text-sm hover:bg-neutral-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProof}
                        className="flex items-center gap-2 px-6 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-lg shadow-neutral-200 transition-all active:scale-95"
                      >
                        <Save size={16} />
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(selectedRecord.referenceNumber || selectedRecordProofImages.length > 0) ? (
                      <>
                        {selectedRecordProofImages.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedRecordProofImages.map((proofImage, index) => (
                              <div key={`${proofImage}-${index}`} className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 relative group">
                                <img src={proofImage} alt={`Proof ${index + 1}`} className="w-full h-auto max-h-[300px] object-contain" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a href={proofImage} download={`Proof-${selectedRecord.id}-${index + 1}`} className="px-4 py-2 bg-white rounded-full text-neutral-900 font-bold text-sm shadow-lg hover:scale-105 transition-transform">
                                    Download Image
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                        <p className="text-neutral-400 text-sm font-medium">No proof of return attached.</p>
                        <p className="text-neutral-400 text-xs mt-1">Click "Edit Proof" to add details.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

      {/* Stat Modals */}
      {activeStatModal === 'total' && (
        <Modal title="Total Unresolved Returns Breakdown" onClose={() => setActiveStatModal(null)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Active Unresolved Returns</p>
                <p className="text-3xl font-black text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-neutral-900 text-white rounded-xl">
                <Package size={24} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Type Distribution</h4>
              
              <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-neutral-100">
                <div 
                  className="bg-red-600 transition-all" 
                  style={{ width: `${stats.total > 0 ? (stats.reclaimedCount / stats.total) * 100 : 0}%` }}
                  title={`Returned (VOID): ${stats.reclaimedCount}`}
                />
                <div 
                  className="bg-blue-600 transition-all" 
                  style={{ width: `${stats.total > 0 ? (stats.retouchCount / stats.total) * 100 : 0}%` }}
                  title={`For Retouch: ${stats.retouchCount}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wide">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                      Returned (VOID)
                    </div>
                    <p className="text-2xl font-black text-red-950 mt-2">{stats.reclaimedCount}</p>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('Artist Reclaim'); setActiveStatModal(null); }}
                    className="mt-4 text-left text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                  >
                    View in Reclaim Tab →
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wide">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      For Retouch
                    </div>
                    <p className="text-2xl font-black text-blue-950 mt-2">{stats.retouchCount}</p>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('For Retouch'); setActiveStatModal(null); }}
                    className="mt-4 text-left text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View in Retouch Tab →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeStatModal === 'recent' && (
        <Modal title="Recent Returns (Last 30 Days)" onClose={() => setActiveStatModal(null)}>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Recent Return Actions</p>
                <p className="text-3xl font-black text-neutral-900 mt-1">{stats.recent}</p>
              </div>
              <div className="p-3 bg-neutral-900 text-white rounded-xl">
                <Clock size={24} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Recent Records</h4>
              <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-2">
                {recentRecordsList.length === 0 ? (
                  <p className="text-sm text-neutral-400 py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">No return actions in the last 30 days.</p>
                ) : (
                  recentRecordsList.map((record) => {
                    const liveArt = artworks.find(a => a.id === record.artworkId);
                    const image = liveArt?.imageUrl || record.artworkSnapshot.imageUrl;
                    return (
                      <div 
                        key={record.id}
                        onClick={() => { handleSelectRecord(record); setActiveStatModal(null); }}
                        className="flex gap-4 p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer items-center"
                      >
                        <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                          {image ? (
                            <img src={image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={16} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-neutral-900 truncate">{record.artworkSnapshot.title}</h5>
                          <p className="text-[10px] text-neutral-500 font-medium truncate">by {record.artworkSnapshot.artist}</p>
                          <p className="text-[9px] text-neutral-400 font-semibold mt-0.5">{new Date(record.returnDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide border shrink-0 ${
                          record.returnType === 'For Retouch' 
                            ? 'bg-orange-100 text-orange-850 border-orange-200' 
                            : 'bg-neutral-900 text-white border-neutral-900'
                        }`}>
                          {record.returnType === 'For Retouch' ? 'Retouch' : 'Returned'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeStatModal === 'value' && (
        <Modal title="Returned Value Insights" onClose={() => setActiveStatModal(null)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Total Value Out of Circulation</p>
                <p className="text-3xl font-black text-neutral-900 mt-1">₱{stats.totalValue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-neutral-900 text-white rounded-xl">
                <Banknote size={24} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Returned (Void) Value</p>
                <p className="text-lg font-black text-neutral-850 mt-1">₱{valueStats.reclaimValue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Retouch Value</p>
                <p className="text-lg font-black text-neutral-850 mt-1">₱{valueStats.retouchValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Highest Value Returned Items</h4>
              <div className="space-y-2">
                {valueStats.highValueReturns.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-6">No return records found</p>
                ) : (
                  valueStats.highValueReturns.map((record) => {
                    const liveArt = artworks.find(a => a.id === record.artworkId);
                    const image = liveArt?.imageUrl || record.artworkSnapshot.imageUrl;
                    return (
                      <div 
                        key={record.id}
                        onClick={() => { handleSelectRecord(record); setActiveStatModal(null); }}
                        className="flex gap-4 p-3 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 transition-all cursor-pointer items-center"
                      >
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                          {image ? (
                            <img src={image} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300"><Package size={14} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-neutral-900 truncate">{record.artworkSnapshot.title}</h5>
                          <p className="text-[10px] text-neutral-500 font-medium truncate">by {record.artworkSnapshot.artist}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-neutral-900">₱{(record.artworkSnapshot.price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeStatModal === 'branch' && (
        <Modal title="Returns By Branch" onClose={() => setActiveStatModal(null)}>
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Top Branch For Returns</p>
                <p className="text-2xl font-black text-neutral-900 mt-1">{stats.topBranch}</p>
              </div>
              <div className="p-3 bg-neutral-900 text-white rounded-xl">
                <MapPin size={24} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Branch Ranking</h4>
              <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2">
                {branchStats.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-6">No branch return data available</p>
                ) : (
                  branchStats.map((branch) => {
                    const maxCount = Math.max(...branchStats.map(b => b.count), 1);
                    const percentage = (branch.count / maxCount) * 100;
                    return (
                      <div key={branch.branchName} className="p-4 rounded-xl border border-neutral-200 space-y-2 bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xs font-bold text-neutral-900">{branch.branchName}</h5>
                            <p className="text-[10px] font-semibold text-neutral-500 mt-0.5">
                              {branch.reclaim} Returned (Void) • {branch.retouch} For Retouch
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-neutral-900">{branch.count} {branch.count === 1 ? 'record' : 'records'}</p>
                            <p className="text-[10px] font-bold text-neutral-500 mt-0.5">₱{branch.value.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-neutral-800 h-full rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReturnToArtistView;
