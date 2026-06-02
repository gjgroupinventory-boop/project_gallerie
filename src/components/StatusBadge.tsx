import React from 'react';
import { ArtworkStatus, SaleRecord } from '../types';

interface StatusBadgeProps {
    status: ArtworkStatus | string;
    sale?: SaleRecord;
    artworkPrice?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, sale, artworkPrice }) => {
    const styles: Record<string, string> = {
        [ArtworkStatus.AVAILABLE]: 'bg-[#107c10] text-white border-[#107c10]',
        [ArtworkStatus.RESERVED]: 'bg-[#fff4ce] text-[#4a1e00] border-[#fed44d]',
        [ArtworkStatus.SOLD]: 'bg-[#fde7e9] text-[#a4262c] border-[#fde7e9]',
        [ArtworkStatus.DELIVERED]: 'bg-[#eff6fc] text-[#0078d4] border-[#deecf9]',
        [ArtworkStatus.CANCELLED]: 'bg-[#f3f2f1] text-[#605e5c] border-[#edebe9] line-through',
        [ArtworkStatus.FOR_RETOUCH]: 'bg-[#605e5c] text-white border-[#323130] shadow-sm',
        [ArtworkStatus.FOR_FRAMING]: 'bg-[#f3f2f1] text-[#323130] border-[#edebe9] border-dashed',
        [ArtworkStatus.EXCLUSIVE_VIEW_ONLY]: 'bg-[#323130] text-white border-[#000000]',
        [ArtworkStatus.RETURNED]: 'bg-[#d13438] text-white border-[#d13438] shadow-sm',
        'RETURNED': 'bg-[#d13438] text-white border-[#d13438] shadow-sm',
        'Sold (Prior)': 'bg-[#f3f2f1] text-[#605e5c] border-[#edebe9]',
        'Pull Out': 'bg-[#f3f2f1] text-[#605e5c] border-[#edebe9]',
    };

    // Normalize status string for lookup if needed
    const normalizedStatus = Object.keys(styles).find(key => key.toLowerCase() === status?.toLowerCase()) || status;

    let displayText = normalizedStatus === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? 'NOT FOR SALE' : status;

    // Enhance display text if it's a sale with downpayment info
    if ((normalizedStatus === ArtworkStatus.SOLD || normalizedStatus === ArtworkStatus.DELIVERED) && sale && artworkPrice !== undefined) {
        const isDownpayment = sale.downpayment !== undefined && sale.downpayment < artworkPrice;
        const isFullPayment = sale.downpayment !== undefined && sale.downpayment >= artworkPrice;
        
        if (sale.deliveryRequest?.status === 'Declined') {
            displayText = 'Sold (Cancelled Delivery)';
        } else if (isDownpayment) {
            displayText = `${status} (Partial)`;
        } else if (isFullPayment) {
            displayText = `${status} (Full)`;
        }
    }

    // Logistics Status Integration
    if (sale?.deliveryRequest) {
        const dStatus = sale.deliveryRequest.status;
        let logBadge = null;

        if (dStatus === 'Approved') {
            logBadge = (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#dff6dd] text-[#107c10] border border-[#107c10]/20 rounded-sm text-[8px] font-black uppercase tracking-widest shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#107c10] animate-pulse" />
                    Dispatch Ready
                </div>
            );
        } else if (dStatus === 'Pending') {
            logBadge = (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#fff4ce] text-[#4a1e00] border border-[#fed44d]/40 rounded-sm text-[8px] font-black uppercase tracking-widest shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ffb900]" />
                    Review Pending
                </div>
            );
        } else if (dStatus === 'Dispatched') {
            logBadge = (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#eff6fc] text-[#0078d4] border border-[#0078d4]/20 rounded-sm text-[8px] font-black uppercase tracking-widest shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0078d4] animate-pulse" />
                    On the way
                </div>
            );
        } else if (dStatus === 'Declined') {
            logBadge = (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#fde7e9] text-[#a4262c] border border-[#a4262c]/20 rounded-sm text-[8px] font-black uppercase tracking-widest shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a4262c]" />
                    Update Required
                </div>
            );
        } else if (dStatus === 'Cancelled') {
            logBadge = (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f3f2f1] text-[#605e5c] border border-[#c8c6c4]/50 rounded-sm text-[8px] font-black uppercase tracking-widest shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#605e5c]" />
                    Delivery Cancelled
                </div>
            );
        }

        if (logBadge) {
            return (
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider border shadow-sm whitespace-nowrap ${styles[normalizedStatus] || 'bg-[#f3f2f1] text-[#323130] border-[#edebe9]'}`}>
                        {displayText}
                    </span>
                    {logBadge}
                </div>
            );
        }
    }

    return (
        <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider border shadow-sm whitespace-nowrap ${styles[normalizedStatus] || 'bg-[#f3f2f1] text-[#323130] border-[#edebe9]'}`}>
            {displayText}
        </span>
    );
};
