import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight,
  RefreshCcw,
  FileText,
  Tag,
  Home,
  User,
  Truck,
  MapPin,
  Calendar
} from 'lucide-react';
import { SaleRecord, Artwork, SaleStatus, DeliveryRequestStatus, TransferRequest } from '../types';
import { OptimizedImage } from '../components/OptimizedImage';

interface AgentRequestsPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  currentUser?: any;
  userPermissions?: any;
  onViewArtwork: (id: string, autoOpenSale?: boolean) => void;
  transferRequests?: TransferRequest[];
}

type UnifiedRequestItem = 
  | { type: 'sale'; date: string; data: SaleRecord }
  | { type: 'transfer'; date: string; data: TransferRequest };

const AgentRequestsPage: React.FC<AgentRequestsPageProps> = ({ 
  sales, 
  artworks, 
  currentUser, 
  onViewArtwork,
  transferRequests = []
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'declined' | 'approved'>('all');
  const [requestType, setRequestType] = useState<'all' | 'sales' | 'deliveries' | 'transfers'>('all');

  const mySales = useMemo(() => {
    return sales
      .filter(s => {
        // 1. Exact match by agentId or agentName
        if (s.agentId === currentUser.id || s.agentName === currentUser.name) {
          return true;
        }
        
        // 2. Fallback for branch-specific queries (especially if agentId is missing in DB)
        if (currentUser.role === 'Branch User' && currentUser.branch) {
          const userBranchLower = currentUser.branch.trim().toLowerCase();
          const saleAgentLower = (s.agentName || '').trim().toLowerCase();
          
          // If the agent name starts with their branch name (e.g., "Gallery Joaquin - BGC — Will")
          if (saleAgentLower.startsWith(userBranchLower)) {
            return true;
          }
          
          // Or if the artwork's current branch matches the user's branch
          const art = artworks.find(a => a.id === s.artworkId);
          const artBranch = art?.currentBranch || s.artworkSnapshot?.currentBranch;
          if (artBranch && artBranch.trim().toLowerCase() === userBranchLower) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, currentUser, artworks]);

  const myTransfers = useMemo(() => {
    return transferRequests
      .filter(r => {
        if (r.requestedBy === currentUser.name) return true;
        if (currentUser.role === 'Branch User' && currentUser.branch && r.fromBranch === currentUser.branch) return true;
        return false;
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [transferRequests, currentUser]);

  const filteredSales = useMemo(() => {
    let baseSales = mySales;
    if (requestType === 'sales') {
      // Show all sales
    } else if (requestType === 'deliveries') {
      baseSales = mySales.filter(s => !!s.deliveryRequest);
    } else if (requestType === 'transfers') {
      return [];
    }

    if (activeTab === 'all') return baseSales;

    if (activeTab === 'pending') {
      return baseSales.filter(s => {
        if (requestType === 'deliveries') {
          return s.deliveryRequest?.status === DeliveryRequestStatus.PENDING;
        } else if (requestType === 'sales') {
          return s.status === SaleStatus.FOR_SALE_APPROVAL || !s.status;
        } else {
          return (s.status === SaleStatus.FOR_SALE_APPROVAL || !s.status) || (s.deliveryRequest?.status === DeliveryRequestStatus.PENDING);
        }
      });
    }

    if (activeTab === 'declined') {
      return baseSales.filter(s => {
        if (requestType === 'deliveries') {
          return s.deliveryRequest?.status === DeliveryRequestStatus.DECLINED || s.deliveryRequest?.status === DeliveryRequestStatus.CANCELLED;
        } else if (requestType === 'sales') {
          return s.status === SaleStatus.DECLINED;
        } else {
          return s.status === SaleStatus.DECLINED || (s.deliveryRequest?.status === DeliveryRequestStatus.DECLINED || s.deliveryRequest?.status === DeliveryRequestStatus.CANCELLED);
        }
      });
    }

    if (activeTab === 'approved') {
      return baseSales.filter(s => {
        if (requestType === 'deliveries') {
          return s.deliveryRequest?.status === DeliveryRequestStatus.APPROVED || s.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED || s.isDelivered;
        } else if (requestType === 'sales') {
          return s.status === SaleStatus.APPROVED;
        } else {
          return s.status === SaleStatus.APPROVED || (s.deliveryRequest?.status === DeliveryRequestStatus.APPROVED || s.deliveryRequest?.status === DeliveryRequestStatus.DISPATCHED || s.isDelivered);
        }
      });
    }

    return baseSales;
  }, [mySales, activeTab, requestType]);

  const unifiedRequests = useMemo(() => {
    const items: UnifiedRequestItem[] = [];

    // Add sales if not only viewing transfers
    if (requestType !== 'transfers') {
      filteredSales.forEach(sale => {
        items.push({
          type: 'sale',
          date: sale.saleDate,
          data: sale
        });
      });
    }

    // Add transfers
    if (requestType === 'all' || requestType === 'transfers') {
      let baseTransfers = myTransfers;

      if (activeTab === 'pending') {
        baseTransfers = myTransfers.filter(t => t.status === 'Pending' || t.status === 'On Hold');
      } else if (activeTab === 'declined') {
        baseTransfers = myTransfers.filter(t => t.status === 'Declined' || t.status === 'Cancelled');
      } else if (activeTab === 'approved') {
        baseTransfers = myTransfers.filter(t => t.status === 'Accepted');
      }

      baseTransfers.forEach(transfer => {
        items.push({
          type: 'transfer',
          date: transfer.requestedAt,
          data: transfer
        });
      });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, myTransfers, requestType, activeTab]);

  const getArtwork = (id: string) => artworks.find(a => a.id === id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getStatusBadge = (status?: SaleStatus) => {
    switch (status) {
      case SaleStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
            <CheckCircle size={12} />
            Accepted
          </span>
        );
      case SaleStatus.DECLINED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest border border-rose-700 shadow-lg shadow-rose-200 animate-pulse">
            <AlertCircle size={12} />
            Declined: Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">
            <Clock size={12} />
            In Review
          </span>
        );
    }
  };

  const getTransferStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
            <CheckCircle size={12} />
            Accepted
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest border border-rose-700 shadow-lg shadow-rose-200 animate-pulse">
            <AlertCircle size={12} />
            Declined: Action Required
          </span>
        );
      case 'On Hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">
            <Clock size={12} />
            On Hold
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest border border-neutral-200 shadow-sm">
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
            <Clock size={12} />
            In Review
          </span>
        );
    }
  };

  const getDeliveryStatusBadge = (status?: DeliveryRequestStatus, isDelivered?: boolean) => {
    if (isDelivered) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm">
          <Truck size={12} />
          Delivered
        </span>
      );
    }
    switch (status) {
      case DeliveryRequestStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
            <Clock size={12} />
            Delivery Pending
          </span>
        );
      case DeliveryRequestStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
            <Calendar size={12} />
            Delivery Scheduled
          </span>
        );
      case DeliveryRequestStatus.DISPATCHED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 shadow-sm animate-pulse">
            <Truck size={12} />
            Out for Delivery
          </span>
        );
      case DeliveryRequestStatus.DECLINED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">
            <XCircle size={12} />
            Delivery Declined
          </span>
        );
      case DeliveryRequestStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest border border-neutral-200 shadow-sm">
            <XCircle size={12} />
            Delivery Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-neutral-900 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-sm border border-orange-100 text-[10px] font-black uppercase tracking-widest mb-3">
            <MessageSquare size={12} />
            Submission Hub
          </div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight">My Requests</h1>
          <p className="text-sm font-medium text-neutral-500 mt-2">Track your sale declarations, delivery requests, and handle admin feedback.</p>
        </div>
      </div>

      {/* Filter / Type Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: 'All Requests' },
            { id: 'sales', label: 'Sales Declarations' },
            { id: 'deliveries', label: 'Delivery Requests' },
            { id: 'transfers', label: 'Transfer Requests' }
          ] as const).map(type => (
            <button
              key={type.id}
              onClick={() => setRequestType(type.id)}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                requestType === type.id
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'text-neutral-500 hover:text-neutral-800 bg-white border border-neutral-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
          {(['all', 'pending', 'declined', 'approved'] as const).map(tab => {
            const saleDeclinedCount = mySales.filter(s => s.status === SaleStatus.DECLINED).length;
            const transferDeclinedCount = myTransfers.filter(t => t.status === 'Declined').length;
            const totalDeclined = saleDeclinedCount + transferDeclinedCount;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-neutral-900 shadow-md border border-neutral-200/50 scale-105 z-10' 
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {tab}
                {tab === 'declined' && totalDeclined > 0 && (
                  <span className="ml-2 w-4 h-4 bg-rose-600 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce">
                    {totalDeclined}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 gap-6">
        {unifiedRequests.length === 0 ? (
          <div className="py-32 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-300 gap-4">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-neutral-100 text-neutral-200">
              <RefreshCcw size={40} strokeWidth={1} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-neutral-400">No requests found</p>
              <p className="text-[10px] font-bold mt-1 tracking-widest">Your submitted items will appear here once registered.</p>
            </div>
          </div>
        ) : (
          unifiedRequests.map((item) => {
            if (item.type === 'sale') {
              const sale = item.data;
              const art = getArtwork(sale.artworkId);
              const isDeclined = sale.status === SaleStatus.DECLINED;

              return (
                <motion.div
                  key={sale.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:shadow-xl ${
                    isDeclined 
                      ? 'border-rose-200 bg-rose-50/30' 
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[160px]">
                    {/* Artwork Preview */}
                    <div className="w-full lg:w-48 bg-neutral-100 relative overflow-hidden">
                      {art?.imageUrl ? (
                        <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300">
                          <Tag size={40} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                      <div className="absolute bottom-4 left-4 lg:hidden flex flex-col gap-1.5">
                        {getStatusBadge(sale.status)}
                        {sale.deliveryRequest && getDeliveryStatusBadge(sale.deliveryRequest.status, sale.isDelivered)}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 lg:p-8 flex flex-col justify-between gap-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div>
                          <div className="hidden lg:flex items-center gap-2 mb-3">
                            {getStatusBadge(sale.status)}
                            {sale.deliveryRequest && getDeliveryStatusBadge(sale.deliveryRequest.status, sale.isDelivered)}
                          </div>
                          <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight">{art?.title || 'Untitled Artwork'}</h3>
                          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mt-1">{art?.artist || 'Unknown Artist'}</p>
                        </div>

                        <div className="flex flex-wrap gap-6 text-right">
                          <div>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Declared On</p>
                            <p className="text-sm font-black text-neutral-900">{new Date(sale.saleDate).toLocaleDateString()}</p>
                          </div>
                          <div className={isDeclined && sale.requestedAttachments?.includes('price') ? 'p-2 bg-rose-50 rounded-xl border border-rose-200 animate-pulse' : ''}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDeclined && sale.requestedAttachments?.includes('price') ? 'text-rose-600' : 'text-neutral-400'}`}>Value</p>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-black ${isDeclined && sale.requestedAttachments?.includes('price') ? 'text-rose-700' : 'text-emerald-600'}`}>
                                {formatCurrency(art?.price || 0)}
                              </p>
                              {isDeclined && sale.requestedAttachments?.includes('price') && (
                                <AlertCircle size={14} className="text-rose-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400"><User size={16} /></div>
                          <div className="min-w-0"><p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Client</p><p className="text-xs font-bold text-neutral-900 truncate">{sale.clientName}</p></div>
                        </div>
                        <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'bg-rose-50 border border-rose-100 animate-pulse' : ''}`}>
                          <div className={`p-2 rounded-lg ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'bg-rose-100 text-rose-600' : 'bg-neutral-50 text-neutral-400'}`}><Home size={16} /></div>
                          <div className="min-w-0">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'text-rose-600' : 'text-neutral-400'}`}>Branch</p>
                            <p className={`text-xs font-bold truncate ${isDeclined && sale.requestedAttachments?.includes('branch') ? 'text-rose-700' : 'text-neutral-900'}`}>{art?.currentBranch || 'Main'}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'bg-rose-50 border border-rose-100 animate-pulse' : ''}`}>
                          <div className={`p-2 rounded-lg ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'bg-rose-100 text-rose-600' : 'bg-neutral-50 text-neutral-400'}`}><FileText size={16} /></div>
                          <div className="min-w-0">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isDeclined && sale.requestedAttachments?.some(r => ['itdr', 'rsa', 'orcr'].includes(r)) ? 'text-rose-600' : 'text-neutral-400'}`}>Documents</p>
                            <div className="flex gap-1 mt-0.5">
                              {['itdr', 'rsa', 'orcr'].map(type => {
                                const isMissing = !sale[`${type}Url` as keyof SaleRecord];
                                const isRequested = isDeclined && sale.requestedAttachments?.includes(type);
                                return (
                                  <div 
                                    key={type} 
                                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                                      isRequested ? 'bg-rose-600 border-rose-200 animate-bounce' : 
                                      isMissing ? 'bg-neutral-200 border-transparent' : 'bg-emerald-400 border-transparent'
                                    }`} 
                                    title={type.toUpperCase() + (isRequested ? ' (Action Required)' : '')} 
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Integrated Delivery logistics details */}
                      {sale.deliveryRequest && (
                        <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-4">
                          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                            <div className="flex items-center gap-2">
                              <Truck size={16} className="text-neutral-500" />
                              <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Delivery Logistics Request</span>
                            </div>
                            {getDeliveryStatusBadge(sale.deliveryRequest.status, sale.isDelivered)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="flex items-start gap-2.5">
                              <MapPin size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Destination Address</span>
                                <span className="font-bold text-neutral-800 leading-relaxed">
                                  {sale.deliveryRequest.clientAddress || 
                                   [sale.deliveryRequest.street, sale.deliveryRequest.barangay, sale.deliveryRequest.city, sale.deliveryRequest.province].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2.5">
                              <Calendar size={15} className="text-neutral-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Scheduled Delivery Date</span>
                                <span className="font-bold text-neutral-800">
                                  {sale.deliveryRequest.deliveryDate ? new Date(sale.deliveryRequest.deliveryDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To Be Scheduled'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Extra Details */}
                          {(sale.deliveryRequest.extraPersonnelCount > 0 || (sale.deliveryRequest.toolsNeeded && sale.deliveryRequest.toolsNeeded.length > 0)) && (
                            <div className="pt-2.5 border-t border-neutral-200/60 flex flex-wrap gap-x-6 gap-y-2 text-[11px]">
                              {sale.deliveryRequest.extraPersonnelCount > 0 && (
                                <div className="text-neutral-600">
                                  <strong>Personnel:</strong> {sale.deliveryRequest.extraPersonnelCount} Extra Crew Member(s)
                                </div>
                              )}
                              {sale.deliveryRequest.toolsNeeded && sale.deliveryRequest.toolsNeeded.length > 0 && (
                                <div className="text-neutral-600">
                                  <strong>Required Tools:</strong> {sale.deliveryRequest.toolsNeeded.join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {sale.deliveryRequest.status === DeliveryRequestStatus.DECLINED && sale.deliveryRequest.declineReason && (
                            <div className="pt-3 border-t border-neutral-200 flex items-start gap-2 text-xs text-rose-700 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>Logistics Decline Reason:</strong> "{sale.deliveryRequest.declineReason}"
                              </div>
                            </div>
                          )}
                          {sale.deliveryRequest.status === DeliveryRequestStatus.CANCELLED && sale.deliveryRequest.cancellationReason && (
                            <div className="pt-3 border-t border-neutral-200 flex items-start gap-2 text-xs text-neutral-600 bg-neutral-100 p-2.5 rounded-lg border border-neutral-200">
                              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>Logistics Cancellation Reason:</strong> "{sale.deliveryRequest.cancellationReason}"
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isDeclined && sale.declineReason && (
                        <div className="mt-4 p-5 bg-white rounded-2xl border border-rose-100 shadow-sm animate-in slide-in-from-left-2 duration-500">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Feedback from Admin</p>
                              <p className="text-sm font-medium text-neutral-700 italic">"{sale.declineReason}"</p>
                              
                              {sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {sale.requestedAttachments.map(req => (
                                    <span key={req} className="px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm shadow-rose-200">
                                      {req === 'itdr' ? 'Re-upload IT/DR' : 
                                       req === 'rsa' ? 'Re-upload RSA/AR' : 
                                       req === 'orcr' ? 'Re-upload OR/CR' : 
                                       req === 'price' ? 'Correct Price' :
                                       req === 'branch' ? 'Fix Branch' : 
                                       req.toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => onViewArtwork(sale.artworkId, true)}
                              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 group/btn"
                            >
                              <RefreshCcw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                              Fix & Resubmit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions (Desktop) */}
                    {!isDeclined && (
                      <div className="hidden lg:flex flex-col border-l border-neutral-100 p-6 items-center justify-center gap-3 bg-neutral-50/50">
                        <button 
                          onClick={() => onViewArtwork(sale.artworkId)}
                          className="p-3 bg-white border border-neutral-200 text-neutral-400 rounded-2xl hover:text-neutral-900 hover:border-neutral-900 hover:shadow-md transition-all active:scale-95"
                          title="View Artwork Details"
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            } else {
              const transfer = item.data;
              const art = getArtwork(transfer.artworkId);
              const isDeclined = transfer.status === 'Declined';

              return (
                <motion.div
                  key={transfer.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:shadow-xl ${
                    isDeclined 
                      ? 'border-rose-200 bg-rose-50/30' 
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-stretch min-h-[160px]">
                    {/* Artwork Preview */}
                    <div className="w-full lg:w-48 bg-neutral-100 relative overflow-hidden">
                      {art?.imageUrl ? (
                        <OptimizedImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300">
                          <Tag size={40} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:hidden" />
                      <div className="absolute bottom-4 left-4 lg:hidden flex flex-col gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-100">
                          Transfer
                        </span>
                        {getTransferStatusBadge(transfer.status)}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6 lg:p-8 flex flex-col justify-between gap-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div>
                          <div className="hidden lg:flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest border border-purple-100 shadow-sm">
                              Transfer Request
                            </span>
                            {getTransferStatusBadge(transfer.status)}
                          </div>
                          <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight">{art?.title || transfer.artworkTitle || 'Untitled Artwork'}</h3>
                          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mt-1">{art?.artist || 'Unknown Artist'}</p>
                        </div>

                        <div className="flex flex-wrap gap-6 text-right">
                          <div>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Requested On</p>
                            <p className="text-sm font-black text-neutral-900">{new Date(transfer.requestedAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Value</p>
                            <p className="text-sm font-black text-emerald-600">
                              {formatCurrency(art?.price || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400"><Home size={16} /></div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Origin</p>
                            <p className="text-xs font-bold text-neutral-900 truncate">{transfer.fromBranch}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400"><ArrowRight size={16} /></div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Destination</p>
                            <p className="text-xs font-bold text-neutral-900 truncate">{transfer.toBranch}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-50 rounded-lg text-neutral-400"><FileText size={16} /></div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">IT/DR Document</p>
                            <div className="text-xs font-bold text-neutral-900">
                              {transfer.itdrUrl ? (
                                <button
                                  onClick={() => {
                                    const url = Array.isArray(transfer.itdrUrl) ? transfer.itdrUrl[0] : transfer.itdrUrl;
                                    if (url) window.open(url, '_blank');
                                  }}
                                  className="text-blue-600 hover:underline"
                                >
                                  View IT/DR
                                </button>
                              ) : (
                                <span className="text-neutral-400">None</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {transfer.notes && (
                        <div className="mt-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-neutral-600">
                          <strong>Remarks / Notes:</strong> "{transfer.notes}"
                        </div>
                      )}

                      {isDeclined && transfer.notes && (
                        <div className="mt-4 p-5 bg-white rounded-2xl border border-rose-100 shadow-sm animate-in slide-in-from-left-2 duration-500">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <AlertCircle size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Feedback from Admin</p>
                              <p className="text-sm font-medium text-neutral-700 italic">"{transfer.notes}"</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions (Desktop) */}
                    <div className="hidden lg:flex flex-col border-l border-neutral-100 p-6 items-center justify-center gap-3 bg-neutral-50/50">
                      <button 
                        onClick={() => onViewArtwork(transfer.artworkId)}
                        className="p-3 bg-white border border-neutral-200 text-neutral-400 rounded-2xl hover:text-neutral-900 hover:border-neutral-900 hover:shadow-md transition-all active:scale-95"
                        title="View Artwork Details"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            }
          })
        )}
      </div>
    </div>
  );
};

export default AgentRequestsPage;
