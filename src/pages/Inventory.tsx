/* Optimized Module Transformation | Last Refresh: 2026-04-12 */
import React, { useState, useMemo, useRef } from 'react';
import { utils, writeFile } from 'xlsx';
import ExcelJS from 'exceljs';
import { Artwork, ArtworkStatus, Branch, ExhibitionEvent, SaleRecord, isInTransitStatus, UserPermissions, ReturnType, ImportRecord } from '../types';
import { ICONS } from '../constants';
import { Upload, AlertCircle, CheckCircle2, X, Download, XCircle, Edit, Trash2, ShoppingBag, Clock, ArrowRightLeft, Image as ImageIcon, RotateCcw, ChevronRight, ArrowLeft, Sparkles, Plus, ClipboardCheck, Eye, Wrench, ChevronDown, Info, AlertTriangle } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';

import { createPortal } from 'react-dom';
import { useActionProcessing } from '../hooks/useActionProcessing';
import LoadingOverlay from '../components/LoadingOverlay';
import { Modal } from '../components/Modal';
import { BulkActionModal } from '../components/modals/BulkActionModal';
import { OptimizedTextarea } from '../components/OptimizedTextarea';

// Internal Components
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryFilters } from '../components/inventory/InventoryFilters';
import { InventoryCard } from '../components/inventory/InventoryCard';
import { InventoryImportModal } from '../components/inventory/InventoryImportModal';
import { isCmArtist, formatDimensions } from '../utils/unitUtils';
import { getArtworkClassification } from '../services/inventoryService';

interface InventoryProps {
  artworks: Artwork[];
  branches: string[];
  onView: (id: string) => void;
  permissions?: UserPermissions;
  onAdd: (art: Partial<Artwork>) => void;
  onBulkAdd?: (artworks: Partial<Artwork>[], filename?: string, customDate?: string) => void;
  onBulkUpdate?: (ids: string[], updates: Partial<Artwork>) => void;
  onBulkTransferRequest?: (ids: string[], toBranch: string, attachments?: { itdrUrl?: string | string[] }) => void;
  onBulkSale?: (
    ids: string[],
    client: string,
    delivered: boolean,
    eventInfo?: { id: string; name: string },
    attachments?: { itdrUrl?: string | string[]; rsaUrl?: string | string[]; orCrUrl?: string | string[] },
    totalDownpayment?: number,
    clientEmail?: string,
    clientContact?: string,
    perArtworkDownpayments?: Record<string, number>
  ) => void;
  onAddBranch?: (name: string) => void;
  onEdit?: (id: string, updates: Partial<Artwork>) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkReserve?: (ids: string[], details: string, expiryDate?: string, eventId?: string, eventName?: string) => void;
  events?: ExhibitionEvent[];
  preventDuplicates?: boolean;
  importLogs?: ImportRecord[];
  importedFilenames?: string[];
  sales?: SaleRecord[];
  onBulkSendToFramer?: (ids: string[], damageDetails: string, attachmentUrl?: string | string[]) => void;
  onBulkReturn?: (ids: string[], details: { reason: string; type: ReturnType; refNumber?: string; proofImage?: string | string[]; remarks?: string }) => void;
  branchAddresses?: Record<string, string>;
  branchCategories?: Record<string, string>;
  onAddToAuction?: (artworkIds: string[], auctionId: string, name: string) => void;
  initialStatusFilter?: string;
  onNavigateFromStat?: (tab: string, filter?: any) => void;
}

const Inventory: React.FC<InventoryProps> = ({

  artworks,
  branches,
  onView,
  permissions,
  onAdd,
  onBulkAdd,
  onBulkUpdate,
  onBulkTransferRequest,
  onBulkSale,
  onAddBranch,
  onEdit,
  onBulkDelete,
  onBulkReserve,
  onAddToAuction,
  events = [],
  preventDuplicates = false,
  importLogs = [],
  importedFilenames = [],
  sales = [],
  onBulkSendToFramer,
  onBulkReturn,
  initialStatusFilter,
  onNavigateFromStat: ___ // Destructured but unused in props currently
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [selectedImportLogId, setSelectedImportLogId] = useState<string | null>(null);
  const [artistFilter, setArtistFilter] = useState<string>('All');
  const [mediumFilter, setMediumFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [exhibitFilter, setExhibitFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const { isProcessing, setIsProcessing, processMessage, setProcessMessage, processProgress, setProcessProgress, wrapAction } = useActionProcessing({ itemTitle: 'Inventory', itemCode: 'INV' });
  const [importPreview, setImportPreview] = useState<Partial<Artwork>[]>([]);
  const [importTargetBranch, setImportTargetBranch] = useState<string>('');
  const [importFilename, setImportFilename] = useState<string>('');
  const [importMonthValue, setImportMonthValue] = useState<string>(String(new Date().getMonth() + 1));
  const [importYearValue, setImportYearValue] = useState<string>(String(new Date().getFullYear()));
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Date Filters (Month/Year)
  const [dateMonthFilter, setDateMonthFilter] = useState<string>('All');
  const [dateYearFilter, setDateYearFilter] = useState<string>('All');

  // Unified Bulk Action State
  const [bulkActionModal, setBulkActionModal] = useState<{ type: string } | null>(null);
  const [bulkActionValue, setBulkActionValue] = useState('');
  const [bulkActionExtra, setBulkActionExtra] = useState(false);
  const [bulkClientEmail, setBulkClientEmail] = useState('');
  const [bulkClientContact, setBulkClientContact] = useState('');
  const [bulkSaleEventId, setBulkSaleEventId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ArtworkStatus | string>('Available');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [artworkArtist, setArtworkArtist] = useState('');
  const [artworkDimensions, setArtworkDimensions] = useState('');

  // Attachments
  const [activeBulkAttachmentTab, setActiveBulkAttachmentTab] = useState<'itdr' | 'rsa' | 'orcr'>('itdr');
  const [bulkTempItdr, setBulkTempItdr] = useState<string | string[] | null>(null);
  const [bulkTempRsa, setBulkTempRsa] = useState<string | string[] | null>(null);
  const [bulkTempOrcr, setBulkTempOrcr] = useState<string | string[] | null>(null);

  // Reservation details
  const [reservationTab, setReservationTab] = useState<'person' | 'event' | 'auction'>('person');
  const [reservationClient, setReservationClient] = useState('');
  const [reservationEventName, setReservationEventName] = useState('');
  const [reservationDays, setReservationDays] = useState(0);
  const [reservationHours, setReservationHours] = useState(0);
  const [reservationMinutes, setReservationMinutes] = useState(0);
  const [reservationNotes, setReservationNotes] = useState('');

  // Framer & Return
  const [framerDamageDetails, setFramerDamageDetails] = useState('');
  const [returnType, setReturnType] = useState<'Artist Reclaim' | 'For Retouch'>('Artist Reclaim');
  const [returnReason, setReturnReason] = useState('');
  const [returnProofImage, setReturnProofImage] = useState<string | string[] | null>(null);

  // Downpayments
  const [bulkSaleDownpayments, setBulkSaleDownpayments] = useState<Record<string, string>>({});
  const [bulkSaleInstallmentsEnabled, setBulkSaleInstallmentsEnabled] = useState<Record<string, boolean>>({});
  const [bulkSaleDownpaymentPct, setBulkSaleDownpaymentPct] = useState<number | ''>('');
  const [bulkSalePaymentType, setBulkSalePaymentType] = useState<'Full' | 'Downpayment'>('Full');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [bulkReturnNotes, setBulkReturnNotes] = useState('');
  const [reservationEventId, setReservationEventId] = useState('');
  const [isReturnVoidMode, setIsReturnVoidMode] = useState(false);
  const [isTimelessReservation, setIsTimelessReservation] = useState(false);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('All');

  const monthNames = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], []);

  React.useEffect(() => {
    if (statusFilter !== ArtworkStatus.SOLD && paymentTypeFilter !== 'All') {
      setPaymentTypeFilter('All');
    }
  }, [statusFilter, paymentTypeFilter]);

  React.useEffect(() => {
    if (editingArtwork) {
      setSelectedStatus(editingArtwork.status);
      setImagePreview(editingArtwork.imageUrl);
      setArtworkArtist(editingArtwork.artist || '');
      setArtworkDimensions(editingArtwork.dimensions || '');
    } else {
      setSelectedStatus('Available');
      setImagePreview(null);
      setArtworkArtist('');
      setArtworkDimensions('');
    }
  }, [editingArtwork, showAddModal]);

  const [errorModal, setErrorModal] = useState<{ title: string, message: string, onConfirm?: () => void } | null>(null);

  const availableSheets = useMemo(() => {
    const sheets = new Set(artworks.map(a => a.sheetName).filter(Boolean));
    return Array.from(sheets).sort() as string[];
  }, [artworks]);

  const availableArtists = useMemo(() => {
    const artists = new Set(artworks.map(a => a.artist).filter(Boolean));
    return Array.from(artists).sort();
  }, [artworks]);

  const availableMediums = useMemo(() => {
    const mediums = new Set(artworks.map(a => a.medium).filter(Boolean));
    return Array.from(mediums).sort();
  }, [artworks]);

  const cartArtworks = useMemo(() => {
    return artworks.filter(a => selectedIds.includes(a.id));
  }, [artworks, selectedIds]);

  const totalCartValue = useMemo(() => {
    return cartArtworks.reduce((sum, art) => sum + (art.price || 0), 0);
  }, [cartArtworks]);

  const compressBase64Image = async (base64Str: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const formatImportPeriod = (p?: string) => {
    if (!p) return '';
    const parts = p.split('-');
    if (parts.length < 2) return p;
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parseInt(parts[1], 10)));
    return `${monthNames[m - 1]} ${y}`;
  };

  // Extract effective year-month for filtering (prefers explicit date in year/createdAt, then importPeriod)
  const getArtYearMonth = (art: Artwork): { y: number; m: number } => {
    if (art.importPeriod) {
      const parts = art.importPeriod.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return { y, m };
    }
    if (art.year) {
      const yearDateMatch = String(art.year).match(/^(\d{4})[-\/](\d{1,2})/);
      if (yearDateMatch) return { y: parseInt(yearDateMatch[1], 10), m: parseInt(yearDateMatch[2], 10) };
      const yearOnlyMatch = String(art.year).match(/^(\d{4})$/);
      if (yearOnlyMatch) return { y: parseInt(yearOnlyMatch[1], 10), m: 1 };
    }
    const base = art.createdAt || '';
    const dateMatch = base.match(/^(\d{4})[-\/](\d{1,2})/);
    if (dateMatch) return { y: parseInt(dateMatch[1], 10), m: parseInt(dateMatch[2], 10) };
    const d = new Date(base);
    if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1 };
    const yonly = base.match(/^(\d{4})$/);
    if (yonly) return { y: parseInt(yonly[1], 10), m: 1 };
    return { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
  };



  const maxPossiblePrice = useMemo(() => {
    if (artworks.length === 0) return 2000000;
    const prices = artworks.map(a => a.price || 0);
    return Math.max(...prices, 100000);
  }, [artworks]);

  const baseFilteredArtworks = useMemo(() => {
    return artworks.filter(art => {
      const matchesSearch =
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExhibit = exhibitFilter === 'All' || art.reservedForEventId === exhibitFilter;
      const matchesClient = !clientFilter || (art.remarks || '').toLowerCase().includes(clientFilter.toLowerCase());
      const matchesBranch = branchFilter === 'All' || 
        (art.currentBranch && branchFilter && (
          art.currentBranch.trim().toLowerCase() === branchFilter.trim().toLowerCase() ||
          art.currentBranch.toLowerCase().includes(branchFilter.toLowerCase()) ||
          branchFilter.toLowerCase().includes(art.currentBranch.toLowerCase()) ||
          // Handle parenthetical names like "Galerie Joaquin - (Sanso's Room)" matching "Sanso's Room"
          (art.currentBranch.includes('(') && art.currentBranch.includes(branchFilter))
        ));

      const matchesArtist = artistFilter === 'All' || art.artist === artistFilter;
      const matchesMedium = mediumFilter === 'All' || art.medium === mediumFilter;
      const matchesSize = !sizeFilter || (art.dimensions && art.dimensions.toLowerCase().includes(sizeFilter.toLowerCase()));
      const matchesType = typeFilter === 'All' || (art.type || getArtworkClassification(art.dimensions)) === typeFilter;

      let matchesDate = true;
      if (dateYearFilter !== 'All' || dateMonthFilter !== 'All') {
        const { y: effY, m: effM } = getArtYearMonth(art);
        if (dateYearFilter !== 'All' && dateMonthFilter !== 'All') {
          matchesDate = effY === parseInt(dateYearFilter, 10) && effM === parseInt(dateMonthFilter, 10);
        } else if (dateYearFilter !== 'All') {
          matchesDate = effY === parseInt(dateYearFilter, 10);
        } else if (dateMonthFilter !== 'All') {
          matchesDate = effM === parseInt(dateMonthFilter, 10);
        }
      }

      let matchesPrice = true;
      if (minPrice) {
        matchesPrice = matchesPrice && (art.price >= parseFloat(minPrice));
      }
      if (maxPrice) {
        matchesPrice = matchesPrice && (art.price <= parseFloat(maxPrice));
      }

      return matchesSearch && matchesBranch && matchesDate && matchesArtist && matchesMedium && matchesSize && matchesExhibit && matchesClient && matchesType && matchesPrice;
    });
  }, [artworks, searchTerm, branchFilter, dateMonthFilter, dateYearFilter, artistFilter, mediumFilter, sizeFilter, exhibitFilter, clientFilter, typeFilter, minPrice, maxPrice]);

  const importLogArtworksSet = useMemo(() => {
    if (!selectedImportLogId || !importLogs) return null;
    const log = importLogs.find(l => l.id === selectedImportLogId);
    if (!log) return null;
    return new Set([...(log.importedIds || []), ...(log.updatedIds || [])]);
  }, [selectedImportLogId, importLogs]);

  const filteredArtworks = useMemo(() => {
    return baseFilteredArtworks.filter(art => {
      const matchesStatus =
        statusFilter === 'All' ||
        art.status === statusFilter ||
        (statusFilter === 'In Transit' && isInTransitStatus(art.status));
      const matchesImport = !importLogArtworksSet ? true : importLogArtworksSet.has(art.id);

      let matchesPaymentType = true;
      if (statusFilter === ArtworkStatus.SOLD && paymentTypeFilter !== 'All') {
        const matchingSale = (sales || []).find(s => s.artworkId === art.id && !s.isCancelled);
        if (paymentTypeFilter === 'Downpayment') {
          matchesPaymentType = !!(matchingSale?.downpayment !== undefined && matchingSale.downpayment < art.price);
        } else if (paymentTypeFilter === 'Full') {
          // Full payment means downpayment >= price, or no explicit sale record but status is SOLD (legacy/assumed full)
          matchesPaymentType = !!(
            (matchingSale?.downpayment !== undefined && matchingSale.downpayment >= art.price) || 
            (art.status === ArtworkStatus.SOLD && !matchingSale) ||
            (art.status === ArtworkStatus.DELIVERED && !matchingSale)
          );
        }
      }

      return matchesStatus && matchesImport && matchesPaymentType;
    });
  }, [baseFilteredArtworks, statusFilter, importLogArtworksSet, paymentTypeFilter, sales]);

  const inventoryInsights = useMemo(() => {
    const totalItems = filteredArtworks.length; // Current View
    let availableCount = 0;
    let reservedCount = 0;
    let soldCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalValue = 0;
    let availableValue = 0;

    baseFilteredArtworks.forEach(art => {
      totalValue += art.price || 0;
      if (art.status === ArtworkStatus.AVAILABLE) {
        availableCount += 1;
        availableValue += art.price || 0;
      } else if (art.status === ArtworkStatus.RESERVED) {
        reservedCount += 1;
      } else if (art.status === ArtworkStatus.SOLD) {
        soldCount += 1;
      } else if (art.status === ArtworkStatus.DELIVERED) {
        deliveredCount += 1;
      } else if (art.status === ArtworkStatus.CANCELLED) {
        cancelledCount += 1;
      }
    });

    const inTransitCount = baseFilteredArtworks.filter(art => isInTransitStatus(art.status)).length;

    return {
      totalItems,
      availableCount,
      reservedCount,
      soldCount,
      deliveredCount,
      cancelledCount,
      inTransitCount,
      totalValue,
      availableValue
    };
  }, [filteredArtworks, baseFilteredArtworks]);

  const exportInventory = () => {
    const workbook = utils.book_new();
    const sheets: Record<string, any[]> = {};
    const dataToExport = filteredArtworks.length > 0 ? filteredArtworks : artworks;

    dataToExport.forEach(art => {
      const sheetName = art.sheetName || 'Inventory';
      if (!sheets[sheetName]) sheets[sheetName] = [];
      const { id, sheetName: _, imageUrl, ...rest } = art;
      sheets[sheetName].push(rest);
    });

    Object.keys(sheets).forEach(name => {
      const ws = utils.json_to_sheet(sheets[name]);
      utils.book_append_sheet(workbook, ws, name);
    });

    writeFile(workbook, `ArtisFlow_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateReportHTML = (items: Artwork[]) => {
    const totalValue = items.reduce((sum, art) => sum + (art.price || 0), 0);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const artistName = artistFilter !== 'All' ? artistFilter : 'Inventory Report';
    
    const cardsHTML = items.map(art => `
      <div style="display: flex; flex-direction: column; width: 280px; break-inside: avoid; margin-bottom: 20px;">
        <div style="width: 280px; height: 320px; background: #f0f0f0; border: 1px solid #eeeeee; display: flex; align-items: center; justify-content: center; box-sizing: border-box; overflow: hidden; margin-bottom: 16px; border-radius: 2px;">
          <img src="${art.imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block;" crossorigin="anonymous" />
        </div>

        <!-- Content Architecture -->
        <div style="display: flex; flex-direction: column; flex-grow: 1; font-family: sans-serif;">
          <!-- Primary Identification -->
          <div style="margin-bottom: 14px;">
            <h3 style="font-size: 17px; font-weight: 900; margin: 0; line-height: 1.1; color: #000; letter-spacing: -0.01em;">${art.title || 'Untitled'}</h3>
            <p style="font-size: 14px; font-weight: 500; color: #666; margin: 5px 0 0 0; font-style: italic;">${art.artist || 'Unknown Artist'}</p>
          </div>
          
          <!-- Metadata Matrix -->
          <div style="border-top: 2px solid #000; padding-top: 10px; margin-bottom: 18px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 4px;">
                <span style="color: #999; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Code</span>
                <span style="font-weight: 700; color: #1a1a1a;">${art.code || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 4px;">
                <span style="color: #999; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Medium</span>
                <span style="font-weight: 700; color: #1a1a1a;">${art.medium || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 4px;">
                <span style="color: #999; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Dimensions</span>
                <span style="font-weight: 700; color: #1a1a1a;">${formatDimensions(art.dimensions || art.size || 'N/A', art.artist)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; border-bottom: 1px solid #f5f5f5; padding-bottom: 4px;">
                <span style="color: #999; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Year</span>
                <span style="font-weight: 700; color: #1a1a1a;">${art.year || 'N/A'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 10px;">
                <span style="color: #999; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 12px; flex-shrink: 0;">Location</span>
                <span style="font-weight: 700; color: #1a1a1a; text-align: right; line-height: 1.25; word-break: break-word;">${art.currentBranch || art.branch || art.soldAtBranch || 'Main'}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${art.status === 'Sold' ? '#ff4d4f' : '#52c41a'};"></div>
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #000; letter-spacing: 0.05em;">${art.status || 'Available'}</span>
            </div>
            <span style="font-size: 22px; font-weight: 900; color: #000; letter-spacing: -0.02em;">₱${(art.price || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div id="report-root" style="width: 1100px; padding: 80px 90px 120px 90px; background: white; font-family: sans-serif; color: #000; box-sizing: border-box; min-height: 1400px;">
        <!-- Report Header: Gallery Identity -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 40px;">
          <div style="flex: 1; min-width: 0;">
            <h1 style="font-size: 64px; font-weight: 900; margin: 0; letter-spacing: -0.05em; line-height: 0.9;">${artistName}</h1>
            <div style="display: flex; align-items: center; gap: 24px; color: #666; font-size: 16px; font-weight: 700; margin-top: 15px;">
              <span>${dateStr}</span>
              <span style="width: 4px; height: 4px; border-radius: 50%; background: #ccc; margin: 0 4px;"></span>
              <span>${items.length} Artworks</span>
              <span style="width: 4px; height: 4px; border-radius: 50%; background: #ccc; margin: 0 4px;"></span>
              <span style="color: #000;">Valuation: ₱${totalValue.toLocaleString()}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: 900; letter-spacing: -0.03em; color: #000; margin-bottom: 2px;">ArtisFlow</div>
            <div style="font-size: 11px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 0.15em;">Gallery Registry System</div>
          </div>
        </div>

        <!-- Global Separator -->
        <div style="height: 10px; background: #000; margin-bottom: 60px;"></div>

        <!-- Catalog Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 280px); gap: 70px 40px; justify-content: center;">
          ${cardsHTML}
        </div>
      </div>
    `;
  };

  const handleExportPDF = async () => {
    setIsProcessing(true);
    setProcessMessage('Preparing PDF document...');
    setProcessProgress(20);

    try {
      const element = document.getElementById('inventory-grid');
      if (!element) {
        console.error('Inventory grid element not found');
        return;
      }

      setProcessProgress(40);
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // 1. Create a detached iframe for absolute isolation from app CSS
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1250px'; // Expanded buffer for horizontal safety
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const reportDoc = iframe.contentDocument!;
      const artworksToUse = filteredArtworks.length > 0 ? filteredArtworks : artworks;
      
      reportDoc.open();
      reportDoc.write(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0; padding:0; background: white; width: 1250px; overflow-x: hidden;">
            ${generateReportHTML(artworksToUse)}
          </body>
        </html>
      `);
      reportDoc.close();

      // 2. Wait for images and layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 3. Shrink-wrap the iframe height to the content
      const reportRoot = reportDoc.getElementById('report-root');
      if (!reportRoot) {
        document.body.removeChild(iframe);
        throw new Error('Failed to find report root element');
      }

      iframe.style.height = `${reportRoot.offsetHeight}px`;

      // 4. Render specifically the report-root element
      const canvas = await html2canvas(reportRoot, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        width: 1100, // Matches report-root width
        logging: false
      });
      
      // 5. Cleanup
      document.body.removeChild(iframe);

      setProcessProgress(70);
      // Removed toDataURL to avoid "Invalid string length" errors with large canvases
      // jsPDF can accept the canvas element directly
      const pdfWidth = 612; // 8.5 inches in points (Long Bond Paper width)
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Ensure we have a minimum height for 'Long' format (8.5x13 inches)
      // 13 inches * 72 points/inch = 936 points
      const finalPdfHeight = Math.max(936, pdfHeight);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [pdfWidth, finalPdfHeight]
      });

      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'NONE');
      
      setProcessProgress(90);
      pdf.save(`ArtisFlow_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
      setProcessProgress(100);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessProgress(0);
      }, 500);
    }
  };

  const handleExportImage = async () => {
    setIsProcessing(true);
    setProcessMessage('Capturing high-resolution image...');
    setProcessProgress(30);

    try {
      const element = document.getElementById('inventory-grid');
      if (!element) {
        console.error('Inventory grid element not found');
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      // 1. Create a detached iframe for absolute isolation
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '1100px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const reportDoc = iframe.contentDocument!;
      const artworksToUse = filteredArtworks.length > 0 ? filteredArtworks : artworks;
      
      reportDoc.open();
      reportDoc.write(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0; padding:0; background: white; width: 1100px;">
            ${generateReportHTML(artworksToUse)}
          </body>
        </html>
      `);
      reportDoc.close();

      await new Promise(resolve => setTimeout(resolve, 2500));

      const reportRoot = reportDoc.getElementById('report-root');
      if (reportRoot) {
        iframe.style.height = `${reportRoot.offsetHeight}px`;
      }

      const canvas = await html2canvas(reportRoot || reportDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1120,
        logging: false
      });
      
      document.body.removeChild(iframe);

      setProcessProgress(80);
      const link = document.createElement('a');
      link.download = `ArtisFlow_Inventory_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      setProcessProgress(100);
    } catch (error) {
      console.error('Error exporting image:', error);
      alert(`Failed to capture image: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessProgress(0);
      }, 500);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (preventDuplicates && importedFilenames.includes(file.name)) {
      setErrorModal({
        title: 'Duplicate Import Detected',
        message: `The file "${file.name}" has already been imported.\n\nDuplicate imports are currently restricted.`
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportFilename(file.name);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const parsedData: Partial<Artwork>[] = [];

    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name;
      if (sheetName.toLowerCase().includes('monitoring')) return;

      const rowImages: Record<number, string> = {};
      const wbAny = workbook as any;
      if (wbAny.model && wbAny.model.media) {
        worksheet.getImages().forEach(image => {
          const imgModel = wbAny.model.media.find((m: any) => m.index === image.imageId);
          if (imgModel) {
            const buffer = imgModel.buffer;
            let base64 = '';
            const bufAny = buffer as any;

            const bytes = new Uint8Array(bufAny);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            base64 = window.btoa(binary);

            const mimeType = imgModel.extension === 'png' ? 'image/png' : 'image/jpeg';
            const targetRow = image.range.tl.nativeRow + 1;
            rowImages[targetRow] = `data:${mimeType};base64,${base64}`;
          }
        });
      }

      let headerRowIndex = -1;
      const headerMap: Record<number, string> = {};

      worksheet.eachRow((row, rowNumber) => {
        if (headerRowIndex !== -1) return;
        if (rowNumber > 100) return; // Only look at first 100 rows for header
        
        let keywordCount = 0;
        const keywords = ['title', 'artist', 'code', 'price', 'particulars', 'srp', 'value', 'gp', 'description', 'particular', 'artwork', 'subject', 'amount'];
        
        row.eachCell((cell) => {
          const val = String(cell.value || '').toLowerCase().trim();
          if (keywords.some(k => val.includes(k))) keywordCount++;
        });

        // If at least 2 keywords are found, or 1 strong keyword like 'particulars' or 'code'
        let hasStrongKeyword = false;
        row.eachCell((cell) => {
          const s = String(cell.value || '').toLowerCase();
          if (s.includes('particulars') || s.includes('code') || s.includes('sku') || s.includes('artist')) {
            hasStrongKeyword = true;
          }
        });

        if (keywordCount >= 2 || (keywordCount >= 1 && hasStrongKeyword)) {
          headerRowIndex = rowNumber;
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => { 
            headerMap[colNumber] = String(cell.value || '').toLowerCase().trim(); 
          });
          // Fallback for column 1 if it's empty but usually contains the description/title
          // Only apply if there isn't already an explicit title/particulars column in the sheet
          const hasExplicitTitle = Object.values(headerMap).some(val => 
            ['title', 'particulars', 'description', 'subject', 'artwork', 'particular'].some(k => val.includes(k))
          );
          if (!headerMap[1] && row.getCell(1).value === null && !hasExplicitTitle) {
            headerMap[1] = 'description';
          }
        }
      });

      if (headerRowIndex !== -1) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowIndex) return;
          const entry: any = { sheetName, rowNumber };
          const lowerSheet = sheetName.toLowerCase();
          if (lowerSheet.includes('available')) entry.status = ArtworkStatus.AVAILABLE;
          else if (lowerSheet.includes('sold')) entry.status = ArtworkStatus.SOLD;
          else if (lowerSheet.includes('reserved')) entry.status = ArtworkStatus.RESERVED;

          row.eachCell((cell, colNumber) => {
            const header = headerMap[colNumber];
            if (!header) return;
            let val = cell.value;
            if (val && typeof val === 'object') {
              if ('text' in val) val = (val as any).text;
              else if ('result' in val) val = (val as any).result;
              else if ('richText' in val) val = (val as any).richText.map((rt: any) => rt.text).join('');
            }
            const value = val;
            const lowerKey = header;

            const isPrice = ['price', 'amount', 'value', 'srp', 'cost', 'total', 'php', 'list', 'gross', 'net', 'gp', 'val'].some(k => lowerKey.includes(k));
            const isTitle = ['title', 'particulars', 'description', 'subject', 'artwork', 'particular'].some(k => lowerKey.includes(k));
            const isArtist = ['artist', 'name', 'painter', 'author', 'sculptor'].some(k => lowerKey.includes(k));
            const isMedium = ['medium', 'material', 'type', 'substrate', 'media'].some(k => lowerKey.includes(k));
            const isDimensions = /(dimensions|size|dims|measure|measurement)/.test(lowerKey) && (!/frame/.test(lowerKey) || /w\s*[\/\\]\s*o/.test(lowerKey) || /without/.test(lowerKey));
            const isSizeFrame = /frame/.test(lowerKey) && !/w\s*[\/\\]\s*o/.test(lowerKey) && !/without/.test(lowerKey);
            const isBranch = ['branch', 'location', 'gallery', 'site', 'venue'].some(k => lowerKey.includes(k));
            const isCode = ['code', 'sku', 'item', 'ref', 'reference', 'item #', 'itemno'].some(k => lowerKey.includes(k)) || lowerKey === 'id';

            if (isPrice) {
              const cleaned = String(value || '').replace(/[^\d.-]/g, '');
              const num = typeof value === 'number' ? value : parseFloat(cleaned);
              if (!isNaN(num) && num !== null) entry.price = num;
            } else if (isTitle && !entry.title) {
              const strVal = String(value || '').trim();
              if (strVal && strVal !== 'null' && strVal !== 'undefined') {
                // If Column 1 fallback is active and value is a pure sequence number, skip it
                if (lowerKey === 'description' && colNumber === 1 && /^\d+$/.test(strVal)) {
                  // Skip sequence number
                } else {
                  entry.title = strVal;
                }
              }
            }
            else if (isArtist && !entry.artist) entry.artist = String(value || '').trim();
            else if (isMedium && !entry.medium) entry.medium = String(value || '').trim();
            else if (isDimensions && !entry.dimensions) entry.dimensions = String(value || '').trim();
            else if (isSizeFrame && !entry.sizeFrame) entry.sizeFrame = String(value || '').trim();
            else if (isBranch && !entry.currentBranch) entry.currentBranch = String(value || '').trim();
            else if (isCode && !entry.code) entry.code = String(value || '').trim();
            else if (lowerKey.includes('year') || lowerKey.includes('date')) entry.year = value instanceof Date ? value.toISOString().split('T')[0] : String(value || '').trim();
            else if (lowerKey.includes('status')) entry.status = String(value || '').trim();
            else if (lowerKey.includes('remarks')) entry.remarks = String(value || '').trim();
            else {
              // Store unmapped data for debugging failed items
              if (!entry.unmapped) entry.unmapped = {};
              entry.unmapped[lowerKey] = value;
            }
          });

          let finalDim = entry.dimensions || '';
          let finalFrame = entry.sizeFrame || '';
          const artistName = entry.artist || '';

          // Clean hyphens and format unit
          if (finalDim && finalDim !== 'null' && finalDim !== 'undefined' && !finalDim.includes('---')) {
            entry.dimensions = formatDimensions(finalDim, artistName);
          } else {
            entry.dimensions = '';
          }

          if (finalFrame && finalFrame !== 'null' && finalFrame !== 'undefined' && !finalFrame.includes('---')) {
            entry.sizeFrame = formatDimensions(finalFrame, artistName);
          } else {
            entry.sizeFrame = '';
          }

          // Classification
          entry.type = getArtworkClassification(finalDim);
          if (!entry.type && finalFrame) entry.type = 'Painting'; // Fallback if frame is present but dimensions are weird
          if (rowImages[rowNumber]) entry.imageUrl = rowImages[rowNumber];
          if (!entry.title && (entry.particulars || entry.description)) entry.title = entry.particulars || entry.description;
          if (!entry.title && entry.code) entry.title = `Untitled (${entry.code})`;
          if (!entry.artist) entry.artist = 'Unknown Artist';
          if (entry.title || entry.code) parsedData.push(entry);
        });
      }
    });

    setImportPreview(parsedData);
    setShowImportModal(true);
    setImportTargetBranch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = async () => {
    await wrapAction(async () => {
      if (onAddBranch && importTargetBranch && !branches.includes(importTargetBranch)) onAddBranch(importTargetBranch);
      const finalImport = importPreview.map(item => ({ ...item, currentBranch: importTargetBranch || 'Main Gallery' }));
      let customDate;
      try {
        const year = parseInt(importYearValue);
        const month = parseInt(importMonthValue);
        if (isNaN(year) || isNaN(month)) throw new Error('Invalid date components');
        customDate = new Date(year, month - 1, 1).toISOString();
      } catch (e) {
        customDate = new Date().toISOString();
        console.warn('Invalid import date selection, defaulting to current time');
      }
      if (onBulkAdd) await Promise.resolve(onBulkAdd(finalImport, importFilename, customDate));
      setShowImportModal(false);
    }, 'Synchronizing Import Data...');
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredArtworks.length ? [] : filteredArtworks.map(a => a.id));
  };

  const resetBulkOperationalState = () => {
    setBulkActionValue('');
    setBulkActionExtra(false);
    setBulkClientEmail('');
    setBulkClientContact('');
    setBulkSaleEventId('');
    setBulkTempItdr(null);
    setBulkTempRsa(null);
    setBulkTempOrcr(null);
    setReservationClient('');
    setReservationNotes('');
    setReservationEventName('');
    setReservationEventId('');
    setFramerDamageDetails('');
    setReturnReason('');

    setBulkReturnNotes('');
    setActiveBulkAttachmentTab('itdr');
  };

  const handleBulkActionClick = (type: 'sale' | 'reserve' | 'delete' | 'transfer' | 'framing' | 'return') => {
    if (selectedIds.length === 0) {
      setErrorModal({ title: 'No items selected', message: 'Please select at least one artwork before applying an action.' });
      return;
    }
    resetBulkOperationalState();
    
    // Initialize per-item terms for sales
    if (type === 'sale') {
      const initialTerms: Record<string, string> = {};
      const initialEnabled: Record<string, boolean> = {};
      selectedIds.forEach(id => {
        const art = artworks.find(a => a.id === id);
        initialTerms[id] = '';
        initialEnabled[id] = false; // Default to Full payment
      });
      setBulkSaleDownpayments(initialTerms);
      setBulkSaleInstallmentsEnabled(initialEnabled);
    }

    setBulkActionModal({ type });
    setIsCartOpen(true);
  };

  const firstAttachment = (value: string | string[] | null | undefined) =>
    Array.isArray(value) ? value[0] || null : value || null;

  const toAttachmentArray = (value: string | string[] | null | undefined) =>
    Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const handleBulkActionSubmit = async () => {
    if (!bulkActionModal || selectedIds.length === 0) return;

    await wrapAction(async () => {
      const itdrList = toAttachmentArray(bulkTempItdr);
      const rsaList = toAttachmentArray(bulkTempRsa);
      const orcrList = toAttachmentArray(bulkTempOrcr);

      switch (bulkActionModal.type) {
        case 'sale':
          if (onBulkSale && bulkActionValue) {
            // Aggregate downpayment from per-item PHP values
            const perArtworkDownpayments: Record<string, number> = {};
            selectedIds.forEach(id => {
              if (bulkSaleInstallmentsEnabled[id]) {
                perArtworkDownpayments[id] = parseFloat(bulkSaleDownpayments[id]) || 0;
              } else {
                const art = artworks.find(a => a.id === id);
                if (art) perArtworkDownpayments[id] = art.price;
              }
            });

            const totalDownpayment = Object.values(perArtworkDownpayments).reduce((sum, val) => sum + val, 0);
            const eventInfo = events.find(e => e.id === bulkSaleEventId);

            await onBulkSale(
              selectedIds,
              bulkActionValue,
              bulkActionExtra, // delivered
              eventInfo ? { id: eventInfo.id, name: eventInfo.title } : undefined,
              { itdrUrl: itdrList, rsaUrl: rsaList, orCrUrl: orcrList },
              totalDownpayment,
              bulkClientEmail,
              bulkClientContact,
              perArtworkDownpayments
            );
          }
          break;

        case 'reserve':
          if (reservationTab === 'auction') {
            if (onAddToAuction && reservationEventId) {
              await onAddToAuction(selectedIds, reservationEventId, reservationEventName || 'Auction');
            }
          } else if (onBulkReserve) {
            let details = '';
            let expiryDate: string | undefined;

            if (reservationTab === 'person') {
              details = `Target: Client [${reservationClient}] | Note: ${reservationNotes}`;
              if (reservationDays > 0 || reservationHours > 0 || reservationMinutes > 0) {
                const now = new Date();
                const expiry = new Date(now.getTime() + (reservationDays * 24 * 60 * 60 * 1000) + (reservationHours * 60 * 60 * 1000) + (reservationMinutes * 60 * 1000));
                expiryDate = expiry.toISOString();
              }
            } else if (reservationTab === 'event') {
              details = `Target: Event [${reservationEventName}] | Note: ${reservationNotes}`;
            }

            await onBulkReserve(selectedIds, details, expiryDate, (reservationTab === 'event') ? reservationEventId : undefined, (reservationTab === 'event') ? reservationEventName : undefined);
          }
          break;

        case 'transfer':
          if (onBulkTransferRequest && bulkActionValue) {
            await onBulkTransferRequest(selectedIds, bulkActionValue, { itdrUrl: itdrList });
          }
          break;

        case 'framing':
          if (onBulkSendToFramer && framerDamageDetails) {
            await onBulkSendToFramer(selectedIds, framerDamageDetails, itdrList);
          }
          break;

        case 'return':
          if (onBulkReturn && returnReason) {
            await onBulkReturn(selectedIds, {
              reason: returnReason,
              type: returnType as ReturnType,

              proofImage: itdrList,
              remarks: bulkReturnNotes
            });
          }
          break;

        case 'delete':
          if (onBulkDelete) {
            await onBulkDelete(selectedIds);
          }
          break;
      }

      // Reset & Close
      setBulkActionModal(null);
      setSelectedIds([]);
      setIsCartOpen(false);
      setBulkActionValue('');
      setBulkActionExtra(false);
      setBulkClientEmail('');
      setBulkClientContact('');
      setBulkSaleEventId('');
      setBulkTempItdr(null);
      setBulkTempRsa(null);
      setBulkTempOrcr(null);
      setReservationClient('');
      setReservationNotes('');
      setFramerDamageDetails('');
      setReturnReason('');
    }, `Processing batch sequence...`);
  };


  return (
    <div className="space-y-6 relative min-h-full pb-24">
      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateMonthFilter={dateMonthFilter}
        setDateMonthFilter={setDateMonthFilter}
        dateYearFilter={dateYearFilter}
        setDateYearFilter={setDateYearFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        artistFilter={artistFilter}
        setArtistFilter={setArtistFilter}
        mediumFilter={mediumFilter}
        setMediumFilter={setMediumFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sizeFilter={sizeFilter}
        setSizeFilter={setSizeFilter}
        selectedImportLogId={selectedImportLogId}
        setSelectedImportLogId={setSelectedImportLogId}
        importLogs={importLogs}
        paymentTypeFilter={paymentTypeFilter}
        setPaymentTypeFilter={setPaymentTypeFilter}
        branches={branches}
        availableArtists={availableArtists}
        availableMediums={availableMediums}
        monthNames={monthNames}
        permissions={permissions || null}
        selectedIds={selectedIds}
        filteredCount={filteredArtworks.length}
        handleSelectAll={handleSelectAll}
        exportInventory={exportInventory}
        exportPDF={handleExportPDF}
        exportImage={handleExportImage}
        handleFileChange={handleFileChange}
        fileInputRef={fileInputRef}
        setShowAddModal={setShowAddModal}
        exhibitFilter={exhibitFilter}
        setExhibitFilter={setExhibitFilter}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        events={events}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        maxPossiblePrice={maxPossiblePrice}
      />

      <InventoryStats inventoryInsights={inventoryInsights} />

      <div id="inventory-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-1">
        {filteredArtworks.map((art) => {
          const matchingSale = (sales || []).find(s => s.artworkId === art.id && !s.isCancelled);
          return (
            <InventoryCard
              key={art.id}
              art={art}
              sale={matchingSale}
              selectedIds={selectedIds}
              permissions={permissions || null}
              toggleSelect={toggleSelect}
              onView={onView}
              onEdit={(artwork) => { setEditingArtwork(artwork); setShowAddModal(true); }}
              onPreview={setPreviewImageUrl}
              formatImportPeriod={formatImportPeriod}
            />
          );
        })}
      </div>

      <InventoryImportModal
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        importPreview={importPreview}
        importMonthValue={importMonthValue}
        setImportMonthValue={setImportMonthValue}
        importYearValue={importYearValue}
        setImportYearValue={setImportYearValue}
        importTargetBranch={importTargetBranch}
        setImportTargetBranch={setImportTargetBranch}
        branches={branches}
        processImport={processImport}
      />

      {showAddModal && (
        <Modal onClose={() => { setShowAddModal(false); setEditingArtwork(null); }} title={editingArtwork ? "Edit Artwork" : "Register Artwork"}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await wrapAction(async () => {
              if (uploadingImage) return;
              const formData = new FormData(e.currentTarget);
              const file = formData.get('image') as File;
              let finalImageUrl = editingArtwork?.imageUrl || '';

              if (file && file.size > 0) {
                setUploadingImage(true);
                try {
                  const resizedDataUrl = await new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const scale = Math.min(1200 / img.width, 1200 / img.height, 1);
                      canvas.width = img.width * scale;
                      canvas.height = img.height * scale;
                      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(file);
                  });
                  finalImageUrl = resizedDataUrl;
                } finally { setUploadingImage(false); }
              }

              const status = editingArtwork ? editingArtwork.status : ArtworkStatus.AVAILABLE;
              const remarks = formData.get('remarks') as string;

              const data = {
                code: formData.get('code') as string,
                status: status,
                title: formData.get('title') as string,
                artist: formData.get('artist') as string,
                medium: formData.get('medium') as string,
                dimensions: formData.get('dimensions') as string,
                price: parseFloat(formData.get('price') as string) || 0,
                currentBranch: formData.get('branch') as Branch || 'Main Gallery',
                year: formData.get('year') as string,
                imageUrl: finalImageUrl,
                remarks: remarks
              };
              if (editingArtwork && onEdit) await Promise.resolve(onEdit(editingArtwork.id, data));
              else await Promise.resolve(onAdd(data));
              setShowAddModal(false);
              setEditingArtwork(null);
            }, 'Saving Artwork...');
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Art Code / SKU</label>
                  <input name="code" defaultValue={editingArtwork?.code} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Title</label>
                  <input name="title" defaultValue={editingArtwork?.title} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Artist</label>
                  <input 
                    name="artist" 
                    value={artworkArtist}
                    onChange={(e) => {
                      const val = e.target.value;
                      setArtworkArtist(val);
                      if (isCmArtist(val)) {
                        setArtworkDimensions(prev => formatDimensions(prev, val));
                      }
                    }}
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-4 text-center">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Artwork Preview</label>
                <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-indigo-300 transition-all">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImageIcon size={32} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold mt-2 uppercase">No Image Selected</span>
                    </div>
                  )}
                  <input type="file" name="image" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setImagePreview(URL.createObjectURL(e.target.files![0]))} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price (₱)</label>
                <input 
                  name="price" 
                  type="text" 
                  inputMode="numeric"
                  defaultValue={editingArtwork?.price} 
                  onFocus={(e) => e.target.select()}
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    const val = (e.currentTarget.value || '').replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) parts.splice(2);
                    if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                    e.currentTarget.value = parts.join('.');
                  }}
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-600" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Year</label>
                <input name="year" defaultValue={editingArtwork?.year} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Current Branch</label>
                <select name="branch" defaultValue={editingArtwork?.currentBranch} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700">
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Medium / Material</label>
                <input name="medium" defaultValue={editingArtwork?.medium} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dimensions</label>
                <input 
                  name="dimensions" 
                  value={artworkDimensions}
                  onChange={(e) => {
                    const val = e.target.value;
                    setArtworkDimensions(val);
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    setArtworkDimensions(formatDimensions(val, artworkArtist));
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                  placeholder="e.g. 24 x 36 in" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Remarks / Details</label>
              <textarea name="remarks" defaultValue={editingArtwork?.remarks} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => { setShowAddModal(false); setEditingArtwork(null); }} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button type="submit" className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:from-indigo-700 hover:to-violet-700 transition-all transform active:scale-95">{editingArtwork ? 'Update Artwork' : 'Register Artwork'}</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedIds.length > 0 && createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[40] animate-in slide-in-from-bottom duration-500">
          <div className="bg-[#323130] text-white px-2 py-2 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0078d4] rounded-full shadow-lg">
              <Sparkles size={16} className="text-white animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{selectedIds.length} Assets Staged</span>
            </div>
            
            <div className="h-4 w-[1px] bg-white/20 mx-1"></div>
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 px-6 py-2 hover:bg-white/10 rounded-full transition-all group"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Open Command Hub</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => setSelectedIds([])}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {isCartOpen && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#323130]/60 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="bg-[#faf9f8] w-full max-w-7xl h-[90vh] rounded-md shadow-2xl overflow-hidden flex border border-[#edebe9] relative animate-in zoom-in-95 duration-300">
            
            {/* Side Navigation */}
            <div className="w-16 sm:w-64 bg-[#f3f2f1] border-r border-[#edebe9] flex flex-col shrink-0">
               <div className="p-6 border-b border-[#edebe9]">
                 <span className="hidden sm:block text-[10px] font-bold text-[#605e5c] uppercase tracking-widest leading-none mb-1">Navigation</span>
                 <span className="hidden sm:block text-sm font-black text-[#323130] leading-none">Command Hub</span>
               </div>
               
               <div className="flex-1 py-4 overflow-y-auto">
                 {[
                   { id: 'sale', icon: ShoppingBag, label: 'Execute Sale' },
                   { id: 'reserve', icon: Clock, label: 'Reservation' },
                   { id: 'transfer', icon: ArrowRightLeft, label: 'Asset Transfer' },
                   { id: 'framing', icon: ImageIcon, label: 'Framing Service' },
                   { id: 'return', icon: RotateCcw, label: 'Return Sequence' },
                   { id: 'delete', icon: Trash2, label: 'Final Purge' }
                 ].map((item) => (
                   <button
                     key={item.id}
                     onClick={() => handleBulkActionClick(item.id as any)}
                     className={`w-full group flex items-center gap-4 px-6 py-4 transition-all hover:bg-white ${bulkActionModal?.type === item.id ? 'bg-white border-r-4 border-[#0078d4]' : ''}`}
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
                  onClick={() => setIsCartOpen(false)}
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
                           bulkActionModal?.type === 'framing' ? 'Send to Framer' :
                           bulkActionModal?.type === 'return' ? 'Return to Artist' :
                           bulkActionModal?.type === 'delete' ? 'System De-Classification' :
                           'Operational Workspace'}
                      </h2>
                    </div>
                 </div>
                 <button onClick={() => { setIsCartOpen(false); setBulkActionModal(null); resetBulkOperationalState(); }} className="p-2 hover:bg-[#edebe9] rounded-md transition-colors">
                   <X size={20} className="text-[#605e5c]" />
                 </button>
              </div>

              {/* Content logic */}
              <div className="flex-1 overflow-y-auto">
                {!bulkActionModal ? (
                  <div className="p-8 bg-[#faf9f8] min-h-full">
                    <div className="max-w-4xl mx-auto space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest italic">Staged Assets ({selectedIds.length})</h3>
                        <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-[#d13438] uppercase hover:underline">Purge All</button>
                      </div>
                      {cartArtworks.map(art => (
                        <div key={art.id} className="flex items-center gap-4 bg-white p-3 rounded-md border border-[#edebe9] shadow-sm group animate-in slide-in-from-bottom duration-300">
                          <div className="w-14 h-14 bg-[#f3f2f1] rounded overflow-hidden shrink-0">
                            <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-[#323130] truncate uppercase">{art.title}</h4>
                            <p className="text-[10px] font-bold text-[#605e5c] uppercase tracking-wider">{art.artist} • {art.code}</p>
                          </div>
                          <div className="text-right px-4">
                            <p className="text-sm font-black text-[#0078d4]">₱{art.price?.toLocaleString()}</p>
                          </div>
                          <button onClick={() => setSelectedIds(prev => prev.filter(id => id !== art.id))} className="p-2 text-[#a19f9d] hover:text-[#d13438] transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8">
                    {bulkActionModal.type === 'sale' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Client Identity</h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Client Name *</label>
                                <input autoFocus type="text" value={bulkActionValue} onChange={e => setBulkActionValue(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]" placeholder="Type client name..." />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Email Address</label>
                                  <input type="email" value={bulkClientEmail} onChange={e => setBulkClientEmail(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]" placeholder="email@address.com" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-[#605e5c] uppercase ml-1">Mobile / Contact <span className="text-[#a4262c]">*</span></label>
                                  <PhoneInput value={bulkClientContact} onChange={setBulkClientContact} className="h-11" />
                                </div>
                              </div>
                            </div>
                          </div>
  
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Event Alignment</h4>
                            <select value={bulkSaleEventId} onChange={e => setBulkSaleEventId(e.target.value)} className="w-full h-11 px-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130]">
                              <option value="">Select Event (Optional)...</option>
                              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                          </div>
  
                          <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-[#f3f2f1] pb-2">
                              <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest">Asset Registry & Item Terms</h4>
                              <span className="text-[10px] font-bold text-[#a19f9d] uppercase">{cartArtworks.length} Artifacts Staged</span>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {cartArtworks.map((art) => (
                                <div key={art.id} className="group flex items-start gap-4 p-5 bg-[#faf9f8] border border-[#edebe9] rounded-sm transition-all hover:bg-white hover:shadow-sm">
                                  <div className="w-20 h-20 bg-white border border-[#edebe9] rounded-sm overflow-hidden shrink-0 shadow-sm transition-colors group-hover:border-[#323130]">
                                    <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.title} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-1">
                                        <h5 className="text-[12px] font-black text-[#323130] uppercase leading-none truncate">{art.title}</h5>
                                        <p className="text-[10px] font-bold text-[#605e5c] uppercase opacity-60 leading-none truncate mt-2">{art.artist} • {art.code}</p>
                                        <div className="pt-2">
                                          <span className="px-2 py-0.5 bg-[#eff6fc] text-[#0078d4] text-[9px] font-black uppercase rounded-sm border border-[#deecf9]">SRP: ₱{art.price?.toLocaleString()}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col items-end gap-3 text-right">
                                        <div className="flex bg-[#edebe9] p-0.5 rounded-sm">
                                          {(['Full', 'DP'] as const).map(p => (
                                            <button 
                                              key={p} 
                                              onClick={() => setBulkSaleInstallmentsEnabled(prev => ({ ...prev, [art.id]: p === 'DP' }))}
                                              className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all ${
                                                (p === 'DP' ? bulkSaleInstallmentsEnabled[art.id] : !bulkSaleInstallmentsEnabled[art.id]) 
                                                  ? 'bg-[#323130] text-white shadow-md' 
                                                  : 'text-[#605e5c] hover:bg-[#e1dfdd]'
                                              }`}
                                            >
                                              {p}
                                            </button>
                                          ))}
                                        </div>
                                        
                                        {bulkSaleInstallmentsEnabled[art.id] && (
                                          <div className="flex flex-col items-end gap-1 animate-in slide-in-from-right-4">
                                            <span className="text-[9px] font-black text-[#605e5c] uppercase tracking-widest">Authorized Downpayment</span>
                                              <div className="relative group/input">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#323130]">₱</span>
                                                <input 
                                                  type="text" 
                                                  inputMode="numeric"
                                                  value={bulkSaleDownpayments[art.id] || '0'} 
                                                  onFocus={(e) => e.target.select()}
                                                  onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    const parts = val.split('.');
                                                    if (parts.length > 2) parts.splice(2);
                                                    if (parts[0] && parts[0].length > 1) parts[0] = parts[0].replace(/^0+/, '') || '0';
                                                    setBulkSaleDownpayments(prev => ({ ...prev, [art.id]: parts.join('.') }));
                                                  }}
                                                  className="w-40 h-10 pl-7 pr-4 bg-white border-2 border-[#edebe9] rounded-sm text-right text-sm font-black text-[#323130] focus:border-[#323130] transition-all outline-none" 
                                                />
                                              </div>
                                            <p className="text-[9px] font-bold text-[#a19f9d] uppercase">Remaining: ₱{(art.price - (parseFloat(bulkSaleDownpayments[art.id]) || 0)).toLocaleString()}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-6 flex flex-col items-center bg-[#f3f2f1]/40">
                          <div className="w-14 h-14 bg-white border border-[#edebe9] rounded-lg flex items-center justify-center shadow-sm mb-4 text-[#0078d4]">
                            <ShoppingBag size={28} />
                          </div>
                          <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.3em] mb-1">LOGISTICS GATE</p>
                          <h3 className="text-sm font-black text-[#323130] uppercase mb-8 text-center">Evidence Intake</h3>
  
                          <div className="w-full space-y-6">
                            <div className="flex bg-[#edebe9] p-0.5 rounded-sm">
                              {(['itdr', 'rsa', 'orcr'] as const).map(t => (
                                <button key={t} onClick={() => setActiveBulkAttachmentTab(t)} className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${activeBulkAttachmentTab === t ? 'bg-white text-[#0078d4]' : 'text-[#605e5c]'}`}>
                                  {t}
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
                                     <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`${activeBulkAttachmentTab.toUpperCase()}-${idx+1}`} />
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
  
                          <div className="mt-8 pt-8 border-t border-[#edebe9] w-full">
                            <label className="flex items-start gap-3 cursor-pointer">
                               <input type="checkbox" checked={bulkActionExtra} onChange={e => setBulkActionExtra(e.target.checked)} className="mt-1 w-4 h-4 rounded-sm border-[#c8c6c4] text-[#0078d4]" />
                               <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-[#323130] uppercase">LOGISTICS OVERRIDE</span>
                                 <span className="text-[9px] text-[#605e5c] mt-0.5 uppercase leading-tight font-bold">Declare Immediate Delivery</span>
                               </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
  
                    {bulkActionModal.type === 'reserve' && (
                      <div className="max-w-3xl mx-auto space-y-8">
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
  
                            <div className="p-6 bg-[#fff4ce] border border-[#fed44d] rounded-sm flex flex-col">
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
                                   setBulkTempItdr(prev => [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...results]);
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
                                    <img src={img} className="w-full h-full object-cover" alt={`TRANSFER-REF-${idx+1}`} />
                                    <button 
                                      onClick={() => setBulkTempItdr(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null)} 
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
  
                    {(bulkActionModal.type === 'framing' || bulkActionModal.type === 'return') && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-2 space-y-8">
                           {bulkActionModal.type === 'return' && (
                             <div className="flex bg-[#f3f2f1] p-1 rounded-sm border border-[#edebe9]">
                               <button onClick={() => setReturnType('Artist Reclaim')} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${returnType === 'Artist Reclaim' ? 'bg-[#d13438] text-white' : 'text-[#605e5c]'}`}>Artist Reclaim</button>
                               <button onClick={() => setReturnType('For Retouch')} className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-sm transition-all ${returnType === 'For Retouch' ? 'bg-[#0078d4] text-white' : 'text-[#605e5c]'}`}>For Retouch</button>
                             </div>
                           )}
  
                           <div className={`p-6 border rounded-sm border-l-4 ${bulkActionModal.type === 'framing' ? 'bg-[#fffaf0] border-[#ffb900] border-l-[#ffb900]' : (returnType === 'Artist Reclaim' ? 'bg-[#fff4f4] border-[#fde7e9] border-l-[#a4262c]' : 'bg-[#eff6fc] border-[#deecf9] border-l-[#0078d4]')}`}>
                              <div className="flex items-start gap-4">
                                 <AlertTriangle size={24} className={`${bulkActionModal.type === 'framing' ? 'text-[#ffb900]' : (returnType === 'Artist Reclaim' ? 'text-[#a4262c]' : 'text-[#0078d4]')}`} />
                                 <div>
                                   <h4 className="text-[11px] font-black text-[#323130] uppercase tracking-widest">{bulkActionModal.type === 'framing' ? 'Framing Service Authorization' : (returnType === 'Artist Reclaim' ? 'VOID Authorization' : 'Retouch Sequence Initiation')}</h4>
                                   <p className="text-[10px] font-medium text-[#605e5c] mt-1 leading-relaxed">
                                     {bulkActionModal.type === 'framing' ? 'Assets will transition to "For Framing" and drawn from active registry screens for audit compliance.' : (returnType === 'Artist Reclaim' ? 'This action triggers permanent inventory removal. Evidence IT/DR is mandatory for this gate.' : 'Assets will temporarily enter retouch sequence and remain excluded from active sales.')}
                                   </p>
                                 </div>
                              </div>
                           </div>
  
                           <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-[#605e5c] uppercase tracking-widest border-b border-[#f3f2f1] pb-2">Operational Workflow</h4>
                              <OptimizedTextarea value={bulkActionModal.type === 'framing' ? framerDamageDetails : returnReason} onChange={(e: any) => bulkActionModal.type === 'framing' ? setFramerDamageDetails(e.target.value) : setReturnReason(e.target.value)} className="w-full h-48 p-4 bg-[#faf9f8] border border-[#edebe9] rounded-sm text-sm font-bold text-[#323130] focus:bg-white transition-all resize-none" placeholder={bulkActionModal.type === 'framing' ? 'Detail frame requirements or damage assessment...' : 'Detail the professional rationale for protocol initiation...'} />
                           </div>
                         </div>
  
                         <div className="lg:col-span-1 border border-[#edebe9] rounded-md p-6 flex flex-col items-center bg-[#f3f2f1]/40">
                            <div className="w-14 h-14 bg-white border border-[#edebe9] rounded-lg flex items-center justify-center shadow-sm mb-4">
                               {bulkActionModal.type === 'framing' ? <Wrench className="text-[#0078d4]" size={28} /> : (returnType === 'Artist Reclaim' ? <Trash2 className="text-[#a4262c]" size={28} /> : <RotateCcw className="text-[#0078d4]" size={28} />)}
                            </div>
                            <p className="text-[10px] font-black text-[#a19f9d] uppercase tracking-[0.3em] mb-1">PROTOCOL GATE</p>
                            <h3 className="text-sm font-black text-[#323130] uppercase mb-8 text-center">{bulkActionModal.type === 'framing' ? 'Framer Dispatch' : (returnType === 'Artist Reclaim' ? 'Void Authorization' : 'Retouch Dispatch')}</h3>
  
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
                                      setBulkTempItdr(prev => [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...results]);
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
                                         <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`ART-REF-${idx+1}`} />
                                         <button 
                                           onClick={() => setBulkTempItdr(prev => Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null)} 
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
                               This sequence will permanently purge <span className="text-[#a4262c] font-black">{selectedIds.length} records</span> from the active registry. Audit logs will mark this as a manual system override.
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
  
              {/* Footer */}
              <div className="h-20 px-10 bg-[#faf9f8] border-t border-[#edebe9] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                   {!bulkActionModal ? (
                     <button onClick={() => { setIsCartOpen(false); resetBulkOperationalState(); }} className="flex items-center gap-2.5 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-[#605e5c] hover:bg-[#edebe9] transition-all rounded-sm border border-[#edebe9] bg-white">
                       <ArrowLeft size={16} strokeWidth={3} />
                       <span>Close Workspace</span>
                     </button>
                   ) : (
                     <button onClick={() => { setBulkActionModal(null); resetBulkOperationalState(); }} className="flex items-center gap-2.5 h-11 px-6 text-[11px] font-black uppercase tracking-widest text-[#605e5c] hover:bg-[#edebe9] transition-all rounded-sm border border-[#edebe9] bg-white">
                       <ShoppingBag size={16} strokeWidth={3} />
                       <span>Command Cart</span>
                     </button>
                   )}
                   <div className="flex flex-col border-l border-[#edebe9] pl-6">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a19f9d]">{bulkActionModal ? 'Operational Authorization' : 'Workspace Maintenance'}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">
                        {bulkActionModal ? `Sequence: ${bulkActionModal.type}` : `${selectedIds.length} Artifacts Staged`}
                      </span>
                   </div>
                 </div>
                 
                 {bulkActionModal && (
                   <button 
                     onClick={handleBulkActionSubmit}
                     disabled={
                       bulkActionModal.type === 'sale' ? (!bulkActionValue || !bulkClientContact || bulkClientContact.replace(/\D/g, '').length < 7 || selectedIds.some(id => bulkSaleInstallmentsEnabled[id] && !bulkSaleDownpayments[id])) :
                       bulkActionModal.type === 'reserve' ? (reservationTab === 'person' ? !reservationClient : (reservationTab === 'event' || reservationTab === 'auction') ? !reservationEventId : false) :
                       bulkActionModal.type === 'transfer' ? !bulkActionValue :
                       bulkActionModal.type === 'framing' ? !framerDamageDetails :
                       bulkActionModal.type === 'return' ? (!returnReason || (returnType === 'Artist Reclaim' && !bulkTempItdr)) :
                       false
                     }
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
    )}


      {previewImageUrl && (
        <Modal onClose={() => setPreviewImageUrl(null)} title="View Artwork">
          <img src={previewImageUrl} className="w-full h-auto rounded-xl" alt="Preview" />
        </Modal>
      )}

      {errorModal && (
        <Modal onClose={() => setErrorModal(null)} title={errorModal.title}>
          <div className="space-y-4 text-center py-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-2">
              <AlertCircle size={32} />
            </div>
            <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap">
              {errorModal.message}
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  if (errorModal.onConfirm) errorModal.onConfirm();
                  setErrorModal(null);
                }}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-sm font-bold shadow-sm transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}

      {createPortal(<LoadingOverlay isVisible={isProcessing} title={processMessage} progress={{ current: processProgress, total: 100 }} />, document.body)}
    </div>
  );
};

export default Inventory;
