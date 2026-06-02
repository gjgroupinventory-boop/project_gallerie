import React, { useState, useMemo } from 'react';
import { SaleRecord, Artwork, ArtworkStatus, SaleStatus, UserPermissions } from '../types';
import { ICONS } from '../constants';
import { X, Search, Download, ReceiptText, WalletCards, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';
import CertificateModal from '../components/CertificateModal';
import { OptimizedImage } from '../components/OptimizedImage';
import { createPortal } from 'react-dom';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';

const SaleDetailModal = ({ 
  sale, 
  artwork, 
  onClose 
}: { 
  sale: SaleRecord, 
  artwork: Artwork, 
  onClose: () => void 
}) => {
  if (!sale || !artwork) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-neutral-900">Sale Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-sm transition-colors">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            {/* Artwork Info */}
            <div className="flex gap-4">
                <div className="w-24 h-24 bg-neutral-100 rounded-sm overflow-hidden flex-shrink-0 border border-neutral-200">
                    <OptimizedImage
                        src={artwork.imageUrl || undefined}
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h3 className="font-bold text-neutral-900 leading-tight">{artwork.title}</h3>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1">{artwork.code}</p>
                    <p className="text-sm text-neutral-600 mt-1">{artwork.artist}</p>
                    <div className="flex gap-2 mt-2">
                         {sale.isCancelled ? (
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">Cancelled</span>
                          ) : sale.isDelivered ? (
                            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-900 rounded-md text-[10px] font-bold uppercase">Delivered</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase">In Transit</span>
                          )}
                    </div>
                </div>
            </div>

            {/* Financials */}
            <div className="bg-neutral-50 rounded-md p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-neutral-500 uppercase">Original Price</span>
                    <span className="font-black text-neutral-900">₱{artwork.price.toLocaleString()}</span>
                </div>
                {sale.discountPercentage !== undefined && sale.discountPercentage > 0 && (
                    <>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-emerald-700 font-bold uppercase">Discount</span>
                            <span className="font-black text-emerald-700">-{sale.discountPercentage}%</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Discounted Price</span>
                            <span className="font-black text-neutral-900">₱{(sale.discountedPrice || 0).toLocaleString()}</span>
                        </div>
                    </>
                )}
                {(() => {
                    const price = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
                    const isSaleApproved = sale.status === SaleStatus.APPROVED;
                    const downpayment = sale.downpayment || 0;
                    const installmentsTotal = (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
                    
                    // Only include downpayment if the sale is approved
                    const totalPaid = (isSaleApproved ? downpayment : 0) + installmentsTotal;
                    const balance = price - totalPaid;
                    const isFullyPaid = balance <= 0 && totalPaid > 0;
                    
                    const showBalance = sale.isDownpayment || isSaleApproved;

                    return (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-neutral-500">Total Paid</span>
                                <span className="font-black text-emerald-600">₱{totalPaid.toLocaleString()}</span>
                            </div>
                            
                            {!isSaleApproved && downpayment > 0 && (
                              <div className="flex justify-between items-center text-[10px] mt-1 bg-amber-50/50 p-2 rounded-sm border border-amber-100/50">
                                  <span className="font-black text-amber-600 uppercase tracking-widest">For Approval</span>
                                  <span className="font-black text-amber-700">₱{downpayment.toLocaleString()}</span>
                              </div>
                            )}

                            {showBalance && (
                              <>
                                <div className="border-t border-neutral-200 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-bold uppercase ${isFullyPaid ? 'text-emerald-600' : 'text-neutral-500'}`}>
                                        {isFullyPaid ? 'Status' : 'Remaining Balance'}
                                    </span>
                                    <span className={`font-black ${isFullyPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {isFullyPaid ? 'FULLY PAID' : `₱${balance.toLocaleString()}`}
                                    </span>
                                </div>
                              </>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Client</span>
                    <span className="font-medium text-neutral-900 truncate" title={sale.clientName}>{sale.clientName}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Agent</span>
                    <span className="font-medium text-neutral-900 truncate" title={sale.agentName}>{sale.agentName}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Branch</span>
                    <span className="font-medium text-neutral-900 truncate">{artwork.currentBranch || sale.artworkSnapshot?.currentBranch || '-'}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase">Date</span>
                    <span className="font-medium text-neutral-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Requested Re-uploads Alert */}
            {sale.status === 'Declined' && sale.requestedAttachments && sale.requestedAttachments.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-700">
                        {ICONS.Warning}
                        <h4 className="text-xs font-black uppercase tracking-wider">Re-upload Required</h4>
                    </div>
                    <p className="text-[10px] font-bold text-red-600 leading-normal">
                        The admin has requested new uploads for the following documents:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {sale.requestedAttachments.map(f => (
                            <span key={f} className="px-2 py-1 bg-red-100 text-red-700 rounded-sm text-[10px] font-black uppercase flex items-center gap-1">
                                {ICONS.Refresh}
                                {f === 'itdr' ? 'IT/DR' : f === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                            </span>
                        ))}
                    </div>
                    {sale.declineReason && (
                        <div className="mt-3 pt-3 border-t border-red-200/50">
                            <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Reason for Rejection</span>
                            <p className="text-xs font-medium text-red-800 bg-white/50 p-2 rounded-sm italic border border-red-100">{sale.declineReason}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Attachments */}
             {(sale.itdrUrl?.length || sale.rsaUrl?.length || sale.orCrUrl?.length) && (
                <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                        {sale.itdrUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>ITDR {sale.itdrUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                         {sale.rsaUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>RSA / AR {sale.rsaUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                         {sale.orCrUrl?.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-neutral-200 rounded-sm text-xs font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors">
                                <span>OR / CR {sale.orCrUrl!.length > 1 ? idx + 1 : ''}</span>
                            </a>
                        ))}
                    </div>
                </div>
             )}
        </div>

      </div>
    </div>
  );
};

interface SalesRecordPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onBulkDelete?: (ids: string[]) => void;
  canExport?: boolean;
  canDelete?: boolean;
  onCancelSale?: (id: string) => void;
  initialSaleId?: string | null;
  onClearInitialSaleId?: () => void;
  onViewArtwork?: (id: string) => void;
  userPermissions?: UserPermissions;
}

const SalesRecordPage: React.FC<SalesRecordPageProps> = ({ 
  sales, 
  artworks, 
  onBulkDelete, 
  canExport = true, 
  canDelete = true, 
  onCancelSale,
  initialSaleId,
  onClearInitialSaleId,
  onViewArtwork,
  userPermissions
}) => {
  const [selectedSalePair, setSelectedSalePair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const [selectedSaleDetailPair, setSelectedSaleDetailPair] = useState<{art: Artwork, sale: SaleRecord} | null>(null);
  const { isProcessing, processMessage, processProgress, wrapAction } = useActionProcessing({ itemTitle: 'Sales Records', itemCode: 'REC' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filter Artworks based on Permissions
  const filteredArtworks = useMemo(() => {
    return artworks.filter(artwork => {
      const canViewReserved = userPermissions?.canViewReserved ?? true;
      const canViewAuctioned = userPermissions?.canViewAuctioned ?? true;
      const canViewExhibit = userPermissions?.canViewExhibit ?? true;
      const canViewForFraming = userPermissions?.canViewForFraming ?? true;
      const canViewBackToArtist = userPermissions?.canViewBackToArtist ?? true;

      if (artwork.status === ArtworkStatus.RESERVED) {
        const isAuction = (artwork.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (artwork.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (artwork.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (artwork.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }
      return true;
    });
  }, [artworks, userPermissions]);

  // Effect to handle initial sale selection (deep link / post-sale redirect)
  React.useEffect(() => {
    if (initialSaleId) {
        const sale = sales.find(s => s.id === initialSaleId);
        if (sale) {
            const art = filteredArtworks.find(a => a.id === sale.artworkId);
              
              // Check if artwork exists in raw list but is filtered out (permission denied)
              const isRestricted = !art && artworks.find(a => a.id === sale.artworkId);
              
              if (isRestricted) {
                return;
              }

              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);
            
            if (displayArt) {
                setSelectedSaleDetailPair({ art: displayArt, sale });
                onClearInitialSaleId?.();
            }
        }
    }
  }, [initialSaleId, sales, filteredArtworks]);
  
  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const getPaymentSummary = (sale: SaleRecord, price: number) => {
    const downpayment = sale.downpayment || 0;
    const installmentsTotal = (sale.installments || [])
      .filter(i => !i.isPending)
      .reduce((sum, inst) => sum + inst.amount, 0);
    const recordedPaid = downpayment + installmentsTotal;
    const isInstallment = !!sale.isDownpayment || (recordedPaid > 0 && recordedPaid < price);
    const totalPaid = isInstallment ? recordedPaid : price;
    const balance = Math.max(price - totalPaid, 0);

    return {
      totalPaid,
      balance,
      isFullyPaid: !isInstallment || balance <= 0,
      paymentType: isInstallment ? 'Installment' : 'Full Payment'
    };
  };

  // 1. Synthesize Virtual Sales from Imported/Existing Artworks that are SOLD/DELIVERED but missing in sales log
  const allSales = useMemo(() => {
    const validSales = sales.filter(s => s.status !== SaleStatus.FOR_SALE_APPROVAL);
    const existingSaleArtworkIds = new Set(validSales.map(s => s.artworkId));
    
    const virtualSales = Array.from(
      new Map(
        filteredArtworks
      .filter(a => (a.status === 'Sold' || a.status === 'Delivered') && !existingSaleArtworkIds.has(a.id))
      .map(a => {
        // Attempt to extract client name from remarks if available
        const soldToMatch = a.remarks?.match(/\[Sold To: (.*?)\]/);
        const clientName = soldToMatch ? soldToMatch[1] : 'Imported Client';

        return {
          id: `virtual-${a.id}`,
          artworkId: a.id,
          clientName: clientName,
          agentName: 'System Import',
          saleDate: a.createdAt, // Best effort date
          isDelivered: a.status === 'Delivered',
          deliveryDate: a.status === 'Delivered' ? a.createdAt : undefined,
          artworkSnapshot: {
               title: a.title,
               artist: a.artist,
               code: a.code,
               imageUrl: a.imageUrl,
               price: a.price,
               currentBranch: a.currentBranch,
               medium: a.medium,
               dimensions: a.dimensions,
               year: a.year
          }
        } as SaleRecord;
      })
      .map(sale => [sale.id, sale] as const)
      ).values()
    );

    return [...validSales, ...virtualSales].sort((a, b) => {
      const dateA = new Date(a.saleDate).getTime();
      const dateB = new Date(b.saleDate).getTime();
      return dateB - dateA;
    });
  }, [sales, filteredArtworks]);

  // 2. Compute Available Options for Filters
  const { availableBranches, availableArtists, availableClients, availableYears, availableMediums } = useMemo(() => {
    const branches = new Set<string>();
    const artists = new Set<string>();
    const clients = new Set<string>();
    const years = new Set<string>();
    const mediums = new Set<string>();

    allSales.forEach(sale => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as Artwork);
      if (art?.currentBranch) branches.add(art.currentBranch);
      if (art?.artist) artists.add(art.artist);
      if (art?.medium) mediums.add(art.medium);
      if (sale.clientName) clients.add(sale.clientName);
      
      const date = new Date(sale.saleDate);
      if (!isNaN(date.getTime())) {
        years.add(date.getFullYear().toString());
      }
    });

    return {
      availableBranches: Array.from(branches).sort(),
      availableArtists: Array.from(artists).sort(),
      availableClients: Array.from(clients).sort(),
      availableYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // Descending
      availableMediums: Array.from(mediums).sort()
    };
  }, [allSales, filteredArtworks]);

  const filteredSales = useMemo(() => {
    const result = allSales.filter(sale => {
      // Check for permission restriction first
      const rawArt = artworks.find(a => a.id === sale.artworkId);
      const permittedArt = filteredArtworks.find(a => a.id === sale.artworkId);
      
      // If artwork exists in database but is hidden by permissions, do not show the sale
      if (rawArt && !permittedArt) {
        return false;
      }

      const art = permittedArt || (sale.artworkSnapshot as Artwork);
      const search = searchTerm.trim().toLowerCase();

      if (search) {
        const searchable = [
          art?.title,
          art?.code,
          art?.artist,
          sale.clientName,
          sale.agentName,
          art?.currentBranch
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchable.includes(search)) return false;
      }
      
      // Branch Filter
      if (branchFilter !== 'All' && art?.currentBranch !== branchFilter) return false;

      // Artist Filter
      if (artistFilter !== 'All' && art?.artist !== artistFilter) return false;

      // Client Filter
      if (clientFilter !== 'All' && sale.clientName !== clientFilter) return false;

      // Medium Filter
      if (mediumFilter !== 'All' && art?.medium !== mediumFilter) return false;

      // Size Filter (Text Search)
      if (sizeFilter) {
        const sizeStr = art?.dimensions || '';
        if (!sizeStr.toLowerCase().includes(sizeFilter.toLowerCase())) return false;
      }

      // Date Filters
      const saleDate = new Date(sale.saleDate);

      if (yearFilter !== 'All' && saleDate.getFullYear().toString() !== yearFilter) return false;
      if (monthFilter !== 'All' && (saleDate.getMonth() + 1).toString() !== monthFilter) return false;

      // Payment Type Filter
      if (paymentTypeFilter !== 'All') {
        const price = (art?.price || 0);
        const { paymentType } = getPaymentSummary(sale, price);
        if (paymentType !== paymentTypeFilter) return false;
      }

      return true;
    });

    return result;
  }, [allSales, filteredArtworks, branchFilter, artistFilter, clientFilter, yearFilter, monthFilter, mediumFilter, sizeFilter, paymentTypeFilter, searchTerm]);

  const ledgerMetrics = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId) || (sale.artworkSnapshot as Artwork);
      const price = art?.price || 0;
      const { totalPaid, balance, isFullyPaid, paymentType } = getPaymentSummary(sale, price);

      acc.totalValue += price;
      acc.totalPaid += totalPaid;
      acc.outstanding += balance;
      if (isFullyPaid) acc.fullyPaid += 1;
      if (paymentType === 'Installment') acc.installments += 1;
      if (!sale.isDelivered && !sale.isCancelled) acc.awaitingTransit += 1;
      return acc;
    }, {
      totalValue: 0,
      totalPaid: 0,
      outstanding: 0,
      fullyPaid: 0,
      installments: 0,
      awaitingTransit: 0
    });
  }, [filteredSales, filteredArtworks]);

  const hasActiveFilters = branchFilter !== 'All' || artistFilter !== 'All' || clientFilter !== 'All' || mediumFilter !== 'All' || yearFilter !== 'All' || monthFilter !== 'All' || paymentTypeFilter !== 'All' || sizeFilter !== '' || searchTerm !== '';

  const clearFilters = () => {
    setBranchFilter('All');
    setArtistFilter('All');
    setClientFilter('All');
    setMediumFilter('All');
    setYearFilter('All');
    setMonthFilter('All');
    setPaymentTypeFilter('All');
    setSizeFilter('');
    setSearchTerm('');
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => {
    if (selectedIds.length === filteredSales.length) setSelectedIds([]);
    else setSelectedIds(filteredSales.map(s => s.id));
  };

  const exportSales = () => {
    const headers = ['Sale ID', 'Artwork Code', 'Title', 'Client', 'Agent', 'Branch', 'Sale Date', 'Price', 'Downpayment', 'Remaining Balance', 'Delivery Status', 'Payment Mode'];
    const rows = sales.map(sale => {
      const art = filteredArtworks.find(a => a.id === sale.artworkId);
      const snapshot = sale.artworkSnapshot;
      
      const title = art?.title || snapshot?.title || 'Unknown';
      const safeTitle = `"${title.replace(/"/g, '""')}"`;
      
      const safeClient = `"${sale.clientName.replace(/"/g, '""')}"`;
      
      const branch = art?.currentBranch || snapshot?.currentBranch || 'Unknown';
      const code = art?.code || snapshot?.code || 'N/A';
      const price = art?.price || snapshot?.price || 0;
      const downpayment = sale.downpayment || 0;
      const balance = price - downpayment;

      return [
        sale.id,
        code,
        safeTitle,
        safeClient,
        sale.agentName,
        branch,
        sale.saleDate,
        price,
        downpayment,
        balance,
        sale.isDelivered ? 'Delivered' : 'Awaiting Delivery',
        sale.isDownpayment ? 'Downpayment' : 'Full Payment'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_SalesHistory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-1">Sales History</p>
          <h1 className="text-3xl font-black text-neutral-950 tracking-tight">Sales Ledger</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {filteredSales.length.toLocaleString()} of {allSales.length.toLocaleString()} finalized records shown.
          </p>
        </div>
        {canExport && (
          <button 
            onClick={exportSales}
            className="inline-flex items-center justify-center gap-2 bg-neutral-950 border border-neutral-950 text-white px-5 py-3 rounded-sm hover:bg-neutral-800 transition-all shadow-sm font-black text-xs uppercase tracking-widest"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: 'Gross Sales', value: `₱${ledgerMetrics.totalValue.toLocaleString()}`, icon: ReceiptText, tone: 'text-neutral-950', sub: 'Filtered ledger value' },
          { label: 'Collected', value: `₱${ledgerMetrics.totalPaid.toLocaleString()}`, icon: WalletCards, tone: 'text-emerald-700', sub: 'Approved payments' },
          { label: 'Outstanding', value: `₱${ledgerMetrics.outstanding.toLocaleString()}`, icon: AlertTriangle, tone: ledgerMetrics.outstanding > 0 ? 'text-red-700' : 'text-neutral-950', sub: 'Remaining balance' },
          { label: 'Fully Paid', value: ledgerMetrics.fullyPaid.toLocaleString(), icon: CheckCircle2, tone: 'text-emerald-700', sub: `${ledgerMetrics.installments} installment sale${ledgerMetrics.installments === 1 ? '' : 's'}` },
          { label: 'Awaiting Transit', value: ledgerMetrics.awaitingTransit.toLocaleString(), icon: Truck, tone: 'text-amber-700', sub: 'Sold, not delivered' }
        ].map(metric => (
          <div key={metric.label} className="rounded-sm border border-neutral-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{metric.label}</p>
                <p className={`mt-1 text-xl font-black leading-none ${metric.tone}`}>{metric.value}</p>
              </div>
              <metric.icon size={18} className="text-neutral-400" />
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1.25fr)_repeat(4,minmax(150px,1fr))] xl:grid-cols-[minmax(280px,1.35fr)_repeat(8,minmax(125px,1fr))] gap-3 w-full">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search artwork, client, code, branch..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-sm pl-10 pr-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 transition-all"
            />
          </div>
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Branch"
          >
            <option value="All">All Branches</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Artist Filter */}
          <select
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Artist"
          >
            <option value="All">All Artists</option>
            {availableArtists.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Client"
          >
            <option value="All">All Clients</option>
            {availableClients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Medium Filter */}
          <select
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Medium"
          >
            <option value="All">All Mediums</option>
            {availableMediums.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Year"
          >
            <option value="All">All Years</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Month"
          >
            <option value="All">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m.toString()}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>

          {/* Payment Type Filter */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all cursor-pointer appearance-none"
            title="Filter by Payment Type"
          >
            <option value="All">All Payment Types</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Installment">Installment</option>
          </select>

          {/* Size Filter with Clear Button */}
          <div className="relative w-full">
            <input
              type="text"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              placeholder="Size (e.g. 24x36)"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-3 text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:border-neutral-500 hover:bg-white transition-all pr-10"
            />
            {hasActiveFilters && (
              <button
                  onClick={clearFilters}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:bg-neutral-100 rounded-sm transition-colors"
                  title="Clear All Filters"
              >
                  <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      <div className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-310px)]">
        <table className="w-full text-left border-collapse min-w-[1180px]">
          <thead>
            <tr className="bg-neutral-50/95 backdrop-blur border-b border-neutral-100 sticky top-0 z-10">
              <th className="px-6 py-4">
                {canDelete && <input type="checkbox" checked={selectedIds.length === filteredSales.length && filteredSales.length > 0} onChange={selectAll} />}
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Artwork</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Branch</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Agent</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Value</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Payment Type</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Certificate</th>
              <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => {
              const art = filteredArtworks.find(a => a.id === sale.artworkId);
              // Fallback to snapshot if artwork is deleted
              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);

              return (
                <tr 
                  key={sale.id} 
                  className="hover:bg-neutral-50/80 transition-colors group cursor-pointer even:bg-neutral-50/25"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                    if (displayArt) setSelectedSaleDetailPair({art: displayArt, sale});
                  }}
                >
                  <td className="px-6 py-3">
                    {canDelete && (
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(sale.id)} 
                        onChange={() => toggleSelect(sale.id)} 
                      />
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div 
                      className={`flex items-center space-x-3 min-w-[280px] ${displayArt && onViewArtwork ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (displayArt && onViewArtwork) {
                          onViewArtwork(displayArt.id);
                        }
                      }}
                    >
                      <OptimizedImage
                        src={displayArt?.imageUrl || undefined}
                        className="w-12 h-12 rounded-sm object-cover border border-neutral-200 bg-neutral-50"
                        alt="Thumb"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1">{displayArt?.title || 'Unknown Artwork'}</p>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mt-0.5">{displayArt?.code || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-bold text-neutral-800 max-w-[180px] truncate" title={sale.clientName}>{sale.clientName}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-neutral-600 max-w-[210px] truncate" title={displayArt?.currentBranch || '-'}>{displayArt?.currentBranch || '-'}</p>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-6 h-6 rounded-sm bg-neutral-200 flex items-center justify-center text-[9px] font-black text-neutral-600">{sale.agentName[0]}</div>
                      <p className="text-xs text-neutral-600 font-bold max-w-[130px] truncate" title={sale.agentName}>{sale.agentName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-bold text-neutral-700 tabular-nums">{new Date(sale.saleDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {sale.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                      <div className="flex flex-col items-end leading-tight">
                        <span className="line-through text-neutral-400 font-normal text-[10px]">₱{(displayArt?.price || 0).toLocaleString()}</span>
                        <span className="text-sm font-black text-neutral-900">₱{(sale.discountedPrice || 0).toLocaleString()} <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded ml-1">-{sale.discountPercentage}%</span></span>
                      </div>
                    ) : (
                      <p className="text-sm font-black text-neutral-900">₱{(displayArt?.price || 0).toLocaleString()}</p>
                    )}
                    {(() => {
                      const actualPrice = sale.discountedPrice !== undefined && sale.discountedPrice !== null ? sale.discountedPrice : (displayArt?.price || 0);
                      const { totalPaid, balance, isFullyPaid } = getPaymentSummary(sale, actualPrice);
                      const showBalance = sale.isDownpayment || sale.status === SaleStatus.APPROVED;
                      
                      if (totalPaid === 0 && !showBalance) return null;
                      
                      return (
                        <div className="mt-1 flex flex-col items-end space-y-0.5">
                          <span className="text-[10px] text-neutral-400 font-bold">
                            Paid: ₱{totalPaid.toLocaleString()}
                          </span>
                          {showBalance && (
                            <span className={`text-[10px] font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isFullyPaid ? 'FULLY PAID' : `Bal: ₱${balance.toLocaleString()}`}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-3">
                    {(() => {
                      const { paymentType } = getPaymentSummary(sale, displayArt?.price || 0);
                      const isInstallment = paymentType === 'Installment';

                      return (
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                          isInstallment
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-sm ${isInstallment ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                          <span>{paymentType}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button 
                      onClick={() => displayArt && setSelectedSalePair({art: displayArt, sale})}
                      className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm hover:shadow-md transition-all"
                      title="Generate Certificate"
                      disabled={!displayArt}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    {sale.isCancelled ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-neutral-400 rounded-sm"></span>
                        <span>Cancelled</span>
                      </span>
                    ) : sale.status === SaleStatus.FOR_SALE_APPROVAL ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm animate-pulse"></span>
                        <span>For Approval</span>
                      </span>
                    ) : sale.isDelivered ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-md text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 bg-neutral-50 rounded-sm"></span>
                        <span>Delivered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-sm animate-pulse"></span>
                        <span>Awaiting Transit</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="divide-y divide-neutral-100">
            {filteredSales.map((sale) => {
              const art = filteredArtworks.find(a => a.id === sale.artworkId);
              const displayArt = art || (sale.artworkSnapshot ? {
                id: sale.artworkId,
                status: ArtworkStatus.SOLD,
                sheetName: 'Unknown',
                createdAt: sale.saleDate,
                ...sale.artworkSnapshot
              } as Artwork : undefined);

              return (
                <div 
                  key={sale.id}
                  className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                    if (displayArt) setSelectedSaleDetailPair({art: displayArt, sale});
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {canDelete && (
                      <div className="pt-1">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(sale.id)} 
                          onChange={() => toggleSelect(sale.id)} 
                          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                      </div>
                    )}
                    
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <OptimizedImage
                        src={displayArt?.imageUrl || undefined}
                        className="w-full h-full object-cover"
                        alt="Thumb"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-neutral-900 line-clamp-2">{displayArt?.title || 'Unknown Artwork'}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{displayArt?.code || 'N/A'}</p>
                        </div>
                        {sale.isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md text-[10px] font-bold uppercase">
                            Cancelled
                          </span>
                        ) : sale.status === SaleStatus.FOR_SALE_APPROVAL ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold uppercase tracking-widest">
                            For Approval
                          </span>
                        ) : sale.isDelivered ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200 text-neutral-900 border border-neutral-300 rounded-md text-[10px] font-bold uppercase">
                            Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold uppercase tracking-tight">
                            Transit
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Client</span>
                          <span className="font-medium text-neutral-700 truncate block">{sale.clientName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Value</span>
                          <span className="font-black text-neutral-900">₱{(displayArt?.price || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {(() => {
                        const { paymentType } = getPaymentSummary(sale, displayArt?.price || 0);
                        const isInstallment = paymentType === 'Installment';

                        return (
                          <div className="flex justify-end">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-tight ${
                              isInstallment
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {paymentType}
                            </span>
                          </div>
                        );
                      })()}

                      {(() => {
                        const price = displayArt?.price || 0;
                        const downpayment = sale.downpayment || 0;
                        const installmentsTotal = (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0);
                        const totalPaid = downpayment + installmentsTotal;
                        const balance = price - totalPaid;
                        const isFullyPaid = balance <= 0 && totalPaid > 0;

                        if (totalPaid === 0) return null;

                        return (
                          <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-md">
                            <div className="text-[10px]">
                              <span className="text-neutral-400 font-bold uppercase block">Paid</span>
                              <span className="font-bold text-neutral-700">₱{totalPaid.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-right">
                              <span className="text-neutral-400 font-bold uppercase block">{isFullyPaid ? 'Status' : 'Balance'}</span>
                              <span className={`font-bold ${isFullyPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isFullyPaid ? 'FULLY PAID' : `₱${balance.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-4 h-4 rounded-sm bg-neutral-200 flex items-center justify-center text-[8px] font-bold">{sale.agentName[0]}</div>
                          <p className="text-[10px] text-neutral-600 font-medium">{sale.agentName}</p>
                          <span className="text-[10px] text-neutral-400">•</span>
                          <span className="text-[10px] text-neutral-600 font-medium tabular-nums">{new Date(sale.saleDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-neutral-400">{displayArt?.currentBranch || '-'}</span>
                           <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                displayArt && setSelectedSalePair({art: displayArt, sale});
                              }}
                              className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
                              title="Generate Certificate"
                              disabled={!displayArt}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {filteredSales.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-neutral-500 font-black uppercase tracking-widest text-sm">
              {allSales.length === 0 ? 'No sales recorded yet.' : 'No sales match the current filters.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-sm bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg text-neutral-900 pl-6 pr-4 py-3 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-5 z-40 animate-in slide-in-from-bottom-8 fade-in duration-300 border border-neutral-200/60 max-w-[90vw]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Selection</span>
            <span className="font-bold text-base leading-none">{selectedIds.length} Sales</span>
          </div>
          <div className="h-7 w-px bg-neutral-200/60 mx-1"></div>
          <button 
            onClick={() => wrapAction(async () => {
              if (onBulkDelete) {
                await Promise.resolve(onBulkDelete(selectedIds));
                setSelectedIds([]);
              }
            }, 'Synchronizing Sale Record Deletions...')}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-6 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <span>Delete Selected</span>
          </button>
          <button 
            onClick={() => setSelectedIds([])}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {selectedSaleDetailPair && (
        <SaleDetailModal 
          artwork={selectedSaleDetailPair.art} 
          sale={selectedSaleDetailPair.sale} 
          onClose={() => setSelectedSaleDetailPair(null)} 
        />
      )}

      {selectedSalePair && (
        <CertificateModal 
          artwork={selectedSalePair.art} 
          sale={selectedSalePair.sale} 
          onClose={() => setSelectedSalePair(null)} 
        />
      )}

      {createPortal(
        <LoadingOverlay
          isVisible={isProcessing}
          title={processMessage}
          progress={{ current: processProgress, total: 100 }}
        />,
        document.body
      )}
    </div>
  );
};

export default SalesRecordPage;
