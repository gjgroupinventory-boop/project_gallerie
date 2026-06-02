import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit2, MapPin, Building2, Search, Package, Sparkles, ArrowLeft, XCircle, AlertCircle, ShoppingBag, Calendar, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord, UserPermissions } from '../types';
import { PriceRangeFilter } from '../components/PriceRangeFilter';
import { BulkActionModal } from '../components/modals/BulkActionModal';
import { BRANCH_CATEGORIES } from '../constants';
import { OptimizedImage } from '../components/OptimizedImage';
import { formatDimensions } from '../utils/unitUtils';
import { useActionProcessing } from '../hooks/useActionProcessing';

// Import extracted sub-components
import { BranchFormModal } from '../components/branch/BranchFormModal';
import { BranchInventoryCart } from '../components/branch/BranchInventoryCart';
import { ArtistInventoryViewerModal } from '../components/branch/ArtistInventoryViewerModal';

interface BranchManagementProps {
  branches: string[];
  exclusiveBranches?: string[];
  branchAddresses?: Record<string, string>;
  branchCategories?: Record<string, string>;
  branchLogos?: Record<string, string>;
  artworks: Artwork[];
  onAddBranch: (name: string, isExclusive?: boolean, category?: string, logoUrl?: string) => void;
  onUpdateBranch: (oldName: string, newName: string, category?: string, address?: string, logoUrl?: string) => void;
  onDeleteBranch: (name: string) => void;
  onUpdateBranchAddress?: (name: string, address: string) => void;
  onViewArtwork?: (id: string) => void;
  events?: ExhibitionEvent[];
  onBulkSale?: (ids: string[], client: string, delivered: boolean, eventInfo?: { id: string; name: string }, attachments?: { itdrUrl?: string[]; rsaUrl?: string[]; orCrUrl?: string[] }, totalDownpayment?: number, clientEmail?: string, clientContact?: string, perArtworkDownpayments?: Record<string, number>, installmentsEnabled?: boolean, discountPercentage?: Record<string, number> | number, remarks?: string) => void;
  onBulkReserve?: (ids: string[], details: string, expiryDate?: string, eventId?: string, eventName?: string) => void;
  onBulkTransferRequest?: (ids: string[], targetBranch: string, attachments?: { itdrUrl?: string }) => void;
  onBulkDeleteArtworks?: (ids: string[]) => void;
  onBulkUpdateArtworks?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkSendToFramer?: (ids: string[], damageDetails: string, attachmentUrl?: string) => void;
  onBulkReturnArtwork?: (ids: string[], reason: string, returnType: any, referenceNumber?: string, proofImage?: string | string[], remarks?: string) => void;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string) => void;
  onTabChange?: (tab: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales') => void;
  sales?: SaleRecord[];
  canEdit?: boolean;
  permissions?: UserPermissions;
}

const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  exclusiveBranches,
  branchAddresses,
  branchCategories,
  branchLogos = {},
  artworks,
  onAddBranch,
  onUpdateBranch,
  onDeleteBranch,
  onUpdateBranchAddress,
  onViewArtwork,
  events,
  onBulkSale,
  onBulkReserve,
  onBulkTransferRequest,
  onBulkDeleteArtworks,
  onBulkUpdateArtworks,
  onBulkSendToFramer,
  onBulkReturnArtwork,
  onAddToAuction,
  onTabChange,
  sales,
  canEdit = true,
  permissions
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCategory, setBranchCategory] = useState(BRANCH_CATEGORIES[0]);
  const [branchLogo, setBranchLogo] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistStatusFilter, setArtistStatusFilter] = useState<ArtworkStatus | 'All' | 'Auction'>('All');
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const {
    isProcessing: isSyncing,
    processProgress: syncProgress,
    processMessage,
    wrapAction
  } = useActionProcessing({ itemTitle: 'Branches', itemCode: 'BRN' });

  const permittedArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
      if (!art.id || !art.title) return false;

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
  }, [artworks, permissions]);

  const priceStats = useMemo(() => {
    const branchArtworks = activeBranch ? permittedArtworks.filter(a => a.currentBranch === activeBranch) : [];
    const prices = branchArtworks.map(a => a.price || 0).filter(p => p > 0);

    if (prices.length === 0) return { min: 0, max: 100000, avg: 0 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const sum = prices.reduce((a, b) => a + b, 0);
    return { min, max, avg: Math.round(sum / prices.length) };
  }, [permittedArtworks, activeBranch]);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  React.useEffect(() => {
    if (priceStats.max > 0) {
      setPriceRange([priceStats.min, priceStats.max]);
    } else {
      setPriceRange([0, 100000]);
    }
  }, [priceStats.min, priceStats.max, activeBranch]);

  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkActionModal, setBulkActionModal] = useState<{ type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return' } | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState('');
  const [bulkClientEmail, setBulkClientEmail] = useState('');
  const [bulkClientContact, setBulkClientContact] = useState('');
  const [bulkHandlingAgentName, setBulkHandlingAgentName] = useState('');
  const [bulkSaleRemarks, setBulkSaleRemarks] = useState('');
  const [bulkSaleDiscounts, setBulkSaleDiscounts] = useState<Record<string, string>>({});
  
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    BRANCH_CATEGORIES.forEach(c => cats.add(c));
    Object.values(branchCategories || {}).forEach(c => {
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [branchCategories]);

  const [bulkDownpayment, setBulkDownpayment] = useState('');
  const [bulkSaleDownpayments, setBulkSaleDownpayments] = useState<Record<string, string>>({});
  const [bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled] = useState<Record<string, boolean>>({});
  const [bulkActionExtra, setBulkActionExtra] = useState(false);
  const [bulkSaleEventId, setBulkSaleEventId] = useState('');
  const [bulkTempItdr, setBulkTempItdr] = useState<string | string[] | null>(null);
  const [bulkTempRsa, setBulkTempRsa] = useState<string | string[] | null>(null);
  const [bulkTempOrCr, setBulkTempOrCr] = useState<string | string[] | null>(null);
  const [activeBulkAttachmentTab, setActiveBulkAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [reservationDetails, setReservationDetails] = useState('');
  const [reservationTab, setReservationTab] = useState<'person' | 'event' | 'auction'>('person');
  const [reservationClient, setReservationClient] = useState('');
  const [reservationEventId, setReservationEventId] = useState('');

  const [bulkFramerDamage, setBulkFramerDamage] = useState('');
  const [bulkReturnReason, setBulkReturnReason] = useState('');
  const [bulkReturnType, setBulkReturnType] = useState<'Artist Reclaim' | 'For Retouch'>('Artist Reclaim');
  const [bulkReturnRef, setBulkReturnRef] = useState('');
  const [bulkReturnNotes, setBulkReturnNotes] = useState('');
  const [reservationAuctionId, setReservationAuctionId] = useState('');
  const [reservationDays, setReservationDays] = useState(3);
  const [reservationHours, setReservationHours] = useState(0);
  const [reservationMinutes, setReservationMinutes] = useState(0);
  const [dateMonthFilter, setDateMonthFilter] = useState<string>('All');
  const [dateYearFilter, setDateYearFilter] = useState<string>('All');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [modalSearch, setModalSearch] = useState('');
  const [modalMedium, setModalMedium] = useState('All');
  const [modalYear, setModalYear] = useState('All');
  const [modalStatus, setModalStatus] = useState('All');
  const [modalSize, setModalSize] = useState('All');
  const [modalFramedSize, setModalFramedSize] = useState('All');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isExclusive, setIsExclusive] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; onConfirm?: () => void } | null>(null);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const filteredBranches = branches.filter(b =>
    b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedBranches = useMemo(() => {
    const groups: Record<string, string[]> = {};

    filteredBranches.forEach(branch => {
      let category = branchCategories?.[branch];

      if (category === undefined || category === null) {
        const brandParts = branch.split(' - ');
        if (brandParts.length > 1) {
          category = brandParts[0].trim();
        } else {
          const firstWord = branch.split(' ')[0];
          category = (firstWord && firstWord.length > 2) ? firstWord : 'Other';
        }
      }

      if (!category) category = 'Other';

      if (!groups[category]) {
        groups[category] = [branch];
      } else {
        groups[category].push(branch);
      }
    });

    return groups;
  }, [filteredBranches, branchCategories]);

  const activeCategories = useMemo(() => {
    const keys = Object.keys(groupedBranches).filter(cat => groupedBranches[cat].length > 0);
    return keys.sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;

      const idxA = BRANCH_CATEGORIES.indexOf(a);
      const idxB = BRANCH_CATEGORIES.indexOf(b);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [groupedBranches]);

  const getBranchArtworks = (branch: string) => permittedArtworks.filter(a => a.currentBranch === branch);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !branchName.trim()) return;

    await wrapAction(async () => {
      if (editingBranch) {
        onUpdateBranch(editingBranch, branchName, branchCategory, branchAddress.trim(), branchLogo || undefined);
      } else {
        onAddBranch(branchName, isExclusive, branchCategory, branchLogo || undefined);
        if (branchAddress.trim()) {
          onUpdateBranchAddress?.(branchName, branchAddress.trim());
        }
      }
      handleClose();
    }, editingBranch ? 'Updating Branch Record...' : 'Registering New Branch...');
  };

  const handleEdit = (branch: string) => {
    setEditingBranch(branch);
    setBranchName(branch);
    setBranchAddress(branchAddresses?.[branch] || '');

    let initialCategory = branchCategories?.[branch];
    if (!initialCategory || initialCategory === 'Other') {
      const brandParts = branch.split(' - ');
      if (brandParts.length > 1) {
        initialCategory = brandParts[0].trim();
      } else {
        const firstWord = branch.split(' ')[0];
        initialCategory = firstWord.length > 2 ? firstWord : 'Other';
      }
    }

    setBranchCategory(initialCategory || 'Gallery');
    setBranchLogo(branchLogos?.[branch] || null);
    setIsExclusive(exclusiveBranches?.includes(branch) || false);
    setIsModalOpen(true);
  };

  const handleDelete = async (branch: string) => {
    if (!canEdit) return;
    if (window.confirm(`Are you sure you want to delete "${branch}"? This might affect existing records.`)) {
      await wrapAction(async () => {
        onDeleteBranch(branch);
      }, `Decommissioning ${branch}...`);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchAddress('');
    setBranchCategory(BRANCH_CATEGORIES[0]);
    setBranchLogo(null);
    setIsExclusive(false);
  };

  const handleDeleteArtwork = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const canDelete = permissions ? permissions.canDeleteArtwork : canEdit;
    if (!canDelete || !onBulkDeleteArtworks) return;

    if (window.confirm('Are you sure you want to permanently delete this artwork? This action cannot be undone.')) {
      wrapAction(async () => {
        onBulkDeleteArtworks([id]);
      }, 'Deleting artwork...');
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const hasPermission = permissions
      ? (permissions.canDeleteArtwork || permissions.canSellArtwork || permissions.canReserveArtwork || permissions.canTransferArtwork || permissions.canEditArtwork)
      : canEdit;
    if (!hasPermission) return;
    setSelectedArtworkIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllForArtist = (arts: Artwork[]) => {
    const hasPermission = permissions
      ? (permissions.canDeleteArtwork || permissions.canSellArtwork || permissions.canReserveArtwork || permissions.canTransferArtwork || permissions.canEditArtwork)
      : canEdit;
    if (!hasPermission) return;
    const ids = arts.map(a => a.id);
    const allSelected = ids.every(id => selectedArtworkIds.includes(id));
    if (allSelected) {
      setSelectedArtworkIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedArtworkIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleCloseBranchModal = () => {
    setActiveBranch(null);
    setSelectedArtist(null);
    setArtistStatusFilter('All');
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setReservationDetails('');
    setArtistFilter('All');
    setMediumFilter('All');
    setModalSize('All');
    setReservationDays(3);
    setReservationHours(0);
    setReservationMinutes(0);
    setModalSearch('');
    setModalMedium('All');
    setModalYear('All');
  };

  const handleCloseBulkModal = () => {
    setBulkActionModal(null);
    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setBulkTempItdr(null);
    setBulkTempRsa(null);
    setBulkTempOrCr(null);
    setActiveBulkAttachmentTab('itdr');
    setReservationDetails('');
    setReservationTab('person');
    setReservationClient('');
    setReservationEventId('');
    setReservationDays(3);
    setReservationHours(0);
    setReservationMinutes(0);
    setBulkSaleEventId('');
    setBulkFramerDamage('');
    setBulkReturnReason('');
    setBulkReturnNotes('');
    setBulkReturnRef('');
  };

  const validateBulkAction = (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => {
    const selectedArtworks = permittedArtworks.filter(a => selectedArtworkIds.includes(a.id));
    if (type === 'sale') {
      const alreadySold = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED || a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      if (alreadySold.length > 0) {
        return {
          valid: false,
          title: 'Cannot Process Sale',
          message: `${alreadySold.length} of the selected items cannot be sold (Sold, Delivered, or Exclusive View Only).\n\nPlease deselect these items before processing a sale.`
        };
      }
    }
    if (type === 'reserve' || type === 'auction') {
      const notReservable = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED || a.status === ArtworkStatus.CANCELLED || a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      if (notReservable.length > 0) {
        return {
          valid: false,
          title: type === 'auction' ? 'Cannot Add to Auction' : 'Cannot Reserve Items',
          message: `${notReservable.length} of the selected items cannot be ${type === 'auction' ? 'added to auction' : 'reserved'} because they are Sold, Delivered, Cancelled, or Exclusive View Only.\n\nOnly Available items can be used.`
        };
      }
    }
    if (type === 'transfer') {
      const locked = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED);
      if (locked.length > 0) {
        return {
          valid: false,
          title: 'Cannot Transfer Items',
          message: `${locked.length} of the selected items are Sold or Delivered and cannot be transferred.`
        };
      }
    }
    if (type === 'framer') {
      const locked = selectedArtworks.filter(a => a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED);
      if (locked.length > 0) {
        return {
          valid: false,
          title: 'Cannot Send to Framer',
          message: `${locked.length} of the selected items are Sold or Delivered. Please ensure only Available artworks are sent for framing.`
        };
      }
    }
    return { valid: true };
  };

  const handleBulkActionClick = (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'auction' | 'framer' | 'return') => {
    if (selectedArtworkIds.length === 0) {
      setErrorModal({
        title: 'No items selected',
        message: 'Please select at least one artwork in the cart before applying an action.'
      });
      return;
    }

    const validation = validateBulkAction(type);
    if (!validation.valid && validation.message) {
      setErrorModal({
        title: validation.title || 'Please review selection',
        message: validation.message + '\n\nDo you want to proceed anyway?',
        onConfirm: () => {
          setErrorModal(null);
          setBulkActionValue('');
          setReservationDetails('');
          setBulkFramerDamage('');
          setBulkReturnReason('');
          setBulkReturnRef('');
          setBulkReturnNotes('');

          if (type === 'auction') {
            setReservationTab('auction');
            setBulkActionModal({ type: 'reserve' });
          } else {
            setReservationTab('person');
            setBulkActionModal({ type: type as any });
          }
          setIsCartOpen(true);
        }
      });
      return;
    }

    setBulkActionValue('');
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkDownpayment('');
    setBulkSaleDownpayments({});
    setBulkSaleInstallmentsEnabled({});
    setBulkActionExtra(false);
    setReservationDetails('');
    setBulkFramerDamage('');
    setBulkReturnReason('');
    setBulkReturnRef('');
    setBulkReturnNotes('');

    if (type === 'auction') {
      setReservationTab('auction');
      setBulkActionModal({ type: 'reserve' });
    } else {
      setReservationTab('person');
      setBulkActionModal({ type: type as any });
    }
    setIsCartOpen(true);
  };

  const handleBulkActionSubmit = async (targetTabInput?: any) => {
    if (!bulkActionModal || selectedArtworkIds.length === 0) return;

    let targetTab: any = typeof targetTabInput === 'string' ? targetTabInput : null;

    if (!targetTab) {
      if (bulkActionModal.type === 'sale') targetTab = 'sales';
      else if (bulkActionModal.type === 'reserve') targetTab = 'reservations';
      else if (bulkActionModal.type === 'framer') targetTab = 'framer';
      else if (bulkActionModal.type === 'return') targetTab = 'returned';
      else if (bulkActionModal.type === 'transfer') targetTab = 'inventory';
      else targetTab = 'inventory';
    }

    await wrapAction(async () => {
      const bulkItdrList = Array.isArray(bulkTempItdr) ? bulkTempItdr : bulkTempItdr ? [bulkTempItdr] : [];
      const bulkRsaList = Array.isArray(bulkTempRsa) ? bulkTempRsa : bulkTempRsa ? [bulkTempRsa] : [];
      const bulkOrCrList = Array.isArray(bulkTempOrCr) ? bulkTempOrCr : bulkTempOrCr ? [bulkTempOrCr] : [];
      const primaryBulkItdr = bulkItdrList[0];

      switch (bulkActionModal.type) {
        case 'sale':
          if (onBulkSale && bulkActionValue) {
            const selectedEvent = events?.find(e => e.id === bulkSaleEventId);
            const downpaymentAmount = bulkDownpayment ? parseFloat(bulkDownpayment.replace(/,/g, '')) : undefined;
            const perArtworkDownpayments = Object.fromEntries(
              Object.entries(bulkSaleDownpayments)
                .map(([artworkId, value]) => [artworkId, parseFloat(value.replace(/,/g, ''))] as const)
                .filter(([, value]) => !Number.isNaN(value) && value > 0)
            );

            const discountPcts: Record<string, number> = {};
            selectedArtworkIds.forEach(id => {
              const discountPctString = bulkSaleDiscounts[id] || '';
              const discountPct = discountPctString ? parseFloat(discountPctString) : 0;
              if (discountPct > 0) {
                discountPcts[id] = discountPct;
              }

              // Ensure items not marked as downpayment get their SRP (discounted if applicable)
              if (!bulkSaleInstallmentsEnabled[id] && !perArtworkDownpayments[id]) {
                const art = permittedArtworks.find(a => a.id === id);
                if (art) {
                  const discountedPrice = discountPct > 0 ? Math.round(art.price * (1 - discountPct / 100)) : art.price;
                  perArtworkDownpayments[id] = discountedPrice;
                }
              }
            });

            const hasInstallments = Object.values(bulkSaleInstallmentsEnabled).some(v => v);
            const fullRemarks = bulkSaleRemarks.trim()
              ? `${bulkSaleRemarks.trim()} | Handling Agent: ${bulkHandlingAgentName.trim()}`
              : `Handling Agent: ${bulkHandlingAgentName.trim()}`;

            await Promise.resolve(onBulkSale(selectedArtworkIds, bulkActionValue, bulkActionExtra,
              selectedEvent ? { id: selectedEvent.id, name: selectedEvent.title } : undefined,
              {
                itdrUrl: bulkItdrList.length > 0 ? bulkItdrList : undefined,
                rsaUrl: bulkRsaList.length > 0 ? bulkRsaList : undefined,
                orCrUrl: bulkOrCrList.length > 0 ? bulkOrCrList : undefined
              },
              downpaymentAmount,
              bulkClientEmail || undefined,
              bulkClientContact || undefined,
              Object.keys(perArtworkDownpayments).length > 0 ? perArtworkDownpayments : undefined,
              hasInstallments,
              Object.keys(discountPcts).length > 0 ? discountPcts : undefined,
              fullRemarks
            ));
            setBulkTempItdr(null);
            setBulkTempRsa(null);
            setBulkTempOrCr(null);
            setActiveBulkAttachmentTab('itdr');
            setBulkSaleEventId('');
          }
          break;
        case 'reserve':
          if (reservationTab === 'auction') {
            if (onAddToAuction && reservationAuctionId) {
              const auctionEvent = events?.find(e => e.id === reservationAuctionId);
              const auctionName = auctionEvent ? auctionEvent.title : 'Auction';
              await Promise.resolve(onAddToAuction(selectedArtworkIds, reservationAuctionId, auctionName));
            }
          } else if (onBulkReserve) {
            let details = '';
            if (reservationTab === 'person') {
              if (!reservationClient.trim()) {
                throw new Error('Please enter a client name.');
              }
              details = `Type: Person | Target: ${reservationClient} | Notes: ${reservationDetails}`;
            } else {
              if (!reservationEventId) {
                throw new Error('Please select an event.');
              }
              const event = events?.find(e => e.id === reservationEventId);
              const eventName = event ? event.title : 'Unknown Event';
              details = `Type: Event | Target: ${eventName} | Notes: ${reservationDetails}`;
            }

            let expiryDate: string | undefined = undefined;
            if (reservationTab === 'person' && (reservationDays > 0 || reservationHours > 0 || reservationMinutes > 0)) {
              const now = new Date();
              const expiry = new Date(now.getTime() + (reservationDays * 24 * 60 * 60 * 1000) + (reservationHours * 60 * 60 * 1000) + (reservationMinutes * 60 * 1000));
              expiryDate = expiry.toISOString();
            }

            await Promise.resolve(onBulkReserve(selectedArtworkIds, details, expiryDate, reservationTab === 'event' ? reservationEventId : undefined, reservationTab === 'event' ? (events?.find(e => e.id === reservationEventId)?.title) : undefined));
          }
          break;
        case 'transfer':
          if (onBulkTransferRequest && bulkActionValue) {
            await Promise.resolve(onBulkTransferRequest(selectedArtworkIds, bulkActionValue, { itdrUrl: primaryBulkItdr || undefined }));
            setBulkTempItdr(null);
            setBulkTempRsa(null);
            setBulkTempOrCr(null);
            setActiveBulkAttachmentTab('itdr');
          } else if (onBulkUpdateArtworks && bulkActionValue) {
            const updates: Partial<Artwork> = { currentBranch: bulkActionValue as Branch };
            const isTargetExclusive = exclusiveBranches?.includes(bulkActionValue);
            const isSourceExclusive = activeBranch && exclusiveBranches?.includes(activeBranch);
            if (isTargetExclusive) {
              updates.status = ArtworkStatus.EXCLUSIVE_VIEW_ONLY;
            } else if (isSourceExclusive) {
              updates.status = ArtworkStatus.AVAILABLE;
            }
            await Promise.resolve(onBulkUpdateArtworks(selectedArtworkIds, updates));
          }
          break;
        case 'delete':
          if (onBulkDeleteArtworks) {
            await Promise.resolve(onBulkDeleteArtworks(selectedArtworkIds));
          }
          break;
        case 'framer':
          if (onBulkSendToFramer && bulkFramerDamage.trim()) {
            await Promise.resolve(onBulkSendToFramer(selectedArtworkIds, bulkFramerDamage, primaryBulkItdr || undefined));
          }
          break;
        case 'return':
          if (onBulkReturnArtwork && bulkReturnReason.trim()) {
            await Promise.resolve(onBulkReturnArtwork(selectedArtworkIds, bulkReturnReason, bulkReturnType, bulkReturnRef || undefined, primaryBulkItdr || undefined, bulkReturnNotes || undefined));
          }
          break;
      }

      setBulkActionModal(null);
      setSelectedArtworkIds([]);
      setBulkActionValue('');
      setBulkClientEmail('');
      setBulkClientContact('');
      setBulkHandlingAgentName('');
      setBulkSaleRemarks('');
      setBulkSaleDiscounts({});
      setBulkDownpayment('');
      setBulkSaleDownpayments({});
      setBulkSaleInstallmentsEnabled?.({});
      setBulkActionExtra(false);
      setReservationDetails('');
      setReservationTab('person');
      setReservationClient('');
      setBulkTempItdr(null);
      setBulkTempRsa(null);
      setBulkTempOrCr(null);
      setActiveBulkAttachmentTab('itdr');
      setBulkFramerDamage('');
      setBulkReturnReason('');
      setBulkReturnRef('');
      setBulkReturnNotes('');
      setIsCartOpen(false);

      if (onTabChange) {
        onTabChange(targetTab);
      }
    }, `Synchronizing Bulk ${bulkActionModal.type.charAt(0).toUpperCase() + bulkActionModal.type.slice(1)} Workflow...`);
  };

  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return { y, m };
    }
    const base = art.createdAt || String(art.year || '');
    const d = new Date(base);
    if (!isNaN(d.getTime())) {
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    const ym = base.match(/^(\d{4})[-\/](\d{1,2})$/);
    if (ym) return { y: parseInt(ym[1], 10), m: parseInt(ym[2], 10) };
    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };
    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };

  const now = new Date();

  const totalBranches = branches.length;
  const totalArtworks = permittedArtworks.length;
  const totalAvailable = permittedArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const uniqueArtists = Array.from(new Set(permittedArtworks.map(a => a.artist))).length;

  const rawBranchArtworks = activeBranch ? getBranchArtworks(activeBranch) : [];

  const branchArtists = React.useMemo(() =>
    Array.from(new Set(rawBranchArtworks.map(a => a.artist).filter(Boolean))).sort(),
    [rawBranchArtworks]
  );

  const branchMediums = React.useMemo(() =>
    Array.from(new Set(rawBranchArtworks.map(a => a.medium).filter(Boolean))).sort(),
    [rawBranchArtworks]
  );

  const activeBranchArtworks = rawBranchArtworks.filter(art => {
    if (artistFilter !== 'All' && art.artist !== artistFilter) return false;

    if (statusFilter !== 'All') {
      if (statusFilter === 'Sold/Delivered') {
        if (art.status !== ArtworkStatus.SOLD && art.status !== ArtworkStatus.DELIVERED) return false;
      } else if (art.status !== statusFilter) {
        return false;
      }
    }

    if (mediumFilter !== 'All' && art.medium !== mediumFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = art.title.toLowerCase().includes(q);
      const matchesId = art.id.toLowerCase().includes(q);
      const matchesDim = art.dimensions?.toLowerCase().includes(q);
      const matchesArtist = art.artist.toLowerCase().includes(q);
      if (!matchesTitle && !matchesId && !matchesDim && !matchesArtist) return false;
    }

    const price = art.price || 0;
    if (price < priceRange[0] || price > priceRange[1]) return false;

    if (dateYearFilter === 'All' && dateMonthFilter === 'All') return true;
    const { y, m } = getArtYearMonth(art);
    if (dateYearFilter !== 'All' && dateMonthFilter !== 'All') {
      const fy = parseInt(dateYearFilter, 10);
      const fm = parseInt(dateMonthFilter, 10);
      return y === fy && m === fm;
    }
    if (dateYearFilter !== 'All') {
      const fy = parseInt(dateYearFilter, 10);
      return y === fy;
    }
    if (dateMonthFilter !== 'All') {
      const fm = parseInt(dateMonthFilter, 10);
      return m === fm;
    }
    return true;
  });

  const availableYearOptions: number[] = [];
  for (let year = now.getFullYear(); year >= 2000; year--) {
    availableYearOptions.push(year);
  }

  const branchTotalItems = activeBranchArtworks.length;
  const branchAvailableCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.AVAILABLE).length;
  const branchReservedCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.RESERVED).length;
  const branchSoldCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.SOLD).length;
  const branchDeliveredCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.DELIVERED).length;
  const branchCancelledCount = activeBranchArtworks.filter(a => a.status === ArtworkStatus.CANCELLED).length;
  const branchAvailableValue = activeBranchArtworks
    .filter(a => a.status === ArtworkStatus.AVAILABLE)
    .reduce((sum, art) => sum + (art.price || 0), 0);

  const activeBranchAddress = activeBranch ? branchAddresses?.[activeBranch] : undefined;

  const cartArtworks = useMemo(() => {
    const rawCart = permittedArtworks.filter(a => selectedArtworkIds.includes(String(a.id)));
    return Array.from(new Map(rawCart.map(item => [String(item.id), item])).values());
  }, [permittedArtworks, selectedArtworkIds]);

  const cartItemCount = cartArtworks.length;
  const cartTotalValue = useMemo(
    () => cartArtworks.reduce((sum, art) => sum + (art.price || 0), 0),
    [cartArtworks]
  );

  const availableForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.AVAILABLE
      )
      : [];
  const reservedForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.RESERVED
      )
      : [];
  const soldForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a =>
          a.artist === selectedArtist &&
          (a.status === ArtworkStatus.SOLD || a.status === ArtworkStatus.DELIVERED)
      )
      : [];

  const exclusiveForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.EXCLUSIVE_VIEW_ONLY
      )
      : [];

  const retouchForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.FOR_RETOUCH
      )
      : [];

  const framerForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && a.status === ArtworkStatus.FOR_FRAMING
      )
      : [];

  const auctionForArtist =
    selectedArtist
      ? activeBranchArtworks.filter(
        a => a.artist === selectedArtist && events?.some(e => e.type === 'Auction' && e.artworkIds.includes(a.id))
      )
      : [];

  const getCurrentList = () => {
    const artistArts = selectedArtist ? activeBranchArtworks.filter(a => a.artist === selectedArtist) : [];

    switch (artistStatusFilter) {
      case 'All': return artistArts;
      case ArtworkStatus.AVAILABLE: return availableForArtist;
      case ArtworkStatus.RESERVED: return reservedForArtist;
      case ArtworkStatus.SOLD: return soldForArtist;
      case ArtworkStatus.EXCLUSIVE_VIEW_ONLY: return exclusiveForArtist;
      case ArtworkStatus.FOR_RETOUCH: return retouchForArtist;
      case ArtworkStatus.FOR_FRAMING: return framerForArtist;
      case 'Auction': return auctionForArtist;
      default: return availableForArtist;
    }
  };

  const currentList = getCurrentList();

  const filteredCurrentList = useMemo(() => {
    let list = currentList;

    if (showSelectedOnly) {
      list = list.filter(a => selectedArtworkIds.includes(a.id));
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.id || '').toLowerCase().includes(q)
      );
    }
    if (modalStatus !== 'All') {
      list = list.filter(a => a.status === modalStatus);
    }
    if (modalMedium !== 'All') {
      list = list.filter(a => a.medium === modalMedium);
    }
    if (modalYear !== 'All') {
      list = list.filter(a => {
        const d = new Date(a.date || a.createdAt);
        return !isNaN(d.getTime()) && d.getFullYear().toString() === modalYear;
      });
    }
    if (modalSize !== 'All') {
      list = list.filter(a => a.dimensions === modalSize);
    }
    if (modalFramedSize !== 'All') {
      list = list.filter(a => a.sizeFrame === modalFramedSize);
    }

    return Array.from(
      new Map(list.map((art) => [art.id, art])).values()
    );
  }, [currentList, modalSearch, modalStatus, modalMedium, modalYear, modalSize, modalFramedSize, showSelectedOnly, selectedArtworkIds]);

  const modalUniqueMediums = useMemo(() => Array.from(new Set(currentList.map(a => a.medium).filter((m): m is string => Boolean(m)))).sort(), [currentList]);
  const modalUniqueYears = useMemo(() => Array.from(new Set(currentList.map(a => {
    const d = new Date(a.date || a.createdAt);
    return !isNaN(d.getTime()) ? d.getFullYear().toString() : '';
  }).filter((y): y is string => Boolean(y)))).sort().reverse(), [currentList]);
  const modalUniqueStatuses = useMemo(() => Array.from(new Set(currentList.map(a => a.status as string).filter((s): s is string => Boolean(s)))).sort(), [currentList]);
  const modalUniqueSizes = useMemo(() => Array.from(new Set(currentList.map(a => a.dimensions).filter((d): d is string => Boolean(d)))).sort(), [currentList]);
  const modalUniqueFramedSizes = useMemo(() => Array.from(new Set(currentList.map(a => a.sizeFrame).filter((f): f is string => Boolean(f)))).sort(), [currentList]);

  const allSelectedForArtist =
    filteredCurrentList.length > 0 &&
    filteredCurrentList.every(a => selectedArtworkIds.includes(a.id));

  React.useEffect(() => {
    if (!selectedArtist) return;

    const currentCount =
      artistStatusFilter === 'All' ? (availableForArtist.length + reservedForArtist.length + soldForArtist.length + exclusiveForArtist.length + retouchForArtist.length + framerForArtist.length) :
        artistStatusFilter === ArtworkStatus.AVAILABLE ? availableForArtist.length :
          artistStatusFilter === ArtworkStatus.RESERVED ? reservedForArtist.length :
            artistStatusFilter === ArtworkStatus.SOLD ? soldForArtist.length :
              artistStatusFilter === ArtworkStatus.EXCLUSIVE_VIEW_ONLY ? exclusiveForArtist.length :
                artistStatusFilter === ArtworkStatus.FOR_RETOUCH ? retouchForArtist.length :
                  artistStatusFilter === ArtworkStatus.FOR_FRAMING ? framerForArtist.length :
                    artistStatusFilter === 'Auction' ? auctionForArtist.length : 0;

    if (currentCount === 0) {
      if (availableForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.AVAILABLE);
      else if (reservedForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.RESERVED);
      else if (soldForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.SOLD);
      else if (exclusiveForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.EXCLUSIVE_VIEW_ONLY);
      else if (retouchForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.FOR_RETOUCH);
      else if (framerForArtist.length > 0) setArtistStatusFilter(ArtworkStatus.FOR_FRAMING);
      else if (auctionForArtist.length > 0) setArtistStatusFilter('Auction');
    }
  }, [
    selectedArtist,
    artistStatusFilter,
    availableForArtist.length,
    reservedForArtist.length,
    soldForArtist.length,
    exclusiveForArtist.length,
    retouchForArtist.length,
    framerForArtist.length,
    auctionForArtist.length
  ]);

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-md bg-gradient-to-r from-neutral-200 via-neutral-100 to-white p-[1px] shadow-xl shadow-neutral-200/50">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white text-neutral-900 rounded-md px-8 py-7">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-24 w-64 h-64 bg-neutral-100 blur-3xl rounded-md" />
            <div className="absolute -left-16 -bottom-24 w-72 h-72 bg-neutral-50 blur-3xl rounded-md" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                <Sparkles size={12} className="mr-1.5" />
                Administration
              </span>
              <span className="hidden md:inline-block h-px w-10 bg-neutral-200"></span>
              <span className="hidden md:inline-block text-[11px] font-semibold text-neutral-500">
                Design a vibrant network of ArtisFlow locations.
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900">
              Branch Management
            </h1>
            <p className="text-sm md:text-base text-neutral-500 max-w-2xl">
              Curate galleries, warehouses, and private collections in one colorful control room.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-end gap-3">
            <div className="flex items-center space-x-2 rounded-sm bg-emerald-100 px-3 py-1 border border-emerald-200 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse" />
              <span>Operations Live</span>
            </div>
            {canEdit && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-md bg-neutral-900 text-white text-sm font-black shadow-lg shadow-neutral-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-sm bg-white text-neutral-900">
                  <Plus size={16} />
                </span>
                <span>Launch New Branch</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Active Branches</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalBranches}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Building2 size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Total Artworks</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalArtworks}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Package size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Ready To Exhibit</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{totalAvailable}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <Sparkles size={18} />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-neutral-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Artists Represented</p>
              <p className="mt-1 text-2xl font-black text-neutral-900">{uniqueArtists}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 shadow-sm">
              <MapPin size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-md border border-neutral-200/80 shadow-xl shadow-neutral-200/50 overflow-hidden">
        <div className="p-6 border-b border-neutral-100/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/80">
          <div>
            <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
              Active Locations
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                {branches.length} in network
              </span>
            </h3>
            <p className="text-[12px] text-neutral-500 mt-1">
              Drag open a branch to explore artists and pieces on site.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search branches, cities, spaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 shadow-sm"
            />
          </div>
        </div>

        <div className="p-10 space-y-12">
          {filteredBranches.length > 0 ? (
            activeCategories.map(category => {
              const categoryBranches = groupedBranches[category];
              const isSearchActive = searchTerm.trim().length > 0;
              const isCollapsed = isSearchActive ? false : (collapsedCategories[category] ?? false);

              return (
                <div key={category} className="space-y-4">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedCategories(prev => ({
                        ...prev,
                        [category]: !(prev[category] ?? false)
                      }))
                    }
                    className="w-full flex items-center justify-between rounded-md px-2 py-2 text-left hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                        {category}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {categoryBranches.length}
                      </span>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-neutral-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2">
                      {categoryBranches.map((branch) => {
                        const branchArtworks = getBranchArtworks(branch);

                        return (
                          <div key={branch} className="group relative">
                            <div
                              className="p-4 flex items-center justify-between rounded-md hover:bg-neutral-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-neutral-100"
                              onClick={() => {
                                setActiveBranch(branch);
                                setSelectedArtist(null);
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-4">
                                  {branchLogos?.[branch] ? (
                                    <div className="w-10 h-10 rounded-sm overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                                      <OptimizedImage src={branchLogos[branch]} alt={branch} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-sm bg-neutral-100 flex items-center justify-center text-neutral-400 flex-shrink-0 border border-neutral-100">
                                      <Building2 size={18} />
                                    </div>
                                  )}
                                  <span className="text-lg text-neutral-800 font-semibold group-hover:text-black transition-colors">
                                    {branch}
                                  </span>
                                  {exclusiveBranches?.includes(branch) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
                                      Exclusive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-neutral-400 font-medium mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-neutral-300" />
                                    <span className="truncate max-w-[400px]">{branchAddresses?.[branch] || 'No Address Listed'}</span>
                                  </div>
                                  <span>•</span>
                                  <div className="flex items-center gap-1.5">
                                    <Package size={12} className="text-neutral-300" />
                                    <span>{branchArtworks.length} items on site</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                {canEdit && (
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(branch);
                                      }}
                                      className="p-2.5 text-neutral-400 hover:text-neutral-900 hover:bg-white rounded-sm transition-all border border-transparent hover:border-neutral-200 shadow-sm hover:shadow-md"
                                      title="Edit Details"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(branch);
                                      }}
                                      className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-all border border-transparent hover:border-red-100"
                                      title="Delete Location"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                )}
                                <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-neutral-50 rounded-sm flex items-center justify-center mb-4">
                <Search size={24} className="text-neutral-300" />
              </div>
              <p className="text-neutral-400 font-medium">No locations found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {errorModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-neutral-900">{errorModal.title}</h3>
              <button
                onClick={() => setErrorModal(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl flex items-start gap-3 bg-neutral-50 text-neutral-900">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm whitespace-pre-line leading-relaxed">{errorModal.message}</p>
              </div>
              <div className="flex justify-end space-x-3">
                {errorModal.onConfirm && (
                  <button
                    onClick={() => {
                      const fn = errorModal.onConfirm;
                      setErrorModal(null);
                      if (fn) fn();
                    }}
                    className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-black"
                  >
                    Yes, Proceed Anyway
                  </button>
                )}
                <button
                  onClick={() => setErrorModal(null)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold ${errorModal.onConfirm
                    ? 'text-neutral-600 hover:bg-neutral-50'
                    : 'bg-neutral-900 text-white hover:bg-black'
                    }`}
                >
                  {errorModal.onConfirm ? 'Cancel' : 'Okay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeBranch && createPortal(
        <div
          className="fixed inset-x-0 top-0 z-[120] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4"
          style={{ bottom: '0' }}
        >
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-neutral-200 max-h-full">
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white relative">
              <div className="flex items-start gap-4 pr-0 md:pr-20 w-full md:w-auto">
                <button
                  onClick={handleCloseBranchModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 text-xs font-bold shadow-sm transition-all hover:scale-105"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                      <Sparkles size={12} className="mr-1.5" />
                      Branch Overview
                    </span>
                    <span className="hidden md:inline text-[11px] text-neutral-500 font-semibold">
                      Performance and inventory snapshot.
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-neutral-900 flex items-center gap-3">
                    {branchLogos?.[activeBranch] && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
                        <OptimizedImage src={branchLogos[activeBranch]} alt={activeBranch} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {activeBranch}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-[0.18em] bg-neutral-100 border border-neutral-200 text-neutral-600">
                      {branchTotalItems} items
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {activeBranchAddress || 'Address not set'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseBranchModal}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-sm transition-colors z-10"
                title="Close"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50">
              <div className="max-w-6xl mx-auto px-6 pt-6 pb-24 space-y-4">
                {!exclusiveBranches?.includes(activeBranch) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Items</span>
                      <span className="mt-1 text-2xl font-black text-neutral-900">{branchTotalItems.toLocaleString()}</span>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Available</span>
                      <span className="mt-1 text-2xl font-black text-neutral-900">{branchAvailableCount.toLocaleString()}</span>
                      <span className="text-[11px] text-neutral-500 mt-1">₱{branchAvailableValue.toLocaleString()} value</span>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Reserved</span>
                      <span className="mt-1 text-xl font-black text-neutral-900">{branchReservedCount.toLocaleString()}</span>
                      <span className="text-[11px] text-neutral-500 mt-1">{branchCancelledCount.toLocaleString()} cancelled</span>
                    </div>
                    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">Sold / Delivered</span>
                      <span className="mt-1 text-xl font-black text-neutral-900">
                        {branchSoldCount.toLocaleString()} Sold
                      </span>
                      <span className="text-[11px] text-neutral-500 mt-1">
                        {branchDeliveredCount.toLocaleString()} Delivered
                      </span>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                  <div className="px-6 py-5 border-b border-neutral-100 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-neutral-50 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-neutral-900 text-white shadow-lg shadow-neutral-900/20">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-neutral-900 tracking-tight">Branch Inventory Explorer</h3>
                        <p className="text-sm font-medium text-neutral-500">Manage local stock and audits</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white border-b border-neutral-100">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative group flex-1">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" />
                          <input
                            type="text"
                            placeholder="Search title, artist, or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-sm text-sm font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 transition-all shadow-sm"
                          />
                        </div>
                        <div className="w-full md:w-80 h-full flex gap-2">
                          <div className="flex-1 h-full bg-neutral-50 border border-neutral-200 rounded-sm px-4 py-2 flex items-center shadow-sm">
                            <PriceRangeFilter
                              min={priceStats.min}
                              max={priceStats.max}
                              value={priceRange}
                              onChange={setPriceRange}
                              average={priceStats.avg}
                              className="w-full h-8"
                            />
                          </div>
                          <button
                            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                            className={`md:hidden px-4 py-2 rounded-xl border flex items-center justify-center transition-colors ${isMobileFiltersOpen
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                              }`}
                          >
                            <span className="sr-only">Filters</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`transition-transform duration-200 ${isMobileFiltersOpen ? 'rotate-180' : ''}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className={`flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 transition-all duration-300 overflow-hidden ${isMobileFiltersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100'}`}>
                        <div className="flex items-center bg-white rounded-sm border border-neutral-200 shadow-sm hover:border-neutral-300 transition-colors">
                          <div className="pl-3 pr-2 py-2.5 border-r border-neutral-100 bg-neutral-50 rounded-l-sm">
                            <Calendar size={14} className="text-neutral-400" />
                          </div>
                          <select
                            value={dateMonthFilter}
                            onChange={e => setDateMonthFilter(e.target.value)}
                            className="bg-transparent border-0 px-3 py-2.5 text-xs font-bold text-neutral-700 focus:ring-0 cursor-pointer min-w-[100px]"
                          >
                            <option value="All">All Months</option>
                            {monthNames.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                          </select>
                          <div className="w-px h-5 bg-neutral-200" />
                          <select
                            value={dateYearFilter}
                            onChange={e => setDateYearFilter(e.target.value)}
                            className="bg-transparent border-0 px-3 py-2.5 text-xs font-bold text-neutral-700 focus:ring-0 cursor-pointer rounded-r-sm min-w-[80px]"
                          >
                            <option value="All">All Years</option>
                            {availableYearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                          </select>
                        </div>

                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Statuses</option>
                          {Object.values(ArtworkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                          value={artistFilter}
                          onChange={e => setArtistFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Artists</option>
                          {branchArtists.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>

                        <select
                          value={mediumFilter}
                          onChange={e => setMediumFilter(e.target.value)}
                          className="bg-white border border-neutral-200 rounded-sm px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-sm focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer min-w-[140px]"
                        >
                          <option value="All">All Mediums</option>
                          {branchMediums.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {activeBranchArtworks.length > 0 ? (
                      <div className="relative z-10">
                        <p className="text-[11px] font-medium text-neutral-600 mb-2">
                          Artists with work at this location.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Array.from(new Set(activeBranchArtworks.map(a => a.artist))).sort().map(artist => {
                            const artistArtworks = activeBranchArtworks.filter(a => a.artist === artist);
                            const sampleArt = artistArtworks[0];
                            const isActiveArtist = selectedArtist === artist;
                            return (
                              <button
                                key={artist}
                                type="button"
                                onClick={() => setSelectedArtist(artist)}
                                className={`flex flex-col items-stretch rounded-md border text-left text-xs transition-all shadow-sm overflow-hidden ${isActiveArtist
                                  ? 'bg-neutral-900 text-white border-transparent shadow-md'
                                  : 'bg-white/95 border-neutral-100 hover:border-neutral-300 hover:shadow-md'
                                }`}
                              >
                                {sampleArt && (
                                  <div className={`aspect-[4/3] overflow-hidden ${isActiveArtist ? 'bg-black/20' : 'bg-neutral-100'}`}>
                                    <OptimizedImage
                                      src={sampleArt.imageUrl || undefined}
                                      alt={artist}
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                  </div>
                                )}
                                <div className="px-3 py-3 flex flex-col gap-0.5">
                                  <span className={`text-sm font-bold truncate ${isActiveArtist ? 'text-white' : 'text-neutral-900'}`}>{artist}</span>
                                  <span className={`text-[11px] ${isActiveArtist ? 'text-neutral-100' : 'text-neutral-500'}`}>
                                    {artistArtworks.length} piece{artistArtworks.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10 text-center py-8 text-neutral-400">
                        <Package size={32} className="mx-auto mb-2 opacity-60" />
                        <p className="text-sm">No artworks currently at this location.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Artist Inventory Portfolio modal popup */}
      <ArtistInventoryViewerModal
        isOpen={Boolean(activeBranch && selectedArtist)}
        onClose={() => setSelectedArtist(null)}
        selectedArtist={selectedArtist || ''}
        activeBranch={activeBranch || ''}
        availableForArtist={availableForArtist}
        reservedForArtist={reservedForArtist}
        soldForArtist={soldForArtist}
        exclusiveForArtist={exclusiveForArtist}
        auctionForArtist={auctionForArtist}
        retouchForArtist={retouchForArtist}
        framerForArtist={framerForArtist}
        artistStatusFilter={artistStatusFilter}
        setArtistStatusFilter={setArtistStatusFilter}
        filteredCurrentList={filteredCurrentList}
        selectedArtworkIds={selectedArtworkIds}
        toggleSelect={toggleSelect}
        handleDeleteArtwork={handleDeleteArtwork}
        handleSelectAllForArtist={handleSelectAllForArtist}
        modalSearch={modalSearch}
        setModalSearch={setModalSearch}
        modalStatus={modalStatus}
        setModalStatus={setModalStatus}
        modalMedium={modalMedium}
        setModalMedium={setModalMedium}
        modalYear={modalYear}
        setModalYear={setModalYear}
        modalSize={modalSize}
        setModalSize={setModalSize}
        modalFramedSize={modalFramedSize}
        setModalFramedSize={setModalFramedSize}
        modalUniqueStatuses={modalUniqueStatuses}
        modalUniqueMediums={modalUniqueMediums}
        modalUniqueYears={modalUniqueYears}
        modalUniqueSizes={modalUniqueSizes}
        modalUniqueFramedSizes={modalUniqueFramedSizes}
        allSelectedForArtist={allSelectedForArtist}
        onViewArtwork={onViewArtwork}
        canEdit={canEdit}
        setIsCartOpen={setIsCartOpen}
      />

      {/* Selection floating pill bar */}
      {selectedArtworkIds.length > 0 && !isCartOpen && createPortal(
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-[125] animate-in slide-in-from-bottom-10 fade-in duration-500 max-w-[95vw]">
          <div className="relative group">
            <div className="relative bg-[#323130]/95 backdrop-blur-md text-white pl-5 pr-3 py-3 rounded-full shadow-[0_12px_24_px_-4px_rgba(0,0,0,0.3),0_0_1px_rgba(255,255,255,0.1)] flex items-center gap-5 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div
                className="flex items-center gap-4 cursor-pointer group/item"
                onClick={() => setIsCartOpen(true)}
              >
                <div className="bg-[#0078d4] p-2.5 rounded-full shadow-lg shadow-[#0078d4]/20 transform transition-all group-hover/item:scale-105 group-hover/item:rotate-3">
                  <Sparkles size={16} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a19f9d] leading-none mb-1.5">Queue Action</span>
                  <p className="font-bold text-[13px] tracking-tight text-white leading-none">
                    Review {selectedArtworkIds.length} Artwork{selectedArtworkIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="h-8 w-px bg-white/10"></div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedArtworkIds([]);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#c8c6c4] hover:text-white hover:bg-white/10 transition-all duration-200 transform hover:scale-110 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Batch workspace cart overlay */}
      <BranchInventoryCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartArtworks={cartArtworks}
        setSelectedArtworkIds={setSelectedArtworkIds}
        bulkActionModal={bulkActionModal}
        setBulkActionModal={setBulkActionModal}
        onBulkActionClick={handleBulkActionClick}
        permissions={permissions}
        canEdit={canEdit}
        activeBranch={activeBranch}
        exclusiveBranches={exclusiveBranches}
        cartItemCount={cartItemCount}
        cartTotalValue={cartTotalValue}

        // Inline forms props
        bulkActionValue={bulkActionValue}
        setBulkActionValue={setBulkActionValue}
        bulkClientEmail={bulkClientEmail}
        setBulkClientEmail={setBulkClientEmail}
        bulkClientContact={bulkClientContact}
        setBulkClientContact={setBulkClientContact}
        bulkSaleEventId={bulkSaleEventId}
        setBulkSaleEventId={setBulkSaleEventId}
        events={events || []}
        branches={branches}
        activeBulkAttachmentTab={activeBulkAttachmentTab}
        setActiveBulkAttachmentTab={setActiveBulkAttachmentTab}
        bulkTempItdr={bulkTempItdr}
        setBulkTempItdr={setBulkTempItdr}
        bulkTempRsa={bulkTempRsa}
        setBulkTempRsa={setBulkTempRsa}
        bulkTempOrcr={bulkTempOrCr}
        setBulkTempOrcr={setBulkTempOrCr}
        reservationTab={reservationTab}
        setReservationTab={setReservationTab}
        reservationClient={reservationClient}
        setReservationClient={setReservationClient}
        reservationEventId={reservationEventId}
        setReservationEventId={setReservationEventId}
        reservationAuctionId={reservationAuctionId}
        setReservationAuctionId={setReservationAuctionId}
        reservationDays={reservationDays}
        setReservationDays={setReservationDays}
        reservationHours={reservationHours}
        setReservationHours={setReservationHours}
        reservationMinutes={reservationMinutes}
        setReservationMinutes={setReservationMinutes}
        reservationNotes={reservationDetails}
        setReservationNotes={setReservationDetails}
        framerDamageDetails={bulkFramerDamage}
        setFramerDamageDetails={setBulkFramerDamage}
        returnType={bulkReturnType}
        setReturnType={setBulkReturnType}
        returnReason={bulkReturnReason}
        setReturnReason={setBulkReturnReason}
        returnProofImage={bulkTempItdr}
        setReturnProofImage={(val) => {
          setBulkTempItdr(Array.isArray(val) ? val : ((val as string) || null));
        }}
        bulkDownpayment={bulkDownpayment}
        setBulkDownpayment={setBulkDownpayment}
        bulkSaleDownpayments={bulkSaleDownpayments}
        setBulkSaleDownpayments={setBulkSaleDownpayments}
        bulkSaleInstallmentsEnabled={bulkSaleInstallmentsEnabled}
        setBulkSaleInstallmentsEnabled={setBulkSaleInstallmentsEnabled}
        bulkSaleDiscounts={bulkSaleDiscounts}
        setBulkSaleDiscounts={setBulkSaleDiscounts}
        bulkHandlingAgentName={bulkHandlingAgentName}
        setBulkHandlingAgentName={setBulkHandlingAgentName}
        bulkSaleRemarks={bulkSaleRemarks}
        setBulkSaleRemarks={setBulkSaleRemarks}
        bulkActionExtra={bulkActionExtra}
        setBulkActionExtra={setBulkActionExtra}
        onSubmit={handleBulkActionSubmit}
        resetBulkModalState={handleCloseBulkModal}
      />

      {/* Launch New Branch Add/Edit Modal */}
      <BranchFormModal
        isOpen={isModalOpen}
        onClose={handleClose}
        editingBranch={editingBranch}
        branchName={branchName}
        setBranchName={setBranchName}
        branchAddress={branchAddress}
        setBranchAddress={setBranchAddress}
        branchCategory={branchCategory}
        setBranchCategory={setBranchCategory}
        branchLogo={branchLogo}
        setBranchLogo={setBranchLogo}
        isExclusive={isExclusive}
        setIsExclusive={setIsExclusive}
        existingCategories={existingCategories}
        onSubmit={handleSubmit}
        canEdit={canEdit}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
        processMessage={processMessage}
      />
    </div>
  );
};

export default BranchManagement;
