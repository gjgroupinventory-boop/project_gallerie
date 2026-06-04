import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, User } from 'lucide-react';
import { SaleRecord, DeliveryRequest } from '../../types';
import { OptimizedImage } from '../OptimizedImage';

interface DeliveryRequestModalProps {
  sale: SaleRecord;
  artwork: { id: string; title: string; code: string; imageUrl?: string };
  onClose: () => void;
  onSubmit: (request: Partial<DeliveryRequest>) => void;
}

const DeliveryRequestModal: React.FC<DeliveryRequestModalProps> = ({
  sale,
  artwork,
  onClose,
  onSubmit,
}) => {
  const [addressData, setAddressData] = useState({
    street: sale.deliveryRequest?.street || '',
    barangay: sale.deliveryRequest?.barangay || '',
    city: sale.deliveryRequest?.city || '',
    province: sale.deliveryRequest?.province || '',
    zipCode: sale.deliveryRequest?.zipCode || '',
    landmark: sale.deliveryRequest?.landmark || '',
  });
  const [date, setDate] = useState(sale.deliveryRequest?.deliveryDate || '');
  const [extraPersons, setExtraPersons] = useState(sale.deliveryRequest?.extraPersonnelCount || 0);
  const [remarks, setRemarks] = useState(sale.deliveryRequest?.remarks || '');

  const isFormValid =
    addressData.street &&
    addressData.barangay &&
    addressData.city &&
    addressData.province &&
    date;

  const isAlreadyApproved = sale.deliveryRequest?.status === 'Approved';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#323130]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-md shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#edebe9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-[#edebe9] flex items-center justify-between bg-[#faf9f8]">
          <div>
            <h2 className="text-xl font-black text-[#323130] uppercase tracking-tight">Logistics Configuration</h2>
            <p className="text-[#605e5c] text-[10px] font-bold uppercase tracking-widest mt-1">Operational transport & installation protocol</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#edebe9] rounded-md transition-colors text-[#605e5c]">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto space-y-8 bg-white">
          {/* Artwork Preview */}
          <div className="flex gap-6 p-5 bg-[#faf9f8] rounded-sm border border-[#edebe9] shadow-sm">
            <div className="w-20 h-20 rounded-sm overflow-hidden bg-white border border-[#edebe9] shrink-0 shadow-sm">
              <OptimizedImage src={artwork.imageUrl} className="w-full h-full object-cover grayscale-[0.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-widest leading-none mb-2">{artwork.code}</p>
              <h3 className="font-black text-[#323130] text-sm leading-tight uppercase truncate">{artwork.title}</h3>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#edebe9] flex items-center justify-center">
                  <User size={10} className="text-[#605e5c]" />
                </div>
                <p className="text-[11px] font-bold text-[#605e5c] uppercase">Client: {sale.clientName}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-px bg-[#edebe9] flex-1" />
              <label className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.2em] px-2">Destination Registry</label>
              <div className="h-px bg-[#edebe9] flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-full space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Street / Building / House No. <span className="text-[#d13438]">*</span></label>
                <input type="text" value={addressData.street} onChange={(e) => setAddressData({ ...addressData, street: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="Complete Street Address" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Barangay <span className="text-[#d13438]">*</span></label>
                <input type="text" value={addressData.barangay} onChange={(e) => setAddressData({ ...addressData, barangay: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="Barangay" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">City / Municipality <span className="text-[#d13438]">*</span></label>
                <input type="text" value={addressData.city} onChange={(e) => setAddressData({ ...addressData, city: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="City" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Province <span className="text-[#d13438]">*</span></label>
                <input type="text" value={addressData.province} onChange={(e) => setAddressData({ ...addressData, province: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="Province" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Zip Code</label>
                <input type="text" value={addressData.zipCode} onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="Zip Code" />
              </div>
              <div className="col-span-full space-y-1.5">
                <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Landmark (Optional)</label>
                <input type="text" value={addressData.landmark} onChange={(e) => setAddressData({ ...addressData, landmark: e.target.value })} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all" placeholder="Prominent Landmarks" />
              </div>
            </div>
          </div>

          {/* Date & Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1 block">Fulfillment Date <span className="text-[#d13438]">*</span></label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] transition-all outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1 block">Personnel Allocation</label>
              <div className="flex items-center gap-4 bg-[#faf9f8] p-1 rounded-sm border border-[#edebe9]">
                <button onClick={() => setExtraPersons(Math.max(0, extraPersons - 1))} className="w-10 h-10 bg-white border border-[#edebe9] rounded-sm flex items-center justify-center font-black text-[#323130] hover:bg-[#edebe9] transition-colors shadow-sm">-</button>
                <span className="flex-1 text-center font-black text-sm tabular-nums text-[#323130]">{extraPersons}</span>
                <button onClick={() => setExtraPersons(extraPersons + 1)} className="w-10 h-10 bg-white border border-[#edebe9] rounded-sm flex items-center justify-center font-black text-[#323130] hover:bg-[#edebe9] transition-colors shadow-sm">+</button>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-px bg-[#edebe9] flex-1" />
              <label className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.2em] px-2">Tooling Specifications</label>
              <div className="h-px bg-[#edebe9] flex-1" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#605e5c] uppercase tracking-widest ml-1">Remarks / Protocol Notes</label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full px-4 py-3 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white focus:ring-1 focus:ring-[#0078d4] focus:border-[#0078d4] outline-none transition-all min-h-[100px] resize-none" placeholder="Administrative remarks or special handling instructions..." />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-[#faf9f8] border-t border-[#edebe9] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#a19f9d] uppercase tracking-widest leading-none mb-1">Authorization</span>
            <span className="text-[10px] font-bold text-[#605e5c] uppercase">Logistics Signature Required</span>
          </div>
          <button
            disabled={!isFormValid}
            onClick={() =>
              onSubmit({
                ...addressData,
                clientAddress: `${addressData.street}, Brgy. ${addressData.barangay}, ${addressData.city}, ${addressData.province}${addressData.zipCode ? `, ${addressData.zipCode}` : ''}${addressData.landmark ? ` (Landmark: ${addressData.landmark})` : ''}`,
                deliveryDate: date,
                extraPersonnelCount: extraPersons,
                remarks,
              })
            }
            className="px-12 py-4 bg-[#323130] text-white rounded-sm font-black uppercase tracking-[0.2em] text-[11px] hover:bg-black disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-xl shadow-black/10 flex items-center gap-3"
          >
            <span>{isAlreadyApproved ? 'Dispatch Delivery' : 'Request Delivery'}</span>
            <ChevronRight size={18} strokeWidth={3} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryRequestModal;
