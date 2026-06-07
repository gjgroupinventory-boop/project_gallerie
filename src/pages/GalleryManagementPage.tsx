import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExhibitionEvent, Artwork, SaleRecord, UserPermissions, ReturnRecord, FramerRecord, TransferRecord, UserAccount, ReturnType, ArtworkStatus, ImportRecord } from '../types';
import EventManagement from './EventManagement';
import AuctionManagement from './AuctionManagement';
import BranchManagement from './BranchManagement';
import Inventory from './Inventory';
import MonitoringSummaryPage from './MonitoringSummaryPage';
import ReturnToArtistView from '../components/ReturnToArtistView';
import FramerManagementView from '../components/FramerManagementView';
import ReservationsView from './ReservationsView';
import SalesView from '../components/SalesView';
import { Calendar, Building2, Sparkles, RotateCcw, Gavel, CalendarClock, Wrench, Calculator, Banknote, Leaf, Box } from 'lucide-react';
import { ICONS } from '../constants';

interface GalleryManagementPageProps {
  events: ExhibitionEvent[];
  artworks: Artwork[];
  allArtworksIncludingDeleted?: Artwork[];
  branches: string[];
  branchAddresses: Record<string, string>;
  branchCategories?: Record<string, string>;
  branchLogos?: Record<string, string>;
  exclusiveBranches?: string[];
  sales: SaleRecord[];
  returnRecords: ReturnRecord[];
  framerRecords?: FramerRecord[];
  transfers: TransferRecord[]; // Added
  currentUser: UserAccount | null; // Added
  onAddEvent: (event: Partial<ExhibitionEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, updates: Partial<ExhibitionEvent>) => void;
  onAddBranch: (name: string, isExclusive?: boolean, category?: string, logoUrl?: string) => void;
  onUpdateBranch: (oldName: string, newName: string, category?: string, address?: string, logoUrl?: string) => void;
  onDeleteBranch: (name: string) => void;
  onUpdateBranchAddress: (name: string, address: string) => void;
  onView: (id: string) => void;
  canAdd: boolean;
  onAddArtwork: (art: Partial<Artwork>) => void;
  onEditArtwork?: (id: string, updates: Partial<Artwork>) => void;
  onBulkAddArtworks?: (artworks: Partial<Artwork>[], filename?: string) => void;
  onBulkUpdateArtworks?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkSale?: (
    ids: string[],
    client: string,
    delivered: boolean | Record<string, boolean>,
    eventInfo?: { id: string; name: string },
    attachments?: { itdrUrl?: string | string[]; rsaUrl?: string | string[]; orCrUrl?: string | string[] },
    totalDownpayment?: number,
    clientEmail?: string,
    clientContact?: string,
    perArtworkDownpayments?: Record<string, number>,
    installmentsEnabled?: boolean,
    discountPercentage?: Record<string, number> | number,
    remarks?: string
  ) => void;
  onBulkTransferRequest?: (ids: string[], targetBranch: string, attachments?: { itdrUrl?: string | string[] }) => void;
  onBulkDeleteArtworks: (ids: string[]) => void;
  onBulkReserveArtworks: (ids: string[], details: string, expiryDate?: string, eventId?: string, eventName?: string) => void;
  onBulkCancelReservation?: (ids: string[]) => void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string) => void;
  onUpdateReturnRecord?: (id: string, updates: Partial<ReturnRecord>) => void;
  onBulkDeleteReturnRecords?: (ids: string[]) => void;
  onReturnToGallery?: (id: string, branch: string) => Promise<boolean | void>;
  onReturnFromFramer?: (id: string, branch: string) => void;
  onAddInstallment?: (saleId: string, amount: number, date: string, reference?: string) => void;
  onDeleteSale?: (saleId: string) => void | Promise<boolean | void>;
  onBulkSendToFramer?: (ids: string[], damageDetails: string, attachmentUrl?: string | string[]) => void;
  onBulkReturnArtwork?: (ids: string[], reason: string, returnType: ReturnType, referenceNumber?: string, proofImage?: string | string[], remarks?: string) => void;
  onDeleteFramerRecord?: (id: string) => void;
  preventDuplicates?: boolean;
  importLogs?: ImportRecord[];
  importedFilenames?: string[];
  initialTab?: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales';
  onNavigate?: (tab: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales') => void;
  userPermissions?: UserPermissions;
}

const GalleryManagementPage: React.FC<GalleryManagementPageProps> = (props) => {
  const { branchCategories = {} } = props;
  const isControlled = props.initialTab !== undefined;
  const [internalTab, setInternalTab] = useState<'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales'>('inventory');

  // Use prop if controlled, otherwise use internal state
  const activeTab = isControlled ? props.initialTab! : internalTab;

  const handleTabChange = (tab: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales') => {
    if (!isControlled) {
      setInternalTab(tab);
    }
    if (props.onNavigate) {
      props.onNavigate(tab);
    }
  };

  // Redirect to inventory if activeTab is restricted
  React.useEffect(() => {
    if (!props.userPermissions) return;

    const isRestricted =
      (activeTab === 'branches' && !(props.userPermissions.canViewOpsBranches ?? (props.userPermissions.canManageEvents || props.userPermissions.canAddArtwork))) ||
      (activeTab === 'events' && !(props.userPermissions.canViewOpsExhibitions ?? props.userPermissions.canManageEvents)) ||
      (activeTab === 'auctions' && !(props.userPermissions.canViewOpsAuctions ?? (props.userPermissions.canManageEvents && props.currentUser?.role !== 'Branch User'))) ||
      (activeTab === 'sales' && !(props.userPermissions.canViewOpsSales ?? props.userPermissions.canViewSalesHistory)) ||
      (activeTab === 'reservations' && !(props.userPermissions.canViewOpsReservations ?? props.userPermissions.canViewReserved)) ||
      (activeTab === 'inventory' && !(props.userPermissions.canViewOpsInventory ?? true)) ||
      (activeTab === 'returned' && !(props.userPermissions.canViewOpsReturnToArtist ?? props.userPermissions.canViewBackToArtist)) ||
      (activeTab === 'framer' && !(props.userPermissions.canViewOpsForFraming ?? props.userPermissions.canViewForFraming)) ||
      (activeTab === 'monitoring' && !(props.userPermissions.canViewOpsMonitoring ?? (props.userPermissions.canManageAccounts || props.userPermissions.canManageEvents)));

    if (isRestricted) {
      handleTabChange('inventory');
    }
  }, [activeTab, props.userPermissions, props.currentUser]);

  const filteredArtworks = useMemo(() => {
    return (props.artworks || []).filter(art => {
      // Filter out invalid/ghost artworks
      if (!art.id || !art.title) return false;

      // View Control Permissions
      const permissions = props.userPermissions;
      const canViewReserved = permissions?.canViewReserved ?? true;
      const canViewAuctioned = permissions?.canViewAuctioned ?? true;
      const canViewExhibit = permissions?.canViewExhibit ?? true;
      const canViewForFraming = permissions?.canViewForFraming ?? true;
      const canViewBackToArtist = permissions?.canViewBackToArtist ?? true;

      if (art.status === ArtworkStatus.RESERVED) {
        const isAuction = (art.remarks || '').includes('[Reserved For Auction:');
        const isEvent = (art.remarks || '').includes('[Reserved For Event:');

        if (isAuction) {
          if (!canViewAuctioned) return false;
        } else if (isEvent) {
          if (!canViewExhibit) return false;
        } else {
          if (!canViewReserved) return false;
        }
      } else if (art.status === ArtworkStatus.FOR_FRAMING) {
        if (!canViewForFraming) return false;
      } else if (art.status === ArtworkStatus.FOR_RETOUCH) {
        if (!canViewBackToArtist) return false;
      }

      return true;
    });
  }, [props.artworks, props.userPermissions]);

  const totalArtworks = filteredArtworks.length;
  const totalExhibitions = props.events.filter(e => !e.type || e.type === 'Exhibition').length;
  const totalAuctions = props.events.filter(e => e.type === 'Auction').length;
  const totalBranches = props.branches.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-black p-[1px] shadow-lg shadow-neutral-900/10">
        <div className="relative rounded-2xl bg-neutral-950 px-5 py-5 md:px-8 md:py-7 text-neutral-50">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-neutral-500/10 blur-3xl rounded-full" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-neutral-400/10 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-neutral-400">
                  <Sparkles size={12} className="mr-1.5 text-neutral-300" />
                  WORKSPACE
                </div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white leading-tight">
                  Gallery <span className="font-serif italic text-white font-medium">Operations</span>
                </h1>
                <p className="text-sm md:text-base text-neutral-400 max-w-xl font-serif italic">
                  Orchestrate branches, exhibitions, and inventory in one vivid cockpit.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                <div className="flex flex-col px-4 py-3 rounded-xl bg-white/5 border border-white/5 min-w-0 sm:min-w-[120px] hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 truncate">Artworks</span>
                  <span className="mt-1 text-xl font-black text-white">{totalArtworks.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-xl bg-white/5 border border-white/5 min-w-0 sm:min-w-[120px] hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 truncate">Branches</span>
                  <span className="mt-1 text-xl font-black text-white">{totalBranches.toLocaleString()}</span>
                </div>
                <div className="flex flex-col px-4 py-3 rounded-xl bg-white/5 border border-white/5 min-w-0 sm:min-w-[120px] hover:bg-white/10 transition-colors">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 truncate">Exhibitions</span>
                  <span className="mt-1 text-xl font-black text-white">{totalExhibitions.toLocaleString()}</span>
                </div>
                {props.currentUser?.role !== 'Branch User' && (
                  <div className="flex flex-col px-4 py-3 rounded-xl bg-white/5 border border-white/5 min-w-0 sm:min-w-[120px] hover:bg-white/10 transition-colors">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 truncate">Auctions</span>
                    <span className="mt-1 text-xl font-black text-white">{totalAuctions.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-400 self-start md:self-auto">
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -10, 15, 0],
                    y: [0, -1, 0, -1, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4, 
                    ease: "easeInOut" 
                  }}
                  className="inline-block shrink-0 origin-bottom"
                >
                  <Leaf size={13} className="fill-emerald-400/20 text-emerald-400" />
                </motion.div>
                <span>Life</span>
              </div>
              <div className="flex bg-neutral-900/50 border border-white/5 rounded-xl p-1 gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2 md:mx-0 md:px-1 pb-2 md:pb-1">
                {(props.userPermissions?.canViewOpsBranches ?? (props.userPermissions?.canManageEvents || props.userPermissions?.canAddArtwork)) && (
                  <button
                    onClick={() => handleTabChange('branches')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'branches'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-200 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-12 ${activeTab === 'branches' ? 'text-emerald-600' : 'text-emerald-400'}`}>
                      <Building2 size={18} />
                    </span>
                    <span>Branches</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsExhibitions ?? props.userPermissions?.canManageEvents) && (
                  <button
                    onClick={() => handleTabChange('events')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'events'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:-translate-y-0.5 ${activeTab === 'events' ? 'text-blue-600' : 'text-blue-400'}`}>
                      <Calendar size={18} />
                    </span>
                    <span>Exhibitions</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsAuctions ?? (props.userPermissions?.canManageEvents && props.currentUser?.role !== 'Branch User')) && (
                  <button
                    onClick={() => handleTabChange('auctions')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'auctions'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-45 ${activeTab === 'auctions' ? 'text-amber-600' : 'text-amber-400'}`}>
                      <Gavel size={18} />
                    </span>
                    <span>For Auction</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsSales ?? props.userPermissions?.canViewSalesHistory) && (
                  <button
                    onClick={() => handleTabChange('sales')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'sales'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:-translate-y-0.5 ${activeTab === 'sales' ? 'text-purple-600' : 'text-purple-400'}`}>
                      <Banknote size={18} />
                    </span>
                    <span>Sales</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsReservations ?? props.userPermissions?.canViewReserved) && (
                  <button
                    onClick={() => handleTabChange('reservations')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'reservations'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-[360deg] duration-700 ${activeTab === 'reservations' ? 'text-rose-600' : 'text-rose-400'}`}>
                      <CalendarClock size={18} />
                    </span>
                    <span>Reservations</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsInventory ?? true) && (
                  <button
                    onClick={() => handleTabChange('inventory')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'inventory'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-12 ${activeTab === 'inventory' ? 'text-indigo-600' : 'text-indigo-400'}`}>
                      <Box size={18} />
                    </span>
                    <span>Inventory</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsReturnToArtist ?? props.userPermissions?.canViewBackToArtist) && (
                  <button
                    onClick={() => handleTabChange('returned')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'returned'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-[-45deg] ${activeTab === 'returned' ? 'text-red-600' : 'text-red-400'}`}>
                      <RotateCcw size={18} />
                    </span>
                    <span>Return to Artist</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsForFraming ?? props.userPermissions?.canViewForFraming) && (
                  <button
                    onClick={() => handleTabChange('framer')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'framer'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:rotate-[30deg] ${activeTab === 'framer' ? 'text-teal-600' : 'text-teal-400'}`}>
                      <Wrench size={18} />
                    </span>
                    <span>For Framing</span>
                  </button>
                )}
                {(props.userPermissions?.canViewOpsMonitoring ?? (props.userPermissions?.canManageAccounts || props.userPermissions?.canManageEvents)) && (
                  <button
                    onClick={() => handleTabChange('monitoring')}
                    className={`group flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeTab === 'monitoring'
                      ? 'bg-white text-neutral-900 shadow-lg shadow-neutral-900/10'
                      : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <span className={`transition-all duration-300 group-hover:scale-115 group-hover:-rotate-12 ${activeTab === 'monitoring' ? 'text-cyan-600' : 'text-cyan-400'}`}>
                      <Calculator size={18} />
                    </span>
                    <span>Monitoring</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        {activeTab === 'monitoring' && (
          <MonitoringSummaryPage
            artworks={props.artworks}
            sales={props.sales}
            transfers={props.transfers}
            returns={props.returnRecords}
            currentUser={props.currentUser}
            onBack={() => handleTabChange('inventory')}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'inventory' && (
          <Inventory
            artworks={props.artworks}
            branches={props.branches}
            onView={props.onView}
            onAdd={props.onAddArtwork}
            onBulkAdd={props.onBulkAddArtworks}
            onBulkUpdate={props.onBulkUpdateArtworks}
            onBulkTransferRequest={props.onBulkTransferRequest}
            onBulkSale={props.onBulkSale}
            onAddBranch={props.onAddBranch}
            onEdit={props.onEditArtwork}
            onBulkDelete={props.onBulkDeleteArtworks}
            onBulkReserve={props.onBulkReserveArtworks}
            onAddToAuction={props.onAddToAuction}
            events={props.events}
            preventDuplicates={props.preventDuplicates}
            importLogs={props.importLogs}
            importedFilenames={props.importedFilenames}
            sales={props.sales}
            permissions={props.userPermissions}
            onBulkSendToFramer={props.onBulkSendToFramer}
            branchCategories={branchCategories}
            onBulkReturn={(ids, details) => {
              if (props.onBulkReturnArtwork) {
                props.onBulkReturnArtwork(
                  ids,
                  details.reason,
                  details.type as ReturnType,
                  details.refNumber,
                  details.proofImage,
                  details.remarks
                );
              }
            }}
          />
        )}
        {activeTab === 'events' && (
          <EventManagement
            events={props.events.filter(e => !e.type || e.type === 'Exhibition')}
            artworks={props.artworks}
            branches={props.branches}
            onAddEvent={props.onAddEvent}
            onDeleteEvent={props.onDeleteEvent}
            onUpdateEvent={props.onUpdateEvent}
            onViewArt={props.onView}
            canEdit={props.canAdd}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'auctions' && (
          <AuctionManagement
            events={props.events}
            artworks={props.artworks}
            branches={props.branches}
            onAddEvent={props.onAddEvent}
            onDeleteEvent={props.onDeleteEvent}
            onUpdateEvent={props.onUpdateEvent}
            onViewArt={props.onView}
            canEdit={props.canAdd}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'reservations' && (
          <ReservationsView
            artworks={props.artworks}
            onView={props.onView}
            onBulkCancel={props.onBulkCancelReservation}
            onBulkDelete={props.onBulkDeleteArtworks}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'branches' && (
          <BranchManagement
            branches={props.branches}
            exclusiveBranches={props.exclusiveBranches}
            branchAddresses={props.branchAddresses}
            branchCategories={branchCategories}
            branchLogos={props.branchLogos || {}}
            artworks={props.artworks}
            onAddBranch={props.onAddBranch}
            onUpdateBranch={props.onUpdateBranch}
            onDeleteBranch={props.onDeleteBranch}
            onUpdateBranchAddress={props.onUpdateBranchAddress}
            onViewArtwork={props.onView}
            events={props.events}
            onBulkSale={props.onBulkSale}
            onBulkReserve={props.onBulkReserveArtworks}
            onBulkTransferRequest={props.onBulkTransferRequest}
            onBulkDeleteArtworks={props.onBulkDeleteArtworks}
            onBulkUpdateArtworks={props.onBulkUpdateArtworks}
            onBulkSendToFramer={props.onBulkSendToFramer}
            onBulkReturnArtwork={props.onBulkReturnArtwork}
            onAddToAuction={props.onAddToAuction}
            onTabChange={handleTabChange}
            sales={props.sales}
            canEdit={props.canAdd}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'returned' && (
          <ReturnToArtistView
            returnRecords={props.returnRecords || []}
            artworks={props.allArtworksIncludingDeleted || []}
            onViewArtwork={props.onView}
            branches={props.branches}
            onUpdateReturnRecord={props.onUpdateReturnRecord}
            onReturnToGallery={props.onReturnToGallery}
            onBulkDeleteReturnRecords={props.onBulkDeleteReturnRecords}
            permissions={props.userPermissions}
            framerRecords={props.framerRecords || []}
            onReturnFromFramer={props.onReturnFromFramer}
            onDeleteFramerRecord={props.onDeleteFramerRecord}
            onTransfer={props.onBulkTransferRequest}
          />
        )}
        {activeTab === 'framer' && (
          <FramerManagementView
            framerRecords={props.framerRecords || []}
            artworks={props.allArtworksIncludingDeleted || []}
            branches={props.branches}
            onReturnFromFramer={props.onReturnFromFramer}
            onTransfer={props.onBulkTransferRequest}
            onViewArtwork={props.onView}
            onDeleteFramerRecord={props.onDeleteFramerRecord}
            permissions={props.userPermissions}
          />
        )}
        {activeTab === 'sales' && (
          <SalesView
            sales={props.sales || []}
            artworks={props.allArtworksIncludingDeleted || []}
            onViewArtwork={props.onView}
            branches={props.branches}
            permissions={props.userPermissions}
            onAddInstallment={props.onAddInstallment}
            onDeleteSale={props.onDeleteSale}
          />
        )}
      </div>
    </div>
  );
};

export default GalleryManagementPage;
