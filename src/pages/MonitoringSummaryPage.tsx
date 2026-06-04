import React, { useState, useEffect, useMemo, useRef } from 'react';
import { utils, writeFile } from 'xlsx';
import {
  Artwork,
  SaleRecord,
  TransferRecord,
  ReturnRecord,
  MonitoringSummary,
  InventoryTransaction,
  ArtworkStatus
} from '../types';
import { supabase } from '../supabase';
import { mapToSnakeCase, mapFromSnakeCase } from '../utils/supabaseUtils';
import { generateUUID } from '../utils/idUtils';
import { 
  Calculator, Calendar, FileText, Trash2, ChevronDown, ChevronUp, Printer, 
  CheckCircle, Check, AlertCircle, Download, FileSpreadsheet, ImageIcon, 
  Edit, Save, Plus, X, Minus, Loader2, ArrowLeft, Filter, Shield, RotateCcw, ShoppingBag, Search
} from 'lucide-react';
import { ExportDropdown } from '../components/ExportDropdown';

interface MonitoringSummaryPageProps {
  artworks: Artwork[];
  sales: SaleRecord[];
  transfers: TransferRecord[];
  returns: ReturnRecord[];
  currentUser: any;
  onBack?: () => void;
  permissions?: any;
}

const MonitoringSummaryPage: React.FC<MonitoringSummaryPageProps> = ({
  artworks,
  sales,
  transfers,
  returns,
  currentUser,
  onBack,
  permissions: propPermissions
}) => {
  // Apply permissions filter
  const permissions = propPermissions || currentUser?.permissions;
  const filteredArtworks = useMemo(() => {
    return (artworks || []).filter(art => {
      // View Control Permissions
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

  const [currentSummary, setCurrentSummary] = useState<MonitoringSummary | null>(null);
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard State
  const [allSummaries, setAllSummaries] = useState<MonitoringSummary[]>([]);
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'exhibit' | 'auction'>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [rowSearchQuery, setRowSearchQuery] = useState('');

  // Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'single' | 'bulk'>('single');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editingSummary, setEditingSummary] = useState<MonitoringSummary | null>(null);

  const activeSummary = isEditing ? editingSummary : currentSummary;

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const uniqueClients = useMemo(() => {
    const clients = new Set<string>();
    allSummaries.forEach(s => {
      const allTransactions = [...(s.itemsIn || []), ...(s.itemsOutSold || []), ...(s.itemsOutTransfer || [])];
      allTransactions.forEach(t => {
        if (t.clientBranch) clients.add(t.clientBranch);
      });
    });
    return Array.from(clients).sort();
  }, [allSummaries]);

  // Derived state for filtered summaries
  const filteredSummaries = useMemo(() => {
    let result = [...allSummaries];
    
    if (filterMonth !== 'all') {
      result = result.filter(s => s.month === filterMonth);
    }
    if (filterYear !== 'all') {
      result = result.filter(s => s.year === filterYear);
    }
    if (filterClient !== 'all') {
      result = result.filter(s => {
        const allTransactions = [...(s.itemsIn || []), ...(s.itemsOutSold || []), ...(s.itemsOutTransfer || [])];
        return allTransactions.some(t => t.clientBranch === filterClient);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => {
        // Search report ID
        if (s.id.toLowerCase().includes(q)) return true;
        
        // Search transactions
        const allTransactions = [...(s.itemsIn || []), ...(s.itemsOutSold || []), ...(s.itemsOutTransfer || [])];
        return allTransactions.some(t => 
          (t.clientBranch || '').toLowerCase().includes(q) ||
          (t.referenceNo || '').toLowerCase().includes(q) ||
          (t.artworkTitle || '').toLowerCase().includes(q)
        );
      });
    }

    if (filterType !== 'all') {
      result = result.filter(s => {
        const allTransactions = [...(s.itemsIn || []), ...(s.itemsOutSold || []), ...(s.itemsOutTransfer || [])];
        return allTransactions.some(t => {
          const text = ((t.clientBranch || '') + ' ' + (t.referenceNo || '')).toLowerCase();
          if (filterType === 'exhibit') return text.includes('exhibit') || text.includes('exhibition');
          if (filterType === 'auction') return text.includes('auction');
          return true;
        });
      });
    }

    // Sort by date desc (newest first)
    result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    return result;
  }, [allSummaries, filterMonth, filterYear, searchQuery, filterType]);

  const loadDashboardData = async () => {
    setIsLoadingDashboard(true);
    try {
      const { data, error } = await supabase
        .from('monitoring_summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const summaries = mapFromSnakeCase(data || []) as MonitoringSummary[];
      setAllSummaries(summaries);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleDeleteSummary = () => {
    if (!currentSummary) return;
    setDeleteAction('single');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!currentSummary) return;
    try {
      const { error } = await supabase.from('monitoring_summaries').delete().eq('id', currentSummary.id);
      if (error) throw error;
      
      setCurrentSummary(null);
      setIsEditing(false);
      setEditingSummary(null);
      loadDashboardData(); // Refresh dashboard
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting summary:', error);
      alert('Failed to delete summary: ' + (error as any).message);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteAction('bulk');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBulk = async () => {
    setIsLoadingDashboard(true);
    try {
      const { error } = await supabase.from('monitoring_summaries').delete().in('id', Array.from(selectedIds));
      if (error) throw error;

      setSelectedIds(new Set());
      setIsSelectionMode(false);
      loadDashboardData();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error("Error deleting summaries:", err);
      alert("Failed to delete some summaries: " + err.message);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleConfirmPhysicalCheck = () => {
    if (!currentSummary) return;
    setIsCheckModalOpen(true);
  };

  const executePhysicalCheckConfirmation = async () => {
    if (!currentSummary) return;

    try {
      const updateData = {
        isPhysicalCheckConfirmed: true,
        physicalCheckConfirmedAt: new Date().toISOString(),
        physicalCheckConfirmedBy: currentUser?.name || 'Unknown'
      };

      const { error } = await supabase.from('monitoring_summaries').update(mapToSnakeCase(updateData)).eq('id', currentSummary.id);
      if (error) throw error;

      const updatedSummary = {
        ...currentSummary,
        ...updateData
      };
      setCurrentSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));

      setIsCheckModalOpen(false);
    } catch (error) {
      console.error("Error confirming physical check:", error);
      alert("Failed to confirm physical check.");
    }
  };

  const handleUndoPhysicalCheck = async () => {
    if (!currentSummary) return;
    if (!window.confirm("Are you sure you want to undo the verification?")) return;

    try {
      const updateData = {
        isPhysicalCheckConfirmed: false,
        physicalCheckConfirmedAt: undefined,
        physicalCheckConfirmedBy: undefined
      };

      const { error } = await supabase.from('monitoring_summaries').update(mapToSnakeCase(updateData)).eq('id', currentSummary.id);
      if (error) throw error;

      const updatedSummary = {
        ...currentSummary,
        ...updateData
      };

      setCurrentSummary(updatedSummary);
      setAllSummaries(prev => prev.map(s => s.id === updatedSummary.id ? updatedSummary : s));
    } catch (error) {
      console.error("Error undoing physical check:", error);
      alert("Failed to undo physical check.");
    }
  };

  const recalculateTotals = (summary: MonitoringSummary): MonitoringSummary => {
    const totalItemsIn = summary.itemsIn.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalItemsOutSold = summary.itemsOutSold.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalItemsOutTransfer = summary.itemsOutTransfer.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const beginningInventory = Number(summary.beginningInventory) || 0;
    const soldPiecesStillInGallery = Number(summary.soldPiecesStillInGallery) || 0;

    const availableInventory = beginningInventory + totalItemsIn - totalItemsOutSold - totalItemsOutTransfer;
    const totalInventory = availableInventory + soldPiecesStillInGallery;

    return {
      ...summary,
      totalItemsIn,
      totalItemsOutSold,
      totalItemsOutTransfer,
      availableInventory,
      totalInventory
    };
  };

  const handleAddSummary = async () => {
    const summaryId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.from('monitoring_summaries').select('*').eq('id', summaryId).single();

      let summaryToLoad: MonitoringSummary;

      if (data) {
        summaryToLoad = mapFromSnakeCase(data) as MonitoringSummary;
        setCurrentSummary(summaryToLoad);
        setEditingSummary(JSON.parse(JSON.stringify(summaryToLoad)));
        setIsEditing(true);
      } else {
        // Init new report (Empty Format)
        const newSummary: MonitoringSummary = {
          id: summaryId,
          month: selectedMonth,
          year: selectedYear,
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.name || 'System',
          beginningInventory: 0,
          totalItemsIn: 0,
          totalItemsOutSold: 0,
          totalItemsOutTransfer: 0,
          availableInventory: 0,
          soldPiecesStillInGallery: 0,
          totalInventory: 0,
          itemsIn: [],
          itemsOutSold: [],
          itemsOutTransfer: []
        };
        // We don't save yet, just set local state
        setCurrentSummary(newSummary);
        setEditingSummary(newSummary);
        setIsEditing(true);
      }
      setIsTallyModalOpen(false);
    } catch (err: any) {
      console.error("Error loading summary:", err);
      setError("Failed to load summary: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReport = () => {
    if (!currentSummary) return;
    setEditingSummary(JSON.parse(JSON.stringify(currentSummary))); // Deep copy
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (window.confirm('Discard unsaved changes?')) {
      setIsEditing(false);
      setEditingSummary(null);
      // If we were creating a new one (currentSummary might not exist in DB yet), 
      // check if it exists in allSummaries to determine if we should go back to dashboard
      const exists = allSummaries.find(s => s.id === currentSummary?.id);
      if (!exists) {
        setCurrentSummary(null); // Go back to dashboard
      }
    }
  };

  const handleBackToDashboard = () => {
    if (isEditing) {
      if (window.confirm('Discard unsaved changes?')) {
        setIsEditing(false);
        setEditingSummary(null);
        setCurrentSummary(null);
      }
    } else {
      setCurrentSummary(null);
    }
  };

  const handleSaveReport = async () => {
    if (!editingSummary) return;
    setIsLoading(true);
    setError(null);

    try {
      const finalSummary = recalculateTotals(editingSummary);
      
      const { error } = await supabase
        .from('monitoring_summaries')
        .upsert(mapToSnakeCase(finalSummary));

      if (error) throw error;

      setIsEditing(false);
      setEditingSummary(null);
      setCurrentSummary(finalSummary);
      await loadDashboardData(); // Refresh list
    } catch (err: any) {
      console.error('Error saving summary:', err);
      setError('Failed to save summary: ' + err.message);
      alert('Failed to save summary: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof MonitoringSummary, value: any) => {
    if (!editingSummary) return;
    const updated = { ...editingSummary, [field]: value };
    setEditingSummary(recalculateTotals(updated));
  };

  const updateRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer', index: number, field: keyof InventoryTransaction, value: any) => {
    if (!editingSummary) return;
    const list = [...editingSummary[section]];
    list[index] = { ...list[index], [field]: value };
    const updated = { ...editingSummary, [section]: list };
    setEditingSummary(recalculateTotals(updated));
  };

  const addRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer') => {
    if (!editingSummary) return;
    const newRow: InventoryTransaction = {
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      type: section === 'itemsIn' ? 'IN' : section === 'itemsOutSold' ? 'SOLD' : 'PULLOUT',
      quantity: 1,
      referenceNo: '',
      clientBranch: '',
      artworkTitle: '',
      artworkCode: '',
      artworkId: ''
    };
    const updated = { ...editingSummary, [section]: [...editingSummary[section], newRow] };
    setEditingSummary(recalculateTotals(updated));
  };

  const removeRow = (section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer', index: number) => {
    if (!editingSummary) return;
    const list = [...editingSummary[section]];
    list.splice(index, 1);
    const updated = { ...editingSummary, [section]: list };
    setEditingSummary(recalculateTotals(updated));
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = () => {
    if (!currentSummary) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const workbook = utils.book_new();

        // Sheet 1: Summary Overview
        const summaryData = [
          ['Monitoring Summary Report'],
          ['Period', `${getMonthName(currentSummary.month)} ${currentSummary.year}`],
          ['Generated By', currentSummary.createdBy],
          ['Date Generated', new Date(currentSummary.createdAt).toLocaleDateString()],
          ['Reference ID', currentSummary.id],
          [''],
          ['METRICS', 'VALUE'],
          ['Beginning Inventory', currentSummary.beginningInventory],
          ['Total Items In', currentSummary.totalItemsIn],
          ['Total Items Out (Sold)', currentSummary.totalItemsOutSold],
          ['Total Items Out (Transfer)', currentSummary.totalItemsOutTransfer],
          ['Available Inventory', currentSummary.availableInventory],
          ['Sold Pieces (Still In Gallery)', currentSummary.soldPiecesStillInGallery],
          ['Total Inventory', currentSummary.totalInventory]
        ];
        const wsSummary = utils.aoa_to_sheet(summaryData);
        utils.book_append_sheet(workbook, wsSummary, 'Summary Overview');

        // Helper to format rows
        const formatRows = (rows: InventoryTransaction[]) => rows.map(item => ({
          Date: item.date,
          'IT/DR #': item.referenceNo,
          'Client/Branch': item.clientBranch,
          'Quantity': item.quantity
        }));

        if (currentSummary.itemsIn.length > 0) {
          const wsIn = utils.json_to_sheet(formatRows(currentSummary.itemsIn));
          utils.book_append_sheet(workbook, wsIn, 'Items In');
        }

        if (currentSummary.itemsOutSold.length > 0) {
          const wsSold = utils.json_to_sheet(formatRows(currentSummary.itemsOutSold));
          utils.book_append_sheet(workbook, wsSold, 'Items Out (Sold)');
        }

        if (currentSummary.itemsOutTransfer.length > 0) {
          const wsTransfer = utils.json_to_sheet(formatRows(currentSummary.itemsOutTransfer));
          utils.book_append_sheet(workbook, wsTransfer, 'Items Out (Transfer)');
        }

        writeFile(workbook, `Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.xlsx`);
      } catch (error) {
        console.error("Export error", error);
        alert("Failed to generate Excel file.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const handleExportPDF = async () => {
    if (!currentSummary) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const element = document.getElementById('monitoring-report-content');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        logging: false
      });

      // Use canvas directly to avoid "Invalid string length" errors
      const imgData = canvas;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [612, 936]
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'NONE');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.pdf`);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Could not export PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (!currentSummary) return;
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const element = document.getElementById('monitoring-report-content');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      const link = document.createElement('a');
      link.download = `Monitoring_Summary_${getMonthName(currentSummary.month)}_${currentSummary.year}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Could not export image.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderTransactionRow = (
    item: InventoryTransaction,
    idx: number,
    section: 'itemsIn' | 'itemsOutSold' | 'itemsOutTransfer'
  ) => {
    if (isEditing) {
      return (
        <div key={`${section}-${idx}`} className="grid grid-cols-12 border-b border-neutral-100 text-xs bg-white hover:bg-neutral-50 group transition-colors">
          <div className="col-span-1 px-3 py-2 border-r border-neutral-100 flex items-center justify-center">
            <button 
              onClick={() => removeRow(section, idx)} 
              className="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
              title="Remove Row"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="col-span-2 px-3 py-2 border-r border-neutral-100">
            <input
              type="date"
              value={item.date}
              onChange={(e) => updateRow(section, idx, 'date', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-medium text-neutral-900"
            />
          </div>
          <div className="col-span-3 px-3 py-2 border-r border-neutral-100">
            <input
              type="text"
              value={item.referenceNo}
              onChange={(e) => updateRow(section, idx, 'referenceNo', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-bold text-neutral-900 placeholder:neutral-300"
              placeholder="IT/DR #"
            />
          </div>
          <div className="col-span-5 px-3 py-2 border-r border-neutral-100">
            <input
              type="text"
              value={item.clientBranch}
              onChange={(e) => updateRow(section, idx, 'clientBranch', e.target.value)}
              className="w-full bg-transparent focus:outline-none font-medium text-neutral-600 placeholder:neutral-300"
              placeholder="Client/Branch Allocation"
            />
          </div>
          <div className="col-span-1 px-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              value={item.quantity}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                updateRow(section, idx, 'quantity', Math.max(1, parseInt(val, 10) || 0));
              }}
              className="w-full bg-transparent focus:outline-none font-black text-neutral-900 text-center"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={`${section}-${idx}`} className="grid grid-cols-12 border-b border-neutral-100 text-[11px] bg-white group hover:bg-neutral-50/50 transition-colors">
        <div className="col-span-1 px-3 py-2.5 border-r border-neutral-100 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-200 group-hover:bg-neutral-400 transition-colors" />
        </div>
        <div className="col-span-2 px-3 py-2.5 border-r border-neutral-100 text-neutral-500 font-medium">{item.date}</div>
        <div className="col-span-3 px-3 py-2.5 border-r border-neutral-100 text-neutral-900 font-bold tracking-tight">{item.referenceNo}</div>
        <div className="col-span-5 px-3 py-2.5 border-r border-neutral-100 text-neutral-600 font-medium truncate">{item.clientBranch || '-'}</div>
        <div className="col-span-1 px-3 py-2.5 text-center font-black text-neutral-900">{item.quantity}</div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {!activeSummary && onBack && (
              <button
                onClick={onBack}
                className="bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 p-2 rounded-md transition-colors shadow-sm"
                title="Back to Inventory"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Calculator className="text-neutral-900" size={24} />
              Monitoring Summary
            </h1>
          </div>
          <p className="text-neutral-500 font-medium ml-12">Monthly inventory reports.</p>
        </div>

        <div className="flex items-center gap-2">
          {error && (
            <div className="mr-4 text-red-600 text-sm bg-red-50 px-3 py-1 rounded-sm border border-red-200">
              {error}
            </div>
          )}

          {activeSummary ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToDashboard}
                className="bg-white border border-neutral-200 text-neutral-600 px-4 py-3 rounded-md font-bold hover:bg-neutral-50 transition-colors flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              {isEditing && (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-white border border-neutral-200 text-neutral-600 px-6 py-3 rounded-md font-bold hover:bg-neutral-50 transition-colors flex items-center gap-2"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveReport}
                    className="bg-green-600 text-white px-6 py-3 rounded-md font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-600/20"
                  >
                    <Save size={18} />
                    <span>Save Report</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsTallyModalOpen(true)}
              className="bg-neutral-900 text-white px-6 py-3 rounded-md font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-lg shadow-neutral-900/20"
            >
              <Plus size={18} />
              <span>Add Summary</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-white rounded-md border border-neutral-100 shadow-xl shadow-neutral-200/50">
        {activeSummary ? (
          <div className="flex-1 flex flex-col overflow-hidden overflow-x-auto custom-scrollbar">
            <div id="monitoring-report-content" className="flex-1 p-8 bg-white min-w-[800px]">
              {/* Report Header */}
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-200">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-neutral-900 uppercase tracking-wide">INVENTORY MONITORING FORM</h2>
                    {activeSummary.isPhysicalCheckConfirmed && (
                      <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-sm text-xs font-bold border border-emerald-200">
                        <Shield size={14} className="fill-emerald-600 text-white" />
                        Verified by {activeSummary.physicalCheckConfirmedBy || 'Unknown'}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-600 mt-1">As of {getMonthName(activeSummary.month)} {activeSummary.year}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                    {!isEditing && (
                      <>
                      <div className="relative group" data-html2canvas-ignore="true">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-neutral-600 transition-colors" size={14} />
                        <input
                          type="text"
                          placeholder="Search rows..."
                          value={rowSearchQuery}
                          onChange={(e) => setRowSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-neutral-100 border-none rounded-lg text-[11px] font-bold w-40 focus:w-64 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-300 outline-none"
                        />
                      </div>
                      <div className="h-6 w-px bg-neutral-200 mx-1" data-html2canvas-ignore="true"></div>
                      <button
                        onClick={handleDeleteSummary}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete this report"
                        data-html2canvas-ignore="true"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="h-6 w-px bg-neutral-200 mx-1" data-html2canvas-ignore="true"></div>
                      <button
                        onClick={handleEditReport}
                        className="flex items-center space-x-2 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-md hover:bg-neutral-200 transition-colors font-bold text-sm"
                        data-html2canvas-ignore="true"
                      >
                        <Edit size={16} />
                        <span>Edit Report</span>
                      </button>

                        {!activeSummary.isPhysicalCheckConfirmed ? (
                          <button
                            onClick={handleConfirmPhysicalCheck}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-bold text-sm shadow-md shadow-indigo-600/20 ml-2"
                          >
                            <Shield size={16} />
                            <span>Confirm Physical Check</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleUndoPhysicalCheck}
                            className="flex items-center space-x-2 bg-neutral-100 text-neutral-600 px-4 py-2 rounded-md hover:bg-neutral-200 hover:text-red-600 transition-colors font-bold text-sm ml-2"
                            title="Undo Verification"
                          >
                            <RotateCcw size={16} />
                            <span>Undo Verify</span>
                          </button>
                        )}
                      </>
                    )}
                    {propPermissions?.canExportArtwork && (
                      <div className="print:hidden">
                        <ExportDropdown
                          onExportExcel={handleExportExcel}
                          onExportPDF={handleExportPDF}
                          onExportImage={handleExportImage}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CLASSIC SPREADSHEET FORM LAYOUT */}
              <div className="bg-gradient-to-b from-blue-50/80 to-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-8 pb-6 flex-1 flex flex-col">
                  {/* Form Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-black text-neutral-800 uppercase tracking-wide">INVENTORY MONITORING FORM</h2>
                        {activeSummary.isPhysicalCheckConfirmed && (
                          <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-[10px] font-bold border border-emerald-200">
                            <Shield size={12} className="fill-emerald-600 text-white" />
                            Verified by {activeSummary.physicalCheckConfirmedBy || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-sm mt-1">As of {getMonthName(activeSummary.month)} {activeSummary.year}</p>
                    </div>
                  </div>

                  {/* Main Table */}
                  <div className="border border-blue-200/60 rounded-lg overflow-hidden bg-white">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 bg-white border-b-2 border-blue-200/60 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                      <div className="col-span-1 px-4 py-3 border-r border-blue-100/60"></div>
                      <div className="col-span-3 px-4 py-3 border-r border-blue-100/60 text-center">DATE</div>
                      <div className="col-span-3 px-4 py-3 border-r border-blue-100/60 text-center">IT / DR#</div>
                      <div className="col-span-3 px-4 py-3 border-r border-blue-100/60 text-center">CLIENT / BRANCH</div>
                      <div className="col-span-2 px-4 py-3 text-center">No. of Items</div>
                    </div>

                    {/* Beginning Inventory Row */}
                    <div className="grid grid-cols-12 bg-blue-50/80 border-b border-blue-200/40">
                      <div className="col-span-10 px-4 py-3 font-bold text-neutral-800 text-sm italic">Beginning Inventory</div>
                      <div className="col-span-2 px-4 py-2 flex items-center justify-center">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={(editingSummary as any).beginningInventory}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateField('beginningInventory', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                            className="w-20 text-center bg-white border border-blue-200 rounded px-2 py-1 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="inline-block w-20 text-center bg-white border border-blue-200 rounded px-2 py-1 text-sm font-bold text-neutral-900">{activeSummary.beginningInventory}</span>
                        )}
                      </div>
                    </div>

                    {/* Items In Section */}
                    <div className="border-b border-blue-200/40">
                      <div className="grid grid-cols-12 bg-white">
                        <div className="col-span-10 px-4 py-2.5">
                          <span className="text-sm font-bold text-red-600 italic">Items In</span>
                        </div>
                        <div className="col-span-2 px-4 py-2 flex items-center justify-end">
                          {isEditing && (
                            <button onClick={() => addRow('itemsIn')} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                              <Plus size={12} /> Add Row
                            </button>
                          )}
                        </div>
                      </div>
                      {activeSummary.itemsIn
                        .filter(item => {
                          if (filterClient !== 'all' && item.clientBranch !== filterClient) return false;
                          if (filterType === 'exhibit') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('exhibit') && !text.includes('exhibition')) return false;
                          }
                          if (filterType === 'auction') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('auction')) return false;
                          }
                          if (!rowSearchQuery.trim()) return true;
                          const q = rowSearchQuery.toLowerCase();
                          return (item.referenceNo || '').toLowerCase().includes(q) ||
                            (item.clientBranch || '').toLowerCase().includes(q) ||
                            (item.artworkTitle || '').toLowerCase().includes(q);
                        })
                        .map((item, idx) => (
                        <div key={`in-${idx}`} className="grid grid-cols-12 border-t border-blue-100/40 bg-white hover:bg-blue-50/30 transition-colors">
                          <div className="col-span-1 px-4 py-2 border-r border-blue-100/40 flex items-center justify-center">
                            {isEditing ? (
                              <button onClick={() => removeRow('itemsIn', idx)} className="text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            ) : (
                              <span className="text-[10px] text-neutral-300">{idx + 1}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="date" value={item.date} onChange={(e) => updateRow('itemsIn', idx, 'date', e.target.value)} className="w-full bg-transparent text-sm text-neutral-700 focus:outline-none" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.date}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.referenceNo} onChange={(e) => updateRow('itemsIn', idx, 'referenceNo', e.target.value)} placeholder="IT/DR #" className="w-full bg-transparent text-sm font-bold text-neutral-800 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-800">{item.referenceNo}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.clientBranch} onChange={(e) => updateRow('itemsIn', idx, 'clientBranch', e.target.value)} placeholder="Client/Branch" className="w-full bg-transparent text-sm text-neutral-600 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.clientBranch || '-'}</span>
                            )}
                          </div>
                          <div className="col-span-2 px-4 py-2 text-center">
                            {isEditing ? (
                              <input type="text" inputMode="numeric" value={item.quantity} onFocus={(e) => e.target.select()} onChange={(e) => updateRow('itemsIn', idx, 'quantity', Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="w-16 mx-auto block text-center bg-transparent text-sm font-bold text-neutral-900 focus:outline-none border-b border-neutral-200 focus:border-blue-400" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-900">{item.quantity}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Items Out (SOLD) Section */}
                    <div className="border-b border-blue-200/40">
                      <div className="grid grid-cols-12 bg-white">
                        <div className="col-span-10 px-4 py-2.5">
                          <span className="text-sm font-bold text-red-600 italic">Items Out (SOLD)</span>
                        </div>
                        <div className="col-span-2 px-4 py-2 flex items-center justify-end">
                          {isEditing && (
                            <button onClick={() => addRow('itemsOutSold')} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                              <Plus size={12} /> Add Row
                            </button>
                          )}
                        </div>
                      </div>
                      {activeSummary.itemsOutSold
                        .filter(item => {
                          if (filterClient !== 'all' && item.clientBranch !== filterClient) return false;
                          if (filterType === 'exhibit') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('exhibit') && !text.includes('exhibition')) return false;
                          }
                          if (filterType === 'auction') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('auction')) return false;
                          }
                          if (!rowSearchQuery.trim()) return true;
                          const q = rowSearchQuery.toLowerCase();
                          return (item.referenceNo || '').toLowerCase().includes(q) ||
                            (item.clientBranch || '').toLowerCase().includes(q) ||
                            (item.artworkTitle || '').toLowerCase().includes(q);
                        })
                        .map((item, idx) => (
                        <div key={`sold-${idx}`} className="grid grid-cols-12 border-t border-blue-100/40 bg-white hover:bg-blue-50/30 transition-colors">
                          <div className="col-span-1 px-4 py-2 border-r border-blue-100/40 flex items-center justify-center">
                            {isEditing ? (
                              <button onClick={() => removeRow('itemsOutSold', idx)} className="text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            ) : (
                              <span className="text-[10px] text-neutral-300">{idx + 1}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="date" value={item.date} onChange={(e) => updateRow('itemsOutSold', idx, 'date', e.target.value)} className="w-full bg-transparent text-sm text-neutral-700 focus:outline-none" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.date}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.referenceNo} onChange={(e) => updateRow('itemsOutSold', idx, 'referenceNo', e.target.value)} placeholder="IT/DR #" className="w-full bg-transparent text-sm font-bold text-neutral-800 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-800">{item.referenceNo}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.clientBranch} onChange={(e) => updateRow('itemsOutSold', idx, 'clientBranch', e.target.value)} placeholder="Client/Branch" className="w-full bg-transparent text-sm text-neutral-600 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.clientBranch || '-'}</span>
                            )}
                          </div>
                          <div className="col-span-2 px-4 py-2 text-center">
                            {isEditing ? (
                              <input type="text" inputMode="numeric" value={item.quantity} onFocus={(e) => e.target.select()} onChange={(e) => updateRow('itemsOutSold', idx, 'quantity', Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="w-16 mx-auto block text-center bg-transparent text-sm font-bold text-neutral-900 focus:outline-none border-b border-neutral-200 focus:border-blue-400" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-900">{item.quantity}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Items Out (Transfer and Pullout) Section */}
                    <div className="border-b border-blue-200/40">
                      <div className="grid grid-cols-12 bg-white">
                        <div className="col-span-10 px-4 py-2.5">
                          <span className="text-sm font-bold text-red-600 italic">Items out (Transfer and Pullout)</span>
                        </div>
                        <div className="col-span-2 px-4 py-2 flex items-center justify-end">
                          {isEditing && (
                            <button onClick={() => addRow('itemsOutTransfer')} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors">
                              <Plus size={12} /> Add Row
                            </button>
                          )}
                        </div>
                      </div>
                      {activeSummary.itemsOutTransfer
                        .filter(item => {
                          if (filterClient !== 'all' && item.clientBranch !== filterClient) return false;
                          if (filterType === 'exhibit') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('exhibit') && !text.includes('exhibition')) return false;
                          }
                          if (filterType === 'auction') {
                            const text = ((item.clientBranch || '') + ' ' + (item.referenceNo || '')).toLowerCase();
                            if (!text.includes('auction')) return false;
                          }
                          if (!rowSearchQuery.trim()) return true;
                          const q = rowSearchQuery.toLowerCase();
                          return (item.referenceNo || '').toLowerCase().includes(q) ||
                            (item.clientBranch || '').toLowerCase().includes(q) ||
                            (item.artworkTitle || '').toLowerCase().includes(q);
                        })
                        .map((item, idx) => (
                        <div key={`transfer-${idx}`} className="grid grid-cols-12 border-t border-blue-100/40 bg-white hover:bg-blue-50/30 transition-colors">
                          <div className="col-span-1 px-4 py-2 border-r border-blue-100/40 flex items-center justify-center">
                            {isEditing ? (
                              <button onClick={() => removeRow('itemsOutTransfer', idx)} className="text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            ) : (
                              <span className="text-[10px] text-neutral-300">{idx + 1}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="date" value={item.date} onChange={(e) => updateRow('itemsOutTransfer', idx, 'date', e.target.value)} className="w-full bg-transparent text-sm text-neutral-700 focus:outline-none" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.date}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.referenceNo} onChange={(e) => updateRow('itemsOutTransfer', idx, 'referenceNo', e.target.value)} placeholder="IT/DR #" className="w-full bg-transparent text-sm font-bold text-neutral-800 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-800">{item.referenceNo}</span>
                            )}
                          </div>
                          <div className="col-span-3 px-4 py-2 border-r border-blue-100/40">
                            {isEditing ? (
                              <input type="text" value={item.clientBranch} onChange={(e) => updateRow('itemsOutTransfer', idx, 'clientBranch', e.target.value)} placeholder="Client/Branch" className="w-full bg-transparent text-sm text-neutral-600 focus:outline-none placeholder:text-neutral-300" />
                            ) : (
                              <span className="text-sm text-neutral-600">{item.clientBranch || '-'}</span>
                            )}
                          </div>
                          <div className="col-span-2 px-4 py-2 text-center">
                            {isEditing ? (
                              <input type="text" inputMode="numeric" value={item.quantity} onFocus={(e) => e.target.select()} onChange={(e) => updateRow('itemsOutTransfer', idx, 'quantity', Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))} className="w-16 mx-auto block text-center bg-transparent text-sm font-bold text-neutral-900 focus:outline-none border-b border-neutral-200 focus:border-blue-400" />
                            ) : (
                              <span className="text-sm font-bold text-neutral-900">{item.quantity}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Available Row */}
                    <div className="grid grid-cols-12 bg-white border-b border-blue-200/40">
                      <div className="col-span-10 px-4 py-3 font-bold text-neutral-800 text-sm">Available</div>
                      <div className="col-span-2 px-4 py-3 text-center font-bold text-neutral-900 text-sm">{activeSummary.availableInventory}</div>
                    </div>

                    {/* Sold pieces still in Gallery Row */}
                    <div className="grid grid-cols-12 bg-white border-b border-blue-200/40">
                      <div className="col-span-10 px-4 py-3 font-bold text-neutral-800 text-sm">Sold pieces that still in the Gallery</div>
                      <div className="col-span-2 px-4 py-2 flex items-center justify-center">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={(editingSummary as any).soldPiecesStillInGallery}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateField('soldPiecesStillInGallery', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                            className="w-20 text-center bg-white border border-blue-200 rounded px-2 py-1 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="inline-block w-20 text-center bg-white border border-blue-200 rounded px-2 py-1 text-sm font-bold text-neutral-900">{activeSummary.soldPiecesStillInGallery}</span>
                        )}
                      </div>
                    </div>

                    {/* Total Inventory Row */}
                    <div className="grid grid-cols-12 bg-white border-b border-blue-200/40">
                      <div className="col-span-10 px-4 py-3 font-bold text-red-600 text-sm italic">Total Inventory</div>
                      <div className="col-span-2 px-4 py-3 text-center font-bold text-red-600 text-sm">{activeSummary.totalInventory}</div>
                    </div>

                    {/* As of Footer */}
                    <div className="grid grid-cols-12 bg-white">
                      <div className="col-span-12 px-4 py-2.5">
                        <span className="text-sm text-red-500 italic">
                          As of {new Date(activeSummary.year, activeSummary.month, 0).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-8">
            {/* Dashboard View */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-neutral-900">Saved Reports</h2>
                {filteredSummaries.length > 0 && (
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedIds(new Set());
                    }}
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                  >
                    {isSelectionMode ? 'Cancel Selection' : 'Select'}
                  </button>
                )}
                {isSelectionMode && selectedIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="text-sm font-bold px-3 py-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedIds.size})
                  </button>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by client, event, or artwork..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm font-medium w-full md:w-64 focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('exhibit')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'exhibit' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Exhibits
                  </button>
                  <button
                    onClick={() => setFilterType('auction')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filterType === 'auction' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Auctions
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="bg-transparent text-sm font-bold text-neutral-600 px-3 py-1.5 focus:outline-none cursor-pointer max-w-[150px]"
                  >
                    <option value="all">All Clients</option>
                    {uniqueClients.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-neutral-600 px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-neutral-300"></div>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-neutral-600 px-3 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Years</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isLoadingDashboard ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-neutral-900" size={32} />
                <p className="text-neutral-500 font-medium">Loading reports...</p>
              </div>
            ) : filteredSummaries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                {filteredSummaries.map((summary) => (
                  <div
                    key={summary.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(summary.id);
                      } else {
                        setCurrentSummary(summary);
                      }
                    }}
                    className={`flex flex-col text-left bg-white border p-6 rounded-2xl transition-all group relative cursor-pointer ${isSelectionMode && selectedIds.has(summary.id)
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-500 bg-blue-50/10'
                      : 'border-neutral-200 hover:border-neutral-900 hover:shadow-lg hover:shadow-neutral-900/5'
                      }`}
                  >
                    {isSelectionMode && (
                      <div className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.has(summary.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-neutral-300 bg-white'
                        }`}>
                        {selectedIds.has(summary.id) && <CheckCircle size={14} className="text-white" />}
                      </div>
                    )}

                    <div className="flex justify-between items-start w-full mb-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {summary.year}
                        </div>
                        {summary.isPhysicalCheckConfirmed && (
                          <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Shield size={12} className="fill-emerald-600 text-white" />
                            <span>Verified by {summary.physicalCheckConfirmedBy || 'Unknown'}</span>
                          </div>
                        )}
                      </div>
                      {!isSelectionMode && (
                        <FileText size={20} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">
                      {getMonthName(summary.month)}
                    </h3>
                    <div className="text-sm text-neutral-500 flex flex-col gap-1 mt-auto pt-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                        Created by {summary.createdBy?.split(' ')[0] || 'System'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs opacity-70">
                        {new Date(summary.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                <Calculator size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">No reports found.</p>
                <button
                  onClick={() => setIsTallyModalOpen(true)}
                  className="mt-4 bg-neutral-100 text-neutral-900 px-6 py-2 rounded-md font-bold hover:bg-neutral-200 transition-colors"
                >
                  Create New Report
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tally Modal */}
      {isTallyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black mb-2">Create New Summary</h2>
            <p className="text-neutral-500 mb-6">Select the month and year for the report.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full p-3 rounded-md border border-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsTallyModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSummary}
                className="flex-1 py-3 bg-neutral-900 text-white font-bold rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                Create & Edit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 mb-2">Confirm Deletion</h2>
              <p className="text-neutral-500">
                {deleteAction === 'bulk'
                  ? `Are you sure you want to permanently delete ${selectedIds.size} selected summaries? This action cannot be undone.`
                  : 'Are you sure you want to permanently delete this summary? This action cannot be undone.'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAction === 'bulk' ? confirmDeleteBulk : confirmDeleteSingle}
                disabled={isLoadingDashboard}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingDashboard ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Physical Check Confirmation Modal */}
      {isCheckModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-md p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-black text-neutral-900 mb-2">Confirm Physical Check</h2>
              <p className="text-neutral-500">
                Are you sure you want to confirm the physical inventory check? This will mark the report as verified and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCheckModalOpen(false)}
                className="flex-1 py-3 font-bold text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executePhysicalCheckConfirmation}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringSummaryPage;
