import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, Sparkles, Trash2, Image as ImageIcon, CheckCircle2, Clock, ArrowRightLeft, Frame, RotateCcw, ArrowLeft, ClipboardCheck, ChevronRight, AlertTriangle, Upload, Wrench, Tag } from 'lucide-react';
import { Artwork, UserPermissions, ExhibitionEvent } from '../../types';
import { OptimizedImage } from '../OptimizedImage';
import { PhoneInput } from '../PhoneInput';
import { OptimizedTextarea } from '../OptimizedTextarea';
import { compressBase64Image } from '../../services/imageService';

interface BranchInventoryCartProps {
  isOpen: boolean;
  onClose: () => void;
  cartArtworks: Artwork[];
  setSelectedArtworkIds: React.Dispatch<React.SetStateAction<string[]>>;
  bulkActionModal: { type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return' } | null;
  setBulkActionModal: (val: { type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return' } | null) => void;
  onBulkActionClick: (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => void;
  permissions: UserPermissions | undefined;
  canEdit: boolean;
  activeBranch: string | null;
  exclusiveBranches: string[] | undefined;
  cartItemCount: number;
  cartTotalValue: number;

  // Bulk action states/setters for inline BulkActionModal
  bulkActionValue: string;
  setBulkActionValue: (val: string) => void;
  bulkClientEmail?: string;
  setBulkClientEmail?: (val: string) => void;
  bulkClientContact?: string;
  setBulkClientContact?: (val: string) => void;
  bulkSaleEventId: string;
  setBulkSaleEventId: (val: string) => void;

  events: ExhibitionEvent[];
  branches: string[];

  activeBulkAttachmentTab: 'itdr' | 'rsa' | 'orcr';
  setActiveBulkAttachmentTab: (val: 'itdr' | 'rsa' | 'orcr') => void;
  bulkTempItdr: string | string[] | null;
  setBulkTempItdr: React.Dispatch<React.SetStateAction<string | string[] | null>>;
  bulkTempRsa: string | string[] | null;
  setBulkTempRsa: React.Dispatch<React.SetStateAction<string | string[] | null>>;
  bulkTempOrcr: string | string[] | null;
  setBulkTempOrcr: React.Dispatch<React.SetStateAction<string | string[] | null>>;

  reservationTab: 'person' | 'event' | 'auction';
  setReservationTab: (val: 'person' | 'event' | 'auction') => void;
  reservationClient: string;
  setReservationClient: (val: string) => void;
  reservationEventId: string;
  setReservationEventId: (val: string) => void;
  reservationAuctionId: string;
  setReservationAuctionId: (val: string) => void;
  reservationDays: number;
  setReservationDays: (val: number) => void;
  reservationHours: number;
  setReservationHours: (val: number) => void;
  reservationMinutes: number;
  setReservationMinutes: (val: number) => void;
  reservationNotes: string;
  setReservationNotes: (val: string) => void;

  framerDamageDetails: string;
  setFramerDamageDetails: (val: string) => void;

  returnType: 'Artist Reclaim' | 'For Retouch';
  setReturnType: (val: 'Artist Reclaim' | 'For Retouch') => void;
  returnReason: string;
  setReturnReason: (val: string) => void;
  returnProofImage: string | string[] | null;
  setReturnProofImage: (val: string | string[] | null) => void;

  bulkDownpayment?: string;
  setBulkDownpayment?: (val: string) => void;
  bulkSaleDownpayments?: Record<string, string>;
  setBulkSaleDownpayments?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  bulkSaleInstallmentsEnabled?: Record<string, boolean>;
  setBulkSaleInstallmentsEnabled?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  bulkSaleDiscounts?: Record<string, string>;
  setBulkSaleDiscounts?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  bulkHandlingAgentName?: string;
  setBulkHandlingAgentName?: (val: string) => void;
  bulkSaleRemarks?: string;
  setBulkSaleRemarks?: (val: string) => void;

  bulkSaleHandedOver?: Record<string, boolean>;
  setBulkSaleHandedOver?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  onSubmit: () => void;
  resetBulkModalState: () => void;
}

export const BranchInventoryCart: React.FC<BranchInventoryCartProps> = ({
  isOpen,
  onClose,
  cartArtworks,
  setSelectedArtworkIds,
  bulkActionModal,
  setBulkActionModal,
  onBulkActionClick,
  permissions,
  canEdit,
  activeBranch,
  exclusiveBranches,
  cartItemCount,
  cartTotalValue,

  // Inline forms props
  bulkActionValue,
  setBulkActionValue,
  bulkClientEmail,
  setBulkClientEmail,
  bulkClientContact,
  setBulkClientContact,
  bulkSaleEventId,
  setBulkSaleEventId,
  events,
  branches,
  activeBulkAttachmentTab,
  setActiveBulkAttachmentTab,
  bulkTempItdr,
  setBulkTempItdr,
  bulkTempRsa,
  setBulkTempRsa,
  bulkTempOrcr,
  setBulkTempOrcr,
  reservationTab,
  setReservationTab,
  reservationClient,
  setReservationClient,
  reservationEventId,
  setReservationEventId,
  reservationAuctionId,
  setReservationAuctionId,
  reservationDays,
  setReservationDays,
  reservationHours,
  setReservationHours,
  reservationMinutes,
  setReservationMinutes,
  reservationNotes,
  setReservationNotes,
  framerDamageDetails,
  setFramerDamageDetails,
  returnType,
  setReturnType,
  returnReason,
  setReturnReason,
  returnProofImage,
  setReturnProofImage,
  bulkDownpayment,
  setBulkDownpayment,
  bulkSaleDownpayments,
  setBulkSaleDownpayments,
  bulkSaleInstallmentsEnabled,
  setBulkSaleInstallmentsEnabled,
  bulkSaleDiscounts,
  setBulkSaleDiscounts,
  bulkHandlingAgentName,
  setBulkHandlingAgentName,
  bulkSaleRemarks,
  setBulkSaleRemarks,
  bulkSaleHandedOver,
  setBulkSaleHandedOver,
  onSubmit,
  resetBulkModalState
}) => {
  const [isTimelessReservation, setIsTimelessReservation] = useState(false);
  const [reservationEventName, setReservationEventName] = useState('');

  if (!isOpen) return null;

  const showSaleAndReserve = !(activeBranch && exclusiveBranches?.includes(activeBranch));
  const navItems = [
    ...(showSaleAndReserve ? [
      { id: 'sale' as const, icon: ShoppingBag, label: 'Execute Sale', disabled: permissions ? !permissions.canSellArtwork : !canEdit },
      { id: 'reserve' as const, icon: Clock, label: 'Reservation', disabled: permissions ? !permissions.canReserveArtwork : !canEdit }
    ] : []),
    { id: 'transfer' as const, icon: ArrowRightLeft, label: 'Asset Transfer', disabled: permissions ? !permissions.canTransferArtwork : !canEdit },
    { id: 'framer' as const, icon: Frame, label: 'Framing Service', disabled: permissions ? !permissions.canEditArtwork : !canEdit },
    { id: 'return' as const, icon: RotateCcw, label: 'Return Sequence', disabled: permissions ? !permissions.canEditArtwork : !canEdit },
    { id: 'delete' as const, icon: Trash2, label: 'Final Purge', disabled: permissions ? !permissions.canDeleteArtwork : !canEdit }
  ];

  const toAttachmentArray = (value: string | string[] | null | undefined) =>
    Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const normalizedReturnProofImages = Array.isArray(returnProofImage)
    ? returnProofImage
    : returnProofImage
      ? [returnProofImage]
      : [];

  const isStandardActionDisabled =
    !bulkActionModal ? true :
    bulkActionModal.type === 'delete' ? false :
    bulkActionModal.type === 'reserve' ? (
      reservationTab === 'person' ? !reservationClient :
      reservationTab === 'event' ? !reservationEventId :
      !reservationAuctionId
    ) :
    bulkActionModal.type === 'sale' ? (
      !bulkActionValue ||
      !bulkClientContact || bulkClientContact.replace(/\D/g, '').length < 7 ||
      !bulkHandlingAgentName?.trim() ||
      !bulkSaleRemarks?.trim() ||
      toAttachmentArray(bulkTempItdr).length === 0 ||
      toAttachmentArray(bulkTempRsa).length === 0 ||
      cartArtworks.some(art => {
        const installmentEnabled = bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
        if (!installmentEnabled) return false;
        const dpVal = bulkSaleDownpayments?.[art.id];
        return !dpVal || parseFloat(dpVal) <= 0 || Number.isNaN(parseFloat(dpVal));
      })
    ) :
    bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
    bulkActionModal.type === 'framer' ? !framerDamageDetails :
    bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)) :
    true;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#323130]/60 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-[#faf9f8] w-full max-w-7xl h-[90vh] rounded-md shadow-2xl overflow-hidden flex border border-[#edebe9] relative animate-in zoom-in-95 duration-300">
        
        {/* Side Navigation */}
        <div className="w-16 sm:w-64 bg-[#f3f2f1] border-r border-[#edebe9] flex flex-col shrink-0">
          <div className="p-6 border-b border-[#edebe9]">
            <span className="hidden sm:block text-[10px] font-bold text-[#605e5c] uppercase tracking-widest leading-none mb-1">Navigation</span>
            <span className="hidden sm:block text-sm font-black text-[#323130] leading-none">Command Hub</span>
          </div>
          
          <div className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.disabled && onBulkActionClick(item.id)}
                disabled={item.disabled}
                className={`w-full group flex items-center gap-4 px-6 py-4 transition-all hover:bg-white text-left disabled:opacity-40 disabled:cursor-not-allowed ${bulkActionModal?.type === item.id ? 'bg-white border-r-4 border-[#0078d4]' : ''}`}
              >
                <item.icon size={20} style={{ color: bulkActionModal?.type === item.id ? '#0078d4' : '#605e5c' }} className="shrink-0" />
                <span className={`hidden sm:block text-xs font-bold uppercase tracking-wider ${bulkActionModal?.type === item.id ? 'text-[#323130]' : 'text-[#605e5c]'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <div className="p-6 border-t border-[#edebe9]">
            <button 
              onClick={() => {
                onClose();
                resetBulkModalState();
              }}
              className="w-full flex items-center gap-4 text-[#605e5c] hover:text-[#323130] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-wider">Back to Registry</span>
            </button>
          </div>
        </div>

        {/* Main Panel Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header */}
          <div className="h-16 px-8 bg-[#faf9f8] border-b border-[#edebe9] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#0078d4]/10 text-[#0078d4] flex items-center justify-center">
                <ClipboardCheck size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest leading-none mb-1">Command Review</span>
                <h2 className="text-sm font-black text-[#323130] uppercase tracking-tight">
                  {bulkActionModal?.type === 'sale' ? 'Sales Declaration Entry' :
                   bulkActionModal?.type === 'reserve' ? 'Bulk Reserve' :
                   bulkActionModal?.type === 'transfer' ? 'Bulk Transfer' :
                   bulkActionModal?.type === 'framer' ? 'Send to Framer' :
                   bulkActionModal?.type === 'return' ? 'Return to Artist' :
                   bulkActionModal?.type === 'delete' ? 'System De-Classification' :
                   'Operational Workspace'}
                </h2>
              </div>
            </div>
            <button 
              onClick={() => {
                onClose();
                resetBulkModalState();
              }} 
              className="p-2 hover:bg-[#edebe9] rounded-md transition-colors"
            >
              <X size={20} className="text-[#605e5c]" />
            </button>
          </div>

          {/* Staged Assets Content or Form Content */}
          <div className="flex-1 overflow-y-auto">
            {!bulkActionModal ? (
              <div className="p-8 bg-[#faf9f8] min-h-full">
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest italic">Staged Assets ({cartItemCount})</h3>
                    <button onClick={() => setSelectedArtworkIds([])} className="text-[10px] font-bold text-[#d13438] uppercase hover:underline">Purge All</button>
                  </div>

                  {cartArtworks.length > 0 ? (
                    <div className="space-y-3">
                      {cartArtworks.map((art, idx) => (
                        <div key={art.id} className="flex items-center gap-4 bg-white p-3 rounded-md border border-[#edebe9] shadow-sm group animate-in slide-in-from-bottom duration-300">
                          <div className="w-14 h-14 bg-[#f3f2f1] rounded overflow-hidden shrink-0">
                            {art.imageUrl ? (
                              <OptimizedImage
                                src={art.imageUrl || undefined}
                                alt={art.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#c8c6c4]">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-[#323130] truncate uppercase">{art.title}</h4>
                            <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">{art.artist} • {art.code}</p>
                          </div>
                          <div className="text-right px-4">
                            <p className="text-sm font-black text-[#0078d4]">₱{art.price?.toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedArtworkIds(prev => prev.filter(id => id !== art.id))} 
                            className="p-2 text-[#a19f9d] hover:text-[#d13438] transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-[#a19f9d] gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-[#edebe9] bg-[#f8f9fa] shadow-inner">
                        <ShoppingBag size={32} className="text-[#c8c6c4]" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-base font-black text-[#323130] tracking-tight">Workspace Entry Vacant</p>
                        <p className="text-[10px] font-bold text-[#a19f9d] uppercase tracking-widest">Select items from branch inventory</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-[#323130]">
                {bulkActionModal.type === 'sale' && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
                    <div className="lg:col-span-3 space-y-8">
                      {/* Client Identity Section */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Client Identity</h4>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Client Name <span className="text-[#a4262c]">*</span></label>
                            <input autoFocus type="text" value={bulkActionValue} onChange={e => setBulkActionValue(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]" placeholder="Type client name..." />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Email Address</label>
                              <input type="email" value={bulkClientEmail || ''} onChange={e => setBulkClientEmail?.(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]" placeholder="email@address.com" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Mobile / Contact <span className="text-[#a4262c]">*</span></label>
                              <PhoneInput value={bulkClientContact || ''} onChange={val => setBulkClientContact?.(val)} className="h-11" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Audit Compliance Section */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Audit Compliance</h4>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Handling Agent Name <span className="text-[#a4262c]">*</span></label>
                            <input
                              type="text"
                              placeholder="Enter handling agent's name..."
                              required
                              className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]"
                              value={bulkHandlingAgentName || ''}
                              onChange={e => setBulkHandlingAgentName?.(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Sale Remarks / Audit Note <span className="text-[#a4262c]">*</span></label>
                            <textarea
                              placeholder="Required for audit compliance (e.g. client background, special terms...)"
                              required
                              className="w-full min-h-[80px] p-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white transition-all resize-none"
                              value={bulkSaleRemarks || ''}
                              onChange={e => setBulkSaleRemarks?.(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Event Alignment Section */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Event Alignment</h4>
                        <select value={bulkSaleEventId} onChange={e => setBulkSaleEventId(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]">
                          <option value="">Select Event (Optional)...</option>
                          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                        </select>
                      </div>

                      {/* Asset Registry & Item Terms */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#f3f2f1] pb-2">
                          <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest">Asset Registry & Item Terms</h4>
                          <span className="text-[10px] font-bold text-[#a19f9d] uppercase">{cartArtworks.length} Artifacts Staged</span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          {cartArtworks.map((art) => {
                            const installmentEnabled = bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
                            const discountPctString = bulkSaleDiscounts?.[art.id] || '';
                            const discountPct = discountPctString ? parseFloat(discountPctString) : 0;
                            const discountedPrice = discountPct > 0 ? Math.round(art.price * (1 - discountPct / 100)) : art.price;
                            const downpaymentValue = bulkSaleDownpayments?.[art.id] || '0';
                            const numericDownpayment = parseFloat(downpaymentValue);
                            const remainingBalance = Math.max(discountedPrice - (Number.isNaN(numericDownpayment) ? 0 : numericDownpayment), 0);

                            return (
                              <div key={art.id} className="group flex flex-col gap-4 p-5 bg-[#faf9f8] border border-[#edebe9] rounded-sm transition-all hover:bg-white hover:shadow-sm">
                                <div className="flex items-start gap-4">
                                  <div className="w-20 h-20 bg-white border border-[#edebe9] rounded-sm overflow-hidden shrink-0 shadow-sm transition-colors group-hover:border-[#323130]">
                                    <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="space-y-1">
                                      <h5 className="text-[12px] font-black text-[#323130] uppercase leading-none truncate">{art.title}</h5>
                                      <p className="text-[10px] font-bold text-[#605e5c] uppercase opacity-60 leading-none truncate mt-2">{art.artist} • {art.code}</p>
                                      <div className="pt-2 flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-[#eff6fc] text-[#0078d4] text-[9px] font-black uppercase rounded-sm border border-[#deecf9]">SRP: ₱{art.price?.toLocaleString()}</span>
                                        {discountPct > 0 && (
                                          <span className="px-2 py-0.5 bg-[#f0f9f1] text-[#107c41] text-[9px] font-black uppercase rounded-sm border border-[#dff6dd]">Net: ₱{discountedPrice.toLocaleString()} (-{discountPct}%)</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom Grid for Options */}
                                <div className="pt-4 border-t border-dashed border-[#edebe9] grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Column 1: Delivery Option */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest block">Delivery Option</span>
                                    <div className="flex bg-[#edebe9] p-0.5 rounded-sm w-full">
                                      {(['Logistics', 'Handed Over'] as const).map(opt => {
                                        const isHandedOver = opt === 'Handed Over';
                                        const isActive = isHandedOver ? !!bulkSaleHandedOver?.[art.id] : !bulkSaleHandedOver?.[art.id];
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                              setBulkSaleHandedOver?.(prev => ({
                                                ...prev,
                                                [art.id]: isHandedOver
                                              }));
                                            }}
                                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all ${
                                              isActive
                                                ? 'bg-[#323130] text-white shadow-md'
                                                : 'text-[#605e5c] hover:bg-[#e1dfdd]'
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Column 2: Payment Terms */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest block">Payment Terms</span>
                                    <div className="flex bg-[#edebe9] p-0.5 rounded-sm w-full">
                                      {(['Full', 'DP'] as const).map(p => (
                                        <button
                                          key={p}
                                          type="button"
                                          onClick={() => {
                                            const isDp = p === 'DP';
                                            setBulkSaleInstallmentsEnabled?.(prev => ({ ...prev, [art.id]: isDp }));
                                            if (!isDp) {
                                              setBulkSaleDownpayments?.(prev => {
                                                const next = { ...prev };
                                                delete next[art.id];
                                                return next;
                                              });
                                            }
                                          }}
                                          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all ${
                                            (p === 'DP' ? installmentEnabled : !installmentEnabled)
                                              ? 'bg-[#323130] text-white shadow-md'
                                              : 'text-[#605e5c] hover:bg-[#e1dfdd]'
                                          }`}
                                        >
                                          {p}
                                        </button>
                                      ))}
                                    </div>

                                    {installmentEnabled && (
                                      <div className="space-y-1.5 pt-1 animate-in slide-in-from-top-2 duration-200">
                                        <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest block">Authorized Downpayment</span>
                                        <div className="relative group/input">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#323130]">₱</span>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={bulkSaleDownpayments?.[art.id] || '0'}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => {
                                              const val = e.target.value.replace(/[^0-9.]/g, '');
                                              const parts = val.split('.');
                                              if (parts.length > 2) parts.splice(2);
                                              if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                                              setBulkSaleDownpayments?.(prev => ({ ...prev, [art.id]: parts.join('.') }));
                                            }}
                                            className="w-full h-9 pl-7 pr-4 bg-white border border-[#edebe9] rounded-sm text-right text-xs font-black text-[#323130] focus:border-[#323130] transition-all outline-none"
                                          />
                                        </div>
                                        <p className="text-[9px] font-bold text-[#a19f9d] uppercase">Remaining: ₱{remainingBalance.toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Column 3: Item Discount */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest block">Item Discount (%)</span>
                                    <div className="relative w-full">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        className="w-full h-9 pr-8 pl-3 bg-white border border-[#edebe9] rounded-sm text-xs font-bold text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078d4] text-right"
                                        value={discountPctString}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.]/g, '');
                                          const num = parseFloat(val);
                                          if (num > 100) return; // Limit to 100%
                                          setBulkSaleDiscounts?.(prev => ({ ...prev, [art.id]: val }));
                                        }}
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[10px]">%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-6 flex flex-col items-center bg-[#f3f2f1]/40 self-start">
                      <div className="w-14 h-14 bg-white border border-[#edebe9] rounded-lg flex items-center justify-center shadow-sm mb-4 text-[#0078d4]">
                        <ShoppingBag size={28} />
                      </div>
                      <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.3em] mb-1">LOGISTICS GATE</p>
                      <h3 className="text-sm font-black text-[#323130] uppercase mb-8 text-center">Evidence Intake</h3>

                      <div className="w-full space-y-6">
                        <div className="flex bg-[#edebe9] p-0.5 rounded-sm">
                          {(['itdr', 'rsa', 'orcr'] as const).map(t => (
                            <button key={t} onClick={() => setActiveBulkAttachmentTab(t)} className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${activeBulkAttachmentTab === t ? 'bg-white text-[#0078d4]' : 'text-[#605e5c]'}`}>
                              {t === 'orcr' ? t : <>{t} <span className="text-[#a4262c]">*</span></>}
                            </button>
                          ))}
                        </div>

                        <label className="relative block h-32 border-2 border-dashed border-[#c8c6c4] rounded-sm bg-white hover:border-[#0078d4] transition-all cursor-pointer">
                          <input type="file" accept="image/*" multiple onChange={async (e) => {
                            const results = await Promise.all(Array.from(e.target.files || []).map(f => {
                              return new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = async (ev) => resolve(await compressBase64Image(ev.target?.result as string));
                                reader.readAsDataURL(f);
                              });
                            }));
                            const update = (prev: any) => [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...results];
                            if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(update(bulkTempItdr));
                            else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(update(bulkTempRsa));
                            else setBulkTempOrcr(update(bulkTempOrcr));
                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-[#605e5c]">
                            <Upload size={24} className="mb-2" />
                            <span className="text-[10px] font-bold uppercase">Select Payload</span>
                          </div>
                        </label>
                        {toAttachmentArray(activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrcr).length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 w-full max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {toAttachmentArray(activeBulkAttachmentTab === 'itdr' ? bulkTempItdr : activeBulkAttachmentTab === 'rsa' ? bulkTempRsa : bulkTempOrcr).map((img, idx) => (
                              <div key={idx} className="relative group rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm transition-all hover:shadow-md hover:border-neutral-400 aspect-square">
                                <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`${activeBulkAttachmentTab.toUpperCase()}-${idx + 1}`} />
                                <button
                                  onClick={() => {
                                    const rem = (prev: any) => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null;
                                    if (activeBulkAttachmentTab === 'itdr') setBulkTempItdr(rem(bulkTempItdr));
                                    else if (activeBulkAttachmentTab === 'rsa') setBulkTempRsa(rem(bulkTempRsa));
                                    else setBulkTempOrcr(rem(bulkTempOrcr));
                                  }}
                                  className="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 shadow-lg hover:bg-red-700"
                                >
                                  <Trash2 size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="w-full py-8 bg-white border border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-300 gap-2">
                            <Upload size={20} strokeWidth={1} />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">No Payload</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bulkActionModal.type === 'reserve' && (
                  <div className="max-w-3xl mx-auto space-y-8 text-left">
                    <div className="flex bg-[#f3f2f1] p-1 rounded-sm border border-[#edebe9]">
                      {(['person', 'event', 'auction'] as const).map(t => (
                        <button key={t} onClick={() => setReservationTab(t)} className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${reservationTab === t ? 'bg-white text-[#0078d4] shadow-sm' : 'text-[#605e5c]'}`}>
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Target Identification</h4>
                          {reservationTab === 'person' ? (
                            <input autoFocus type="text" value={reservationClient} onChange={e => setReservationClient(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]" placeholder="Enter client name..." />
                          ) : (
                            (() => {
                              const filtered = events.filter(ev => reservationTab === 'event' ? ev.type !== 'Auction' : ev.type === 'Auction');
                              const typeLabel = reservationTab === 'event' ? 'Exhibition' : 'Auction House';
                              return (
                                <select value={reservationEventId} onChange={e => { setReservationEventId(e.target.value); setReservationEventName(events.find(ev => ev.id === e.target.value)?.title || ''); }} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]">
                                  <option value="">Select {typeLabel}...</option>
                                  {filtered.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                </select>
                              );
                            })()
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-[#f3f2f1] pb-2">
                            <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest">Effective Period</h4>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isTimelessReservation}
                                onChange={e => {
                                  setIsTimelessReservation(e.target.checked);
                                  if (e.target.checked) {
                                    setReservationDays(0);
                                    setReservationHours(0);
                                    setReservationMinutes(0);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded-sm border-[#c8c6c4] text-[#0078d4] focus:ring-[#0078d4]"
                              />
                              <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-widest group-hover:text-[#0078d4] transition-colors">Timeless</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {(['Days', 'Hours', 'Mins'] as const).map(u => {
                              const val = u === 'Days' ? reservationDays : u === 'Hours' ? reservationHours : reservationMinutes;
                              return (
                                <div key={u} className="space-y-1">
                                  <label className="text-[9px] font-bold text-[#605e5c] uppercase text-center block">{u}</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={val}
                                    onFocus={(e) => e.target.select()}
                                    onChange={e => {
                                      if (isTimelessReservation) return;
                                      const raw = e.target.value.replace(/\D/g, '');
                                      const v = Math.max(0, parseInt(raw, 10) || 0);
                                      if (u === 'Days') setReservationDays(v);
                                      else if (u === 'Hours') setReservationHours(Math.min(23, v));
                                      else setReservationMinutes(Math.min(59, v));
                                      if (v > 0) setIsTimelessReservation(false);
                                    }}
                                    disabled={isTimelessReservation}
                                    className={`w-full h-10 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-black text-center text-[#323130] transition-opacity ${isTimelessReservation ? 'opacity-30' : ''}`} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-[#fff4ce] border border-[#fed44d] rounded-sm flex flex-col text-left">
                        <div className="flex items-center gap-3 mb-4 text-[#4a1e00]">
                          <Clock size={18} />
                          <h4 className="text-[11px] font-black uppercase tracking-widest">Expiry Sequence</h4>
                        </div>
                        <div className="flex-1 bg-white/40 border border-white/50 rounded-sm p-4 text-center mt-2 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-[#4a1e00]/60 uppercase tracking-[0.2em] mb-1">Release Schedule</p>
                          <p className="text-3xl font-black text-[#4a1e00] italic leading-none">
                            {isTimelessReservation || (reservationDays === 0 && reservationHours === 0 && reservationMinutes === 0) ? 'Timeless' : `${reservationDays}d ${reservationHours}h ${reservationMinutes}m`}
                          </p>
                        </div>
                        <OptimizedTextarea value={reservationNotes} onChange={(e: any) => setReservationNotes(e.target.value)} className="w-full h-24 p-3 bg-white/60 border border-transparent rounded-sm text-sm mt-4 font-medium text-[#4a1e00] resize-none focus:bg-white transition-all" placeholder="Reservation justification..." />
                      </div>
                    </div>
                  </div>
                )}

                {bulkActionModal.type === 'transfer' && (
                  <div className="max-w-lg mx-auto py-12 space-y-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#0078d4] text-white rounded-xl flex items-center justify-center shadow-lg">
                      <ArrowRightLeft size={32} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.3em]">Logistics Gate</h3>
                      <p className="text-sm font-medium text-[#605e5c]">Initialize batch movement sequence to target destination registry.</p>
                    </div>

                    <div className="w-full space-y-6">
                      <select value={bulkActionValue} onChange={e => setBulkActionValue(e.target.value)} className="w-full h-12 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]">
                        <option value="">Choose Destination Gallery...</option>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>

                      <div className="flex flex-col gap-1 text-center">
                        <label className="text-[10px] font-black text-[#605e5c] uppercase mb-2">Verification Artifact *</label>
                        <label className="relative block h-32 border-2 border-dashed border-[#c8c6c4] rounded-sm bg-white hover:border-[#0078d4] transition-all cursor-pointer">
                          <input type="file" accept="image/*" multiple onChange={async e => {
                            const results = await Promise.all(Array.from(e.target.files || []).map(f => {
                              return new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = async (ev) => resolve(await compressBase64Image(ev.target?.result as string));
                                reader.readAsDataURL(f);
                              });
                            }));
                            setBulkTempItdr((prev: string | string[] | null) => [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...results]);
                          }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-[#605e5c]">
                            <Upload size={24} className="mb-2" />
                            <span className="text-[10px] font-bold uppercase">Upload Proof</span>
                          </div>
                        </label>
                      </div>

                      {toAttachmentArray(bulkTempItdr).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 w-full max-h-48 overflow-y-auto pr-1">
                          {toAttachmentArray(bulkTempItdr).map((img, idx) => (
                            <div key={idx} className="relative group rounded-sm border border-[#edebe9] overflow-hidden bg-white shadow-sm h-20">
                              <img src={img} className="w-full h-full object-cover" alt={`TRANSFER-REF-${idx + 1}`} />
                              <button
                                onClick={() => setBulkTempItdr((prev: string | string[] | null) => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null)}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={10} strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(bulkActionModal.type === 'framer' || bulkActionModal.type === 'return') && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
                    <div className="lg:col-span-3 space-y-8">
                      {bulkActionModal.type === 'return' && (
                        <div className="flex bg-[#f3f2f1] p-1 rounded-sm border border-[#edebe9]">
                          <button onClick={() => setReturnType('Artist Reclaim')} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${returnType === 'Artist Reclaim' ? 'bg-[#d13438] text-white' : 'text-[#605e5c]'}`}>Artist Reclaim</button>
                          <button onClick={() => setReturnType('For Retouch')} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${returnType === 'For Retouch' ? 'bg-[#0078d4] text-white' : 'text-[#605e5c]'}`}>For Retouch</button>
                        </div>
                      )}

                      <div className={`p-6 border rounded-sm border-l-4 ${bulkActionModal.type === 'framer' ? 'bg-[#fffaf0] border-[#ffb900] border-l-[#ffb900]' : (returnType === 'Artist Reclaim' ? 'bg-[#fff4f4] border-[#fde7e9] border-l-[#a4262c]' : 'bg-[#eff6fc] border-[#deecf9] border-l-[#0078d4]')}`}>
                        <div className="flex items-start gap-4">
                          <AlertTriangle size={24} className={`${bulkActionModal.type === 'framer' ? 'text-[#ffb900]' : (returnType === 'Artist Reclaim' ? 'text-[#a4262c]' : 'text-[#0078d4]')}`} />
                          <div>
                            <h4 className="text-[11px] font-black text-[#323130] uppercase tracking-widest">{bulkActionModal.type === 'framer' ? 'Framing Service Authorization' : (returnType === 'Artist Reclaim' ? 'VOID Authorization' : 'Retouch Sequence Initiation')}</h4>
                            <p className="text-[10px] font-medium text-[#605e5c] mt-1 leading-relaxed">
                              {bulkActionModal.type === 'framer' ? 'Assets will transition to "For Framing" and drawn from active registry screens for audit compliance.' : (returnType === 'Artist Reclaim' ? 'This action triggers permanent inventory removal. Evidence IT/DR is mandatory for this gate.' : 'Assets will temporarily enter retouch sequence and remain excluded from active sales.')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Operational Workflow</h4>
                        <OptimizedTextarea value={bulkActionModal.type === 'framer' ? framerDamageDetails : returnReason} onChange={(e: any) => bulkActionModal.type === 'framer' ? setFramerDamageDetails(e.target.value) : setReturnReason(e.target.value)} className="w-full h-48 p-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white transition-all resize-none" placeholder={bulkActionModal.type === 'framer' ? 'Detail frame requirements or damage assessment...' : 'Detail the professional rationale for protocol initiation...'} />
                      </div>
                    </div>

                    <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-6 flex flex-col items-center bg-[#f3f2f1]/40 self-start">
                      <div className="w-14 h-14 bg-white border border-[#edebe9] rounded-lg flex items-center justify-center shadow-sm mb-4">
                        {bulkActionModal.type === 'framer' ? <Wrench className="text-[#0078d4]" size={28} /> : (returnType === 'Artist Reclaim' ? <Trash2 className="text-[#a4262c]" size={28} /> : <RotateCcw className="text-[#0078d4]" size={28} />)}
                      </div>
                      <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.3em] mb-1">PROTOCOL GATE</p>
                      <h3 className="text-sm font-black text-[#323130] uppercase mb-8 text-center">{bulkActionModal.type === 'framer' ? 'Framer Dispatch' : (returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Dispatch')}</h3>

                      <div className="w-full space-y-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-[#605e5c] uppercase mb-2 text-center">Verification Artifact *</label>
                          <label className="relative block h-32 border-2 border-dashed border-[#c8c6c4] rounded-sm bg-white hover:border-[#0078d4] transition-all cursor-pointer">
                            <input type="file" accept="image/*" multiple onChange={async e => {
                              const results = await Promise.all(Array.from(e.target.files || []).map(f => {
                                return new Promise<string>((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => resolve(await compressBase64Image(ev.target?.result as string));
                                  reader.readAsDataURL(f);
                                });
                              }));
                              setBulkTempItdr((prev: string | string[] | null) => [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...results]);
                            }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-[#605e5c]">
                              <Upload size={24} className="mb-2" />
                              <span className="text-[10px] font-bold uppercase">Upload Proof</span>
                            </div>
                          </label>
                        </div>

                        <div className="w-full">
                          {toAttachmentArray(bulkTempItdr).length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 w-full max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                              {toAttachmentArray(bulkTempItdr).map((img, idx) => (
                                <div key={idx} className="relative group rounded-xl border border-neutral-200 overflow-hidden bg-white shadow-sm transition-all hover:shadow-md hover:border-neutral-400 aspect-square">
                                  <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`ART-REF-${idx + 1}`} />
                                  <button
                                    onClick={() => setBulkTempItdr((prev: string | string[] | null) => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null)}
                                    className="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 shadow-lg hover:bg-red-700"
                                  >
                                    <Trash2 size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="w-full py-8 bg-white border border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-300 gap-2">
                              <Upload size={20} strokeWidth={1} />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">No Payload</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {bulkActionModal.type === 'delete' && (
                  <div className="max-w-lg mx-auto py-20 text-center space-y-8 flex flex-col items-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-[#fdf3f2] text-[#a4262c] rounded-2xl flex items-center justify-center shadow-md border border-[#fde7e9]">
                      <Trash2 size={56} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.4em]">System Notice</h3>
                      <h2 className="text-2xl font-black text-[#323130] uppercase tracking-tighter">Authorize Record Void</h2>
                      <p className="text-sm font-medium text-[#605e5c] max-w-sm leading-relaxed">
                        This sequence will permanently purge <span className="text-[#a4262c] font-black">{cartArtworks.length} records</span> from the active registry. Audit logs will mark this as a manual system override.
                      </p>
                    </div>
                    <div className="p-5 bg-[#fff4f4] border border-[#fde7e9] border-dashed rounded-sm w-full">
                      <span className="text-[11px] font-black text-[#a4262c] uppercase tracking-widest">Protocol Warning: Purge operation is irreversible</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Footer */}
          <div className="h-16 px-8 bg-[#faf9f8] border-t border-[#edebe9] flex items-center justify-between shrink-0 text-xs font-bold text-[#605e5c] uppercase tracking-wider">
            <div className="flex items-center gap-4">
              {!bulkActionModal ? (
                <button 
                  onClick={() => {
                    onClose();
                    resetBulkModalState();
                  }}
                  className="flex items-center gap-2.5 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-[#605e5c] hover:bg-[#edebe9] transition-all rounded-sm border border-[#edebe9] bg-white"
                >
                  <ArrowLeft size={16} strokeWidth={3} />
                  <span>Close Workspace</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setBulkActionModal(null);
                    resetBulkModalState();
                  }}
                  className="flex items-center gap-2.5 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-[#605e5c] hover:bg-[#edebe9] transition-all rounded-sm border border-[#edebe9] bg-white"
                >
                  <ShoppingBag size={16} strokeWidth={3} />
                  <span>Command Cart</span>
                </button>
              )}
              <div className="flex flex-col border-l border-[#edebe9] pl-6">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a19f9d]">
                  {bulkActionModal ? 'Operational Authorization' : 'Workspace Maintenance'}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">
                  {bulkActionModal ? `Sequence: ${bulkActionModal.type}` : `${cartItemCount} Artifacts Staged`}
                </span>
              </div>
            </div>

            {bulkActionModal && (
              <button
                onClick={onSubmit}
                disabled={isStandardActionDisabled}
                className={`h-12 px-10 rounded-sm text-[11px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-3 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
                  bulkActionModal.type === 'delete' || (bulkActionModal.type === 'return' && returnType === 'Artist Reclaim') ? 'bg-[#a4262c] text-white' : 'bg-[#323130] text-white hover:bg-[#000000]'
                }`}
              >
                <span>Authorize Sequence</span>
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
