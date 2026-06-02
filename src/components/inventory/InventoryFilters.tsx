import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';
import { Branch, ArtworkStatus, UserPermissions, ExhibitionEvent, ImportRecord } from '../../types';
import { ExportDropdown } from '../ExportDropdown';

interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  dateMonthFilter: string;
  setDateMonthFilter: (val: string) => void;
  dateYearFilter: string;
  setDateYearFilter: (val: string) => void;
  branchFilter: string;
  setBranchFilter: (val: string) => void;
  artistFilter: string;
  setArtistFilter: (val: string) => void;
  mediumFilter: string;
  setMediumFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sizeFilter: string;
  setSizeFilter: (val: string) => void;
  selectedImportLogId: string | null;
  setSelectedImportLogId: (val: string | null) => void;
  importLogs: ImportRecord[];
  paymentTypeFilter: string;
  setPaymentTypeFilter: (val: string) => void;
  branches: string[];
  availableArtists: string[];
  availableMediums: string[];
  monthNames: string[];
  permissions: UserPermissions | null;
  selectedIds: string[];
  filteredCount: number;
  handleSelectAll: () => void;
  exportInventory: () => void;
  exportPDF: () => void;
  exportImage: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowAddModal: (val: boolean) => void;
  exhibitFilter: string;
  setExhibitFilter: (val: string) => void;
  clientFilter: string;
  setClientFilter: (val: string) => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
  events: ExhibitionEvent[];
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  maxPossiblePrice: number;
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  dateMonthFilter,
  setDateMonthFilter,
  dateYearFilter,
  setDateYearFilter,
  branchFilter,
  setBranchFilter,
  artistFilter,
  setArtistFilter,
  mediumFilter,
  setMediumFilter,
  statusFilter,
  setStatusFilter,
  sizeFilter,
  setSizeFilter,
  selectedImportLogId,
  setSelectedImportLogId,
  importLogs,
  paymentTypeFilter,
  setPaymentTypeFilter,
  branches,
  availableArtists,
  availableMediums,
  monthNames,
  permissions,
  selectedIds,
  filteredCount,
  handleSelectAll,
  exportInventory,
  exportPDF,
  exportImage,
  handleFileChange,
  fileInputRef,
  setShowAddModal,
  exhibitFilter,
  setExhibitFilter,
  clientFilter,
  setClientFilter,
  typeFilter,
  setTypeFilter,
  events,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  maxPossiblePrice
}) => {
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [tempMinPrice, setTempMinPrice] = useState(0);
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPossiblePrice);
  const priceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (minPrice === '') {
      setTempMinPrice(0);
    } else {
      setTempMinPrice(parseFloat(minPrice) || 0);
    }
  }, [minPrice]);

  useEffect(() => {
    if (maxPrice === '') {
      setTempMaxPrice(maxPossiblePrice);
    } else {
      setTempMaxPrice(parseFloat(maxPrice) || maxPossiblePrice);
    }
  }, [maxPrice, maxPossiblePrice]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (priceRef.current && !priceRef.current.contains(e.target as Node)) {
        setShowPricePopover(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const formatPriceLabel = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(val);
  };

  const controlClass = "h-9 bg-white border-0 px-3 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer uppercase tracking-[0.04em]";
  const groupClass = "flex min-w-0 items-center overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]";
  const separatorClass = "h-5 w-px bg-slate-200";
  const commandButtonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 hover:text-blue-700 active:bg-slate-100";

  const sortedUniqueBranches = useMemo(() => {
    return Array.from(new Set(branches)).sort((a, b) => a.localeCompare(b));
  }, [branches]);

  return (
    <div className="space-y-3">
      {/* TOP ROW: PRIMARY ACTIONS & SEARCH */}
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 min-w-[320px]">
            {(permissions?.canEditArtwork || permissions?.canSellArtwork || permissions?.canDeleteArtwork) && (
              <button
                onClick={handleSelectAll}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 active:bg-slate-100 whitespace-nowrap"
              >
                <div className={`w-3.5 h-3.5 rounded-sm border ${selectedIds.length === filteredCount ? 'bg-blue-600 border-blue-600' : 'border-slate-400'}`}>
                  {selectedIds.length === filteredCount && <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span>Select All</span>
              </button>
            )}

            <div className="relative flex-1 group max-w-2xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none group-focus-within:text-blue-600 transition-colors">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Search assets (Title, Code, Artist...)"
                className="block h-9 w-full rounded-sm border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permissions?.canEditArtwork && (
              <ExportDropdown
                onExportExcel={exportInventory}
                onExportPDF={exportPDF}
                onExportImage={exportImage}
                buttonClassName={commandButtonClass}
              />
            )}
            {permissions?.canAddArtwork && (
              <>
                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={commandButtonClass}
                >
                  <Upload size={14} />
                  <span className="hidden xl:inline">Bulk Import</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-[11px] font-bold uppercase tracking-[0.05em] text-white shadow-[0_2px_6px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-700 active:bg-blue-800"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Register</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: DIMENSIONAL FILTERS */}
      <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className={groupClass}>
            <select
              value={dateMonthFilter}
              onChange={(e) => setDateMonthFilter(e.target.value)}
              className={`${controlClass} min-w-[104px]`}
            >
              <option value="All">Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>{monthNames[m - 1]}</option>
              ))}
            </select>
            <div className={separatorClass}></div>
            <select
              value={dateYearFilter}
              onChange={(e) => setDateYearFilter(e.target.value)}
              className={`${controlClass} min-w-[84px]`}
            >
              <option value="All">Years</option>
              {Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`${controlClass} min-w-[180px] text-blue-700`}
            >
              <option value="All">All Branches</option>
              {sortedUniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              className={`${controlClass} min-w-[150px] max-w-[190px]`}
            >
              <option value="All">All Artists</option>
              {availableArtists.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className={separatorClass}></div>
            <select
              value={mediumFilter}
              onChange={(e) => setMediumFilter(e.target.value)}
              className={`${controlClass} min-w-[150px] max-w-[190px]`}
            >
              <option value="All">All Mediums</option>
              {availableMediums.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className={groupClass}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${controlClass} min-w-[140px]`}
            >
              <option value="All">Status</option>
              <option value="In Transit">In Transit</option>
              {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className={separatorClass}></div>
            <input
              type="text"
              placeholder="Size..."
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="h-9 w-24 border-0 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {statusFilter === ArtworkStatus.SOLD && (
            <div className={groupClass}>
              <select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className={`${controlClass} min-w-[150px] text-emerald-700`}
              >
                <option value="All">Payment Type</option>
                <option value="Full">Full Payment</option>
                <option value="Downpayment">Downpayment</option>
              </select>
            </div>
          )}

          <div className={groupClass}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`${controlClass} min-w-[120px] text-indigo-700`}
            >
              <option value="All">All Types</option>
              <option value="Painting">Painting</option>
              <option value="Sculpture">Sculpture</option>
            </select>
          </div>

          {permissions?.canManageEvents && (
            <div className={groupClass}>
              <select
                value={exhibitFilter}
                onChange={(e) => setExhibitFilter(e.target.value)}
                className={`${controlClass} min-w-[200px] text-blue-600`}
              >
                <option value="All">All Exhibits & Events</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}

          <div className="relative" ref={priceRef}>
            <style dangerouslySetInnerHTML={{__html: `
              .dual-range-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                background: transparent;
                pointer-events: none;
                position: absolute;
                height: 6px;
                outline: none;
              }
              .dual-range-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #2563eb;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2);
                cursor: pointer;
                pointer-events: auto;
                transition: transform 0.1s ease, background-color 0.15s ease;
              }
              .dual-range-slider::-webkit-slider-thumb:hover {
                transform: scale(1.25);
                background-color: #1d4ed8;
              }
              .dual-range-slider::-moz-range-thumb {
                height: 14px;
                width: 14px;
                border-radius: 50%;
                background: #2563eb;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2);
                cursor: pointer;
                pointer-events: auto;
                transition: transform 0.1s ease, background-color 0.15s ease;
              }
              .dual-range-slider::-moz-range-thumb:hover {
                transform: scale(1.25);
                background-color: #1d4ed8;
              }
            `}} />
            <button
              type="button"
              onClick={() => setShowPricePopover(!showPricePopover)}
              className="flex h-9 items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
            >
              <span>
                Price: {minPrice === '' && maxPrice === '' 
                  ? 'All Prices' 
                  : `₱${formatPriceLabel(parseFloat(minPrice || '0'))} - ₱${formatPriceLabel(parseFloat(maxPrice || String(maxPossiblePrice)))}`}
              </span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPricePopover && (
              <div className="absolute left-0 lg:right-auto mt-2 w-[320px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">Price Range Filter</h4>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md leading-none">
                    ₱{formatPriceLabel(tempMinPrice)} - ₱{formatPriceLabel(tempMaxPrice)}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Slider Track Area */}
                  <div className="relative h-6 flex items-center">
                    <div 
                      className="absolute left-0 right-0 h-1.5 rounded-lg"
                      style={{
                        background: `linear-gradient(to right, #e2e8f0 0%, #e2e8f0 ${(tempMinPrice / maxPossiblePrice) * 100}%, #2563eb ${(tempMinPrice / maxPossiblePrice) * 100}%, #2563eb ${(tempMaxPrice / maxPossiblePrice) * 100}%, #e2e8f0 ${(tempMaxPrice / maxPossiblePrice) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                    
                    <input
                      type="range"
                      min="0"
                      max={maxPossiblePrice}
                      step="5000"
                      value={tempMinPrice}
                      onChange={(e) => {
                        const val = Math.min(parseFloat(e.target.value), tempMaxPrice - 5000);
                        setTempMinPrice(val);
                      }}
                      className="dual-range-slider z-10"
                    />
                    
                    <input
                      type="range"
                      min="0"
                      max={maxPossiblePrice}
                      step="5000"
                      value={tempMaxPrice}
                      onChange={(e) => {
                        const val = Math.max(parseFloat(e.target.value), tempMinPrice + 5000);
                        setTempMaxPrice(val);
                      }}
                      className="dual-range-slider z-20"
                    />
                  </div>

                  <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    <span>₱0</span>
                    <span>₱{formatPriceLabel(maxPossiblePrice)}</span>
                  </div>

                  {/* Buttons matching design palette */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setTempMinPrice(0);
                        setTempMaxPrice(maxPossiblePrice);
                        setShowPricePopover(false);
                      }}
                      className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice(String(tempMinPrice));
                        setMaxPrice(String(tempMaxPrice));
                        setShowPricePopover(false);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-lg active:scale-95"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-w-[220px] items-center overflow-hidden rounded-sm border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <input
              type="text"
              placeholder="Filter by Client/Remarks..."
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 w-full border-0 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>


    </div>
  );
};
