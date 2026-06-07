import React, { useEffect, useMemo, useState } from 'react';
import { SaleRecord, Artwork, SaleStatus, UserPermissions } from '../types';
import { CheckCircle, XCircle, FileImage, FileText, ShieldCheck, Shield, Clock, LayoutGrid, Rows3, Eye, ExternalLink, Calendar, User, Mail, Phone, Tag, Info, AlertCircle, MessageSquare, ChevronRight, Trash2, Search, Filter, Folder, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { OptimizedTextarea } from '../components/OptimizedTextarea';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

interface SalesApprovalPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveSale: (saleId: string, remarks?: string) => void;
  onDeclineSale: (saleId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeleteSales?: (ids: string[]) => void;
  userPermissions?: UserPermissions;
  hideHeader?: boolean;
  externalActiveTab?: 'approval' | 'history';
}

const SalesApprovalPage: React.FC<SalesApprovalPageProps> = ({ 
  sales, 
  artworks, 
  onApproveSale, 
  onDeclineSale, 
  onBulkDeleteSales,
  userPermissions,
  hideHeader,
  externalActiveTab
}) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'history'>('approval');

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [requestedFiles, setRequestedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'full' | 'down'>('all');
  const [pendingBranchFilter, setPendingBranchFilter] = useState<string>('All');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'approved' | 'declined'>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [purchaseTypeTab, setPurchaseTypeTab] = useState<'all' | 'single' | 'bulk'>('all');
  const [activeFolderKey, setActiveFolderKey] = useState<string | null>(null);

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const pendingSales = useMemo(() => {
    const pending = sales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL && !s.isCancelled);
    const byArtwork = new Map<string, SaleRecord>();
    const malformed: SaleRecord[] = [];

    pending.forEach(sale => {
      // If artworkId is missing or "undefined", don't group it as it's likely corrupted data
      if (!sale.artworkId || sale.artworkId === 'undefined' || sale.artworkId === 'null') {
        malformed.push(sale);
      } else if (!byArtwork.has(sale.artworkId)) {
        byArtwork.set(sale.artworkId, sale);
      }
    });

    return [...Array.from(byArtwork.values()), ...malformed]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales]);

  const pendingBranches = useMemo(() => {
    const set = new Set<string>();
    pendingSales.forEach(sale => {
      const liveArt = artworks.find(a => a.id === sale.artworkId);
      const branch = liveArt?.currentBranch || sale.artworkSnapshot?.currentBranch || 'Main';
      if (branch) set.add(branch);
    });
    return ['All', ...Array.from(set)].sort();
  }, [pendingSales, artworks]);

  const filteredPendingSales = useMemo(() => {
    return pendingSales.filter(sale => {
      const liveArt = artworks.find(a => a.id === sale.artworkId);
      const art = {
        ...(liveArt || {}),
        ...(sale.artworkSnapshot || {}),
        title: sale.artworkSnapshot?.title || liveArt?.title || 'Untitled Artwork',
        artist: sale.artworkSnapshot?.artist || liveArt?.artist || 'Unknown Artist',
      };
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        sale.clientName.toLowerCase().includes(searchLower) ||
        sale.agentName.toLowerCase().includes(searchLower) ||
        art.title.toLowerCase().includes(searchLower) ||
        art.artist.toLowerCase().includes(searchLower) ||
        sale.id.toLowerCase().includes(searchLower);

      const isFull = !sale.isDownpayment || sale.downpayment === (art?.price || 0);
      const matchesPaymentType = paymentTypeFilter === 'all' ||
        (paymentTypeFilter === 'full' && isFull) ||
        (paymentTypeFilter === 'down' && !isFull);

      const branch = liveArt?.currentBranch || sale.artworkSnapshot?.currentBranch || 'Main';
      const matchesBranch = pendingBranchFilter === 'All' || branch === pendingBranchFilter;

      return matchesSearch && matchesPaymentType && matchesBranch;
    });
  }, [pendingSales, searchQuery, paymentTypeFilter, pendingBranchFilter, artworks]);

  const [contactConfirmed, setContactConfirmed] = useState<Record<string, boolean>>({});
  const { isProcessing, processMessage, processProgress, wrapAction } = useActionProcessing({ itemTitle: 'Sales Approval', itemCode: 'SAL' });
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [declineSaleId, setDeclineSaleId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineMode, setDeclineMode] = useState<'remediation' | 'straight'>('remediation');
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [activeAttachmentGroup, setActiveAttachmentGroup] = useState<{
    label: string;
    urls: string[];
  } | null>(null);
  const [approvalChecklist, setApprovalChecklist] = useState<Record<string, {
    buyerContacted: boolean;
    clientDetailsVerified: boolean;
    pricingVerified: boolean;
    documentsVerified: boolean;
  }>>({});

  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerConfirm = (title: string, message: string, actionLabel: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, actionLabel, onConfirm });
  };

  useEffect(() => {
    if (pendingSales.length === 0) {
      if (selectedSale) setSelectedSale(null);
      return;
    }

    if (selectedSale && !pendingSales.some(sale => sale.id === selectedSale.id)) {
      setSelectedSale(null);
      setApprovalRemarks('');
    }
  }, [pendingSales, selectedSale]);

  useEffect(() => {
    if (selectedSale) {
      setApprovalRemarks('');
    }
  }, [selectedSale]);

  const handleToggleConfirm = (saleId: string) => {
    setContactConfirmed(prev => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  const getChecklistState = (sale: SaleRecord | null) => {
    if (!sale) {
      return {
        buyerContacted: false,
        clientDetailsVerified: false,
        pricingVerified: false,
        documentsVerified: false
      };
    }

    return approvalChecklist[sale.id] || {
      buyerContacted: !!contactConfirmed[sale.id],
      clientDetailsVerified: false,
      pricingVerified: false,
      documentsVerified: false
    };
  };

  const handleChecklistToggle = (
    sale: SaleRecord,
    key: 'buyerContacted' | 'clientDetailsVerified' | 'pricingVerified' | 'documentsVerified'
  ) => {
    setApprovalChecklist(prev => {
      const current = prev[sale.id] || getChecklistState(sale);
      const next = {
        ...current,
        [key]: !current[key]
      };
      return { ...prev, [sale.id]: next };
    });

    if (key === 'buyerContacted') {
      setContactConfirmed(prev => ({ ...prev, [sale.id]: !getChecklistState(sale).buyerContacted }));
    }
  };

  const isSaleReadyForApproval = (sale: SaleRecord | null) => {
    const checklist = getChecklistState(sale);
    return checklist.buyerContacted
      && checklist.clientDetailsVerified
      && checklist.pricingVerified
      && checklist.documentsVerified;
  };


  const getArtwork = (id: string) => artworks.find(a => a.id === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getAttachmentKind = (url?: string) => {
    if (!url) return 'missing';
    const normalized = url.toLowerCase();
    if (normalized.startsWith('data:image/')) return 'image';
    if (normalized.startsWith('data:application/pdf')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(normalized)) return 'image';
    if (/\.(pdf)(\?|$)/.test(normalized)) return 'pdf';
    return 'file';
  };

  const getAttachmentName = (url?: string, index?: number) => {
    if (!url) return 'Missing file';
    try {
      if (url.startsWith('data:')) {
        const typeLabel = getAttachmentKind(url) === 'pdf' ? 'PDF Document' : 'Image File';
        return `${typeLabel}${typeof index === 'number' ? ` ${index + 1}` : ''}`;
      }
      const pathname = new URL(url).pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      return lastSegment || `Attachment ${typeof index === 'number' ? index + 1 : ''}`.trim();
    } catch {
      const trimmed = url.split('?')[0].split('/').pop();
      return trimmed || `Attachment ${typeof index === 'number' ? index + 1 : ''}`.trim();
    }
  };

  const handleDeclineClick = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    setDeclineSaleId(saleId);
    setDeclineReason('');
    setDeclineMode('remediation');
    setRequestedFiles(new Set());
    setIsDeclineModalOpen(true);
  };

  const normalizeAttachmentUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .flatMap(item => normalizeAttachmentUrls(item))
        .filter((url, index, self) => !!url && self.indexOf(url) === index);
    }

    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return normalizeAttachmentUrls(JSON.parse(trimmed));
      } catch {
        return [];
      }
    }

    return [trimmed];
  };

  const confirmDecline = async () => {
    if (declineSaleId) {
      await wrapAction(async () => {
        const filesToRequest = declineMode === 'straight' ? [] : Array.from(requestedFiles);
        const reasonToSubmit = declineMode === 'straight' ? 'Straight rejection' : declineReason;
        await Promise.resolve(onDeclineSale(declineSaleId, reasonToSubmit, filesToRequest));
        setIsDeclineModalOpen(false);
        setDeclineSaleId(null);
        setDeclineReason('');
        setDeclineMode('remediation');
        setRequestedFiles(new Set());
        if (selectedSale?.id === declineSaleId) setSelectedSale(null);
      }, 'Synchronizing Sale Decline with Database...', { silent: true });
    }
  };

  const handleDeleteSale = (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    if (!onBulkDeleteSales) return;
    
    const confirmMessage = "Are you sure you want to permanently delete this sale record? This action cannot be undone and will remove it from the verification queue.";
    triggerConfirm(
      "Remove Sale Record",
      confirmMessage,
      "Delete Record",
      async () => {
        await wrapAction(async () => {
          await Promise.resolve(onBulkDeleteSales([saleId]));
          if (selectedSale?.id === saleId) setSelectedSale(null);
        }, 'Permanently Removing Sale Record...', { silent: true });
      }
    );
  };

  const renderSaleCard = (sale: SaleRecord) => {
    const liveArt = getArtwork(sale.artworkId);
    const isCorrupted = !liveArt && (!sale.artworkSnapshot || !sale.artworkSnapshot.title || sale.artworkSnapshot.title === 'Untitled Artwork');
    
    const art = {
      ...(liveArt || {}),
      ...(sale.artworkSnapshot || {}),
      imageUrl: sale.artworkSnapshot?.imageUrl || liveArt?.imageUrl || '',
      title: sale.artworkSnapshot?.title || liveArt?.title || 'Untitled Artwork',
      artist: sale.artworkSnapshot?.artist || liveArt?.artist || 'Unknown Artist',
      price: sale.artworkSnapshot?.price || liveArt?.price || 0
    };

    const isFull = !sale.isDownpayment || sale.downpayment === (art?.price || 0);

    return (
      <div 
        key={sale.id} 
        onClick={() => setSelectedSale(sale)}
        className="group relative flex flex-col cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 h-full"
      >
        {/* Card Header with Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/60 backdrop-blur-md px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white border border-white/10 shadow-sm">
          <span className={`w-1.5 h-1.5 rounded-full ${isCorrupted ? 'bg-rose-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
          <span>{isCorrupted ? 'Corrupted' : 'Pending'}</span>
        </div>

        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {userPermissions?.canManageAccounts && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSale(e, sale.id);
              }}
              className="p-1 rounded-full bg-slate-900/40 text-white hover:text-red-500 hover:bg-white border border-white/10 shadow-sm transition-colors backdrop-blur-sm"
              title="Delete Record"
            >
              <Trash2 size={10} />
            </button>
          )}
          {isFull ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm border border-emerald-400/20">
              Full
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm border border-amber-400/20">
              Down
            </span>
          )}
          {sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm animate-pulse border border-blue-500/20">
              Re-upload
            </span>
          )}
        </div>

        {/* Hero Section with Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-50 border-b border-slate-100">
          {art.imageUrl ? (
            <OptimizedImage 
              src={art.imageUrl} 
              alt={art.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <FileImage size={24} strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3.5 flex flex-col justify-between">
          <div>
            <h4 className={`text-xs font-black tracking-tight leading-snug line-clamp-1 uppercase ${isCorrupted ? 'text-rose-600' : 'text-slate-800'}`}>
              {art.title}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{art.artist}</p>
          </div>

          <div className="grid grid-cols-2 gap-1 mt-3 bg-slate-50/75 border border-slate-100 rounded-lg p-1.5 text-[10px] select-none">
            <div className="bg-white rounded-md p-1 border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col min-w-0">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Client</span>
              <span className="font-bold text-slate-700 truncate mt-0.5">{sale.clientName}</span>
            </div>
            <div className="bg-white rounded-md p-1 border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col min-w-0">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Agent</span>
              <span className="font-bold text-slate-700 truncate mt-0.5">{sale.agentName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
            <div>
              <p className="text-[7.5px] font-bold uppercase tracking-widest text-slate-400">
                {isFull ? 'Final Price' : 'Downpayment'}
              </p>
              <span className="text-[11px] font-black text-emerald-600 tracking-tight block mt-0.5">
                {formatCurrency(sale.downpayment || 0)}
              </span>
            </div>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50/80 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-md tracking-wider transition-all duration-200 flex items-center gap-0.5 border border-blue-100/30">
              REVIEW
              <ChevronRight size={10} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    );
  };


  const renderSaleRow = (sale: SaleRecord) => {
    const liveArt = getArtwork(sale.artworkId);
    const art = {
      ...(liveArt || {}),
      ...(sale.artworkSnapshot || {}),
      imageUrl: sale.artworkSnapshot?.imageUrl || liveArt?.imageUrl || '',
      title: sale.artworkSnapshot?.title || liveArt?.title || 'Untitled Artwork',
      artist: sale.artworkSnapshot?.artist || liveArt?.artist || 'Unknown Artist',
      price: sale.artworkSnapshot?.price || liveArt?.price || 0
    };

    return (
      <div
        key={sale.id}
        onClick={() => setSelectedSale(sale)}
        className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          {/* Artwork Info */}
          <div className="flex items-center gap-5 lg:w-[400px] shrink-0">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
              {art.imageUrl ? (
                <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <FileImage size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                {(!sale.isDownpayment || sale.downpayment === (art?.price || 0) || (sale.discountedPrice !== undefined && sale.downpayment === sale.discountedPrice)) ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-wider rounded border border-emerald-100">Full</span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider rounded border border-amber-100">Down</span>
                )}
                <span className="text-[10px] font-bold text-slate-400">#{sale.id.slice(0, 6)}</span>
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight truncate leading-none mb-1">{art.title}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-medium text-slate-500">{art.artist}</p>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-tight bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                    ₱{sale.discountedPrice?.toLocaleString()} (-{sale.discountPercentage}%)
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">₱{art.price.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 border-l border-slate-100 lg:mx-4">
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</p>
                <p className="text-xs font-bold text-slate-700 truncate">{sale.clientName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent</p>
                <p className="text-xs font-bold text-slate-700 truncate">{sale.agentName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                <p className="text-xs font-medium text-slate-600">{new Date(sale.saleDate).toLocaleDateString()}</p>
             </div>
             <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection</p>
                <div className="text-xs font-black text-emerald-600">
                  {formatCurrency(sale.downpayment || 0)}
                  {sale.discountPercentage !== undefined && sale.discountPercentage > 0 && (
                    <span className="text-[8.5px] font-black text-emerald-800 ml-1">(-{sale.discountPercentage}%)</span>
                  )}
                </div>
             </div>
             <div className="hidden xl:flex flex-col justify-center border-l border-slate-100 pl-4">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-tight leading-none mb-1">Awaiting Approval</p>
                <p className="text-[8px] font-bold text-orange-400 uppercase tracking-tight leading-none">Zero ledger impact</p>
             </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col sm:flex-row items-center gap-4 lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6">
            <div className="flex-1 relative flex items-start gap-2.5 rounded-lg border border-blue-50 bg-blue-50/30 p-2.5 transition-colors hover:bg-blue-50">
               <input
                type="checkbox"
                id={`confirm-row-${sale.id}`}
                checked={!!contactConfirmed[sale.id]}
                onChange={() => handleToggleConfirm(sale.id)}
                className="mt-0.5 h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`confirm-row-${sale.id}`} className="text-[10px] font-medium text-slate-600 leading-tight">
                Verified buyer details
              </label>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               <button
                onClick={(e) => handleDeclineClick(e, sale.id)}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                title="Decline"
              >
                <XCircle size={18} />
              </button>
              {userPermissions?.canManageAccounts && (
                <button
                  onClick={(e) => handleDeleteSale(e, sale.id)}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Force Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSale(sale);
                }}
                disabled={isProcessing}
                className="h-10 px-6 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2"
                title="Open detail view to add remarks and approve"
              >
                <span>Review & Approve</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderCard = (group: { key: string, items: SaleRecord[], representative: SaleRecord }) => {
    const rep = group.representative;
    
    const totalValue = group.items.reduce((sum, item) => {
      const art = getArtwork(item.artworkId);
      const price = item.discountedPrice !== undefined ? item.discountedPrice : (item.artworkSnapshot?.price || art?.price || 0);
      return sum + price;
    }, 0);

    const images = group.items.map(item => {
      const art = getArtwork(item.artworkId);
      return item.artworkSnapshot?.imageUrl || art?.imageUrl || '';
    }).filter(Boolean);

    return (
      <div 
        onClick={() => setActiveFolderKey(group.key)}
        className="group relative flex flex-col cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.03)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 h-full"
      >
        {/* Card Header with Badges */}
        <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 rounded-full bg-slate-900/60 backdrop-blur-md px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white border border-white/10 shadow-sm">
          <Folder size={10} className="text-amber-400" />
          <span>Folder</span>
        </div>

        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm border border-blue-500/20">
            Bulk ({group.items.length})
          </span>
        </div>

        {/* Hero Section with stacked images deck (compact) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 flex items-center justify-center pt-3 border-b border-slate-100">
          <div className="relative w-[75%] h-[80%]">
            {images.slice(0, 3).map((img, idx) => {
              const rotation = idx === 0 ? '-5deg' : idx === 1 ? '5deg' : '0deg';
              const scale = idx === 0 ? 'scale-90' : idx === 1 ? 'scale-95' : 'scale-100';
              const translate = idx === 0 ? '-translate-y-1.5 -translate-x-2' : idx === 1 ? '-translate-y-1 translate-x-2' : '';
              const zIndex = idx === 2 ? 'z-20' : idx === 1 ? 'z-10' : 'z-0';
              
              return (
                <div 
                  key={idx}
                  style={{ transform: `rotate(${rotation})` }}
                  className={`absolute inset-0 bg-white border border-slate-200/85 rounded-md overflow-hidden shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-transform duration-300 group-hover:scale-105 ${scale} ${translate} ${zIndex}`}
                >
                  {img ? (
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300 bg-slate-50">
                      <Folder size={18} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3.5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black tracking-tight leading-snug line-clamp-1 text-slate-800 uppercase flex items-center gap-1">
              <FolderOpen className="text-blue-600" size={12} />
              Bulk Sale Folder
            </h4>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Purchased by {rep.clientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-1 mt-3 bg-slate-50/75 border border-slate-100 rounded-lg p-1.5 text-[10px] select-none">
            <div className="bg-white rounded-md p-1 border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col min-w-0">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Client</span>
              <span className="font-bold text-slate-700 truncate mt-0.5">{rep.clientName}</span>
            </div>
            <div className="bg-white rounded-md p-1 border border-slate-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col min-w-0">
              <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Agent</span>
              <span className="font-bold text-slate-700 truncate mt-0.5">{rep.agentName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
            <div>
              <p className="text-[7.5px] font-bold uppercase tracking-widest text-slate-400">Total Value</p>
              <span className="text-[11px] font-black text-emerald-600 tracking-tight block mt-0.5">
                {formatCurrency(totalValue)}
              </span>
            </div>
            <span className="text-[9px] font-black text-amber-600 bg-amber-50/80 hover:bg-amber-600 hover:text-white px-2.5 py-1 rounded-md tracking-wider transition-all duration-200 flex items-center gap-0.5 border border-amber-100/30">
              OPEN
              <ChevronRight size={10} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderRow = (group: { key: string, items: SaleRecord[], representative: SaleRecord }) => {
    const rep = group.representative;
    
    const totalValue = group.items.reduce((sum, item) => {
      const art = getArtwork(item.artworkId);
      const price = item.discountedPrice !== undefined ? item.discountedPrice : (item.artworkSnapshot?.price || art?.price || 0);
      return sum + price;
    }, 0);

    return (
      <div 
        onClick={() => setActiveFolderKey(group.key)}
        className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-300 hover:border-blue-400 hover:shadow-md cursor-pointer"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-4">
          <div className="flex items-center gap-4 lg:w-[400px] shrink-0">
            {(() => {
              const images = group.items.map(item => {
                const art = getArtwork(item.artworkId);
                return item.artworkSnapshot?.imageUrl || art?.imageUrl || '';
              }).filter(Boolean);

              return (
                <div className="w-12 h-12 relative shrink-0">
                  {images.length === 0 ? (
                    <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                      <Folder size={24} />
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      {images.slice(0, 3).map((img, idx) => {
                        const offset = idx * 4;
                        const zIndex = 30 - idx * 10;
                        return (
                          <div
                            key={idx}
                            className="absolute rounded border border-white bg-white shadow-sm overflow-hidden"
                            style={{
                              width: '34px',
                              height: '34px',
                              left: `${offset}px`,
                              top: `${offset}px`,
                              zIndex: zIndex,
                            }}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black uppercase tracking-wider rounded border border-blue-100">Bulk Folder</span>
                <span className="text-[10px] font-bold text-slate-400">{group.items.length} Items</span>
              </div>
              <h4 className="font-bold text-slate-900 tracking-tight leading-none">Bulk Purchase Folder</h4>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 border-l border-slate-100 lg:mx-4">
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Client</p>
                <p className="text-xs font-bold text-slate-700 truncate">{rep.clientName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent</p>
                <p className="text-xs font-bold text-slate-700 truncate">{rep.agentName}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                <p className="text-xs font-medium text-slate-600">{new Date(rep.saleDate).toLocaleDateString()}</p>
             </div>
             <div className="space-y-1 text-right sm:text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Folder Value</p>
                <div className="text-xs font-black text-emerald-600">
                  ₱{totalValue.toLocaleString()}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 justify-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden xl:inline">Click to Open Folder</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const selectedSaleArtwork = selectedSale ? getArtwork(selectedSale.artworkId) : null;
  const selectedSaleAttachments = selectedSale
    ? [
        {
          label: 'IT / DR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.itdrUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.itdrImageUrl);
          })(),
          tone: 'emerald'
        },
        {
          label: 'RSA / AR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.rsaUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.rsaImageUrl);
          })(),
          tone: 'amber'
        },
        {
          label: 'OR / CR',
          urls: (() => {
            const saleUrls = normalizeAttachmentUrls(selectedSale.orCrUrl);
            return saleUrls.length > 0 ? saleUrls : normalizeAttachmentUrls(selectedSaleArtwork?.orCrImageUrl);
          })(),
          tone: 'blue'
        }
      ]
    : [];
  const selectedSaleChecklist = getChecklistState(selectedSale);


  // Approval History
  const approvalHistory = useMemo(() => {
    return sales
      .filter(s => s.status === SaleStatus.APPROVED || s.status === SaleStatus.DECLINED)
      .map(s => {
        const art = artworks.find(a => a.id === s.artworkId);
        return {
          ...s,
          artwork: art,
          branch: art?.currentBranch || 'Main'
        };
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, artworks]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    approvalHistory.forEach(h => {
      if (h.branch) set.add(h.branch);
    });
    return ['All', ...Array.from(set)].sort();
  }, [approvalHistory]);

  const filteredHistory = useMemo(() => {
    return approvalHistory.filter(h => {
      const matchesBranch = selectedBranch === 'All' || h.branch === selectedBranch;
      const matchesStatus = historyStatusFilter === 'all' || 
        (historyStatusFilter === 'approved' && h.status === SaleStatus.APPROVED) ||
        (historyStatusFilter === 'declined' && h.status === SaleStatus.DECLINED);
      
      const searchLower = historySearchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower ||
        h.clientName.toLowerCase().includes(searchLower) ||
        (h.agentName || '').toLowerCase().includes(searchLower) ||
        (h.artwork?.title || '').toLowerCase().includes(searchLower) ||
        (h.artwork?.artist || '').toLowerCase().includes(searchLower) ||
        (h.branch || '').toLowerCase().includes(searchLower);
      
      return matchesBranch && matchesStatus && matchesSearch;
    });
  }, [approvalHistory, selectedBranch, historyStatusFilter, historySearchQuery]);

  const handleToggleSelectAllHistory = () => {
    if (selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds(filteredHistory.map(h => h.id));
    }
  };

  const handleToggleSelectHistory = (id: string) => {
    setSelectedHistoryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (onBulkDeleteSales && selectedHistoryIds.length > 0) {
      await Promise.resolve(onBulkDeleteSales(selectedHistoryIds));
      setSelectedHistoryIds([]);
    }
  };

  const groupedPendingSales = useMemo(() => {
    const groups: Record<string, SaleRecord[]> = {};
    filteredPendingSales.forEach(sale => {
      const key = `${sale.clientName.trim().toLowerCase()}_${sale.agentName.trim().toLowerCase()}_${new Date(sale.saleDate).toDateString()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(sale);
    });
    return Object.entries(groups).map(([key, items]) => ({
      key,
      items,
      representative: items[0]
    }));
  }, [filteredPendingSales]);

  const singleCount = useMemo(() => {
    return groupedPendingSales.filter(g => g.items.length === 1).length;
  }, [groupedPendingSales]);

  const bulkCount = useMemo(() => {
    return groupedPendingSales.filter(g => g.items.length > 1).length;
  }, [groupedPendingSales]);

  const displayedPendingSales = useMemo(() => {
    return groupedPendingSales.filter(group => {
      if (purchaseTypeTab === 'all') return true;
      if (purchaseTypeTab === 'single') return group.items.length === 1;
      if (purchaseTypeTab === 'bulk') return group.items.length > 1;
      return true;
    });
  }, [groupedPendingSales, purchaseTypeTab]);

  const activeFolder = useMemo(() => {
    if (!activeFolderKey) return null;
    return groupedPendingSales.find(g => g.key === activeFolderKey) || null;
  }, [groupedPendingSales, activeFolderKey]);

  return (
    <div className={`max-w-[1600px] w-full ${hideHeader ? '' : 'mx-auto p-4 md:p-8 space-y-10'}`}>
      <LoadingOverlay isVisible={isProcessing} title={processMessage} />
      {/* Header Section */}
      {!hideHeader && (
        <div className="flex flex-col gap-6 border-b-2 border-neutral-900 pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Sales Approval</h1>
              <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-widest">Review and verify sale declarations</p>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div className="pr-6 border-r border-neutral-200">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Queue</p>
                <p className="text-2xl font-black text-neutral-900">{pendingSales.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Verified</p>
                <p className="text-2xl font-black text-neutral-900">{approvalHistory.length}</p>
              </div>
            </div>
          </div>

          {/* Primary Tabs */}
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200">
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <ShieldCheck size={14} />
              Pending
              {pendingSales.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                  {pendingSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              <Clock size={14} />
              History
            </button>
          </div>
        </div>
      )}

      {hideHeader && !externalActiveTab && (
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-sm w-fit border border-neutral-200 mb-8">
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'approval' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Pending Approval
              {pendingSales.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full">
                  {pendingSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/50' : 'text-neutral-400 hover:text-neutral-600'}`}
            >
              Approval History
            </button>
          </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'approval' ? (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
              {pendingSales.length === 0 ? (
              <div className="py-24 bg-neutral-50 rounded-sm border border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
                <ShieldCheck size={56} strokeWidth={1} />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">Queue Synchronized</p>
                  <p className="text-[10px] font-bold mt-1 tracking-widest">No pending sale declarations require verification.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Sub-tabs for purchase types */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200/60 shadow-sm">
                  <button
                    onClick={() => setPurchaseTypeTab('all')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      purchaseTypeTab === 'all'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>All Sales</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${purchaseTypeTab === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/50 text-slate-400'}`}>
                      {groupedPendingSales.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setPurchaseTypeTab('single')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      purchaseTypeTab === 'single'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Single Purchases</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${purchaseTypeTab === 'single' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/50 text-slate-400'}`}>
                      {singleCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setPurchaseTypeTab('bulk')}
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      purchaseTypeTab === 'bulk'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span>Bulk Folders</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${purchaseTypeTab === 'bulk' ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/50 text-slate-400'}`}>
                      {bulkCount}
                    </span>
                  </button>
                </div>

                {/* Search and Filters Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-md border border-neutral-200 shadow-sm">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search by client, agent, or artwork..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                    {/* Payment Type filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Filter size={11} />
                        Payment
                      </span>
                      <select
                        value={paymentTypeFilter}
                        onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                      >
                        <option value="all">All</option>
                        <option value="full">Full Payment</option>
                        <option value="down">Downpayment</option>
                      </select>
                    </div>

                    {/* Branch filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Filter size={11} />
                        Branch
                      </span>
                      <select
                        value={pendingBranchFilter}
                        onChange={(e) => setPendingBranchFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                      >
                        <option value="All">All</option>
                        {pendingBranches.filter(b => b !== 'All').map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>

                    {/* View Mode controls */}
                    <div className="flex gap-1 p-1 bg-slate-200/60 rounded-lg border border-slate-200/40 ml-auto lg:ml-0">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                      >
                        <Rows3 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {displayedPendingSales.length === 0 ? (
                  <div className="py-20 bg-slate-50/40 rounded-xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Search size={32} className="text-slate-300" />
                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {purchaseTypeTab === 'single' ? 'No single purchases found' : purchaseTypeTab === 'bulk' ? 'No bulk folders found' : 'No matching declarations'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "space-y-4"}>
                    {displayedPendingSales.map(group => {
                      if (group.items.length === 1) {
                        const sale = group.items[0];
                        return (
                          <div key={sale.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {viewMode === 'grid' ? renderSaleCard(sale) : renderSaleRow(sale)}
                          </div>
                        );
                      } else {
                        const isExpanded = !!expandedFolders[group.key];
                        return (
                          <div 
                            key={group.key} 
                            className={
                              viewMode === 'grid'
                                ? isExpanded
                                  ? "col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4 2xl:col-span-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                                  : "col-span-1 animate-in fade-in slide-in-from-bottom-2 duration-500"
                                : "animate-in fade-in slide-in-from-bottom-2 duration-500"
                            }
                          >
                            {viewMode === 'grid' ? renderFolderCard(group) : renderFolderRow(group)}
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-6">
              {/* History Search & Filters Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-100/50 p-4 rounded-xl border border-slate-200/60 backdrop-blur-sm shadow-sm">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search history by client, agent, or artwork..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                  {/* Status filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Filter size={11} />
                      Status
                    </span>
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                    >
                      <option value="all">All</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>

                  {/* Branch filter (dropdown) */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Filter size={11} />
                      Branch
                    </span>
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer"
                    >
                      {branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.02)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200">
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedHistoryIds.length === filteredHistory.length && filteredHistory.length > 0}
                          onChange={handleToggleSelectAllHistory}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Artwork</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Approval Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-10">
                            <Search size={32} className="text-slate-300" />
                            <div className="text-center">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">No matching history records</p>
                              <p className="text-[10px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/40 transition-all group duration-200">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.includes(h.id)}
                              onChange={() => handleToggleSelectHistory(h.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                {h.artwork?.imageUrl ? (
                                  <img src={h.artwork.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-200">
                                    <Tag size={16} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight block group-hover:text-blue-600 transition-colors">{h.artwork?.title || 'Untitled Artwork'}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">{h.artwork?.artist || 'Unknown Artist'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold text-slate-600">{h.clientName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-bold text-slate-600">{h.agentName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                              {h.branch || 'Main'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-widest border ${h.status === SaleStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100/80' : 'bg-rose-50 text-rose-700 border-rose-100/80'}`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-black text-slate-900">
                            {h.discountPercentage !== undefined && h.discountPercentage > 0 ? (
                              <div className="flex flex-col gap-0.5 leading-tight">
                                <span className="line-through text-slate-400 font-normal text-[10px]">₱{(h.artworkSnapshot?.price || h.artwork?.price || 0).toLocaleString()}</span>
                                <span className="text-emerald-600">₱{(h.discountedPrice || 0).toLocaleString()} <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded ml-1">-{h.discountPercentage}%</span></span>
                              </div>
                            ) : (
                              <span>₱{(h.artworkSnapshot?.price || h.artwork?.price || 0).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2 text-slate-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold">{new Date(h.saleDate).toLocaleDateString()}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selection Bar */}
              <AnimatePresence>
                {selectedHistoryIds.length > 0 && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-6 px-8 py-4 bg-neutral-900 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-800"
                  >
                    <div className="flex items-center gap-3 pr-6 border-r border-neutral-700">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center">
                        {selectedHistoryIds.length}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedHistoryIds([])}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-900/20"
                      >
                        <Trash2 size={14} />
                        Delete Permanently
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sale Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_80px_rgba(0,0,0,0.35),0_4px_24px_rgba(0,0,0,0.1)]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <ShieldCheck size={18} strokeWidth={2} />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Review Declaration</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedSale.id.substring(0, 8)}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest rounded">Pending</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-5">
                  {/* Left Column */}
                  <div className="space-y-8">
                    {/* Artwork Details Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                         <LayoutGrid size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Artwork Details</h3>
                      </div>
                      {(() => {
                        const liveArt = artworks.find(a => a.id === selectedSale.artworkId);
                        const displayArt = liveArt || selectedSale.artworkSnapshot;
                        
                        return (
                          <div className="flex gap-5">
                            {displayArt?.imageUrl ? (
                                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                                <OptimizedImage src={displayArt.imageUrl} alt="Artwork" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                               <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300">
                                <FileImage size={24} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{displayArt?.code || 'N/A'}</p>
                              <h4 className="text-lg font-black text-slate-900 leading-tight mb-1 truncate">{displayArt?.title || 'Untitled'}</h4>
                              <p className="text-sm font-bold text-slate-500 mb-3">{displayArt?.artist || 'Unknown Artist'}</p>
                               <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 border border-emerald-100">
                                <Tag size={12} />
                                <span className="text-xs font-black tracking-tight">{formatCurrency(displayArt?.price || 0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Client Info Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                         <User size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Client Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><User size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Full Name</span></div>
                           <p className="text-sm font-bold text-slate-700">{selectedSale.clientName}</p>
                        </div>
                         <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><Mail size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Email Address</span></div>
                           <p className="text-sm font-bold text-slate-700 truncate">{selectedSale.clientEmail || 'N/A'}</p>
                        </div>
                         <div className="col-span-full rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-slate-100">
                           <div className="flex items-center gap-2 mb-1 text-slate-400"><Phone size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Contact Number</span></div>
                           <p className="text-sm font-bold text-slate-700">{selectedSale.clientContact || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {selectedSale.requestedAttachments && selectedSale.requestedAttachments.length > 0 && (
                      <div className="rounded-md border border-[#CFE4FA] bg-[#F0F6FF] p-6 shadow-sm">
                         <div className="flex items-center gap-3 mb-4">
                           <Clock size={16} className="text-[#0078D4]" />
                           <h3 className="text-sm font-semibold text-[#005A9E]">Re-upload Context</h3>
                         </div>
                         <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {selectedSale.requestedAttachments.map(req => (
                                <span key={req} className="px-2 py-1 bg-white border border-[#A19F9D] text-[#323130] text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm">
                                  {req === 'itdr' ? 'IT/DR' : req === 'rsa' ? 'RSA/AR' : 'OR/CR'} REQUIRED
                                </span>
                              ))}
                            </div>
                            {selectedSale.declineReason && (
                              <div className="bg-white border-l-4 border-[#0078D4] rounded-sm p-4 shadow-sm">
                                <p className="text-[10px] font-bold text-[#605E5C] uppercase tracking-wider mb-1">Previous Admin Feedback</p>
                                <p className="text-sm font-medium text-[#323130] italic leading-relaxed">"{selectedSale.declineReason}"</p>
                              </div>
                            )}
                         </div>
                      </div>
                    )}

                    {/* Approval Checklist Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-white">
                         <ShieldCheck size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Approval Checklist</h3>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {[
                          {
                            key: 'buyerContacted' as const,
                            title: 'Buyer confirmed',
                            detail: 'Contact verification complete.'
                          },
                          {
                            key: 'clientDetailsVerified' as const,
                            title: 'Details verified',
                            detail: 'Info is correct/complete.'
                          },
                          {
                            key: 'pricingVerified' as const,
                            title: 'Pricing reviewed',
                            detail: 'Setup & price verified.'
                          },
                          {
                            key: 'documentsVerified' as const,
                            title: 'Proofs reviewed',
                            detail: 'Files valid & readable.'
                          }
                        ].map((item) => (
                          <label
                            key={item.key}
                             className="flex cursor-pointer items-start gap-3 px-5 py-3 transition-all hover:bg-slate-50"
                          >
                            <div className="relative flex items-center mt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedSaleChecklist[item.key]}
                                onChange={() => handleChecklistToggle(selectedSale, item.key)}
                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 transition-all checked:bg-blue-600 checked:border-blue-600"
                              />
                              <CheckCircle size={10} className="absolute left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700 leading-none mb-1">{item.title}</p>
                              <p className="text-[10px] text-slate-500 leading-tight">{item.detail}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Administrative Remarks */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                         <MessageSquare size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Administrative Remarks</h3>
                      </div>
                      <OptimizedTextarea
                        value={approvalRemarks}
                        onChange={(e: any) => setApprovalRemarks(e.target.value)}
                        placeholder="Add internal notes or audit remarks for this approval..."
                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Transaction Metadata Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center gap-2.5">
                         <Shield size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Transaction Details</h3>
                      </div>
                      <div className="divide-y divide-slate-50">
                         <div className="flex items-center justify-between px-5 py-3.5">
                           <div className="flex items-center gap-2.5 text-slate-400"><Calendar size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Sale Date</span></div>
                           <span className="text-xs font-black text-slate-800">{new Date(selectedSale.saleDate).toLocaleDateString()}</span>
                        </div>
                         <div className="flex items-center justify-between px-5 py-3.5">
                           <div className="flex items-center gap-2.5 text-slate-400"><Tag size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">{selectedSale.isDownpayment ? 'Downpayment' : 'Full Payment'}</span></div>
                           <span className="text-xs font-black text-emerald-600">{formatCurrency(selectedSale.downpayment || 0)}</span>
                        </div>
                        {selectedSale.discountPercentage !== undefined && selectedSale.discountPercentage > 0 && (
                          <>
                            <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50/40">
                              <div className="flex items-center gap-2.5 text-emerald-800"><Tag size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Applied Discount</span></div>
                              <span className="text-xs font-black text-emerald-800">-{selectedSale.discountPercentage}%</span>
                            </div>
                            <div className="flex items-center justify-between px-5 py-3.5">
                              <div className="flex items-center gap-2.5 text-slate-400"><Tag size={12} /><span className="text-[10px] font-bold uppercase tracking-widest">Discounted Price</span></div>
                              <span className="text-xs font-black text-emerald-600">{formatCurrency(selectedSale.discountedPrice || 0)}</span>
                            </div>
                          </>
                        )}
                         <div className="flex items-center justify-between px-6 py-4 bg-[#FAF9F8]">
                           <div className="flex items-center gap-3 text-[#605E5C]"><User size={14} /><span className="text-xs font-semibold">Handling Agent</span></div>
                           <span className="text-sm font-bold text-[#323130]">{selectedSale.agentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Attachments Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 px-1">
                         <Eye size={14} className="text-blue-600" />
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Verification Attachments</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedSaleAttachments.map((attachment) => {
                          const previewUrl = attachment.urls[0];
                          const previewKind = getAttachmentKind(previewUrl);
                          const isReady = attachment.urls.length > 0;

                          return (
                            <button
                              key={attachment.label}
                              type="button"
                              onClick={() => setActiveAttachmentGroup({ label: attachment.label, urls: attachment.urls })}
                              className="group flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:border-blue-500 hover:shadow-md text-left"
                            >
                              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                                <div>
                                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{attachment.label}</p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    {isReady ? `${attachment.urls.length} document(s) attached` : 'No proof uploaded'}
                                  </p>
                                </div>
                                <div className={`flex h-5 items-center px-2 rounded-md text-[8px] font-black uppercase tracking-widest border ${isReady ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  {isReady ? 'Ready' : 'Missing'}
                                </div>
                              </div>

                               <div className="p-3 bg-slate-50">
                                 <div className="relative aspect-video w-full rounded-lg border border-slate-100 bg-white flex items-center justify-center overflow-hidden">
                                  {previewUrl ? (
                                    <>
                                      {previewKind === 'image' ? (
                                        <OptimizedImage src={previewUrl} alt={attachment.label} className="w-full h-full object-contain" />
                                      ) : (
                                        <div className="flex flex-col items-center gap-3">
                                           <div className="h-12 w-12 flex items-center justify-center bg-[#F3F2F1] text-[#605E5C] rounded-sm">
                                            {previewKind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                                          </div>
                                          <p className="text-[10px] font-semibold text-[#605E5C] uppercase tracking-widest">{previewKind === 'pdf' ? 'PDF' : 'FILE'}</p>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5 flex items-center justify-center">
                                        <div className="opacity-0 translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0 flex items-center gap-2">
                                           <div className="bg-white text-[#323130] text-[10px] font-bold px-4 py-2 rounded-sm shadow-md flex items-center gap-2 border border-[#E1E1E1]">
                                             <Eye size={12} />
                                             Expand View
                                           </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center gap-2 text-[#A19F9D]">
                                      <AlertCircle size={20} />
                                      <span className="text-[9px] font-bold uppercase tracking-widest">Awaiting Upload</span>
                                    </div>
                                  )}
                                </div>
                               </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>              {/* Modal Footer */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row">
                <div className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100 max-w-sm">
                    <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Requirement Notice</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        Verify all items before approval. Declined declarations notify the agent.
                      </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleDeclineClick(e, selectedSale.id)}
                    className="h-10 px-6 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
                  >
                    Decline
                  </button>
                    <button
                      onClick={() => wrapAction(async () => {
                        await Promise.resolve(onApproveSale(selectedSale.id, approvalRemarks));
                        setSelectedSale(null);
                        setApprovalRemarks('');
                      }, 'Processing Sale Approval...', { silent: true })}
                      disabled={!isSaleReadyForApproval(selectedSale) || isProcessing}
                      className={`h-10 px-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                        isSaleReadyForApproval(selectedSale)
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                      }`}
                    >
                      Approve Declaration
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeAttachmentGroup && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_80px_rgba(0,0,0,0.35),0_4px_24px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <FileImage size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">{activeAttachmentGroup.label}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{activeAttachmentGroup.urls.length} Documents Verified</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAttachmentGroup(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
                {activeAttachmentGroup.urls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <AlertCircle size={48} className="mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No attachments found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {activeAttachmentGroup.urls.map((url, index) => {
                      const kind = getAttachmentKind(url);
                      const fileName = getAttachmentName(url, index);
                      return (
                        <div key={`${activeAttachmentGroup.label}-${url}-${index}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between gap-3 bg-white">
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">DOC {index + 1}</p>
                              <p className="text-xs font-bold text-slate-700 truncate">{fileName}</p>
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                            >
                              <ExternalLink size={12} />
                              Open
                            </a>
                          </div>
                          <div className="p-4 bg-slate-50">
                            <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-slate-100 bg-white flex items-center justify-center">
                              {kind === 'image' ? (
                                <OptimizedImage src={url} alt={fileName} className="w-full h-full object-contain p-2" />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
                                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200 shadow-sm">
                                    {kind === 'pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                      {kind === 'pdf' ? 'Acrobat' : 'System'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-600 break-all">{fileName}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decline Reason Modal */}
      <AnimatePresence>
        {isDeclineModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-slate-200"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center border border-rose-100">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Decline Declaration</h3>
                </div>
                <button
                  onClick={() => {
                    setIsDeclineModalOpen(false);
                    setDeclineSaleId(null);
                    setDeclineMode('remediation');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 bg-slate-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Rejection Type</label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/60 p-1">
                    {[
                      { id: 'remediation', label: 'Request Fixes' },
                      { id: 'straight', label: 'Straight Reject' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDeclineMode(option.id as 'remediation' | 'straight');
                          if (option.id === 'straight') setRequestedFiles(new Set());
                        }}
                        className={`h-9 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                          declineMode === option.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {declineMode === 'remediation' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Feedback</label>
                    <OptimizedTextarea
                      value={declineReason}
                      onChange={(e: any) => setDeclineReason(e.target.value)}
                      placeholder="Enter the specific reason for declining..."
                      className="w-full h-32 px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none placeholder:text-slate-300 shadow-sm"
                    />
                  </div>
                )}

                {declineMode === 'remediation' ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Request Re-uploads</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'itdr', label: 'IT/DR Record' },
                        { id: 'rsa', label: 'RSA/AR Agreement' },
                        { id: 'orcr', label: 'OR/CR Documents' }
                      ].map((file) => (
                        <button
                          key={file.id}
                          onClick={() => {
                            const next = new Set(requestedFiles);
                            if (next.has(file.id)) next.delete(file.id);
                            else next.add(file.id);
                            setRequestedFiles(next);
                          }}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                            requestedFiles.has(file.id)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {file.label}
                          {requestedFiles.has(file.id) && <CheckCircle size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                    <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Straight Rejection</p>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-rose-900">
                      This sale declaration will be declined without requesting new documents from the agent.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                   <button
                    onClick={() => {
                      setIsDeclineModalOpen(false);
                      setDeclineSaleId(null);
                      setDeclineMode('remediation');
                    }}
                    className="flex-1 h-10 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDecline}
                    disabled={declineMode === 'remediation' && !declineReason.trim()}
                    className={`flex-1 h-10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                      declineMode === 'straight' || declineReason.trim()
                        ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {declineMode === 'straight' ? 'Straight Reject' : 'Confirm Decline'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Microsoft Folder style Pop-up Dashboard Modal */}
      <AnimatePresence>
        {activeFolder && (() => {
          const rep = activeFolder.representative;
          const totalValue = activeFolder.items.reduce((sum, item) => {
            const art = getArtwork(item.artworkId);
            return sum + (item.discountedPrice !== undefined ? item.discountedPrice : (item.artworkSnapshot?.price || art?.price || 0));
          }, 0);
          
          return (
            <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-900/60 p-4 md:p-6 backdrop-blur-sm overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
              >
                {/* Folder Title Bar (Explorer style) */}
                <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200 select-none shrink-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Navigation buttons */}
                    <div className="flex items-center gap-1.5 mr-2 shrink-0">
                      <button 
                        onClick={() => setActiveFolderKey(null)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Back"
                      >
                        <ChevronRight className="rotate-180" size={16} />
                      </button>
                      <button 
                        disabled 
                        className="p-1.5 rounded text-slate-300 cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 bg-slate-100 border border-slate-200/80 rounded-md px-3 py-1.5 text-xs font-medium flex-1 max-w-md truncate">
                      <FolderOpen size={14} className="text-amber-500 shrink-0" />
                      <span className="text-slate-400">Finance Approval</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-400">Bulk Sales</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-700 font-bold">{rep.clientName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button
                      onClick={() => setActiveFolderKey(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>

                {/* Sub-header Stats panel */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                        Bulk Purchase Folder
                      </h2>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {activeFolder.items.length} Paintings
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Client: <span className="font-bold text-slate-800">{rep.clientName}</span> &bull; Agent: <span className="font-bold text-slate-800">{rep.agentName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Total Value</p>
                      <p className="text-xl font-black text-emerald-600">₱{totalValue.toLocaleString()}</p>
                      {onBulkDeleteSales && (
                      <button
                        onClick={() => {
                          triggerConfirm(
                            "Delete Bulk Folder",
                            `Are you sure you want to permanently delete all ${activeFolder.items.length} records inside this folder?`,
                            "Delete Folder",
                            async () => {
                              await wrapAction(async () => {
                                await Promise.resolve(onBulkDeleteSales(activeFolder.items.map(i => i.id)));
                                setActiveFolderKey(null);
                              }, 'Deleting Bulk Records...', { silent: true });
                            }
                          );
                        }}
                        className="h-9 px-4 rounded-none bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Delete Folder
                      </button>
                    )}
                    </div>
                  </div>
                </div>

                {/* Explorer File View Area */}
                <div className="custom-scrollbar flex-1 overflow-y-auto p-6 bg-slate-100/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {activeFolder.items.map(sale => (
                      <div key={sale.id} className="animate-in fade-in zoom-in-95 duration-200">
                        {renderSaleCard(sale)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explorer style Status Bar */}
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-[10.5px] font-bold text-slate-500 select-none shrink-0">
                  <div className="flex items-center gap-3">
                    <Folder size={12} className="text-amber-500" />
                    <span>{activeFolder.items.length} files selected</span>
                  </div>
                  <div>
                    <span>Total Valuation: <span className="text-slate-800 font-black">₱{totalValue.toLocaleString()}</span></span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white border border-slate-200 w-full max-w-md overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.3)] flex flex-col rounded-none"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-white">
                <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-none flex items-center justify-center border border-rose-100">
                  <Trash2 size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{confirmConfig.title}</h3>
              </div>

              <div className="p-6 space-y-6 bg-slate-50">
                <p className="text-xs font-bold leading-relaxed text-slate-600 uppercase tracking-wider">
                  {confirmConfig.message}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setConfirmConfig(null)}
                    className="flex-1 h-10 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95 rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig(null);
                    }}
                    className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 rounded-none shadow-lg shadow-rose-200"
                  >
                    {confirmConfig.actionLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesApprovalPage;
