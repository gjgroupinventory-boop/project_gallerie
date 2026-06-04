import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  ArrowRightLeft, 
  X, 
  Search, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingUp,
  Tag,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Artwork, SaleRecord, ArtworkStatus } from '../../types';

interface InventoryInsights {
  totalItems: number;
  availableCount: number;
  availableValue: number;
  reservedCount: number;
  inTransitCount: number;
  soldCount: number;
  deliveredCount: number;
  cancelledCount: number;
}

interface InventoryStatsProps {
  inventoryInsights: InventoryInsights;
  artworks?: Artwork[];
  sales?: SaleRecord[];
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ 
  inventoryInsights, 
  artworks = [], 
  sales = [] 
}) => {
  const [activeModal, setActiveModal] = useState<'total' | 'available' | 'reserved' | 'sold' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Close modal and reset search
  const closeModal = () => {
    setActiveModal(null);
    setSearchTerm('');
  };

  // Helper: Get sales matching an artwork
  const getArtworkSale = (artworkId: string) => {
    return sales.find(s => s.artworkId === artworkId && !s.isCancelled);
  };

  // 1. Total Overview Calculations
  const totalValuation = useMemo(() => {
    return artworks.reduce((sum, art) => sum + (art.price || 0), 0);
  }, [artworks]);

  const uniqueArtists = useMemo(() => {
    return new Set(artworks.map(art => art.artist).filter(Boolean)).size;
  }, [artworks]);

  const mediumBreakdown = useMemo(() => {
    const counts: { [key: string]: number } = {};
    artworks.forEach(art => {
      const medium = art.medium || 'Other';
      counts[medium] = (counts[medium] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [artworks]);

  const branchBreakdown = useMemo(() => {
    const counts: { [key: string]: number } = {};
    artworks.forEach(art => {
      const branch = art.currentBranch || 'N/A';
      counts[branch] = (counts[branch] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [artworks]);

  // 2. Available Stocks Calculations
  const availableArtworks = useMemo(() => {
    return artworks.filter(art => art.status === ArtworkStatus.AVAILABLE);
  }, [artworks]);

  const avgAvailablePrice = useMemo(() => {
    if (availableArtworks.length === 0) return 0;
    const total = availableArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    return Math.round(total / availableArtworks.length);
  }, [availableArtworks]);

  // 3. Reserved & In Transit Calculations
  const reservedArtworks = useMemo(() => {
    return artworks.filter(art => art.status === ArtworkStatus.RESERVED);
  }, [artworks]);

  const inTransitArtworks = useMemo(() => {
    // Treat any artwork with transit status or inTransit status helper as Transit
    return artworks.filter(art => (art.status as string) === 'In Transit' || (art.status as string).toLowerCase().includes('transit'));
  }, [artworks]);

  // 4. Sold / Delivered Calculations
  const soldSales = useMemo(() => {
    // Find all sales matching current filtered artworks that are not cancelled
    const artworkIds = new Set(artworks.map(a => a.id));
    return sales.filter(s => artworkIds.has(s.artworkId) && !s.isCancelled);
  }, [sales, artworks]);

  const totalSalesRevenue = useMemo(() => {
    return soldSales.reduce((sum, s) => {
      const art = artworks.find(a => a.id === s.artworkId);
      const price = s.discountedPrice !== undefined && s.discountedPrice !== null 
        ? s.discountedPrice 
        : (s.artworkSnapshot?.discountedPrice || s.artworkSnapshot?.price || art?.price || 0);
      return sum + price;
    }, 0);
  }, [soldSales, artworks]);

  const totalCollectedPayments = useMemo(() => {
    return soldSales.reduce((sum, s) => {
      const downpayment = s.downpayment || 0;
      const installments = (s.installments || []).filter(i => !i.isPending && !i.isDeclined).reduce((tot, inst) => tot + inst.amount, 0);
      return sum + downpayment + installments;
    }, 0);
  }, [soldSales]);

  const outstandingBalance = useMemo(() => {
    return Math.max(0, totalSalesRevenue - totalCollectedPayments);
  }, [totalSalesRevenue, totalCollectedPayments]);

  // Filter lists inside modals based on Search Term
  const filteredModalArtworks = useMemo(() => {
    if (!activeModal) return [];
    
    let targetList: Artwork[] = [];
    if (activeModal === 'total') {
      targetList = artworks;
    } else if (activeModal === 'available') {
      targetList = availableArtworks;
    } else if (activeModal === 'reserved') {
      targetList = [...reservedArtworks, ...inTransitArtworks];
    } else if (activeModal === 'sold') {
      targetList = artworks.filter(art => art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED);
    }

    if (!searchTerm.trim()) return targetList;
    const term = searchTerm.toLowerCase();
    return targetList.filter(art => 
      art.title.toLowerCase().includes(term) ||
      art.code.toLowerCase().includes(term) ||
      art.artist.toLowerCase().includes(term) ||
      (art.currentBranch && art.currentBranch.toLowerCase().includes(term))
    );
  }, [activeModal, artworks, availableArtworks, reservedArtworks, inTransitArtworks, searchTerm]);

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div 
          onClick={() => setActiveModal('total')}
          className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-indigo-600 transition-colors">
              Total Items (Current View)
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <ShoppingBag className="w-4 h-4 transition-all duration-300 group-hover:scale-115 group-hover:rotate-12" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {inventoryInsights.totalItems.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
            <span>Filtered & searched view</span>
            <span className="font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Analyze details &rarr;</span>
          </div>
        </div>

        {/* Card 2: Available */}
        <div 
          onClick={() => setActiveModal('available')}
          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 group-hover:text-emerald-800 transition-colors">
              Available Inventory
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <CheckCircle2 className="w-4 h-4 transition-all duration-300 group-hover:scale-115 group-hover:-translate-y-0.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {inventoryInsights.availableCount.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>₱{inventoryInsights.availableValue.toLocaleString()} list value</span>
            <span className="font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">Analyze details &rarr;</span>
          </div>
        </div>

        {/* Card 3: Reserved */}
        <div 
          onClick={() => setActiveModal('reserved')}
          className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 group-hover:text-amber-800 transition-colors">
              Reserved / In Transit
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
              <Clock className="w-4 h-4 transition-all duration-700 group-hover:scale-115 group-hover:rotate-[360deg]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(inventoryInsights.reservedCount + inventoryInsights.inTransitCount).toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>{inventoryInsights.reservedCount} Res, {inventoryInsights.inTransitCount} Transit</span>
            <span className="font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">Analyze details &rarr;</span>
          </div>
        </div>

        {/* Card 4: Sold */}
        <div 
          onClick={() => setActiveModal('sold')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 group-hover:text-blue-800 transition-colors">
              Sold / Delivered
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <ArrowRightLeft className="w-4 h-4 transition-all duration-300 group-hover:scale-115 group-hover:translate-x-0.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {inventoryInsights.soldCount.toLocaleString()}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>{inventoryInsights.deliveredCount} Del, {inventoryInsights.cancelledCount} Can</span>
            <span className="font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Analyze details &rarr;</span>
          </div>
        </div>
      </div>

      {/* Pop-up Dashboard Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header with Custom Themes */}
            <div className={`p-6 text-white relative overflow-hidden ${
              activeModal === 'total' ? 'bg-gradient-to-r from-indigo-600 to-indigo-800' :
              activeModal === 'available' ? 'bg-gradient-to-r from-emerald-600 to-teal-700' :
              activeModal === 'reserved' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
              'bg-gradient-to-r from-blue-600 to-slate-800'
            }`}>
              {/* Background abstract decoration */}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-4 translate-x-4">
                <Sparkles size={200} />
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                    {activeModal === 'total' && <ShoppingBag className="w-6 h-6 text-white" />}
                    {activeModal === 'available' && <CheckCircle2 className="w-6 h-6 text-white" />}
                    {activeModal === 'reserved' && <Clock className="w-6 h-6 text-white" />}
                    {activeModal === 'sold' && <ArrowRightLeft className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight uppercase">
                      {activeModal === 'total' && 'Total Inventory Analysis'}
                      {activeModal === 'available' && 'Available Stocks Analyzer'}
                      {activeModal === 'reserved' && 'Reserved & Transit Logistics'}
                      {activeModal === 'sold' && 'Sales Performance Ledger'}
                    </h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5">
                      {activeModal === 'total' && 'Detailed breakdown of all active records in the filtered view'}
                      {activeModal === 'available' && 'Summary of available items and estimated catalog value'}
                      {activeModal === 'reserved' && 'Logistical track for reservations, events, and transit records'}
                      {activeModal === 'sold' && 'Revenue ledger of completed, in-progress, and delivered sales'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white border border-white/10 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick insights widgets */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {activeModal === 'total' && (
                <>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Items</span>
                    <p className="text-lg font-black text-slate-800">{artworks.length}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estimated Valuation</span>
                    <p className="text-lg font-black text-indigo-700">₱{totalValuation.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Unique Artists</span>
                    <p className="text-lg font-black text-slate-800">{uniqueArtists}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Avg Price / Art</span>
                    <p className="text-lg font-black text-slate-800">
                      ₱{artworks.length ? Math.round(totalValuation / artworks.length).toLocaleString() : 0}
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'available' && (
                <>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Available Items</span>
                    <p className="text-lg font-black text-slate-800">{availableArtworks.length}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Value</span>
                    <p className="text-lg font-black text-emerald-700">₱{inventoryInsights.availableValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Avg Price</span>
                    <p className="text-lg font-black text-slate-800">₱{avgAvailablePrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Market Share</span>
                    <p className="text-lg font-black text-slate-800">
                      {artworks.length ? Math.round((availableArtworks.length / artworks.length) * 100) : 0}% of view
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'reserved' && (
                <>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reserved count</span>
                    <p className="text-lg font-black text-amber-700">{reservedArtworks.length}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Transit count</span>
                    <p className="text-lg font-black text-orange-700">{inTransitArtworks.length}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Locked Valuation</span>
                    <p className="text-lg font-black text-slate-800">
                      ₱{reservedArtworks.reduce((sum, art) => sum + (art.price || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Transit Valuation</span>
                    <p className="text-lg font-black text-slate-800">
                      ₱{inTransitArtworks.reduce((sum, art) => sum + (art.price || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </>
              )}

              {activeModal === 'sold' && (
                <>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sales Revenue</span>
                    <p className="text-lg font-black text-blue-700">₱{totalSalesRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Collected</span>
                    <p className="text-lg font-black text-emerald-700">₱{totalCollectedPayments.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Outstanding Balance</span>
                    <p className="text-lg font-black text-red-600">₱{outstandingBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fulfillment Rate</span>
                    <p className="text-lg font-black text-slate-800">
                      {soldSales.length ? Math.round((soldSales.filter(s => s.isDelivered).length / soldSales.length) * 100) : 0}% Delivered
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Body / Detailed Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Extra visual analytics for Total & Available */}
              {activeModal === 'total' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Layers size={13} className="text-indigo-500" /> Top Mediums
                    </h4>
                    <div className="space-y-2">
                      {mediumBreakdown.map(([medium, count]) => (
                        <div key={medium} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="truncate max-w-[200px]">{medium}</span>
                            <span>{count} ({Math.round((count / artworks.length) * 100)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(count / artworks.length) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin size={13} className="text-indigo-500" /> Branch Inventory Count
                    </h4>
                    <div className="space-y-2">
                      {branchBreakdown.map(([branch, count]) => (
                        <div key={branch} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="truncate max-w-[200px]">{branch}</span>
                            <span>{count} items</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(count / artworks.length) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Items List Filter & Table */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-1 rounded-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 pl-2">
                    Record Listing ({filteredModalArtworks.length} items shown)
                  </h4>
                  <div className="relative flex-1 sm:max-w-xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={14} />
                    </span>
                    <input 
                      type="text" 
                      placeholder="Search code, title, artist, branch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3.5 px-4">Artwork Code</th>
                          <th className="py-3.5 px-4">Title & Artist</th>
                          <th className="py-3.5 px-4">Branch / Location</th>
                          <th className="py-3.5 px-4 text-right">Price / Value</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {filteredModalArtworks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                              No matching records found.
                            </td>
                          </tr>
                        ) : (
                          filteredModalArtworks.map((art) => {
                            const matchingSale = getArtworkSale(art.id);
                            return (
                              <tr key={art.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4 font-mono font-black text-slate-900">
                                  {art.code}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className="text-slate-900 font-extrabold">{art.title}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{art.artist} • {art.medium}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={11} className="text-slate-400" />
                                    <span>{art.currentBranch}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-black text-slate-900">
                                  ₱{art.price?.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                    art.status === ArtworkStatus.AVAILABLE ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    art.status === ArtworkStatus.RESERVED ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    (art.status as string) === 'In Transit' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                    'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  }`}>
                                    {art.status}
                                  </span>
                                  {/* Event or Client tag */}
                                  {art.status === ArtworkStatus.RESERVED && art.reservedForEventName && (
                                    <div className="text-[8px] text-amber-600 font-black tracking-tight mt-1 truncate max-w-[120px] mx-auto uppercase">
                                      {art.reservedForEventName}
                                    </div>
                                  )}
                                  {matchingSale && (
                                    <div className="text-[8px] text-indigo-500 font-black tracking-tight mt-1 truncate max-w-[120px] mx-auto uppercase">
                                      For: {matchingSale.clientName}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Info size={12} className="text-slate-400" /> Use search filter above to narrow records
              </span>
              <span>
                Artisflow Engine
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
