import React, { useState, useMemo, useEffect } from 'react';
import { Artwork, SaleRecord, ArtworkStatus, ActivityLog, TransferRecord, ExhibitionEvent, ReturnRecord, FramerRecord, UserPermissions } from '../types';
import { Search, Download, TrendingUp, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Package, Frame, RotateCcw, Building2, Ticket, Filter, Image as ImageIcon, History, Maximize2, MapPin, Tag } from 'lucide-react';
import { utils, writeFile } from 'xlsx';

interface TimeMachinePageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  logs: ActivityLog[];
  transfers: TransferRecord[];
  events?: ExhibitionEvent[];
  returnRecords?: ReturnRecord[];
  framerRecords?: FramerRecord[];
  onViewArtwork?: (id: string) => void;
  exclusiveBranches?: string[];
  userPermissions?: UserPermissions;
}

const TimeMachinePage: React.FC<TimeMachinePageProps> = ({
  artworks,
  sales,
  logs,
  transfers,
  events = [],
  returnRecords = [],
  framerRecords = [],
  onViewArtwork,
  exclusiveBranches = [],
  userPermissions
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDay === 'all') {
      const lastDay = new Date(selectedYear, selectedMonth, 0);
      setSelectedDate(`${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`);
    } else {
      const date = new Date(selectedYear, selectedMonth - 1, selectedDay as number);
      setSelectedDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    }
  }, [selectedMonth, selectedYear, selectedDay]);

  const getEffectiveCreationDate = (art: Artwork): string => {
    if (art.importPeriod) return `${art.importPeriod}-01`;
    if (art.createdAt) return art.createdAt;
    return '2020-01-01';
  };

  const unifiedData = useMemo(() => {
    const targetTime = new Date(selectedDate).getTime() + (24 * 60 * 60 * 1000) - 1;
    const existedArtworks = artworks.filter(art => {
      if (!art.id || !art.title) return false;
      const effectiveDateStr = getEffectiveCreationDate(art);
      if (new Date(effectiveDateStr).getTime() > targetTime) return false;
      if ((art as any).deletedAt && new Date((art as any).deletedAt).getTime() <= targetTime) return false;
      return true;
    });

    const historicalData = existedArtworks.map(art => {
      const sale = sales.find(s => s.artworkId === art.id && !s.isCancelled);
      let historicalStatus: string = ArtworkStatus.AVAILABLE;
      let saleDetails = undefined;
      let isSold = false;

      if (sale && new Date(sale.saleDate).getTime() <= targetTime) {
        isSold = true;
        const isMonthSale = new Date(sale.saleDate).getMonth() + 1 === selectedMonth && new Date(sale.saleDate).getFullYear() === selectedYear;
        historicalStatus = isMonthSale ? ArtworkStatus.SOLD : 'SOLD (Prior)';
        saleDetails = { price: (sale as any).amount || sale.artworkSnapshot?.price || 0, clientName: sale.clientName };
      } else if (art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED) {
        isSold = true;
        historicalStatus = 'SOLD (Prior)';
        saleDetails = { price: art.price, clientName: 'Imported/External' };
      }

      if (!isSold) {
        const activeReturn = returnRecords.find(r => new Date(r.returnDate).getTime() <= targetTime && (!r.resolvedAt || new Date(r.resolvedAt).getTime() > targetTime) && r.artworkId === art.id);
        if (activeReturn) historicalStatus = 'RETURNED';
        else {
          const activeFramer = framerRecords.find(f => new Date(f.sentDate).getTime() <= targetTime && (!f.resolvedAt || new Date(f.resolvedAt).getTime() > targetTime) && f.artworkId === art.id);
          if (activeFramer) historicalStatus = 'FRAMER';
          else {
            const activeEvent = events.find(e => e?.artworkIds?.includes(art.id) && new Date(e.startDate).getTime() <= targetTime && new Date(e.endDate).getTime() >= targetTime);
            if (activeEvent) historicalStatus = 'EXHIBITED';
            else if (targetTime >= new Date().setHours(0, 0, 0, 0) && art.status === ArtworkStatus.RESERVED) historicalStatus = ArtworkStatus.RESERVED;
          }
        }
      }

      let historicalBranch = art.currentBranch;
      if (isSold && art.soldAtBranch) historicalBranch = art.soldAtBranch;
      else if (transfers?.length > 0) {
        const artTransfers = transfers.filter(t => t.artworkId === art.id).sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime());
        const lastValid = [...artTransfers].reverse().find(t => new Date(t.timestamp || '').getTime() <= targetTime);
        if (lastValid) historicalBranch = lastValid.destination;
        else if (artTransfers[0] && artTransfers[0].origin) historicalBranch = artTransfers[0].origin;
      }

      return { ...art, status: historicalStatus as any, currentBranch: historicalBranch, saleDetails };
    });

    return historicalData;
  }, [artworks, sales, transfers, events, returnRecords, framerRecords, selectedDate, selectedMonth, selectedYear]);

  const filteredData = useMemo(() => {
    return unifiedData.filter((art: any) => {
      const matchesSearch = [art.title, art.artist, art.code, art.saleDetails?.clientName].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBranch = branchFilter === 'All' || art.currentBranch === branchFilter;
      const matchesFilter = activeFilter === 'ALL' || art.status === activeFilter;
      return matchesSearch && matchesBranch && matchesFilter;
    });
  }, [unifiedData, searchTerm, branchFilter, activeFilter]);

  const stats = useMemo(() => ({
    total: unifiedData.length,
    active: unifiedData.filter((a: any) => a.status === ArtworkStatus.AVAILABLE).length,
    sold: unifiedData.filter((a: any) => a.status === ArtworkStatus.SOLD || a.status === 'SOLD (Prior)').length,
    exhibited: unifiedData.filter((a: any) => a.status === 'EXHIBITED').length,
    framer: unifiedData.filter((a: any) => a.status === 'FRAMER').length,
    returned: unifiedData.filter((a: any) => a.status === 'RETURNED').length,
    reserved: unifiedData.filter((a: any) => a.status === ArtworkStatus.RESERVED).length,
    totalValue: unifiedData.reduce((acc, curr: any) => acc + (curr.saleDetails?.price || curr.price || 0), 0)
  }), [unifiedData]);

  const handlePrevMonth = () => { if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); } else setSelectedMonth(m => m - 1); };
  const handleNextMonth = () => { if (selectedYear === currentYear && selectedMonth === currentMonth) return; if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); } else setSelectedMonth(m => m + 1); };

  const exportData = () => {
    const data = filteredData.map(item => ({ Code: item.code, Title: item.title, Artist: item.artist, Status: item.status, Branch: item.currentBranch, Price: item.price }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Inventory");
    writeFile(wb, `TimeMachine_${selectedDate}.xlsx`);
  };

  return (
    <div className="h-[calc(100vh-6rem)] bg-[#FBFBFB] flex flex-col font-sans text-neutral-900 overflow-hidden">
      {/* TOP HEADER: HIGH PRESTIGE BLACK DESIGN */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 relative z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-neutral-700 flex items-center justify-center text-neutral-400 bg-neutral-800 rounded shadow-inner">
            <History size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Time Machine</h1>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Inventory Archive Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-3.5 h-3.5" />
            <input 
              type="text" 
              placeholder="Query state..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 pr-4 py-1.5 bg-neutral-800 border border-neutral-700 text-xs text-white focus:border-blue-500 outline-none w-64 transition-all" 
            />
          </div>
          <div className="h-6 w-px bg-neutral-800" />
          <button 
            onClick={() => { setSelectedYear(currentYear); setSelectedMonth(currentMonth); setSelectedDay(currentDay); }} 
            className="px-4 py-1.5 bg-white text-neutral-900 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            Present
          </button>
          {userPermissions?.canExportArtwork && (
            <button onClick={exportData} className="p-2 border border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white transition-colors"><Download size={16} /></button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT CONTROL COLUMN: CLEAN BORDER TILES */}
        <div className="w-72 bg-white border-r border-neutral-200 flex flex-col overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-8">
            
            {/* DATE PICKER TILE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <CalendarIcon size={12} /> Temporal Focus
              </div>
              <div className="border border-neutral-200 p-4 space-y-4">
                 <div className="flex items-center justify-between">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-neutral-50 rounded border border-transparent hover:border-neutral-200"><ChevronLeft size={16} /></button>
                    <div className="text-center">
                       <div className="text-[11px] font-black uppercase">{monthNames[selectedMonth - 1]}</div>
                       <div className="text-[10px] font-bold text-neutral-400">{selectedYear}</div>
                    </div>
                    <button onClick={handleNextMonth} disabled={selectedYear === currentYear && selectedMonth === currentMonth} className="p-1 hover:bg-neutral-50 rounded border border-transparent hover:border-neutral-200 disabled:opacity-0"><ChevronRight size={16} /></button>
                 </div>
                 <select 
                   value={selectedDay === 'all' ? 'all' : selectedDay} 
                   onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                   className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider focus:outline-none focus:border-neutral-900"
                 >
                   <option value="all">Whole Month View</option>
                   {Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => selectedYear < currentYear || selectedMonth < currentMonth || d <= currentDay).map(d => <option key={d} value={d}>{fullMonthNames[selectedMonth - 1]} {d}</option>)}
                 </select>
              </div>
            </div>

            {/* LOCATION FILTER TILE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <MapPin size={12} /> Infrastructure
              </div>
              <div className="border border-neutral-200 p-4">
                <select 
                  value={branchFilter} 
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider focus:outline-none focus:border-neutral-900"
                >
                  <option value="All">All Clusters</option>
                  {Array.from(new Set(unifiedData.map(a => a.currentBranch).filter(Boolean))).sort().map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* ANALYTICS TILE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                <TrendingUp size={12} /> State Summary
              </div>
              <div className="grid grid-cols-1 gap-px bg-neutral-200 border border-neutral-200">
                 {[
                   { label: 'Inventory', value: stats.total, filter: 'ALL', icon: Package },
                   { label: 'Available', value: stats.active, filter: ArtworkStatus.AVAILABLE, icon: Tag },
                   { label: 'Sold', value: stats.sold, filter: ArtworkStatus.SOLD, icon: TrendingUp },
                   { label: 'Exhibited', value: stats.exhibited, filter: 'EXHIBITED', icon: Ticket },
                   { label: 'For Framing', value: stats.framer, filter: 'FRAMER', icon: Frame },
                   { label: 'Returned', value: stats.returned, filter: 'RETURNED', icon: RotateCcw },
                   { label: 'Reserved', value: stats.reserved, filter: ArtworkStatus.RESERVED, icon: Clock },
                 ].map(s => (
                   <button 
                     key={s.label}
                     onClick={() => setActiveFilter(activeFilter === s.filter ? 'ALL' : s.filter)}
                     className={`flex items-center justify-between p-3.5 bg-white hover:bg-neutral-50 transition-all group
                       ${activeFilter === s.filter ? 'bg-neutral-50 border-l-2 border-l-neutral-900 shadow-inner' : ''}
                     `}
                   >
                     <div className="flex items-center gap-3">
                        <s.icon size={12} className={`transition-colors ${activeFilter === s.filter ? 'text-neutral-900' : 'text-neutral-300'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${activeFilter === s.filter ? 'text-neutral-900' : 'text-neutral-400'}`}>{s.label}</span>
                     </div>
                     <span className="text-[11px] font-black">{s.value}</span>
                   </button>
                 ))}
              </div>

              {/* TOTAL VALUE COMPONENT */}
              <div className="border border-neutral-200 p-4 bg-neutral-900 text-white">
                 <div className="text-[8px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-1">Portfolio Value</div>
                 <div className="text-lg font-black tracking-tighter">₱{stats.totalValue.toLocaleString()}</div>
                 <div className="mt-2 h-1 w-full bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(stats.totalValue / (stats.totalValue || 1)) * 100}%` }} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DATA AREA: BLUEPRINT BORDER DESIGN */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-6 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
               Snapshot Protocol: {selectedDate}
             </div>
             {activeFilter !== 'ALL' && (
                <div className="flex items-center gap-3">
                   <span className="text-[9px] font-black uppercase text-neutral-900 bg-white border border-neutral-200 px-2 py-0.5">Filter: {activeFilter}</span>
                   <button onClick={() => setActiveFilter('ALL')} className="text-[9px] font-black uppercase text-neutral-400 hover:text-neutral-900">Clear</button>
                </div>
             )}
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-neutral-200">
             {filteredData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-300">
                   <Package size={24} className="mb-4 opacity-30" />
                   <div className="text-[10px] font-black uppercase tracking-widest">No Temporal Records</div>
                </div>
             ) : (
                <table className="w-full text-left border-collapse border-spacing-0">
                   <thead className="bg-white sticky top-0 z-10">
                      <tr>
                         <th className="px-6 py-4 border-b border-r border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-20 text-center">Img</th>
                         <th className="px-6 py-4 border-b border-r border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-32">Index</th>
                         <th className="px-6 py-4 border-b border-r border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400">Asset Detail</th>
                         <th className="px-6 py-4 border-b border-r border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-48">Locus</th>
                         <th className="px-6 py-4 border-b border-r border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-32">Status</th>
                         <th className="px-6 py-4 border-b border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-400 w-40 text-right">Value</th>
                      </tr>
                   </thead>
                   <tbody className="bg-white">
                      {filteredData.map((art) => (
                         <tr 
                           key={art.id} 
                           onClick={() => onViewArtwork && onViewArtwork(art.id)}
                           className="group hover:bg-neutral-50 transition-colors cursor-pointer"
                         >
                            <td className="p-0 border-b border-r border-neutral-200 text-center">
                               <div className="w-20 h-20 flex items-center justify-center p-2">
                                  <div className="w-full h-full border border-neutral-200 overflow-hidden bg-neutral-50">
                                     {art.imageUrl && !imageErrors[art.id] ? (
                                        <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={() => setImageErrors(prev => ({ ...prev, [art.id]: true }))} />
                                     ) : (
                                        <ImageIcon className="text-neutral-200 m-auto h-full" size={16} />
                                     )}
                                  </div>
                               </div>
                            </td>
                            <td className="px-6 py-4 border-b border-r border-neutral-200">
                               <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">{art.code}</span>
                            </td>
                            <td className="px-6 py-4 border-b border-r border-neutral-200">
                               <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-black text-neutral-800 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{art.title}</span>
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase truncate">{art.artist}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 border-b border-r border-neutral-200">
                               <div className="flex items-center gap-2">
                                  <Building2 size={12} className="text-neutral-300" />
                                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider truncate">{art.currentBranch}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4 border-b border-r border-neutral-200">
                               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border
                                 ${(art.status as any) === ArtworkStatus.SOLD ? 'border-red-200 text-red-500 bg-red-50' : 
                                   (art.status as any) === ArtworkStatus.AVAILABLE ? 'border-emerald-200 text-emerald-500 bg-emerald-50' : 
                                   'border-neutral-200 text-neutral-400 bg-neutral-50'}
                               `}>
                                 {art.status}
                               </span>
                            </td>
                            <td className="px-6 py-4 border-b border-neutral-200 text-right">
                               <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-neutral-800">₱{(art.saleDetails?.price || art.price || 0).toLocaleString()}</span>
                                  {art.saleDetails && <span className="text-[9px] font-black text-blue-600 uppercase">Archived Sale</span>}
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             )}
          </div>

          <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
             <div className="flex items-center gap-4">
                <span>Snapshot Units: {filteredData.length}</span>
                <div className="h-2 w-px bg-neutral-300" />
                <span>Status: Validated Archive</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live Temporal Engine
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeMachinePage;
