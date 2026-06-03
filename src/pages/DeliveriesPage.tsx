
import React, { useState, useMemo, useEffect } from 'react';
import { SaleRecord, Artwork, ArtworkStatus, SaleStatus, UserPermissions, DeliveryRequest, DeliveryRequestStatus, ActivityLog, Branch, ReturnType, FramerRecord, ReturnRecord, TransferRequest, ExhibitionEvent, UserRole } from '../types';
import { ICONS } from '../constants';
import { Truck, Clock, Search, CheckCircle2, AlertCircle, LayoutGrid, List as ListIcon, Users, X, User, Filter, Info, Inbox, RefreshCw, Ban, Paperclip, Upload, Trash2 } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { StatusBadge } from '../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import MasterView from './MasterView';
import DeliveryFinalizationModal from '../components/modals/DeliveryFinalizationModal';
import DeliveryRequestModal from '../components/modals/DeliveryRequestModal';
import DeliveryRequestsPage from './DeliveryRequestsPage';
import { uploadBase64ToStorage } from '../services/supabaseStorageService';

type DeliveryTab = 'requests' | 'active' | 'rescheduled' | 'pending' | 'delivered' | 'failed';

interface DeliveriesPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  logs: ActivityLog[];
  branches: string[];
  events: ExhibitionEvent[];
  framerRecords: FramerRecord[];
  returnRecords: ReturnRecord[];
  transferRequests: TransferRequest[];
  userPermissions?: UserPermissions;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => Promise<boolean>;
  onDispatch?: (artworkId: string) => Promise<boolean>;
  onDeliver?: (artworkId: string, itdr?: string, rsa?: string, orcr?: string, carrier?: string, referenceNumber?: string, remarks?: string) => Promise<boolean>;
  onReturn?: (id: string, reason: string, refNumber?: string, proofImage?: string | string[], remarks?: string, type?: ReturnType) => Promise<boolean | void> | boolean | void;
  onReturnToGallery?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onSendToFramer?: (id: string, damageDetails: string, attachmentUrl?: string | string[]) => Promise<boolean | void> | boolean | void;
  onReturnFromFramer?: (recordId: string, branch: string, resolvedAt?: string, remarks?: string) => Promise<boolean | void> | boolean | void;
  onTransfer?: (id: string, destination: Branch, attachments?: { itdrUrl?: string | string[] }, remarks?: string) => void;
  onReserve?: (id: string, details: string, expiryDate?: string, eventId?: string, eventName?: string) => Promise<boolean | void> | boolean | void;
  onCancelReservation?: (id: string) => Promise<boolean | void> | boolean | void;
  onSale: (id: string, clientName: string, clientEmail: string, clientContact: string, delivered: boolean, eventInfo?: { id: string, name: string }, attachment?: string, itdr?: string[], rsa?: string[], orcr?: string[], downpayment?: number, isDownpayment?: boolean, remarks?: string) => void;
  onCancelSale: (id: string) => void;
  onApproveRequest?: (saleId: string, remarks: string) => void;
  onDeclineRequest?: (saleId: string, reason: string) => void;
  onDeleteSale?: (saleId: string) => Promise<boolean>;
  currentUser?: any;
}


const DeliveriesPage: React.FC<DeliveriesPageProps> = ({ 
  sales = [], 
  artworks = [], 
  logs = [],
  branches = [],
  events = [],
  framerRecords = [],
  returnRecords = [],
  transferRequests = [],
  userPermissions,
  onUpdateSale,
  onDispatch,
  onDeliver,
  onReturn,
  onReturnToGallery,
  onSendToFramer,
  onReturnFromFramer,
  onTransfer,
  onReserve,
  onCancelReservation,
  onSale,
  onCancelSale,
  onApproveRequest,
  onDeclineRequest,
  onDeleteSale,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [requestModalSale, setRequestModalSale] = useState<{sale: SaleRecord, artwork: any} | null>(null);
  const [finalizeModalSale, setFinalizeModalSale] = useState<{sale: SaleRecord, artwork: any} | null>(null);
  const [detailsSale, setDetailsSale] = useState<{sale: SaleRecord, artwork: Artwork} | null>(null);
  const [deliveryActionSale, setDeliveryActionSale] = useState<{sale: SaleRecord, artwork: Artwork, mode: 'reschedule' | 'cancel'} | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [returnDestination, setReturnDestination] = useState('Main Office');
  const [returnItdrAttachment, setReturnItdrAttachment] = useState('');
  const [returnItdrAttachmentName, setReturnItdrAttachmentName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | 'All'>('All');
  const [activeTab, setActiveTab] = useState<DeliveryTab>('requests');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);



  const getDeliveryDueTime = (sale: SaleRecord) => {
    const dateValue = sale.deliveryRequest?.deliveryDate || sale.deliveryDate;
    if (!dateValue) return null;
    const normalizedDate = dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00`;
    const dueTime = new Date(normalizedDate).getTime();
    return Number.isNaN(dueTime) ? null : dueTime;
  };

  const isWaitingOnReschedule = (sale: SaleRecord) => {
    if (!sale.deliveryRequest?.rescheduledAt) return false;
    const dueTime = getDeliveryDueTime(sale);
    return dueTime !== null && dueTime > now.getTime();
  };

  const getRescheduleCountdown = (sale: SaleRecord) => {
    const dueTime = getDeliveryDueTime(sale);
    if (dueTime === null) return 'Awaiting active slot';

    const remaining = Math.max(0, dueTime - now.getTime());
    if (remaining === 0) return 'Ready for active delivery';

    const totalMinutes = Math.ceil(remaining / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const tabCounts = useMemo(() => {
    const counts = { requests: 0, active: 0, rescheduled: 0, pending: 0, delivered: 0, failed: 0 };
    sales.forEach(sale => {
      if (sale.status !== SaleStatus.APPROVED || sale.isCancelled) return;
      
      if (sale.isDelivered) {
        counts.delivered++;
      } else {
        const status = sale.deliveryRequest?.status;
        const isRescheduled = isWaitingOnReschedule(sale);
        if (status === DeliveryRequestStatus.PENDING) counts.requests++;
        else if ((status === DeliveryRequestStatus.APPROVED || status === DeliveryRequestStatus.DISPATCHED) && isRescheduled) counts.rescheduled++;
        else if (status === DeliveryRequestStatus.APPROVED || status === DeliveryRequestStatus.DISPATCHED) counts.active++;
        else if (!status) counts.pending++;
        else if (status === DeliveryRequestStatus.DECLINED || status === DeliveryRequestStatus.CANCELLED) counts.failed++;
      }
    });
    return counts;
  }, [sales, now]);

  const deliveryItems = useMemo(() => {
    return sales.filter(sale => {
      const isApprovedSale = sale.status === SaleStatus.APPROVED;
      const notCancelled = !sale.isCancelled;
      
      if (!isApprovedSale || notCancelled === false) return false;

      // Filter by Tab
      const hasRequest = !!sale.deliveryRequest;
      const requestStatus = sale.deliveryRequest?.status;
      const isRescheduled = isWaitingOnReschedule(sale);

      if (activeTab === 'requests') {
        if (sale.isDelivered || requestStatus !== DeliveryRequestStatus.PENDING) return false;
      } else if (activeTab === 'active') {
        if (sale.isDelivered || isRescheduled || (requestStatus !== DeliveryRequestStatus.APPROVED && requestStatus !== DeliveryRequestStatus.DISPATCHED)) return false;
      } else if (activeTab === 'rescheduled') {
        if (sale.isDelivered || !isRescheduled || (requestStatus !== DeliveryRequestStatus.APPROVED && requestStatus !== DeliveryRequestStatus.DISPATCHED)) return false;
      } else if (activeTab === 'pending') {
        if (sale.isDelivered || hasRequest) return false; // Show only those without requests
      } else if (activeTab === 'delivered') {
        if (!sale.isDelivered) return false;
      } else if (activeTab === 'failed') {
        if (sale.isDelivered || (requestStatus !== DeliveryRequestStatus.DECLINED && requestStatus !== DeliveryRequestStatus.CANCELLED)) return false;
      }
      
      const artwork = artworks.find(a => a.id === sale.artworkId) || ({ ...sale.artworkSnapshot, id: sale.artworkId, status: 'Sold', createdAt: sale.saleDate } as any);
      if (!artwork) return false;

      const title = (artwork.title || '').toLowerCase();
      const code = (artwork.code || '').toLowerCase();
      const clientName = (sale.clientName || '').toLowerCase();
      const search = searchQuery.toLowerCase();

      const matchesSearch = 
        title.includes(search) ||
        code.includes(search) ||
        clientName.includes(search);
      
      const matchesBranch = selectedBranch === 'All' || 
        (artwork as Artwork).currentBranch === selectedBranch || 
        (sale.artworkSnapshot?.currentBranch === selectedBranch);

      const registryKey = activeTab === 'requests' ? (sale.agentName || 'Unknown Agent') : (sale.clientName || 'Unknown Client');
      const matchesRegistrySelection = selectedClientId === 'All' || registryKey === selectedClientId;

      return matchesSearch && matchesBranch && matchesRegistrySelection;
    }).sort((a, b) => {
      const dateA = a.deliveryDate || a.saleDate;
      const dateB = b.deliveryDate || b.saleDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [sales, artworks, searchQuery, selectedBranch, selectedClientId, activeTab, now]);

  const allClientStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    sales.forEach(sale => {
      const isApprovedSale = sale.status === SaleStatus.APPROVED;
      if (!isApprovedSale || sale.isCancelled) return;

      // Tab Filtering for counts
      const hasRequest = !!sale.deliveryRequest;
      const requestStatus = sale.deliveryRequest?.status;
      const isRescheduled = isWaitingOnReschedule(sale);

      let matchesTab = false;
      if (activeTab === 'requests') {
        matchesTab = !sale.isDelivered && requestStatus === DeliveryRequestStatus.PENDING;
      } else if (activeTab === 'active') {
        matchesTab = !sale.isDelivered && !isRescheduled && (requestStatus === DeliveryRequestStatus.APPROVED || requestStatus === DeliveryRequestStatus.DISPATCHED);
      } else if (activeTab === 'rescheduled') {
        matchesTab = !sale.isDelivered && isRescheduled && (requestStatus === DeliveryRequestStatus.APPROVED || requestStatus === DeliveryRequestStatus.DISPATCHED);
      } else if (activeTab === 'pending') {
        matchesTab = !sale.isDelivered && !hasRequest;
      } else if (activeTab === 'delivered') {
        matchesTab = sale.isDelivered === true;
      } else if (activeTab === 'failed') {
        matchesTab = !sale.isDelivered && (requestStatus === DeliveryRequestStatus.DECLINED || requestStatus === DeliveryRequestStatus.CANCELLED);
      }

      if (matchesTab) {
        const key = activeTab === 'requests' ? (sale.agentName || 'Unknown Agent') : sale.clientName;
        stats[key] = (stats[key] || 0) + 1;
      }
    });
    return Object.entries(stats).sort(([a], [b]) => a.localeCompare(b));
  }, [sales, activeTab, now]);

  const filteredClientStats = useMemo(() => {
    if (!clientSearchQuery) return allClientStats;
    return allClientStats.filter(([client]) => 
      client.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );
  }, [allClientStats, clientSearchQuery]);

  const deliveryBranches = useMemo(() => {
    const b = new Set<string>();
    artworks.forEach(a => {
      if (a.currentBranch) b.add(a.currentBranch);
    });
    return Array.from(b).sort();
  }, [artworks]);

  const returnDestinationOptions = useMemo(() => {
    const options = new Map<string, string>();
    const addOption = (value?: string) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!options.has(key)) options.set(key, trimmed);
    };

    addOption('Main Office');
    addOption(deliveryActionSale?.artwork.currentBranch);
    addOption(deliveryActionSale?.sale.artworkSnapshot?.currentBranch);
    addOption(currentUser?.branch);
    branches.forEach(addOption);
    deliveryBranches.forEach(addOption);

    return Array.from(options.values()).sort((a, b) => {
      if (a === 'Main Office') return -1;
      if (b === 'Main Office') return 1;
      return a.localeCompare(b);
    });
  }, [branches, currentUser?.branch, deliveryActionSale, deliveryBranches]);

  const currentReturnBranch = (
    deliveryActionSale?.artwork.currentBranch ||
    deliveryActionSale?.sale.artworkSnapshot?.currentBranch ||
    currentUser?.branch ||
    ''
  ).trim();

  const returnRequiresItdr = !!returnDestination.trim() &&
    returnDestination.trim().toLowerCase() !== 'main office' &&
    (!currentReturnBranch || returnDestination.trim().toLowerCase() !== currentReturnBranch.toLowerCase());

  const handleSubmitRequest = (requestData: Partial<DeliveryRequest>) => {
    if (!requestModalSale || !onUpdateSale) return;

    const newRequest: DeliveryRequest = {
      id: `DRQ-${Date.now()}`,
      saleId: requestModalSale.sale.id,
      clientAddress: requestData.clientAddress!,
      deliveryDate: requestData.deliveryDate!,
      extraPersonnelCount: requestData.extraPersonnelCount!,
      toolsNeeded: requestData.toolsNeeded || [],
      remarks: requestData.remarks,
      status: DeliveryRequestStatus.PENDING,
      requestedAt: new Date().toISOString(),
      requestedBy: currentUser?.name || 'System User',
    };

    onUpdateSale(requestModalSale.sale.id, {
      deliveryRequest: newRequest
    });
    setRequestModalSale(null);
  };

  const resetDeliveryActionForm = () => {
    setDeliveryActionSale(null);
    setRescheduleDate('');
    setRescheduleReason('');
    setCancelReason('');
    setReturnDestination('Main Office');
    setReturnItdrAttachment('');
    setReturnItdrAttachmentName('');
  };

  const handleReturnItdrAttachment = (file?: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReturnItdrAttachment(String(reader.result || ''));
      setReturnItdrAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRescheduleDelivery = async () => {
    if (!deliveryActionSale || !deliveryActionSale.sale.deliveryRequest || !onUpdateSale || !rescheduleDate) return;

    const existingRemarks = deliveryActionSale.sale.deliveryRequest.remarks || '';
    const updateNote = `Rescheduled to ${new Date(rescheduleDate).toLocaleDateString()}${rescheduleReason ? `: ${rescheduleReason}` : ''}`;
    const updatedRequest: DeliveryRequest = {
      ...deliveryActionSale.sale.deliveryRequest,
      deliveryDate: rescheduleDate,
      status: DeliveryRequestStatus.APPROVED,
      rescheduledAt: new Date().toISOString(),
      rescheduledBy: currentUser?.name || 'System User',
      rescheduleReason: rescheduleReason || undefined,
      remarks: existingRemarks ? `${existingRemarks}\n${updateNote}` : updateNote
    };

    const ok = await onUpdateSale(deliveryActionSale.sale.id, { deliveryRequest: updatedRequest });
    if (ok !== false) resetDeliveryActionForm();
  };

  const handleCancelDelivery = async () => {
    if (!deliveryActionSale || !deliveryActionSale.sale.deliveryRequest || !onUpdateSale || !cancelReason.trim()) return;
    if (returnRequiresItdr && !returnItdrAttachment) return;

    const uploadedReturnItdr = returnRequiresItdr
      ? await uploadBase64ToStorage(returnItdrAttachment, 'images', 'attachments')
      : undefined;

    const destinationText = returnRequiresItdr
      ? `${returnDestination} / ITDR attached`
      : returnDestination;
    const existingRemarks = deliveryActionSale.sale.deliveryRequest.remarks || '';
    const cancelNote = `Delivery cancelled. Return destination: ${destinationText}. Reason: ${cancelReason.trim()}`;
    const updatedRequest: DeliveryRequest = {
      ...deliveryActionSale.sale.deliveryRequest,
      status: DeliveryRequestStatus.CANCELLED,
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser?.name || 'System User',
      cancellationReason: cancelReason.trim(),
      returnDestination: destinationText,
      returnItdrNumber: undefined,
      returnItdrAttachment: returnRequiresItdr ? (uploadedReturnItdr || returnItdrAttachment) : undefined,
      remarks: existingRemarks ? `${existingRemarks}\n${cancelNote}` : cancelNote
    };

    const ok = await onUpdateSale(deliveryActionSale.sale.id, { deliveryRequest: updatedRequest });
    if (ok !== false) resetDeliveryActionForm();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#faf9f8]">
      {/* Client Navigator Sidebar with Search */}
      <div className="w-80 bg-[#f3f2f1] border-r border-[#edebe9] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#edebe9] bg-white">
           <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-black text-[#323130] flex items-center gap-3 uppercase tracking-tight">
                  {activeTab === 'requests' ? (
                    <Users className="text-[#605e5c]" size={18} strokeWidth={2.5} />
                  ) : (
                    <User className="text-[#605e5c]" size={18} strokeWidth={2.5} />
                  )}
                  {activeTab === 'requests' ? 'Agent Registry' : 'Client Registry'}
                </h2>
                <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.2em] mt-1">
                  {activeTab === 'requests' ? 'Pending Logistics' : 'Pending fulfillment'}
                </p>
              </div>
           </div>

           {/* New Client Search Input */}
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#605e5c]" size={14} />
             <input
               type="text"
               placeholder={activeTab === 'requests' ? "Search agents..." : "Search clients..."}
               value={clientSearchQuery}
               onChange={(e) => setClientSearchQuery(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-xs font-medium focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
             />
             {clientSearchQuery && (
               <button 
                onClick={() => setClientSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#605e5c] hover:text-[#323130]"
               >
                 <X size={12} />
               </button>
             )}
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {!clientSearchQuery && (
            <>
              <button
                onClick={() => setSelectedClientId('All')}
                className={`w-full text-left px-4 py-3 rounded-sm transition-all flex items-center justify-between group ${
                  selectedClientId === 'All' 
                    ? 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20' 
                    : 'text-[#605e5c] hover:bg-white hover:text-[#323130]'
                }`}
              >
                <div className="flex items-center gap-3">
                   <Filter size={16} className={selectedClientId === 'All' ? 'text-white' : 'text-[#605e5c] group-hover:text-[#323130]'} />
                   <span className="text-sm font-bold">{activeTab === 'requests' ? 'All Agents' : 'All Clients'}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedClientId === 'All' ? 'bg-white/20' : 'bg-[#edebe9] group-hover:bg-[#e1dfdd]'
                }`}>
                  {allClientStats.reduce((acc, [_, count]) => acc + count, 0)}
                </span>
              </button>

              <div className="py-2">
                <div className="h-px bg-[#edebe9] mx-2" />
              </div>
            </>
          )}

          {filteredClientStats.map(([client, count]) => (
            <button
              key={client}
              onClick={() => setSelectedClientId(client)}
              className={`w-full text-left px-4 py-3 rounded-sm transition-all flex items-center justify-between group ${
                selectedClientId === client 
                  ? 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20' 
                  : 'text-[#605e5c] hover:bg-white hover:text-[#323130]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${selectedClientId === client ? 'bg-white' : 'bg-[#c8c6c4]'}`} />
                <span className="text-sm font-bold truncate max-w-[160px]">{client}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedClientId === client ? 'bg-white/20' : 'bg-[#edebe9] group-hover:bg-[#e1dfdd]'
              }`}>
                {count}
              </span>
            </button>
          ))}

          {filteredClientStats.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-xs text-[#605e5c] font-medium italic">
                {activeTab === 'requests' ? 'No agents found.' : 'No clients found.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Workspace with Simple Concept Cards */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#faf9f8]">
        {/* Toolbar */}
        <div className="bg-white border-b border-[#edebe9] px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#605e5c]" size={16} />
              <input
                type="text"
                placeholder="Search logistics payload..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm focus:bg-white focus:ring-1 focus:ring-[#0078d4] outline-none transition-all"
              />
            </div>
            
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="hidden lg:block px-4 py-2 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-xs font-bold text-[#605e5c] outline-none hover:bg-white transition-colors"
            >
              <option value="All">All Branches</option>
              {deliveryBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#f3f2f1] p-1 rounded-sm border border-[#edebe9] relative isolate">
              {[
                { id: 'requests', label: 'Requests', icon: Inbox, count: tabCounts.requests, color: '#0078d4' },
                { id: 'active', label: 'Active', icon: Truck, count: tabCounts.active, color: '#107c10' },
                { id: 'rescheduled', label: 'Rescheduled', icon: RefreshCw, count: tabCounts.rescheduled, color: '#8764b8' },
                { id: 'pending', label: 'Pending', icon: Clock, count: tabCounts.pending, color: '#ffb900' },
                { id: 'delivered', label: 'Delivered', icon: CheckCircle2, count: tabCounts.delivered, color: '#0078d4' },
                { id: 'failed', label: 'Failed', icon: AlertCircle, count: tabCounts.failed, color: '#d13438' }
              ].filter(tab => {
                if (tab.id === 'requests') {
                  return true;
                }
                return true;
              }).map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as DeliveryTab)}
                    className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative transition-colors duration-200 z-10 select-none ${
                      isActive 
                        ? tab.id === 'requests'
                          ? 'text-white'
                          : 'text-[#323130]' 
                        : 'text-[#605e5c] hover:text-[#323130]'
                    }`}
                    whileHover={{ scale: 1.04, y: -0.5 }}
                    whileTap={{ scale: 0.96, y: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeDeliveryTabPill"
                        className={`absolute inset-0 rounded-sm -z-10 shadow-sm border ${
                          tab.id === 'requests'
                            ? 'bg-[#0078d4] border-[#005a9e] shadow-lg shadow-blue-200/20'
                            : 'bg-white border-[#edebe9]'
                        }`}
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}

                    <tab.icon 
                      size={14} 
                      className="transition-transform duration-200"
                      style={{ 
                        color: isActive 
                          ? (tab.id === 'requests' ? '#ffffff' : tab.color) 
                          : (tab.id === 'requests' && tab.count > 0 ? '#e11d48' : undefined) 
                      }} 
                    />
                    
                    <span>{tab.label}</span>
                    
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-sm text-[8px] transition-all duration-200 ${
                        isActive 
                          ? tab.id === 'requests' ? 'bg-white text-[#0078d4]' : 'bg-[#323130] text-white'
                          : tab.id === 'requests' ? 'bg-rose-600 text-white shadow-sm shadow-rose-200 animate-pulse' : 'bg-[#edebe9] text-[#605e5c]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="w-[1px] h-6 bg-[#edebe9] mx-1" />
            
            <div className="flex items-center gap-1 bg-[#f3f2f1] p-1 rounded-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-sm transition-all ${viewMode === 'grid' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-[#605e5c] hover:bg-white/50'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-sm transition-all ${viewMode === 'list' ? 'bg-white text-[#0078d4] shadow-sm' : 'text-[#605e5c] hover:bg-white/50'}`}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
           {activeTab === 'requests' ? (
             <div className="-mt-8 -mx-8 bg-white min-h-full">
               <DeliveryRequestsPage
                 sales={deliveryItems}
                 artworks={artworks}
                 onUpdateSale={onUpdateSale}
                 currentUser={currentUser}
                 hideHeader={true}
                 userPermissions={userPermissions}
                 onApproveRequest={onApproveRequest}
                 onDeclineRequest={onDeclineRequest}
               />
             </div>
           ) : (
             <div className="max-w-[1600px] mx-auto space-y-10">
              <div className="flex items-end justify-between border-b border-[#edebe9] pb-4">
                <div>
                  <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest mb-1">Logistics / Pipeline</p>
                  <h1 className="text-3xl font-black text-[#323130] tracking-tight uppercase">
                    {selectedClientId === 'All' ? 'Master Fulfillment' : selectedClientId}
                  </h1>
                </div>
                {selectedClientId !== 'All' && (
                  <div className="flex items-center gap-2 text-[#605e5c] text-[10px] font-bold uppercase tracking-widest bg-white px-3 py-1.5 rounded-sm border border-[#edebe9]">
                    <Info size={14} className="text-[#0078d4]" />
                    Active Payload
                  </div>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {deliveryItems.length > 0 ? (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                      {deliveryItems.map((sale) => {
                        const artwork = artworks.find(a => a.id === sale.artworkId) || ({ ...sale.artworkSnapshot, id: sale.artworkId, status: 'Sold', createdAt: sale.saleDate } as any);

                        return (
                          <motion.div
                            key={sale.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setDetailsSale({ sale, artwork })}
                            className="group bg-white rounded-sm border border-[#edebe9] overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full cursor-pointer"
                          >
                              {/* Card Image Area */}
                              <div className="aspect-[4/3] overflow-hidden relative bg-[#faf9f8]">
                                 <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                                 
                                 {onDeleteSale && (
                                   <div className="absolute top-3 left-3 z-10">
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         onDeleteSale(sale.id);
                                       }}
                                       className="p-1.5 bg-white/95 hover:bg-[#a4262c] hover:text-white rounded-sm text-[#a4262c] border border-[#edebe9] shadow-sm transition-all duration-200 flex items-center justify-center"
                                       title="Delete Sale Record"
                                     >
                                       <Trash2 size={12} />
                                     </button>
                                   </div>
                                 )}

                                 <div className="absolute top-3 right-3">
                                   <StatusBadge status={artwork.status} sale={sale} artworkPrice={artwork.price} />
                                 </div>

                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#323130]/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                  <p className="text-white text-[9px] font-black uppercase tracking-widest">{artwork.currentBranch}</p>
                                </div>
                             </div>

                             {/* Card Info Area */}
                             <div className="p-5 flex-1 flex flex-col border-t border-[#edebe9]">
                                <div className="mb-4 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-[#605e5c] tracking-widest uppercase">{artwork.code}</span>
                                    <span className="text-[9px] font-bold text-[#a19f9d] italic">{sale.clientName}</span>
                                  </div>
                                  <h4 className="text-xs font-black text-[#323130] leading-snug line-clamp-1 group-hover:text-[#0078d4] transition-colors uppercase tracking-tight">{artwork.title}</h4>
                                  <p className="text-[10px] text-[#605e5c] font-bold uppercase opacity-60 tracking-wider">{artwork.artist}</p>
                                  {activeTab === 'rescheduled' && (
                                    <div className="mt-3 flex items-center gap-2 rounded-sm border border-[#e1dfdd] bg-[#faf9f8] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#605e5c]">
                                      <Clock size={12} className="text-[#8764b8]" />
                                      <span>{getRescheduleCountdown(sale)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-auto pt-5 border-t border-[#f3f2f1] grid grid-cols-1 gap-2">
                                     { (sale.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED || sale.deliveryRequest?.status === DeliveryRequestStatus.APPROVED) ? (
                                       <button 
                                         disabled={sale.isDelivered}
                                         onClick={(e) => { e.stopPropagation(); if (!sale.isDelivered) setFinalizeModalSale({ sale, artwork }); }}
                                         className={`py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                           sale.isDelivered
                                             ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed'
                                             : 'bg-[#0078d4] text-white shadow-lg shadow-[#0078d4]/20 hover:bg-[#106ebe]'
                                         }`}
                                       >
                                         {sale.isDelivered ? 'Delivered' : (activeTab === 'rescheduled' ? 'Deliver' : 'Delivery Successful')}
                                       </button>
                                     ) : (
                                       <button 
                                         disabled={true}
                                         className="py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                                       >
                                         {sale.isDelivered ? 'Archived' : 'Approve Delivery'}
                                       </button>
                                     )}
                                   {(activeTab === 'active' || activeTab === 'rescheduled') ? (
                                     <div className="grid grid-cols-2 gap-2">
                                       <button
                                         onClick={(e) => { e.stopPropagation(); setDeliveryActionSale({ sale, artwork, mode: 'reschedule' }); }}
                                         className="py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#f3f2f1] text-[#323130] hover:bg-[#edebe9] flex items-center justify-center gap-1.5"
                                       >
                                         <RefreshCw size={12} />
                                         Reschedule
                                       </button>
                                       <button
                                         onClick={(e) => { e.stopPropagation(); setDeliveryActionSale({ sale, artwork, mode: 'cancel' }); }}
                                         className="py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#fde7e9] text-[#a4262c] hover:bg-[#f8d7da] flex items-center justify-center gap-1.5"
                                       >
                                         <Ban size={12} />
                                         Cancel
                                       </button>
                                     </div>
                                   ) : (
                                     <button 
                                       disabled={sale.isDelivered || sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING}
                                       onClick={(e) => { e.stopPropagation(); setRequestModalSale({ sale, artwork }); }}
                                       className={`py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                         sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                         sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING ? 'bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed' :
                                         'bg-[#323130] text-white hover:bg-[#000000] shadow-md shadow-black/10'
                                       }`}
                                     >
                                       {sale.deliveryRequest?.status === DeliveryRequestStatus.DECLINED || sale.deliveryRequest?.status === DeliveryRequestStatus.CANCELLED ? 'Retry Payload' : (sale.deliveryRequest ? 'Edit Payload' : 'Schedule')}
                                     </button>
                                   )}
                                </div>
                             </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-sm border border-[#edebe9] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#f3f2f1] border-b border-[#edebe9]">
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Payload Spec</th>
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 text-[9px] font-black text-[#605e5c] uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edebe9]">
                           {deliveryItems.map((sale) => {
                             const artwork = artworks.find(a => a.id === sale.artworkId) || ({ ...sale.artworkSnapshot, id: sale.artworkId, status: 'Sold', createdAt: sale.saleDate } as any);

                             return (
                               <tr 
                                 key={sale.id} 
                                 onClick={() => setDetailsSale({ sale, artwork })}
                                 className="hover:bg-[#faf9f8] transition-colors group cursor-pointer"
                               >
                                 <td className="px-8 py-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-sm overflow-hidden bg-[#faf9f8] border border-[#edebe9] shrink-0">
                                         <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all" />
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest mb-0.5">{artwork.code}</p>
                                        <h3 className="text-[11px] font-black text-[#323130] leading-none uppercase tracking-tight group-hover:text-[#0078d4] transition-colors">{artwork.title}</h3>
                                        <p className="text-[9px] text-[#605e5c] font-bold uppercase mt-1 opacity-60">{artwork.artist}</p>
                                      </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-4">
                                    <div className="space-y-2">
                                      <StatusBadge status={artwork.status} sale={sale} artworkPrice={artwork.price} />
                                      {activeTab === 'rescheduled' && (
                                        <div className="inline-flex items-center gap-2 rounded-sm border border-[#e1dfdd] bg-[#faf9f8] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#605e5c]">
                                          <Clock size={11} className="text-[#8764b8]" />
                                          {getRescheduleCountdown(sale)}
                                        </div>
                                      )}
                                    </div>
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                      <button 
                                        disabled={sale.isDelivered || sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING}
                                        onClick={(e) => { e.stopPropagation(); setRequestModalSale({ sale, artwork }); }}
                                        className={`px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all ${
                                          sale.isDelivered ? 'bg-[#f3f2f1] text-[#c8c6c4] cursor-not-allowed' :
                                          sale.deliveryRequest?.status === DeliveryRequestStatus.PENDING ? 'bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed' :
                                          'bg-[#f3f2f1] text-[#323130] hover:bg-[#edebe9]'
                                        }`}
                                      >
                                        {sale.deliveryRequest?.status === DeliveryRequestStatus.DECLINED || sale.deliveryRequest?.status === DeliveryRequestStatus.CANCELLED ? 'Retry' : (sale.deliveryRequest ? 'Edit' : 'Schedule')}
                                      </button>
                                      { (sale.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED || sale.deliveryRequest?.status === DeliveryRequestStatus.APPROVED) ? (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setDeliveryActionSale({ sale, artwork, mode: 'cancel' }); }}
                                            className="px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#fde7e9] text-[#a4262c] hover:bg-[#f8d7da] flex items-center gap-1.5"
                                          >
                                            <Ban size={12} />
                                            Cancel
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setDeliveryActionSale({ sale, artwork, mode: 'reschedule' }); }}
                                            className="px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#f3f2f1] text-[#323130] hover:bg-[#edebe9] flex items-center gap-1.5"
                                          >
                                            <RefreshCw size={12} />
                                            Reschedule
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setFinalizeModalSale({ sale, artwork }); }}
                                            className="px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#0078d4] text-white shadow-md shadow-[#0078d4]/20 hover:bg-[#106ebe]"
                                          >
                                            {activeTab === 'rescheduled' ? 'Deliver' : 'Delivery Successful'}
                                          </button>
                                        </>
                                      ) : (
                                        <button 
                                          disabled={true}
                                          className="px-5 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                                        >
                                          {sale.isDelivered ? 'Done' : 'Approve Delivery'}
                                        </button>
                                      )}
                                      {onDeleteSale && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteSale(sale.id);
                                          }}
                                          className="p-2 bg-[#fde7e9] text-[#a4262c] hover:bg-[#f8d7da] rounded-sm transition-all flex items-center justify-center border border-[#fde7e9]"
                                          title="Delete Sale Record"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                 </td>
                               </tr>
                             );
                           })}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <div className="py-40 flex flex-col items-center justify-center text-center">
                     <div className="w-20 h-20 bg-[#f3f2f1] rounded-full flex items-center justify-center mb-6">
                       <Truck size={32} className="text-[#a19f9d]" strokeWidth={1.5} />
                     </div>
                     <h3 className="text-sm font-black text-[#323130] uppercase tracking-widest">Pipeline Clear</h3>
                     <p className="text-[10px] text-[#605e5c] font-bold uppercase mt-2 opacity-60">No active fulfillment payload detected.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Logistics Modal */}
      <AnimatePresence>
        {deliveryActionSale && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#323130]/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={resetDeliveryActionForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-[#edebe9]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#edebe9] flex items-center justify-between bg-[#faf9f8]">
                <div>
                  <h2 className="text-sm font-black text-[#323130] uppercase tracking-tight">
                    {deliveryActionSale.mode === 'reschedule' ? 'Reschedule Delivery' : 'Cancel Delivery'}
                  </h2>
                  <p className="text-[#605e5c] text-[10px] font-bold uppercase tracking-widest mt-1">
                    {deliveryActionSale.sale.clientName} / {deliveryActionSale.artwork.code}
                  </p>
                </div>
                <button onClick={resetDeliveryActionForm} className="p-2 hover:bg-[#edebe9] rounded-md transition-colors text-[#605e5c]">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-[#faf9f8] rounded-sm border border-[#edebe9]">
                  <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest mb-1">
                    Active Delivery
                  </p>
                  <h3 className="font-black text-[#323130] text-sm uppercase truncate">{deliveryActionSale.artwork.title}</h3>
                  <p className="text-[11px] font-bold text-[#605e5c] mt-2">
                    Current schedule: {new Date(deliveryActionSale.sale.deliveryRequest?.deliveryDate || '').toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </p>
                </div>

                {deliveryActionSale.mode === 'reschedule' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                        New Delivery Date <span className="text-[#d13438]">*</span>
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                        Reschedule Notes
                      </label>
                      <textarea
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[90px] resize-none"
                        placeholder="Client requested a new schedule, unavailable receiving contact, route issue..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                        Cancel Reason <span className="text-[#d13438]">*</span>
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[90px] resize-none"
                        placeholder="Client cancelled, client requested hold, failed receiving confirmation..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                        Artwork Return Destination <span className="text-[#d13438]">*</span>
                      </label>
                      <select
                        value={returnDestination}
                        onChange={(e) => {
                          setReturnDestination(e.target.value);
                          setReturnItdrAttachment('');
                          setReturnItdrAttachmentName('');
                        }}
                        className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all"
                      >
                        {returnDestinationOptions.map(destination => (
                          <option key={destination} value={destination}>
                            {destination}{currentReturnBranch && destination === currentReturnBranch ? ' (Current Branch)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {returnRequiresItdr && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">
                          Return IT/DR Attachment <span className="text-[#d13438]">*</span>
                        </label>
                        {returnItdrAttachment ? (
                          <div className="flex items-center gap-3 rounded-sm border border-[#0078d4] bg-[#f3f9fd] px-4 py-3">
                            <Paperclip size={16} className="text-[#0078d4] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-[#323130]">
                                {returnItdrAttachmentName || 'IT/DR attachment selected'}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-[#605e5c]">
                                Ready to attach to this cancellation
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setReturnItdrAttachment('');
                                setReturnItdrAttachmentName('');
                              }}
                              className="rounded-sm p-1.5 text-[#605e5c] hover:bg-white hover:text-[#a4262c] transition-colors"
                              title="Remove IT/DR attachment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              id="return-itdr-attachment"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleReturnItdrAttachment(e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                            <label
                              htmlFor="return-itdr-attachment"
                              className="flex cursor-pointer items-center justify-center gap-3 rounded-sm border border-dashed border-[#c8c6c4] bg-[#faf9f8] px-4 py-4 text-xs font-black uppercase tracking-widest text-[#605e5c] transition-all hover:border-[#0078d4] hover:bg-white hover:text-[#323130]"
                            >
                              <Upload size={16} />
                              Upload IT/DR for {returnDestination}
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-6 bg-[#faf9f8] border-t border-[#edebe9] flex gap-3">
                <button
                  onClick={resetDeliveryActionForm}
                  className="flex-1 px-4 py-3 bg-white border border-[#edebe9] text-[#323130] rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-[#edebe9] transition-all"
                >
                  Close
                </button>
                {deliveryActionSale.mode === 'reschedule' ? (
                  <button
                    onClick={handleRescheduleDelivery}
                    disabled={!rescheduleDate}
                    className={`flex-1 px-4 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${
                      rescheduleDate ? 'bg-[#0078d4] text-white hover:bg-[#106ebe] shadow-lg shadow-[#0078d4]/20' : 'bg-[#edebe9] text-[#a19f9d] cursor-not-allowed'
                    }`}
                  >
                    Reschedule Delivery
                  </button>
                ) : (
                  <button
                    onClick={handleCancelDelivery}
                    disabled={!cancelReason.trim() || (returnRequiresItdr && !returnItdrAttachment)}
                    className={`flex-1 px-4 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all ${
                      cancelReason.trim() && (!returnRequiresItdr || returnItdrAttachment)
                        ? 'bg-[#a4262c] text-white hover:bg-[#8f1f25] shadow-lg shadow-[#a4262c]/20'
                        : 'bg-[#edebe9] text-[#a19f9d] cursor-not-allowed'
                    }`}
                  >
                    Cancel Delivery
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {requestModalSale && (
          <DeliveryRequestModal 
            sale={requestModalSale.sale}
            artwork={requestModalSale.artwork}
            onClose={() => setRequestModalSale(null)}
            onSubmit={handleSubmitRequest}
          />
        )}
        {finalizeModalSale && (
          <DeliveryFinalizationModal 
            sale={finalizeModalSale.sale}
            artwork={finalizeModalSale.artwork}
            onClose={() => setFinalizeModalSale(null)}
            onConfirm={(itdr, rsa, orcr, carrier, referenceNumber, remarks) => {
              onDeliver && onDeliver(finalizeModalSale.artwork.id, itdr, rsa, orcr, carrier, referenceNumber, remarks);
              setFinalizeModalSale(null);
            }}
          />
        )}
        {detailsSale && (
          <div className="fixed inset-0 z-[150] bg-white overflow-y-auto">
             <div className="max-w-[1400px] mx-auto">
                <MasterView 
                   artwork={detailsSale.artwork}
                   branches={branches}
                   logs={logs.filter(l => String(l.artworkId) === String(detailsSale.artwork.id))}
                   sale={detailsSale.sale}
                   userRole={currentUser?.role || UserRole.BRANCH_USER}
                   userBranch={currentUser?.branch}
                   userPermissions={userPermissions}
                   events={events}
                   onReturn={onReturn}
                   onReturnToGallery={onReturnToGallery}
                   onSendToFramer={onSendToFramer}
                   onReturnFromFramer={onReturnFromFramer}
                   onEdit={() => {}}
                   onBack={() => setDetailsSale(null)}
                   onTransfer={onTransfer}
                   onReserve={onReserve}
                   onCancelReservation={onCancelReservation}
                   onSale={onSale}
                   onCancelSale={onCancelSale}
                                       onDeliver={(id, itdr, rsa, orcr, carrier, ref, remarks) => {
                      if (onDeliver) onDeliver(id, Array.isArray(itdr) ? itdr[0] : itdr, Array.isArray(rsa) ? rsa[0] : rsa, Array.isArray(orcr) ? orcr[0] : orcr, carrier, ref, remarks);
                    }}
                   framerRecords={framerRecords}
                   returnRecords={returnRecords}
                   transferRequests={transferRequests}
                />
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveriesPage;
