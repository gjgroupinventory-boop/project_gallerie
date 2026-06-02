import React from 'react';
import {
  Artwork,
  ArtworkStatus,
  SaleRecord,
  UserRole
} from '../../types';
import { ICONS } from '../../constants';
import {
  Image as ImageIcon,
  Tag,
  Edit,
  AlertCircle,
  Calendar,
  Shield,
  Gavel,
  User,
  FileText,
  Paperclip
} from 'lucide-react';
import { OptimizedImage } from '../OptimizedImage';
import { StatusBadge } from './StatusBadge';
import { getArtworkClassification } from '../../services/inventoryService';

interface ArtworkDetailPanelProps {
  artwork: Artwork;
  displayStatus: ArtworkStatus;
  displayBranch: string;
  sale?: SaleRecord;
  onEditPayment?: (saleId: string, paymentId: string, updates: { amount: number; date?: string; reference?: string; attachmentUrls?: string[] }) => void;
  setEditingPayment: React.Dispatch<React.SetStateAction<{ id: string; amount: string; date: string; reference: string; type: 'downpayment' | 'installment' } | null>>;
  setModalMode: React.Dispatch<React.SetStateAction<any>>;
  userRole: UserRole;
  onApprovePaymentEdit?: (saleId: string, paymentId: string, remarks?: string) => void;
  onDeclinePaymentEdit?: (saleId: string, paymentId: string, remarks?: string) => void;
  reservationInfo: { type: string; target: string; expiry?: string; notes?: string } | null;
  staffRemarks: string;
  setShowImagePreview: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReservationCountdown: React.FC<{ expiry: string }> = ({ expiry }) => {
  const calculateTimeLeft = React.useCallback(() => {
    const difference = +new Date(expiry) - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      isUrgent: false
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
        isUrgent: difference < 24 * 60 * 60 * 1000
      };
    }

    return timeLeft;
  }, [expiry]);

  const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase tracking-wider animate-pulse">
        <AlertCircle size={11} />
        Reservation Expired
      </span>
    );
  }

  const { days, hours, minutes, seconds, isUrgent } = timeLeft;
  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono font-black ${
        isUrgent 
          ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' 
          : 'bg-indigo-50/50 border-indigo-100/50 text-indigo-700'
      }`}>
        {isUrgent ? (
          <AlertCircle size={10} className="shrink-0 animate-pulse" />
        ) : (
          <Calendar size={10} className="shrink-0 text-indigo-500" />
        )}
        <div className="flex items-center gap-0.5">
          {days > 0 && (
            <>
              <span>{pad(days)}</span>
              <span className="text-[8px] font-sans font-bold text-neutral-400 uppercase mr-0.5">d</span>
            </>
          )}
          <span>{pad(hours)}</span>
          <span className="text-[8px] font-sans font-bold text-neutral-400 uppercase mr-0.5">h</span>
          <span>{pad(minutes)}</span>
          <span className="text-[8px] font-sans font-bold text-neutral-400 uppercase mr-0.5">m</span>
          <span>{pad(seconds)}</span>
          <span className="text-[8px] font-sans font-bold text-neutral-400 uppercase">s</span>
        </div>
        <span className={`ml-1 text-[8px] font-sans font-black uppercase tracking-widest ${
          isUrgent ? 'text-rose-500' : 'text-indigo-500'
        }`}>
          left
        </span>
      </div>
    </div>
  );
};

export const ArtworkDetailPanel: React.FC<ArtworkDetailPanelProps> = ({
  artwork,
  displayStatus,
  displayBranch,
  sale,
  onEditPayment,
  setEditingPayment,
  setModalMode,
  userRole,
  onApprovePaymentEdit,
  onDeclinePaymentEdit,
  reservationInfo,
  staffRemarks,
  setShowImagePreview
}) => {
  const actualPrice = sale?.discountedPrice !== undefined && sale?.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
  const balance = sale ? actualPrice - (sale.downpayment || 0) - (sale.installments || []).filter(i => !i.isPending).reduce((sum, inst) => sum + inst.amount, 0) : 0;
  const isFullyPaid = balance <= 0 && !!sale;

  return (
    <div className="lg:col-span-2 bg-white rounded-md shadow-sm border border-neutral-200 flex flex-col md:flex-row overflow-hidden items-stretch">
      <div className="w-full md:w-[50%] bg-neutral-100 flex items-center justify-center relative min-h-[500px] border-r border-neutral-100">
        <OptimizedImage
          src={artwork.imageUrl || undefined}
          className="w-full h-full object-contain"
          alt={artwork.title}
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={32} />
                <span className="text-xs font-semibold uppercase tracking-widest">No Preview</span>
              </div>
            </div>
          }
          {...(artwork.imageUrl ? { onClick: () => setShowImagePreview(true) } : {})}
          containerClassName={artwork.imageUrl ? 'w-full h-full cursor-zoom-in' : 'w-full h-full'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
      <div className="p-3 sm:p-5 md:p-8 flex-1 space-y-4 md:space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="flex items-center bg-white px-3 py-1.5 rounded-sm border border-neutral-200 shadow-sm">
              <span className="text-[9px] font-black text-neutral-400 mr-2 uppercase tracking-widest">Code</span>
              <span className="text-[11px] font-black text-neutral-900 uppercase tracking-tight">{artwork.code}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <StatusBadge status={displayStatus} />
              
              {displayStatus === ArtworkStatus.RESERVED && artwork.reservedForEventName && (
                <div className="flex items-center px-3 py-1 rounded-sm bg-neutral-50 border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-700 shadow-sm animate-in fade-in slide-in-from-left-2 duration-500">
                  <span className="text-neutral-400 mr-2 font-black">For:</span>
                  <span className="truncate max-w-[200px]">{artwork.reservedForEventName}</span>
                </div>
              )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-tight">{artwork.title}</h1>
          <p className="text-base sm:text-lg text-neutral-500 font-medium">
            {artwork.artist}, {artwork.year}
            {(artwork.type || getArtworkClassification(artwork.dimensions)) && (
              <>
                <span className="mx-2 text-neutral-300">•</span>
                {artwork.type || getArtworkClassification(artwork.dimensions)}
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-sm bg-neutral-50 border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-700">
              <span className="w-1.5 h-1.5 rounded-sm bg-neutral-500 mr-1.5" />
              Added: {new Date(artwork.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 sm:gap-x-8 text-sm pt-4 border-t border-neutral-100">
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Medium</p><p className="text-neutral-700 font-medium break-words">{artwork.medium}</p></div>
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Size</p><p className="text-neutral-700 font-medium break-words">{artwork.dimensions || 'N/A'}</p></div>
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Size with Frame</p><p className="text-neutral-700 font-medium break-words">{artwork.sizeFrame || 'N/A'}</p></div>
          <div><p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Location</p><p className="text-neutral-700 font-medium break-words">{displayBranch}</p></div>

          {/* Financial Section */}
          <div className="col-span-2 pt-6 mt-2 border-t border-neutral-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Base Valuation</p>
                {sale?.discountPercentage !== undefined && sale.discountPercentage > 0 ? (
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="line-through text-neutral-400 font-normal text-xs">₱{(artwork.price || 0).toLocaleString()}</span>
                    <span className="text-2xl font-black text-neutral-900 mt-1">₱{(sale.discountedPrice || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded ml-1">-{sale.discountPercentage}%</span></span>
                  </div>
                ) : (
                  <p className="text-2xl font-black text-neutral-900 leading-none">₱{(artwork.price || 0).toLocaleString()}</p>
                )}
              </div>
              {(() => {
                 const showBalance = sale && !sale.isCancelled && (sale.isDownpayment || sale.status === 'Approved');

                 if (!sale || sale.isCancelled || displayStatus === ArtworkStatus.AVAILABLE || !showBalance) return null;

                return (
                  <div className={`px-4 py-3 rounded-xl border ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} flex flex-col items-end shrink-0`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isFullyPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isFullyPaid ? 'Status: Fully Paid' : 'Outstanding Balance'}
                    </p>
                    <p className={`text-xl font-black leading-none ${isFullyPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                      ₱{balance.toLocaleString()}
                    </p>
                  </div>
                );
              })()}
            </div>

            {sale?.downpayment && !sale.isCancelled && displayStatus !== ArtworkStatus.AVAILABLE && (
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-900 uppercase tracking-widest">Payment Ledger</h4>
                  {isFullyPaid ? (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Fully Paid</span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-400">{sale.installments?.length || 0} Installments recorded</span>
                  )}
                </div>
                
                <div className="divide-y divide-neutral-50">
                  {/* Downpayment Row */}
                  <div className="p-4 flex items-center justify-between group/dp hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Tag size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          {sale.isDownpayment ? 'Initial Downpayment' : 'Full Payment'}
                        </p>
                        <p className="text-xs font-bold text-neutral-400">{new Date(sale.saleDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-base font-black text-neutral-900">₱{(sale.downpayment || 0).toLocaleString()}</p>
                        {sale.pendingDownpaymentEdit && (
                          <span className="text-[9px] text-orange-500 font-black uppercase">Approval Pending</span>
                        )}
                      </div>
                      {onEditPayment && (
                        <button
                          onClick={() => {
                            setEditingPayment({
                              id: 'downpayment',
                              amount: (sale.downpayment || 0).toString(),
                              date: sale.saleDate,
                              reference: 'Downpayment',
                              type: 'downpayment'
                            });
                            setModalMode('edit-payment');
                          }}
                          className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-900 transition-all opacity-0 group-hover/dp:opacity-100"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Downpayment Admin Actions */}
                  {userRole === UserRole.ADMIN && sale.pendingDownpaymentEdit && (
                    <div className="bg-orange-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-orange-500" />
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Proposed Edit</p>
                          <p className="text-sm font-black text-orange-900 leading-none">₱{sale.pendingDownpaymentEdit.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onApprovePaymentEdit?.(sale.id, 'downpayment')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm">Approve</button>
                        <button onClick={() => onDeclinePaymentEdit?.(sale.id, 'downpayment')} className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">Decline</button>
                      </div>
                    </div>
                  )}

                  {/* Installments List */}
                  {sale.installments?.map((inst) => (
                    <React.Fragment key={inst.id}>
                      <div className={`p-4 flex items-center justify-between group/inst hover:bg-neutral-50 transition-colors ${inst.isPending ? 'bg-red-50/30' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inst.isPending ? 'bg-red-100 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${inst.isPending ? 'text-red-600' : 'text-neutral-500'}`}>
                              {inst.isPending ? 'Pending Installment' : 'Payment Received'}
                            </p>
                            <p className="text-xs font-bold text-neutral-400">{new Date(inst.date).toLocaleDateString()}</p>
                            {inst.attachmentUrls && inst.attachmentUrls.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {inst.attachmentUrls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md border border-neutral-200 overflow-hidden hover:scale-110 transition-transform bg-white shadow-sm shrink-0">
                                    <img src={url} className="w-full h-full object-cover" alt="" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-base font-black ${inst.isPending ? 'text-indigo-700' : 'text-neutral-900'}`}>
                              ₱{inst.amount.toLocaleString()}
                            </p>
                            {inst.pendingEdit && (
                              <span className="text-[9px] text-orange-500 font-black uppercase">Edit Pending</span>
                            )}
                          </div>
                          {onEditPayment && !inst.isPending && (
                            <button
                              onClick={() => {
                                setEditingPayment({
                                  id: inst.id,
                                  amount: inst.amount.toString(),
                                  date: inst.date.split('T')[0],
                                  reference: inst.reference || '',
                                  type: 'installment'
                                });
                                setModalMode('edit-payment');
                              }}
                              className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-400 hover:text-neutral-900 transition-all opacity-0 group-hover/inst:opacity-100"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Approval Alert */}
                      {inst.isPending && (
                        <div className="bg-indigo-50 p-4 border-l-4 border-indigo-500 flex items-center gap-4">
                          <Shield size={20} className="text-indigo-500 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Administrative Approval Required</p>
                            <p className="text-xs font-bold text-indigo-800 leading-tight">
                              Payment of ₱{inst.amount.toLocaleString()} has been recorded and is currently awaiting admin confirmation.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Installment Admin Actions */}
                      {userRole === UserRole.ADMIN && (inst.pendingEdit || inst.isPending) && (() => {
                        const approvedTotal = (sale?.downpayment || 0) + 
                          (sale?.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0);
                        const actualPrice = sale?.discountedPrice !== undefined && sale?.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
                        const isOver = inst.isPending && (approvedTotal + inst.amount) > actualPrice + 0.01;
                        const theme = isOver ? { bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-600', accent: 'bg-red-100 text-red-600', darkText: 'text-red-900' } 
                                     : inst.isPending ? { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600', accent: 'bg-indigo-100 text-indigo-600', darkText: 'text-indigo-900' }
                                     : { bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600', accent: 'bg-orange-100 text-orange-600', darkText: 'text-orange-900' };

                        return (
                          <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t ${theme.bg} ${theme.border}`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${theme.accent}`}>
                                {inst.isPending ? <Shield size={16} /> : <Edit size={16} />}
                              </div>
                              <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${theme.text}`}>
                                  {isOver ? 'Overpayment Detected' : inst.isPending ? 'Approval Required' : 'Proposed Modification'}
                                </p>
                                <p className={`text-base font-black leading-none ${theme.darkText}`}>
                                  ₱{(inst.pendingEdit?.amount || inst.amount).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => onApprovePaymentEdit?.(sale.id, inst.id)} 
                                className={`flex-1 sm:flex-none px-6 py-2.5 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${inst.isPending ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                              >
                                {(() => {
                                  if (!inst.isPending) return 'Approve Edit';
                                  const approvedTotal = (sale?.downpayment || 0) + 
                                    (sale?.installments || []).filter(i => !i.isPending).reduce((sum, i) => sum + i.amount, 0);
                                  const totalIncludingThis = approvedTotal + inst.amount;
                                  const actualPrice = sale?.discountedPrice !== undefined && sale?.discountedPrice !== null ? sale.discountedPrice : (artwork.price || 0);
                                  const isOver = totalIncludingThis > actualPrice + 0.01;
                                  return isOver ? 'Approve Overpayment' : 'Approve Payment';
                                })()}
                              </button>
                              <button onClick={() => onDeclinePaymentEdit?.(sale.id, inst.id)} className="flex-1 sm:flex-none px-6 py-2.5 bg-white hover:bg-neutral-50 text-neutral-600 border border-neutral-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </React.Fragment>
                  ))}
                </div>

                {/* Footer Message */}
                {sale.installments?.length === 0 && !sale.pendingDownpaymentEdit && (
                  <div className="p-8 text-center bg-neutral-50/50">
                    <p className="text-xs font-bold text-neutral-400 italic">
                      {isFullyPaid ? 'This sale has been fully paid.' : 'No additional installments recorded for this sale.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Organized Reservation Info */}
        {reservationInfo && (
          <div className="pt-6 border-t border-neutral-100 mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Reservation Payload</p>
              {reservationInfo.expiry && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100">
                  Expires: {new Date(reservationInfo.expiry).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="bg-indigo-50/30 rounded-xl border border-indigo-100/50 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Reservation Type</p>
                  <div className="flex items-center gap-1.5">
                    {reservationInfo.type === 'Auction' ? <Gavel size={14} className="text-indigo-600" /> : <User size={14} className="text-indigo-600" />}
                    <p className="text-sm font-black text-neutral-900">{reservationInfo.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target Identity</p>
                  <p className="text-sm font-black text-neutral-900 truncate">{reservationInfo.target}</p>
                </div>
              </div>

              {reservationInfo.expiry && (
                <div className="pt-3 border-t border-indigo-100/50 flex flex-col gap-1.5">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Time Remaining</p>
                  <ReservationCountdown expiry={reservationInfo.expiry} />
                </div>
              )}

              {reservationInfo.notes && (
                <div className="pt-3 border-t border-indigo-100/50">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Administrative Notes</p>
                  <p className="text-xs font-bold text-neutral-600 leading-relaxed italic">
                    "{reservationInfo.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dedicated Remarks Section (Shown only if NOT reserved, as reserved notes appear in the payload block) */}
        {staffRemarks && !reservationInfo && (
          <div className="pt-6 border-t border-neutral-100 mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3">Administrative Remarks</p>
            <div className="bg-neutral-50/80 rounded-xl border border-neutral-100 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FileText size={48} />
              </div>
              <p className="text-sm text-neutral-600 font-bold leading-relaxed relative z-10 whitespace-pre-wrap italic">
                "{staffRemarks}"
              </p>
            </div>
          </div>
        )}

        {/* Extra Details from Import */}
        {Object.keys(artwork).filter(key => {
          const excludedKeys = ['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'sizeFrame', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt', 'updatedAt', 'deletedAt', 'importPeriod', 'reservedForEventId', 'reservedForEventName', 'reservationExpiry', 'soldAtBranch', 'sheetName', 'itemCount', 'itdrImageUrl', 'rsaImageUrl', 'orCrImageUrl', 'ROWINDEX', 'rowindex', 'rowIndex', 'remarks'];
          return !excludedKeys.includes(key);
        }).length > 0 && (
          <div className="pt-4 border-t border-neutral-100 mt-4">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Additional Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              {Object.keys(artwork)
                .filter(key => {
                  const excludedKeys = ['id', 'code', 'title', 'artist', 'medium', 'dimensions', 'sizeFrame', 'year', 'price', 'status', 'currentBranch', 'imageUrl', 'createdAt', 'updatedAt', 'deletedAt', 'importPeriod', 'reservedForEventId', 'reservedForEventName', 'reservationExpiry', 'soldAtBranch', 'sheetName', 'itemCount', 'itdrImageUrl', 'rsaImageUrl', 'orCrImageUrl', 'ROWINDEX', 'rowindex', 'rowIndex', 'remarks'];
                  return !excludedKeys.includes(key);
                })
                .map(key => (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{key}</p>
                    <p className="text-neutral-700 font-medium break-words">{String((artwork as any)[key])}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Delivery Information */}
        {(displayStatus === ArtworkStatus.DELIVERED || (sale && sale.isDelivered)) && (
          <div className="pt-4 border-t border-neutral-100 mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Delivery Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-[11px] bg-blue-50/40 p-3 rounded-md border border-blue-100/50">
              <div className="col-span-2">
                <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Destination</p>
                <p className="text-neutral-900 font-black leading-tight">
                  {sale?.deliveryRequest?.clientAddress || 'Direct Pickup / In-Gallery Collection'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Date</p>
                <p className="text-neutral-900 font-black">
                  {sale?.deliveryDate || sale?.deliveryRequest?.deliveryDate ? 
                    new Date(sale.deliveryDate || sale.deliveryRequest!.deliveryDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Handled at Branch'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Team</p>
                <p className="text-neutral-900 font-black">
                  {sale?.deliveryRequest?.extraPersonnelCount !== undefined 
                    ? (sale.deliveryRequest.extraPersonnelCount > 0 
                        ? `${sale.deliveryRequest.extraPersonnelCount} Extra Personnel` 
                        : 'Driver Only') 
                    : 'Standard Fulfillment'}
                </p>
              </div>
              {sale?.deliveryRequest?.carrier && (
                <div>
                  <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Carrier</p>
                  <p className="text-neutral-900 font-black">
                    {sale.deliveryRequest.carrier}
                  </p>
                </div>
              )}
              {sale?.deliveryRequest?.referenceNumber && (
                <div>
                  <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-0.5">Reference #</p>
                  <p className="text-neutral-900 font-black">
                    {sale.deliveryRequest.referenceNumber}
                  </p>
                </div>
              )}
              {sale?.deliveryRequest?.toolsNeeded && sale.deliveryRequest.toolsNeeded.length > 0 && (
                <div className="col-span-2 pt-1">
                  <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-1">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sale.deliveryRequest.toolsNeeded.map((tool, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-blue-100 rounded text-[9px] font-black text-blue-600 uppercase">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(displayStatus === ArtworkStatus.DELIVERED || displayStatus === ArtworkStatus.CANCELLED) && (
          <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-md flex items-start space-x-3 mt-4">
            <div className="text-neutral-400 mt-0.5">{ICONS.Shield}</div>
            <div>
              <p className="text-[11px] font-black text-neutral-900 uppercase tracking-tight">Record Finalized</p>
              <p className="text-[10px] text-neutral-500 font-bold leading-tight">This record is finalized due to its current status. Activity is restricted for audit integrity.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
