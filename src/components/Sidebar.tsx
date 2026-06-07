
import React, { useEffect, useState, useMemo } from 'react';
import { UserRole, UserPermissions } from '../types';
import { ICONS, getDefaultAccessibleTabs } from '../constants';
import {
  BarChart3,
  ShieldEllipsis,
  FileSpreadsheet,
  History,
  Settings2,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Package,
  CreditCard,
  MessageSquare,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  userPermissions?: UserPermissions;
  onOpenOperationsBranches?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  sales?: any[];
  currentUser?: any;
  transferRequests?: any[];
  returnRecords?: any[];
  onViewProfile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  groupId: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, userPermissions, onOpenOperationsBranches, isOpen = false, onClose, sales = [], currentUser, transferRequests = [], returnRecords = [], onViewProfile }) => {
  const menuGroups = [
    { id: 'main', label: 'Main' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'sales', label: 'Sales' },
    { id: 'management', label: 'Management' },
    { id: 'logs', label: 'Logs' }
  ];

  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard />, groupId: 'main' },
    { id: 'finance', label: 'Finance', icon: <CreditCard />, groupId: 'sales' },
    { id: 'analytics', label: 'Inventory Insights', icon: <BarChart3 />, groupId: 'inventory' },
    { id: 'artwork-transfer', label: 'Artwork T/R', icon: <ArrowRightLeft />, groupId: 'inventory' },
    { id: 'snapshots', label: 'Artwork Timeline', icon: <History />, groupId: 'inventory' },
    { id: 'approvals', label: 'Finance Approval', icon: <ShieldCheck />, groupId: 'sales' },
    { id: 'requests', label: 'My Requests', icon: <MessageSquare />, groupId: 'sales' },
    { id: 'sales-history', label: 'Sales History', icon: ICONS.Sales, groupId: 'sales' },
    { id: 'deliveries', label: 'Delivery Management', icon: ICONS.Truck, groupId: 'inventory' },
    { id: 'delivery-requests', label: 'Delivery Requests (Tab)', icon: <Package />, groupId: 'inventory' },
    { id: 'operations', label: 'Gallery Operations', icon: <Settings2 />, groupId: 'management' },
    { id: 'accounts', label: 'Branch Accounts', icon: ICONS.Users, groupId: 'management' },
    { id: 'audit-logs', label: 'System Audit Logs', icon: <ShieldEllipsis />, groupId: 'logs' },
    { id: 'import-history', label: 'Import History', icon: <FileSpreadsheet />, groupId: 'logs' }
  ];

  // Determine which tabs are visible based on granular permissions or role defaults
  let visibleTabIds = userPermissions?.accessibleTabs !== undefined
    ? userPermissions.accessibleTabs
    : getDefaultAccessibleTabs(userRole);

  // Ensure visibleTabIds is an array to prevent crashes with .includes
  if (!Array.isArray(visibleTabIds)) {
    visibleTabIds = getDefaultAccessibleTabs(userRole);
  }

  let menuItems = allMenuItems.filter(item => visibleTabIds.includes(item.id));

  // Legacy quirk removed: We now automatically hide Inventory if Operations is present to avoid redundancy.

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const storageKey = `sidebar-order-${userRole}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const hiddenStorageKey = 'sidebar-hidden-tabs';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadHidden = () => {
      const raw = window.localStorage.getItem(hiddenStorageKey);
      if (!raw) {
        const initial = ['analytics'];
        window.localStorage.setItem(hiddenStorageKey, JSON.stringify(initial));
        setHiddenIds(initial);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHiddenIds(parsed);
        else setHiddenIds([]);
      } catch {
        setHiddenIds([]);
      }
    };
    loadHidden();
    const handler = () => loadHidden();
    window.addEventListener('artisflow-hidden-tabs-changed', handler as any);
    return () => window.removeEventListener('artisflow-hidden-tabs-changed', handler as any);
  }, [hiddenStorageKey]);

  menuItems = menuItems.filter(item => !hiddenIds.includes(item.id));

  useEffect(() => {
    let menuIds = menuItems.map(item => item.id);
    let storedOrder: string[] | null = null;
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        try {
          storedOrder = JSON.parse(raw);
        } catch {
          storedOrder = null;
        }
      }
    }
    let nextOrder = storedOrder ? storedOrder.filter(id => menuIds.includes(id)) : menuIds;
    menuIds.forEach(id => {
      if (!nextOrder.includes(id)) {
        nextOrder = [...nextOrder, id];
      }
    });
    setOrderedIds(nextOrder);
  }, [storageKey, menuItems.length]);

  const orderedMenuItems = useMemo(() => {
    return (orderedIds.length > 0 ? orderedIds : menuItems.map(m => m.id))
      .map(id => menuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => item !== undefined);
  }, [orderedIds, menuItems]);

  const persistOrder = (order: string[]) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(order));
    }
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>, overId: string) => {
    event.preventDefault();
    if (!draggingId || draggingId === overId) return;
    setOrderedIds(prev => {
      const current = [...prev];
      const fromIndex = current.indexOf(draggingId);
      const toIndex = current.indexOf(overId);
      if (fromIndex === -1 || toIndex === -1) return current;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, draggingId);
      persistOrder(current);
      return current;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <aside className={`
      w-64 max-[1512px]:w-56 bg-white border-r border-neutral-200 text-neutral-700 flex flex-col h-full
      fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
    `}>
      {/* Brand Header */}
      <div className="px-6 py-7 border-b border-neutral-200">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 bg-neutral-900 text-white rounded-lg flex items-center justify-center font-serif italic font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-300">
            Gj
          </div>
          <div>
            <h1 className="text-xs font-semibold tracking-wider text-neutral-900 uppercase">
              Galerie <span className="font-serif italic text-neutral-400 capitalize">Joaquin</span>
            </h1>
            <p className="text-[9px] text-neutral-400 font-medium tracking-[0.15em] uppercase mt-0.5">Art Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto custom-scrollbar pb-10">
        {menuGroups.map((group) => {
          const groupItems = orderedMenuItems.filter((item): item is MenuItem => item.groupId === group.id);
          if (groupItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-2">
              <h3 className="px-3 text-[9px] font-bold text-neutral-400 uppercase tracking-[0.2em] select-none">
                {group.label}
              </h3>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'operations' && onOpenOperationsBranches) {
                           onOpenOperationsBranches();
                        }
                        setActiveTab(item.id);
                        if (window.innerWidth < 768 && onClose) {
                          onClose();
                        }
                      }}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(event) => handleDragOver(event, item.id)}
                      onDragEnd={handleDragEnd}
                      className={`
                        w-full flex items-center gap-2.5 pl-4.5 pr-3 py-2.5 rounded-lg group relative isolate text-left transition-all duration-300
                        ${isActive
                          ? 'text-neutral-900 font-bold'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50/50'
                        } ${draggingId === item.id ? 'opacity-70 bg-neutral-50/50' : ''}`}
                    >
                      {/* Accent left indicator line */}
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-neutral-900 rounded-r-md transition-all duration-300 origin-left ${
                        isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 group-hover:scale-y-75 group-hover:opacity-50'
                      }`} />

                      {/* Active sliding background pill */}
                      {isActive && (
                        <motion.div
                          layoutId="active-sidebar-pill"
                          className="absolute inset-0 bg-neutral-100 border border-neutral-200/50 rounded-lg -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}

                      <span className={`inline-block shrink-0 transition-all duration-300 ${
                        isActive ? 'text-neutral-900 scale-110' : 'text-neutral-400 group-hover:text-neutral-900 group-hover:scale-115 group-hover:rotate-6'
                      }`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 15 })}
                      </span>
                      <span className="text-[12px] tracking-wide flex-1 text-left font-medium whitespace-nowrap transition-transform duration-300 group-hover:translate-x-1.5">
                        {item.label}
                      </span>

                      {item.id === 'requests' && currentUser && (
                        (() => {
                          const count = sales.filter(s =>
                            (s.agentId === currentUser.id || s.agentName === currentUser.name) &&
                            s.status === 'Declined'
                          ).length;
                          return count > 0 ? (
                            <span className="relative flex items-center justify-center mr-1">
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                              />
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.75, ease: "easeOut" }}
                              />
                              <span className="relative px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-500/30 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                                {count}
                              </span>
                            </span>
                          ) : null;
                        })()
                      )}

                      {item.id === 'artwork-transfer' && (
                        (() => {
                          const isUserAdmin = userRole === UserRole.ADMIN;
                          const myBranch = currentUser?.branch;
                          const pendingTransfers = transferRequests.filter(t =>
                            t.status === 'Pending' &&
                            (isUserAdmin || t.toBranch === myBranch || t.fromBranch === myBranch)
                          ).length;
                          const openReturns = returnRecords.filter(r =>
                            r.status === 'Open' &&
                            (isUserAdmin || r.artworkSnapshot?.currentBranch === myBranch)
                          ).length;
                          const count = pendingTransfers + openReturns;
                          return count > 0 ? (
                            <span className="relative flex items-center justify-center mr-1">
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                              />
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.75, ease: "easeOut" }}
                              />
                              <span className="relative px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-500/30 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                                {count}
                              </span>
                            </span>
                          ) : null;
                        })()
                      )}

                      {item.id === 'approvals' && (
                        (() => {
                          const count = sales.filter(s =>
                            s.status === 'For Sale Approval' ||
                            s.status === 'For Payment Approval' ||
                            (s.installments || []).some((i: any) => i.isPending || i.pendingEdit)
                          ).length;
                          return count > 0 ? (
                            <span className="relative flex items-center justify-center mr-1">
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                              />
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.75, ease: "easeOut" }}
                              />
                              <span className="relative px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-500/30 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                                {count}
                              </span>
                            </span>
                          ) : null;
                        })()
                      )}

                      {item.id === 'deliveries' && (
                        (() => {
                          const count = sales.filter(s =>
                            s.status === 'Approved' &&
                            !s.isCancelled &&
                            !s.isDelivered &&
                            (s.deliveryRequest?.status === 'Pending' ||
                             !s.deliveryRequest?.status ||
                             s.deliveryRequest?.status === 'Approved')
                          ).length;
                          return count > 0 ? (
                            <span className="relative flex items-center justify-center mr-1">
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                              />
                              <motion.span
                                className="absolute inset-0 rounded bg-rose-500"
                                initial={{ scale: 1, opacity: 0.6 }}
                                animate={{ scale: 2.3, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.75, ease: "easeOut" }}
                              />
                              <span className="relative px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-500/30 text-[9px] font-extrabold uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.7)]">
                                {count}
                              </span>
                            </span>
                          ) : null;
                        })()
                      )}

                      {!isActive && (
                        <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
        <div 
          onClick={onViewProfile}
          className="flex items-center space-x-3 px-3 py-2.5 rounded-xl border border-neutral-200/50 bg-white hover:bg-neutral-50 hover:border-neutral-250 hover:shadow-sm transition-all duration-300 group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-850 to-neutral-700 flex items-center justify-center text-xs font-serif italic font-bold text-neutral-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
            {(currentUser?.name || currentUser?.fullName || userRole).substring(0, 1).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-neutral-800 truncate leading-none transition-colors group-hover:text-black">
              {currentUser?.name || currentUser?.fullName || 'Active User'}
            </p>
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1.5 truncate">
              {userRole} {currentUser?.branch ? `• ${currentUser.branch}` : ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
