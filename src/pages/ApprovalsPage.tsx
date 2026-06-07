import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CreditCard, Truck, LayoutGrid, Rows3 } from 'lucide-react';
import SalesApprovalPage from './SalesApprovalPage';
import PaymentApprovalPage from './PaymentApprovalPage';

import { SaleRecord, Artwork, UserPermissions, SaleStatus, DeliveryRequestStatus } from '../types';

interface ApprovalsPageProps {
  sales: SaleRecord[];
  artworks: Artwork[];
  onApproveSale: (saleId: string, remarks?: string) => void;
  onDeclineSale: (saleId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeleteSales?: (ids: string[]) => void;
  onApprovePaymentEdit: (saleId: string, paymentId: string, remarks?: string) => void;
  onDeclinePaymentEdit: (saleId: string, paymentId: string, reason?: string, requestedFiles?: string[]) => void;
  onBulkDeletePayments?: (items: { saleId: string, paymentId: string }[]) => void;
  onUpdateSale?: (saleId: string, updates: Partial<SaleRecord>) => Promise<boolean>;
  userPermissions?: UserPermissions;
  currentUser?: any;
}

const ApprovalsPage: React.FC<ApprovalsPageProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales');
  const [subTab, setSubTab] = useState<'approval' | 'history'>('approval');

  const canAccessSales = (props.userPermissions?.accessibleTabs && Array.isArray(props.userPermissions.accessibleTabs))
    ? (props.userPermissions.accessibleTabs.includes('sales-approval') || props.userPermissions.accessibleTabs.includes('approvals'))
    : true;
  const canAccessPayments = (props.userPermissions?.accessibleTabs && Array.isArray(props.userPermissions.accessibleTabs))
    ? (props.userPermissions.accessibleTabs.includes('payment-approval') || props.userPermissions.accessibleTabs.includes('approvals'))
    : true;

  // Auto-switch if only one is accessible
  React.useEffect(() => {
    if (!canAccessSales && canAccessPayments) {
      setActiveTab('payments');
    }
  }, [canAccessSales, canAccessPayments]);

  const pendingSalesCount = props.sales.filter(s => s.status === SaleStatus.FOR_SALE_APPROVAL).length;
  const pendingPaymentsCount = props.sales.filter(s => 
    s.status === SaleStatus.FOR_PAYMENT_APPROVAL || 
    (s.installments || []).some((i: any) => i.isPending || i.pendingEdit)
  ).length;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      {/* Elegant Header Card */}
      <div className="bg-neutral-950 border border-neutral-900 p-6 rounded-md shadow-sm relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-4 bottom-0 text-[6rem] font-serif italic font-normal text-white/5 select-none pointer-events-none leading-none -mb-4">
          APPROVAL
        </div>
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.25em] text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Administrative Audit</span>
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight leading-tight">
            Finance <span className="font-serif italic text-white font-medium">Approval</span>
          </h1>
          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
            Manage administrative validations and financial verifications.
          </p>
        </div>
      </div>

      {/* Main Workspace Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Container Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-200">
          {/* Left Side: Category (Sales vs Payments) */}
          <div className="flex gap-1 p-1 bg-slate-200/60 rounded-lg border border-slate-200/40 w-fit">
            {canAccessSales && (
              <button
                onClick={() => setActiveTab('sales')}
                className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                  activeTab === 'sales'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShieldCheck size={14} />
                Sales
                {pendingSalesCount > 0 && (
                  <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full font-black">
                    {pendingSalesCount}
                  </span>
                )}
              </button>
            )}
            {canAccessPayments && (
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                  activeTab === 'payments'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <CreditCard size={14} />
                Payments
                {pendingPaymentsCount > 0 && (
                  <span className="ml-1 w-4 h-4 bg-indigo-600 text-white text-[8px] flex items-center justify-center rounded-full font-black">
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Right Side: Status Sub-Tabs */}
          <div className="flex gap-1 p-1 bg-slate-200/60 rounded-lg border border-slate-200/40 w-fit">
            <button
              onClick={() => setSubTab('approval')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] rounded-md transition-all flex items-center gap-2 ${
                subTab === 'approval' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setSubTab('history')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] rounded-md transition-all flex items-center gap-2 ${
                subTab === 'history' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Approval History
            </button>
          </div>
        </div>

        {/* Container Body */}
        <div className="p-6 min-h-[600px] bg-slate-50/20">
          <AnimatePresence mode="wait">
            {activeTab === 'sales' && canAccessSales ? (
              <motion.div
                key="sales"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <SalesApprovalPage
                  sales={props.sales}
                  artworks={props.artworks}
                  onApproveSale={props.onApproveSale}
                  onDeclineSale={props.onDeclineSale}
                  onBulkDeleteSales={props.onBulkDeleteSales}
                  userPermissions={props.userPermissions}
                  hideHeader={true}
                  externalActiveTab={subTab}
                />
              </motion.div>
            ) : activeTab === 'payments' && canAccessPayments ? (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PaymentApprovalPage
                  sales={props.sales}
                  artworks={props.artworks}
                  onApprovePaymentEdit={props.onApprovePaymentEdit}
                  onDeclinePaymentEdit={props.onDeclinePaymentEdit}
                  onBulkDeletePayments={props.onBulkDeletePayments}
                  userPermissions={props.userPermissions}
                  hideHeader={true}
                  externalActiveTab={subTab}
                />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                 <ShieldCheck size={48} strokeWidth={1} className="mb-4 opacity-20" />
                 <p className="text-sm font-bold uppercase tracking-widest">Access Restricted</p>
                 <p className="text-xs mt-1 italic">You do not have permission to view these records.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;
