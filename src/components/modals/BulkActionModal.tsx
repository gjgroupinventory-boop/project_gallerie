import React, { useEffect, useState } from 'react';
import { ShoppingBag, AlertCircle, Trash2, Upload, Wrench, RefreshCcw, AlertTriangle, X, Clock, Tag } from 'lucide-react';
import { Modal } from '../Modal';
import { ExhibitionEvent, Artwork } from '../../types';
import { compressImage } from '../../utils/imageUtils';
import { OptimizedTextarea } from '../OptimizedTextarea';
import { PhoneInput } from '../PhoneInput';

interface BulkActionModalProps {
    bulkActionModal: { type: string } | null;
    onClose: () => void;
    // State setters and values
    selectedIds: string[];
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
    artworks: Artwork[];
    bulkActionValue: string;
    setBulkActionValue: (val: string) => void;
    bulkClientEmail?: string;
    setBulkClientEmail?: (val: string) => void;
    bulkClientContact?: string;
    setBulkClientContact?: (val: string) => void;
    bulkSaleEventId: string;
    setBulkSaleEventId: (val: string) => void;

    // Data
    events: ExhibitionEvent[];
    branches: string[];

    // Attachments
    activeBulkAttachmentTab: 'itdr' | 'rsa' | 'orcr';
    setActiveBulkAttachmentTab: (val: 'itdr' | 'rsa' | 'orcr') => void;
    bulkTempItdr: string | string[] | null;
    setBulkTempItdr: (val: string | string[] | null) => void;
    bulkTempRsa: string | string[] | null;
    setBulkTempRsa: (val: string | string[] | null) => void;
    bulkTempOrcr: string | string[] | null;
    setBulkTempOrcr: (val: string | string[] | null) => void;

    // Reservation
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

    // Framer
    framerDamageDetails: string;
    setFramerDamageDetails: (val: string) => void;

    // Return
    returnType: 'Artist Reclaim' | 'For Retouch';
    setReturnType: (val: 'Artist Reclaim' | 'For Retouch') => void;
    returnReason: string;
    setReturnReason: (val: string) => void;
    returnProofImage: string | string[] | null;
    setReturnProofImage: (val: string | string[] | null) => void;

    // Downpayment
    bulkDownpayment?: string;
    setBulkDownpayment?: (val: string) => void;
    bulkSaleDownpayments?: Record<string, string>;
    setBulkSaleDownpayments?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    bulkSaleInstallmentsEnabled?: Record<string, boolean>;
    setBulkSaleInstallmentsEnabled?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

    // Additional sale declaration variables
    bulkSaleDiscounts?: Record<string, string>;
    setBulkSaleDiscounts?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    bulkHandlingAgentName?: string;
    setBulkHandlingAgentName?: (val: string) => void;
    bulkSaleRemarks?: string;
    setBulkSaleRemarks?: (val: string) => void;

    // Logistics Override
    bulkActionExtra?: boolean;
    setBulkActionExtra?: (val: boolean) => void;

    // Submit handler
    onSubmit: () => void;
    isInline?: boolean;
}

export const BulkActionModal: React.FC<BulkActionModalProps> = ({
    bulkActionModal, onClose, selectedIds, artworks,
    bulkActionValue, setBulkActionValue, bulkSaleEventId, setBulkSaleEventId,
    isInline,
    bulkClientEmail, setBulkClientEmail, bulkClientContact, setBulkClientContact,
    bulkDownpayment, setBulkDownpayment,
    bulkSaleDownpayments, setBulkSaleDownpayments,
    bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled,
    bulkSaleDiscounts, setBulkSaleDiscounts,
    bulkHandlingAgentName, setBulkHandlingAgentName,
    bulkSaleRemarks, setBulkSaleRemarks,
    events, branches,
    activeBulkAttachmentTab, setActiveBulkAttachmentTab,
    bulkTempItdr, setBulkTempItdr, bulkTempRsa, setBulkTempRsa, bulkTempOrcr, setBulkTempOrcr,
    reservationTab, setReservationTab, reservationClient, setReservationClient, reservationEventId, setReservationEventId,
    reservationAuctionId, setReservationAuctionId, reservationDays, setReservationDays, reservationHours, setReservationHours,
    reservationMinutes, setReservationMinutes, reservationNotes, setReservationNotes,
    framerDamageDetails, setFramerDamageDetails,
    returnType, setReturnType, returnReason, setReturnReason, returnProofImage, setReturnProofImage,
    bulkActionExtra, setBulkActionExtra,
    onSubmit
}) => {
    if (!bulkActionModal) return null;

    const [localInstallmentsEnabled, setLocalInstallmentsEnabled] = useState<Record<string, boolean>>({});
    const [localBulkTempItdr, setLocalBulkTempItdr] = useState<string | string[] | null>(null);
    const [localBulkTempRsa, setLocalBulkTempRsa] = useState<string | string[] | null>(null);
    const [localBulkTempOrcr, setLocalBulkTempOrcr] = useState<string | string[] | null>(null);

    const toAttachmentArray = (value: string | string[] | null | undefined) =>
        Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

    const firstAttachment = (value: string | string[] | null | undefined) =>
        Array.isArray(value) ? value[0] || null : value || null;

    useEffect(() => {
        setLocalInstallmentsEnabled(bulkSaleInstallmentsEnabled || {});
    }, [bulkSaleInstallmentsEnabled, bulkActionModal.type]);

    useEffect(() => {
        setLocalBulkTempItdr(bulkTempItdr);
    }, [bulkTempItdr]);

    useEffect(() => {
        setLocalBulkTempRsa(bulkTempRsa);
    }, [bulkTempRsa]);

    useEffect(() => {
        setLocalBulkTempOrcr(bulkTempOrcr);
    }, [bulkTempOrcr]);

    const resetBulkModalState = () => {
        setFramerDamageDetails('');
        setBulkTempItdr(null);
        setBulkTempRsa(null);
        setBulkTempOrcr(null);
        setLocalBulkTempItdr(null);
        setLocalBulkTempRsa(null);
        setLocalBulkTempOrcr(null);
        setLocalInstallmentsEnabled({});
        setActiveBulkAttachmentTab('itdr');
        setBulkSaleDiscounts?.({});
        setBulkHandlingAgentName?.('');
        setBulkSaleRemarks?.('');
    };

    const normalizedReturnProofImages = Array.isArray(returnProofImage)
        ? returnProofImage
        : returnProofImage
            ? [returnProofImage]
            : [];
    const selectedArtworks = artworks.filter(art => selectedIds.includes(art.id));
    const totalSelectedValue = selectedArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
    const totalPerArtworkDownpayment = selectedArtworks.reduce((sum, art) => {
        const rawValue = bulkSaleDownpayments?.[art.id];
        const parsed = rawValue ? parseFloat(rawValue.replace(/,/g, '')) : 0;
        return sum + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);

    const activeBulkPreview =
        activeBulkAttachmentTab === 'itdr'
            ? (localBulkTempItdr ?? bulkTempItdr)
            : activeBulkAttachmentTab === 'rsa'
                ? (localBulkTempRsa ?? bulkTempRsa)
                : (localBulkTempOrcr ?? bulkTempOrcr);
    const activeBulkPreviewImages = toAttachmentArray(activeBulkPreview);

    const getTitle = () => {
        if (bulkActionModal.type === 'framer') {
            return 'Send to Framer';
        }

        if (bulkActionModal.type === 'return') {
            return 'Return to Artist';
        }
        return bulkActionModal.type === 'sale' ? 'Sales Declaration Entry' :
            bulkActionModal.type === 'reserve' ? 'Bulk Reserve' :
                bulkActionModal.type === 'transfer' ? 'Bulk Transfer' :
                    'Confirm Deletion';
    };

    const closeAndReset = () => {
        onClose();
        resetBulkModalState();
    };

    const isStandardActionDisabled =
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
                    selectedArtworks.some(art => {
                        const installmentEnabled = localInstallmentsEnabled[art.id] ?? bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
                        if (!installmentEnabled) return false;
                        const dpVal = bulkSaleDownpayments?.[art.id];
                        return !dpVal || parseFloat(dpVal) <= 0 || Number.isNaN(parseFloat(dpVal));
                    })
                ) :
                    bulkActionModal.type === 'transfer' ? (!bulkActionValue || !bulkTempItdr) :
                        bulkActionModal.type === 'framer' ? !framerDamageDetails :
                            bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && normalizedReturnProofImages.length === 0)) :
                                true;

    const standardFooter = (
        <div className="flex flex-col sm:flex-row items-center justify-between w-full">
            <p className="text-[11px] font-medium text-[#605E5C] uppercase tracking-[0.15em] hidden sm:block">
                {bulkActionModal.type === 'delete' ? 'System De-Classification' : `Authorized ${bulkActionModal.type} operation`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                    onClick={closeAndReset}
                    className="px-6 py-2 rounded-sm font-semibold text-sm text-[#323130] bg-white border border-[#8A8886] hover:bg-[#EDEBE9] transition-all order-2 sm:order-1"
                >
                    {bulkActionModal.type === 'sale' ? 'Cancel' : 'Back to Workspace'}
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isStandardActionDisabled}
                    className={`px-10 py-2 rounded-sm font-semibold text-sm shadow-sm transition-all disabled:bg-[#F3F2F1] disabled:text-[#A19F9D] disabled:border-[#EDEBE9] disabled:shadow-none disabled:cursor-not-allowed order-1 sm:order-2 ${bulkActionModal.type === 'delete'
                        ? 'bg-[#A4262C] text-white hover:bg-[#821F24]'
                        : 'bg-[#0078D4] text-white hover:bg-[#005A9E]'
                        }`}
                >
                    {bulkActionModal.type === 'sale' ? 'Confirm Sale' :
                        bulkActionModal.type === 'delete' ? 'Authorize Deletion' :
                            bulkActionModal.type === 'reserve' ? (reservationTab === 'auction' ? 'Sync to Auction' : 'Authorize Reservation') :
                                bulkActionModal.type === 'framer' ? 'Request Delivery' :
                                    bulkActionModal.type === 'return' ? (returnType === 'Artist Reclaim' ? 'Authorize Void' : 'Authorize Retouch') :
                                        'Complete Action'}
                </button>
            </div>
        </div>
    );

    const formContent = (
        <div className="space-y-4">
            {bulkActionModal.type === 'sale' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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

                        {/* Compliance / Agent Details */}
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
                                {events.filter(e => {
                                    if ((e as any).status === 'Recent' || (e as any).status === 'Closed') return false;
                                    if ((e as any).isStrictDuration && (e as any).endDate) {
                                        const end = new Date((e as any).endDate);
                                        end.setHours(23, 59, 59, 999);
                                        if (end.getTime() < Date.now()) return false;
                                    }
                                    return true;
                                }).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                        </div>

                        {/* Asset Registry & Item Terms */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-[#f3f2f1] pb-2">
                                <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest">Asset Registry & Item Terms</h4>
                                <span className="text-[10px] font-bold text-[#a19f9d] uppercase">{selectedArtworks.length} Artifacts Staged</span>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedArtworks.map((art) => {
                                    const installmentEnabled = localInstallmentsEnabled[art.id] ?? bulkSaleInstallmentsEnabled?.[art.id] ?? !!bulkSaleDownpayments?.[art.id];
                                    const downpaymentValue = bulkSaleDownpayments?.[art.id] || '0';
                                    const numericDownpayment = parseFloat(downpaymentValue || '0');
                                    const discountPctString = bulkSaleDiscounts?.[art.id] || '';
                                    const discountPct = discountPctString ? parseFloat(discountPctString) : 0;
                                    
                                    const discountedPrice = discountPct > 0 ? Math.round(art.price * (1 - discountPct / 100)) : art.price;
                                    const remainingBalance = Math.max(discountedPrice - (Number.isNaN(numericDownpayment) ? 0 : numericDownpayment), 0);

                                    return (
                                        <div key={art.id} className="group flex flex-col gap-4 p-5 bg-[#faf9f8] border border-[#edebe9] rounded-sm transition-all hover:bg-white hover:shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="w-20 h-20 bg-white border border-[#edebe9] rounded-sm overflow-hidden shrink-0 shadow-sm transition-colors group-hover:border-[#323130]">
                                                    {art.imageUrl ? (
                                                        <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-[#F3F3F3]">
                                                            <ShoppingBag size={20} className="text-[#a19f9d]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
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

                                                        <div className="flex flex-col items-end gap-3 text-right">
                                                            <div className="flex bg-[#edebe9] p-0.5 rounded-sm">
                                                                {(['Full', 'DP'] as const).map(p => (
                                                                    <button
                                                                        key={p}
                                                                        onClick={() => {
                                                                            const isDp = p === 'DP';
                                                                            setLocalInstallmentsEnabled(prev => ({ ...prev, [art.id]: isDp }));
                                                                            setBulkSaleInstallmentsEnabled?.(prev => ({ ...prev, [art.id]: isDp }));
                                                                            if (!isDp) {
                                                                                setBulkSaleDownpayments?.(prev => {
                                                                                    const next = { ...prev };
                                                                                    delete next[art.id];
                                                                                    return next;
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all ${
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
                                                                <div className="flex flex-col items-end gap-1 animate-in slide-in-from-right-4">
                                                                    <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Authorized Downpayment</span>
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
                                                                            className="w-40 h-10 pl-7 pr-4 bg-white border-2 border-[#edebe9] rounded-sm text-right text-sm font-black text-[#323130] focus:border-[#323130] transition-all outline-none"
                                                                        />
                                                                    </div>
                                                                    <p className="text-[9px] font-bold text-[#a19f9d] uppercase">Remaining: ₱{remainingBalance.toLocaleString()}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Per-artwork discount input */}
                                            <div className="pt-3 border-t border-dashed border-[#edebe9] flex items-center justify-between gap-4">
                                                <span className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">Item Discount Percentage (%)</span>
                                                <div className="relative w-36">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder="0"
                                                        className="w-full h-8 pr-8 pl-3 bg-white border border-[#edebe9] rounded-sm text-xs font-bold text-[#323130] focus:outline-none focus:ring-1 focus:ring-[#0078d4] text-right"
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
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Evidence Intake Sidebar */}
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
                                <input
                                    key={activeBulkAttachmentTab}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files || []);
                                        if (files.length === 0) return;
                                        const dataUrls = await Promise.all(files.map(file => compressImage(file)));
                                        const mergeAttachments = (existing: string | string[] | null | undefined) =>
                                            [...toAttachmentArray(existing), ...dataUrls];

                                        if (activeBulkAttachmentTab === 'itdr') {
                                            const next = mergeAttachments(localBulkTempItdr ?? bulkTempItdr);
                                            setLocalBulkTempItdr(next);
                                            setBulkTempItdr(next);
                                        } else if (activeBulkAttachmentTab === 'rsa') {
                                            const next = mergeAttachments(localBulkTempRsa ?? bulkTempRsa);
                                            setLocalBulkTempRsa(next);
                                            setBulkTempRsa(next);
                                        } else {
                                            const next = mergeAttachments(localBulkTempOrcr ?? bulkTempOrcr);
                                            setLocalBulkTempOrcr(next);
                                            setBulkTempOrcr(next);
                                        }
                                        e.target.value = '';
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-[#605e5c]">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-[10px] font-bold uppercase">Select Payload</span>
                                </div>
                            </label>

                            {activeBulkPreviewImages.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3 w-full max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                                    {activeBulkPreviewImages.map((image, idx) => (
                                        <div key={`${activeBulkAttachmentTab}-${idx}`} className="relative group rounded-sm border border-[#edebe9] overflow-hidden bg-white shadow-sm transition-all hover:shadow-md hover:border-[#323130] aspect-square">
                                            <img src={image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`${activeBulkAttachmentTab.toUpperCase()}-${idx + 1}`} />
                                            <button
                                                onClick={() => {
                                                    const nextImages = activeBulkPreviewImages.filter((_, i) => i !== idx);
                                                    const nextValue = nextImages.length > 0 ? nextImages : null;
                                                    if (activeBulkAttachmentTab === 'itdr') { setLocalBulkTempItdr(nextValue); setBulkTempItdr(nextValue); }
                                                    else if (activeBulkAttachmentTab === 'rsa') { setLocalBulkTempRsa(nextValue); setBulkTempRsa(nextValue); }
                                                    else { setLocalBulkTempOrcr(nextValue); setBulkTempOrcr(nextValue); }
                                                }}
                                                className="absolute top-2 right-2 bg-[#a4262c] text-white rounded-sm p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-[#821f24]"
                                            >
                                                <Trash2 size={12} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full py-8 bg-white border border-dashed border-[#edebe9] rounded-sm flex flex-col items-center justify-center text-[#a19f9d] gap-2">
                                    <Upload size={20} strokeWidth={1} />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">No Payload</span>
                                </div>
                            )}
                        </div>

                        {/* Logistics Override */}
                        <div className="mt-8 pt-8 border-t border-[#edebe9] w-full">
                            <div 
                                className="flex items-center justify-between p-4 bg-neutral-50 rounded-sm border border-neutral-100 group hover:bg-[#edebe9]/40 transition-all cursor-pointer" 
                                onClick={() => setBulkActionExtra?.(!bulkActionExtra)}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${bulkActionExtra ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-400 border border-neutral-200'}`}>
                                        <Tag size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Handed over to Client</p>
                                        <p className="text-[10px] font-bold text-neutral-500">Already delivered / skip logistics request</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-6 rounded-md transition-all relative ${bulkActionExtra ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-sm bg-white transition-all ${bulkActionExtra ? 'right-1' : 'left-1'}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {bulkActionModal.type === 'reserve' && (
                <div className="space-y-6">
                    <div className="bg-[#F3F2F1] p-1 rounded-sm border border-[#EDEBE9] flex">
                        {(['person', 'event', 'auction'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setReservationTab(tab)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${reservationTab === tab
                                    ? 'bg-white text-[#0078D4] shadow-sm border border-[#EDEBE9]'
                                    : 'text-[#605E5C] hover:text-[#323130]'
                                    }`}
                            >
                                {tab === 'person' ? 'Person' : tab === 'event' ? 'Event' : 'Auction'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-6">
                        {reservationTab === 'person' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Client Identification
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={reservationClient}
                                        onChange={e => setReservationClient(e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-[#8A8886] rounded-sm text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        placeholder="Enter full name..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                        Expiration Period (Time-to-Live)
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {(['Days', 'Hours', 'Minutes'] as const).map((unit) => (
                                            <div key={unit} className="space-y-1">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm font-bold text-center text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none"
                                                    value={unit === 'Days' ? reservationDays : unit === 'Hours' ? reservationHours : reservationMinutes}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        const num = Math.max(0, parseInt(val || '0', 10));
                                                        if (unit === 'Days') setReservationDays(num);
                                                        else if (unit === 'Hours') setReservationHours(num);
                                                        else setReservationMinutes(num);
                                                    }}
                                                />
                                                <p className="text-[10px] text-center font-semibold text-[#A19F9D] uppercase tracking-widest">
                                                    {unit}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {reservationTab === 'event' && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                    Select Allocated Event
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
                                    value={reservationEventId}
                                    onChange={e => setReservationEventId(e.target.value)}
                                >
                                    <option value="">Align with an exhibition...</option>
                                    {events
                                        .filter(e => e.type !== 'Auction')
                                        .filter(e => {
                                            if (e.status === 'Recent' || e.status === 'Closed') return false;
                                            if (e.isStrictDuration && e.endDate) {
                                                const end = new Date(e.endDate);
                                                end.setHours(23, 59, 59, 999);
                                                if (end.getTime() < Date.now()) return false;
                                            }
                                            return true;
                                        })
                                        .map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.title}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {reservationTab === 'auction' && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                    Select Auction Event
                                </label>
                                <select
                                    className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
                                    value={reservationAuctionId}
                                    onChange={e => setReservationAuctionId(e.target.value)}
                                >
                                    <option value="">Align with an auction...</option>
                                    {events
                                        .filter(e => e.type === 'Auction')
                                        .filter(e => {
                                            if (e.status === 'Recent' || e.status === 'Closed') return false;
                                            if (e.isStrictDuration && e.endDate) {
                                                const end = new Date(e.endDate);
                                                end.setHours(23, 59, 59, 999);
                                                if (end.getTime() < Date.now()) return false;
                                            }
                                            return true;
                                        })
                                        .map(e => (
                                            <option key={e.id} value={e.id}>
                                                {e.title}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {reservationTab !== 'auction' && (
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">
                                    Justification & Remarks
                                </label>
                                <OptimizedTextarea
                                    value={reservationNotes}
                                    onChange={(e: any) => setReservationNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none resize-none placeholder-[#A19F9D]"
                                    placeholder="Enter allocation specifics..."
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {bulkActionModal.type === 'transfer' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                        <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-4 bg-[#0078D4]" />
                            Destination Logistics
                        </h4>
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[#605E5C] uppercase tracking-wider">Target Branch</label>
                            <select
                                value={bulkActionValue}
                                onChange={(e) => setBulkActionValue(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-[#8A8886] rounded-sm text-sm text-[#323130] focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none cursor-pointer"
                            >
                                <option value="">Synchronizing Target...</option>
                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                        <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1 h-4 bg-[#A4262C]" />
                            Protocol Evidence (Mandatory)
                        </h4>
                        
                        <div className="flex bg-[#F3F3F3] p-1 rounded-sm border border-[#E1E1E1]">
                            {(['itdr', 'rsa', 'orcr'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveBulkAttachmentTab(tab)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${activeBulkAttachmentTab === tab ? 'bg-white text-[#323130] shadow-sm border border-[#E1E1E1]' : 'text-[#605E5C] hover:bg-[#EDEBE9]'}`}
                                >
                                    {tab === 'itdr' ? 'IT/DR' : tab === 'rsa' ? 'RSA/AR' : 'OR/CR'}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${activeBulkAttachmentTab === 'itdr' ? 'text-[#A4262C]' : 'text-[#605E5C]'}`}>
                                    {activeBulkAttachmentTab === 'itdr' ? 'IT/DR Evidence (Required)' : activeBulkAttachmentTab === 'rsa' ? 'RSA/AR Evidence' : 'OR/CR Evidence'}
                                </label>
                                <span className="text-[10px] text-[#A19F9D] uppercase tracking-widest">{activeBulkPreviewImages.length} Attached</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E1E1E1] rounded-sm bg-[#F9F9F9] hover:bg-[#F3F3F3] hover:border-[#0078D4] transition-all cursor-pointer group h-40">
                                    <input
                                        key={activeBulkAttachmentTab}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length === 0) return;
                                            const dataUrls = await Promise.all(files.map(file => compressImage(file)));
                                            const mergeAttachments = (existing: string | string[] | null | undefined) =>
                                                [...toAttachmentArray(existing), ...dataUrls];

                                            if (activeBulkAttachmentTab === 'itdr') {
                                                const next = mergeAttachments(localBulkTempItdr ?? bulkTempItdr);
                                                setLocalBulkTempItdr(next);
                                                setBulkTempItdr(next);
                                            } else if (activeBulkAttachmentTab === 'rsa') {
                                                const next = mergeAttachments(localBulkTempRsa ?? bulkTempRsa);
                                                setLocalBulkTempRsa(next);
                                                setBulkTempRsa(next);
                                            } else {
                                                const next = mergeAttachments(localBulkTempOrcr ?? bulkTempOrcr);
                                                setLocalBulkTempOrcr(next);
                                                setBulkTempOrcr(next);
                                            }
                                            e.target.value = '';
                                        }}
                                        className="hidden"
                                    />
                                    <Upload size={24} className="text-[#A19F9D] mb-2 group-hover:text-[#0078D4] transition-colors" />
                                    <span className="text-[10px] font-bold text-[#0078D4] uppercase tracking-widest">Upload Proof</span>
                                </label>

                                <div className="h-40 overflow-y-auto custom-scrollbar border border-[#E1E1E1] rounded-sm bg-[#F3F3F3] p-2">
                                    {activeBulkPreviewImages.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {activeBulkPreviewImages.map((image, index) => (
                                                <div key={`${image}-${index}`} className="relative aspect-square rounded-sm overflow-hidden border border-[#E1E1E1] bg-white group shadow-sm">
                                                    <img src={image} className="w-full h-full object-cover" alt="Preview" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextImages = activeBulkPreviewImages.filter((_, imageIndex) => imageIndex !== index);
                                                            const nextValue = nextImages.length > 0 ? nextImages : null;
                                                            if (activeBulkAttachmentTab === 'itdr') {
                                                                setLocalBulkTempItdr(nextValue);
                                                                setBulkTempItdr(nextValue);
                                                            } else if (activeBulkAttachmentTab === 'rsa') {
                                                                setLocalBulkTempRsa(nextValue);
                                                                setBulkTempRsa(nextValue);
                                                            } else {
                                                                setLocalBulkTempOrcr(nextValue);
                                                                setBulkTempOrcr(nextValue);
                                                            }
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-white border border-[#E1E1E1] rounded-sm text-[#A4262C] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#FDE7E9]"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#A19F9D] gap-1 opacity-60">
                                            <AlertCircle size={16} />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">No Selection</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {bulkActionModal.type === 'framer' && (
                <div className="space-y-6">
                    <div className="p-5 bg-[#FFFAF0] border border-[#FFB900]/30 rounded-sm flex items-start gap-4 border-l-4 border-l-[#FFB900]">
                        <AlertTriangle className="text-[#FFB900] shrink-0" size={24} />
                        <div>
                            <h4 className="text-sm font-bold text-[#323130] uppercase tracking-wide">Framing Protocol Authorization</h4>
                            <p className="text-[12px] text-[#605E5C] mt-1 leading-relaxed">
                                Assets will transition to "For Framing" and routed to the secure framing queue. Entry of specific glass/frame requirements is mandatory for audit compliance.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                        <div className="space-y-6">
                            <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                                <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-4 bg-[#0078D4]" />
                                    Job Requirements & Specs *
                                </h4>
                                <OptimizedTextarea
                                    value={framerDamageDetails}
                                    onChange={(e: any) => setFramerDamageDetails(e.target.value)}
                                    className="w-full text-sm placeholder-[#A19F9D] border border-[#8A8886] rounded-sm p-4 focus:border-[#0078D4] focus:ring-1 focus:ring-[#0078D4] outline-none resize-none min-h-[160px] text-[#323130]"
                                    placeholder="Detail the frame profile, archival glass, and mounting specs..."
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 border border-[#E1E1E1] rounded-sm shadow-sm space-y-4">
                                <h4 className="text-xs font-semibold text-[#605E5C] uppercase tracking-widest text-center">Reference Proof</h4>
                                
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#E1E1E1] rounded-sm bg-[#F9F9F9] hover:bg-[#F3F3F3] hover:border-[#0078D4] transition-all cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;
                                            const newUrls = await Promise.all(files.map(f => compressImage(f)));
                                            const existing = Array.isArray(bulkTempItdr) ? bulkTempItdr : (bulkTempItdr ? [bulkTempItdr] : []);
                                            setBulkTempItdr([...existing, ...newUrls]);
                                            e.target.value = '';
                                        }}
                                    />
                                    <Upload size={20} className="text-[#A19F9D] mb-2 group-hover:text-[#0078D4] transition-colors" />
                                    <span className="text-[10px] font-bold text-[#0078D4] uppercase tracking-widest">Attach</span>
                                </label>

                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                    {(Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr]).filter(Boolean).map((url, i) => (
                                        <div key={i} className="relative aspect-video border border-[#E1E1E1] rounded-sm overflow-hidden bg-[#F3F3F3] group">
                                            <img src={url as string} className="w-full h-full object-cover" alt="Proof" />
                                            <button 
                                                onClick={() => {
                                                    const arr = Array.isArray(bulkTempItdr) ? bulkTempItdr : [bulkTempItdr!];
                                                    const nextArr = arr.filter((_, idx) => idx !== i);
                                                    setBulkTempItdr(nextArr.length > 0 ? nextArr : null);
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-white/90 border border-[#E1E1E1] rounded-sm text-[#A4262C] opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {bulkActionModal.type === 'return' && (
                <div className="space-y-6 text-sm text-neutral-800">
                    <div className="border-b border-neutral-200">
                        <div className="flex gap-8">
                            <button
                                onClick={() => setReturnType('Artist Reclaim')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${returnType === 'Artist Reclaim' ? 'text-red-500 border-red-500' : 'text-neutral-500 border-transparent hover:text-neutral-700'}`}
                            >
                                Return (Void)
                            </button>
                            <button
                                onClick={() => setReturnType('For Retouch')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${returnType === 'For Retouch' ? 'text-blue-600 border-blue-500' : 'text-neutral-500 border-transparent hover:text-neutral-700'}`}
                            >
                                For Retouch
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className={`flex p-4 border rounded-sm border-l-4 transition-colors ${returnType === 'Artist Reclaim' ? 'border-[#fde7e9] bg-[#fff4f4] border-l-[#a4262c]' : 'border-[#deecf9] bg-[#eff6fc] border-l-[#0078d4]'}`}>
                                <div className={`${returnType === 'Artist Reclaim' ? 'text-[#a4262c]' : 'text-[#0078d4]'} mr-3`}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#323130] text-[13px] uppercase tracking-wide">
                                        {returnType === 'Artist Reclaim' ? 'Permanent Asset De-Classification (VOID)' : 'Temporary Retouch Protocol'}
                                    </h4>
                                    <p className="text-[11px] text-[#605e5c] mt-1 leading-relaxed">
                                        {returnType === 'Artist Reclaim'
                                            ? 'This action triggers a permanent removal from inventory. Audit logs will mark these assets as VOID. Physical IT/DR documentation is mandatory for this gate.'
                                            : 'Assets will transition to "For Retouch" status. They remain in the central registry but are excluded from active sale views until re-entry.'}
                                    </p>
                                </div>
                            </div>

                            <div className="border border-[#edebe9] rounded-sm overflow-hidden bg-white shadow-sm">
                                <div className="grid grid-cols-1">
                                    <div className="p-4 border-b border-[#edebe9]">
                                        <label className="block text-[10px] font-bold text-[#605e5c] uppercase tracking-wider mb-2">
                                            Reason for Protocol {returnType === 'Artist Reclaim' && '*'}
                                        </label>
                                        <OptimizedTextarea
                                            value={returnReason}
                                            onChange={(e: any) => setReturnReason(e.target.value)}
                                            className={`w-full text-sm placeholder-[#a19f9d] border border-[#edebe9] rounded-sm p-3 focus:outline-none resize-none min-h-[100px] text-[#323130] transition-all ${returnType === 'Artist Reclaim' ? 'focus:border-[#a4262c] focus:ring-1 focus:ring-[#a4262c]' : 'focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]'}`}
                                            placeholder={returnType === 'Artist Reclaim' ? 'Specify de-classification reasoning...' : 'Detail the retouch requirements...'}
                                        />
                                    </div>

                                    <div className="p-3 bg-[#f3f2f1]/30">
                                        <label className="block text-[9px] font-bold text-[#a19f9d] uppercase tracking-wider mb-1">
                                            Registry Impact Annotation
                                        </label>
                                        <input
                                            type="text"
                                            disabled
                                            className="w-full text-xs font-medium border border-[#edebe9] rounded-sm p-2 bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed"
                                            value={`Target: Bulk Protocol Transition (${selectedIds.length} assets)`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 border border-[#edebe9] rounded-sm p-5 flex flex-col items-center bg-[#f3f2f1]/50 shadow-sm">
                            <div className={`flex items-center justify-center w-12 h-12 bg-white border rounded-sm shadow-sm mb-4 ${returnType === 'Artist Reclaim' ? 'border-[#fde7e9]' : 'border-[#deecf9]'}`}>
                                {returnType === 'Artist Reclaim' ? <Trash2 className="text-[#a4262c]" size={24} /> : <Wrench className="text-[#0078d4]" size={24} />}
                            </div>
                            <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.2em] mb-1">LOGISTICS GATE</p>
                            <h3 className="text-sm font-black text-[#323130] uppercase mb-8 text-center">{returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Dispatch'}</h3>

                            <div className="w-full space-y-6">
                                <label className={`relative block h-32 border-2 border-dashed rounded-sm bg-white transition-all cursor-pointer ${returnType === 'Artist Reclaim' ? 'border-[#a4262c]/30 hover:border-[#a4262c]' : 'border-[#c8c6c4] hover:border-[#0078d4]'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;
                                            const newUrls = await Promise.all(files.map(f => compressImage(f)));
                                            const existing = Array.isArray(returnProofImage) ? returnProofImage : (returnProofImage ? [returnProofImage] : []);
                                            setReturnProofImage([...existing, ...newUrls]);
                                            e.target.value = '';
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-[#605e5c]">
                                        <Upload size={24} className="mb-2" />
                                        <span className="text-[10px] font-bold uppercase">Select Payload</span>
                                    </div>
                                </label>

                                {normalizedReturnProofImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {normalizedReturnProofImages.map((image, index) => (
                                            <div key={`${image}-${index}`} className="w-full border border-[#edebe9] rounded-sm bg-white overflow-hidden relative group shadow-sm">
                                                <div className="h-24 w-full">
                                                    <img src={image} className="w-full h-full object-cover opacity-90" alt={`Proof ${index + 1}`} />
                                                </div>
                                                <div className="p-2 border-t border-[#edebe9] flex justify-between items-center text-[10px] gap-2 bg-[#f3f2f1]/50">
                                                    <span className="truncate text-[#605e5c] font-bold uppercase">Proof {index + 1}</span>
                                                    <button
                                                        onClick={() => {
                                                            const nextImages = normalizedReturnProofImages.filter((_, imageIndex) => imageIndex !== index);
                                                            setReturnProofImage(nextImages.length > 0 ? nextImages : null);
                                                        }}
                                                        className="text-[#a4262c] hover:underline font-bold transition-all"
                                                    >
                                                        VOID
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {bulkActionModal.type === 'delete' && (
                <div className="bg-[#FDE7E9] border-l-4 border-[#A4262C] p-6 rounded-sm border-y border-r border-y-[#A4262C]/20 border-r-[#A4262C]/20">
                    <div className="flex gap-4">
                        <AlertCircle className="text-[#A4262C] shrink-0" size={24} />
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-[#A4262C] uppercase tracking-wide">Irreversible System Purge</h4>
                            <p className="text-[13px] text-[#323130] leading-relaxed">
                                You are about to permanently delete <span className="font-bold">{selectedIds.length}</span> selected assets from the central registry. This action cannot be undone and will be recorded in the audit trail.
                            </p>
                            <p className="text-[12px] text-[#605E5C] font-medium italic">
                                Please ensure all physical inventory has been reconciled before proceeding.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isInline) {
        return <div className="p-0 min-h-full">{formContent}</div>;
    }

    return (
        <Modal
            onClose={onClose}
            title={getTitle()}
            maxWidth={bulkActionModal.type === 'sale' ? 'max-w-5xl' : bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' ? 'max-w-4xl' : 'max-w-2xl'}
            variant={bulkActionModal.type === 'framer' || bulkActionModal.type === 'return' ? 'sharp' : undefined}
            footer={standardFooter}
        >
            {formContent}
        </Modal>
    );
};
