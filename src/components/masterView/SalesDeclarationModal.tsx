import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../Modal';
import { PhoneInput } from '../PhoneInput';
import { Clock, Shield, Tag, Trash2, Upload } from 'lucide-react';
import { Artwork, ExhibitionEvent, ArtworkStatus } from '../../types';

interface SalesDeclarationModalProps {
  artwork: Artwork;
  events: ExhibitionEvent[];
  onSale: (
    id: string,
    clientName: string,
    clientEmail: string,
    clientContact: string,
    delivered: boolean,
    eventInfo?: { id: string, name: string },
    attachment?: string,
    itdr?: string[],
    rsa?: string[],
    orcr?: string[],
    downpayment?: number,
    isDownpayment?: boolean,
    remarks?: string,
    discountPercentage?: number,
    discountedPrice?: number
  ) => void;
  onClose: () => void;
  wrapAction: (
    action: () => Promise<boolean | void> | boolean | void,
    message?: string,
    optionsOrStatus?: any
  ) => Promise<boolean | undefined>;
}

export const SalesDeclarationModal: React.FC<SalesDeclarationModalProps> = ({
  artwork,
  events,
  onSale,
  onClose,
  wrapAction
}) => {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [saleDownpayment, setSaleDownpayment] = useState('');
  const [isDownpayment, setIsDownpayment] = useState(false);
  const [saleEventId, setSaleEventId] = useState(artwork.reservedForEventId || '');
  const [saleDelivered, setSaleDelivered] = useState(false);
  const [saleItdr, setSaleItdr] = useState<string[]>([]);
  const [saleRsa, setSaleRsa] = useState<string[]>([]);
  const [saleOrcr, setSaleOrcr] = useState<string[]>([]);
  const [activeSaleAttachmentTab, setActiveSaleAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [saleRemarks, setSaleRemarks] = useState('');
  const [handlingAgentName, setHandlingAgentName] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');

  const pct = discountPercentage ? parseFloat(discountPercentage) : 0;
  const discountedPrice = pct > 0 ? Math.round(artwork.price * (1 - pct / 100)) : artwork.price;

  // Pre-fill if reserved
  useEffect(() => {
    if (artwork.status === ArtworkStatus.RESERVED) {
      if (artwork.remarks?.includes('Type: Person')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        if (targetName) setClientName(targetName);
      } else if (artwork.remarks?.includes('Type: Event')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      } else if (artwork.remarks?.includes('Type: Auction')) {
        const targetName = artwork.remarks.split('Target:')[1]?.split('|')[0]?.trim();
        const event = events.find(e => e.title === targetName);
        if (event) setSaleEventId(event.id);
      }
    }
  }, [artwork, events]);

  return (
    <Modal onClose={onClose} title="Sales Declaration Entry">
      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder="Full Client Name" 
            required 
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" 
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Client Email (Optional)</label>
          <input 
            type="email" 
            placeholder="client@example.com" 
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" 
            value={clientEmail} 
            onChange={(e) => setClientEmail(e.target.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Contact Number <span className="text-red-500">*</span></label>
          <PhoneInput
            value={clientContact}
            onChange={setClientContact}
            placeholder="912 345 6789"
            className="h-11"
          />
        </div>

        {/* Pricing & Discount section */}
        <div className="bg-neutral-50 rounded-sm p-4 border border-neutral-100 space-y-3">
          <div className="flex justify-between items-center text-xs font-black text-neutral-400 uppercase tracking-widest">
            <span>Artwork Base Price</span>
            <span className="text-neutral-900 text-sm font-black">₱{artwork.price.toLocaleString()}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Discount Percentage (%)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="w-full pr-10 pl-5 py-2.5 bg-white border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all"
                value={discountPercentage}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  const num = parseFloat(val);
                  if (num > 100) return; // Limit to 100%
                  setDiscountPercentage(val);
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">%</span>
            </div>
          </div>

          {pct > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-sm flex items-center justify-between animate-in fade-in duration-300">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-emerald-950 uppercase tracking-wider">Final Discounted Price</p>
                <p className="text-[9px] font-bold text-emerald-600">Applied {pct}% discount (Deducted ₱{(artwork.price - discountedPrice).toLocaleString()})</p>
              </div>
              <span className="text-sm font-black text-emerald-800">
                ₱{discountedPrice.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div 
            className="flex items-center justify-between p-4 bg-neutral-50 rounded-sm border border-neutral-100 group hover:bg-neutral-100 transition-all cursor-pointer" 
            onClick={() => setIsDownpayment(!isDownpayment)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-all ${isDownpayment ? 'bg-neutral-900 text-white shadow-lg' : 'bg-white text-neutral-400 border border-neutral-200'}`}>
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-neutral-900">Installment Sale</p>
                <p className="text-[10px] font-bold text-neutral-500">Enable downpayment & balance tracking</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-md transition-all relative ${isDownpayment ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-sm bg-white transition-all ${isDownpayment ? 'right-1' : 'left-1'}`} />
            </div>
          </div>

          {isDownpayment ? (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Initial Downpayment Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0.00"
                  className="w-full pl-8 pr-5 py-3 bg-white border border-neutral-200 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 transition-all"
                  value={saleDownpayment}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) parts.splice(2);
                    if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                    setSaleDownpayment(parts.join('.'));
                  }}
                />
              </div>
              {saleDownpayment && (
                <div className="mt-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  Remaining Balance: <span className="text-red-600 font-black">₱{Math.max(0, discountedPrice - (parseFloat(saleDownpayment) || 0)).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-sm flex items-start gap-3">
              <Shield size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-indigo-900 uppercase tracking-tight">Full Payment Mode</p>
                <p className="text-[10px] font-medium text-indigo-700 leading-relaxed">
                  This sale will be treated as a single full payment. Outstanding balance metrics will be hidden until the sale is approved by admin.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Event / Auction (Optional)</label>
          <select
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all"
            value={saleEventId}
            onChange={(e) => setSaleEventId(e.target.value)}
          >
            <option value="">Direct Sale (No Event)</option>
            {events.filter(e => {
              if (e.status === 'Recent' || e.status === 'Closed') return false;
              if (e.isStrictDuration && e.endDate) {
                const end = new Date(e.endDate);
                end.setHours(23, 59, 59, 999);
                if (end.getTime() < Date.now()) return false;
              }
              return true;
            }).map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        {/* Delivery Selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Delivery Option</label>
          <div className="flex bg-[#edebe9] p-0.5 rounded-sm w-full">
            {(['Logistics', 'Handed Over'] as const).map(opt => {
              const isHandedOver = opt === 'Handed Over';
              const isActive = isHandedOver ? saleDelivered : !saleDelivered;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSaleDelivered(isHandedOver)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${
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

        {/* Sale Attachments */}
        <div className="space-y-4 pt-2">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            Attachments <span className="text-red-500 font-bold normal-case">(Required for Sale)</span>
          </label>

          <div className="flex p-1 bg-neutral-100 rounded-sm">
            <button
              onClick={() => setActiveSaleAttachmentTab('itdr')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'itdr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              IT/DR
            </button>
            <button
              onClick={() => setActiveSaleAttachmentTab('rsa')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'rsa' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              RSA / AR <span className="text-red-500 ml-1">*</span>
            </button>
            <button
              onClick={() => setActiveSaleAttachmentTab('orcr')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all ${activeSaleAttachmentTab === 'orcr' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}
            >
              OR / CR
            </button>
          </div>

          <div className="relative">
            {(() => {
              const rawImages = activeSaleAttachmentTab === 'itdr' ? saleItdr : activeSaleAttachmentTab === 'rsa' ? saleRsa : saleOrcr;
              const currentImages = Array.isArray(rawImages) ? rawImages : (rawImages ? [rawImages] : []);
              const setCurrImages = activeSaleAttachmentTab === 'itdr' ? setSaleItdr : activeSaleAttachmentTab === 'rsa' ? setSaleRsa : setSaleOrcr;

              return (
                <div className="grid grid-cols-2 gap-4">
                  {currentImages.map((imgUrl, index) => (
                    <div key={index} className="relative group rounded-md overflow-hidden shadow-md ring-1 ring-neutral-100 h-32">
                      <img src={imgUrl} className="w-full h-full object-cover" alt="Attachment" />
                      <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <button
                          onClick={() => setCurrImages(prev => prev.filter((_, i) => i !== index))}
                          className="px-4 py-2 bg-white text-neutral-700 rounded-sm text-xs font-bold shadow-lg hover:bg-neutral-100 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">
                        {activeSaleAttachmentTab.toUpperCase()} Attached
                      </div>
                    </div>
                  ))}

                  <label className="flex flex-col items-center justify-center w-full h-32 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-md cursor-pointer hover:bg-white hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-500/10 transition-all group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          const resizedDataUrl = await new Promise<string>((resolve, reject) => {
                            const img = new Image();
                            img.onload = () => {
                              const maxW = 1200;
                              const maxH = 1200;
                              const w = img.width;
                              const h = img.height;
                              const scale = Math.min(maxW / w, maxH / h, 1);
                              const canvas = document.createElement('canvas');
                              canvas.width = Math.round(w * scale);
                              canvas.height = Math.round(h * scale);
                              const ctx = canvas.getContext('2d');
                              if (!ctx) {
                                reject(new Error('Canvas not available'));
                                  return;
                                }
                              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                              resolve(canvas.toDataURL('image/jpeg', 0.8));
                            };
                            img.onerror = () => reject(new Error('Failed to load image'));
                            img.src = URL.createObjectURL(file);
                          });
                          setCurrImages(prev => [...prev, resizedDataUrl]);
                        } catch (err) {
                          console.error('Compression failed:', err);
                          const reader = new FileReader();
                          reader.onload = (ev) => setCurrImages(prev => [...prev, ev.target?.result as string]);
                          reader.readAsDataURL(file);
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                    <div className="p-3 bg-white rounded-sm shadow-sm mb-2 group-hover:scale-110 transition-transform ring-1 ring-neutral-100">
                      <Upload size={20} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                    </div>
                    <span className="text-xs font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">Add Attachment</span>
                  </label>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Handling Agent Name <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            placeholder="Enter handling agent's name..." 
            required 
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all" 
            value={handlingAgentName} 
            onChange={(e) => setHandlingAgentName(e.target.value)} 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Sale Remarks / Audit Note <span className="text-red-500">*</span></label>
          <textarea
            className="w-full px-5 py-3 bg-neutral-50 border-0 rounded-sm text-sm font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:bg-neutral-50 hover:bg-neutral-100 transition-all min-h-[80px]"
            placeholder="Required for audit compliance (e.g. client background, special terms...)"
            value={saleRemarks}
            onChange={(e) => setSaleRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-md text-neutral-600 font-bold hover:bg-neutral-100 transition-all transform hover:-translate-y-0.5">Cancel</button>
          <button
            onClick={() => {
              if (clientName && clientContact && saleRsa.length > 0 && saleRemarks.trim() && handlingAgentName.trim()) {
                wrapAction(async () => {
                  const selectedEvent = events.find(e => e.id === saleEventId);
                  const eventInfo = selectedEvent ? { id: selectedEvent.id, name: selectedEvent.title } : undefined;
                  const downpaymentAmount = (isDownpayment && saleDownpayment) ? parseFloat(saleDownpayment) : undefined;
                  const fullRemarks = saleRemarks.trim()
                    ? `${saleRemarks} | Handling Agent: ${handlingAgentName.trim()}`
                    : `Handling Agent: ${handlingAgentName.trim()}`;
                  await onSale(
                    artwork.id, 
                    clientName, 
                    clientEmail, 
                    clientContact, 
                    saleDelivered, 
                    eventInfo, 
                    '', // legacy saleAttachment
                    saleItdr.length > 0 ? saleItdr : undefined, 
                    saleRsa.length > 0 ? saleRsa : undefined, 
                    saleOrcr.length > 0 ? saleOrcr : undefined, 
                    downpaymentAmount, 
                    isDownpayment, 
                    fullRemarks,
                    pct > 0 ? pct : undefined,
                    pct > 0 ? discountedPrice : undefined
                  );
                  onClose();
                }, 'Processing Sale...', saleDelivered ? ArtworkStatus.DELIVERED : ArtworkStatus.SOLD);
              }
            }}
            className="px-8 py-2.5 bg-neutral-900 text-white rounded-md font-bold shadow-lg shadow-neutral-200 hover:shadow-neutral-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!clientName || !clientContact || saleRsa.length === 0 || !saleRemarks.trim() || !handlingAgentName.trim()}
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </Modal>
  );
};
