import React, { useState, useRef, useMemo } from 'react';
import { ImportRecord, Artwork, UserPermissions } from '../types';
import { Search, FileSpreadsheet, Clock, Download, CheckCircle, AlertCircle, HelpCircle, Shield, ShieldAlert, Trash2, X, CheckSquare, Square, Copy, RefreshCw, FileText, Image as ImageIcon, ArrowRightLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { Modal } from '../components/Modal';

interface ImportHistoryPageProps {
  logs: ImportRecord[];
  preventDuplicates: boolean;
  onTogglePreventDuplicates: (val: boolean) => void;
  onDeleteLogs: (ids: string[]) => void;
  artworks: Artwork[];
  onViewArtwork: (artwork: Artwork) => void;
  userPermissions?: UserPermissions;
}

const ImportHistoryPage: React.FC<ImportHistoryPageProps> = ({ logs, preventDuplicates, onTogglePreventDuplicates, onDeleteLogs, artworks, onViewArtwork, userPermissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [analyzingLog, setAnalyzingLog] = useState<ImportRecord | null>(null);
  const [comparingLogs, setComparingLogs] = useState<[ImportRecord, ImportRecord] | null>(null);
  const [analysisTab, setAnalysisTab] = useState<'imported' | 'repeating' | 'failed'>('imported');
  const printRef = useRef<HTMLDivElement>(null);

  const permittedArtworks = useMemo(() => {
    return artworks.filter(art => {
      // Permission Checks
      const permissions = userPermissions || {
        canViewReserved: true,
        canViewSalesHistory: true,
        canViewExhibit: true,
        canViewForFraming: true,
        canViewBackToArtist: true,
        canViewAuctioned: true,
        canAddArtwork: true,
        canEditArtwork: true,
        canManageAccounts: true,
        canManageEvents: true,
        canAccessCertificate: true,
        canAttachITDR: true,
        canDeleteArtwork: true,
        canSellArtwork: true,
        canReserveArtwork: true,
        canTransferArtwork: true
      };

      const canViewReserved = permissions.canViewReserved;
      const canViewAuctioned = permissions.canViewAuctioned;
      const canViewExhibit = permissions.canViewExhibit;

      // Check specific statuses
      if (art.status === 'Reserved' && !canViewReserved) return false;
      if (art.status === 'Sold' && !permissions.canViewSalesHistory) return false;
      if (art.status === 'For Framing' && !permissions.canViewForFraming) return false;
      if (art.status === 'For Retouch' && !permissions.canViewBackToArtist) return false; // Assuming Retouch is related to BackToArtist or similar? 
      // Actually Retouch/Artist Reclaim are 'Return' types.
      // Let's check ReturnToArtistView usage. It uses canViewBackToArtist.
      // And status might be 'For Retouch' or just implicitly returned.
      // But ImportHistory just shows status.

      // Standard Remark Checks for Reservations
      const remarks = art.remarks || '';
      const isAuction = remarks.includes('[Reserved For Auction:');
      const isEvent = remarks.includes('[Reserved For Event:');

      if (isAuction && !canViewAuctioned) return false;
      if (isEvent && !canViewExhibit) return false;

      return true;
    });
  }, [artworks, userPermissions]);

  const filteredLogs = logs.filter(log => {
    return (
      log.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.importedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogs(newSelected);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Import_History_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportImage = async () => {
    if (!printRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `Import_History_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Failed to generate image. Please try again.');
    }
  };

  const exportImportLogs = (logsToExport = filteredLogs) => {
    const headers = ['Timestamp', 'Filename', 'Imported By', 'Record Count', 'Status', 'Details'];
    const rows = logsToExport.map(log => {
      return [
        log.timestamp,
        `"${log.filename}"`,
        `"${log.importedBy}"`,
        log.recordCount,
        log.status,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ArtisFlow_ImportHistory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLogArtworks = (log: ImportRecord, type: 'imported' | 'updated') => {
    const updatedIds = log.updatedIds || [];
    const allImportedIds = log.importedIds || [];

    if (type === 'updated') {
      if (!updatedIds.length) return [];
      return artworks.filter(a => updatedIds.includes(a.id));
    } else {
      // For 'imported', we show ONLY the new items (exclude updated/repeating ones)
      const newIds = allImportedIds.filter(id => !updatedIds.includes(id));
      if (!newIds.length) return [];
      return artworks.filter(a => newIds.includes(a.id));
    }
  };

  const getNewImportCount = (log: ImportRecord) => {
    if (log.importedIds && log.importedIds.length > 0) {
      return log.importedIds.length;
    }
    const importedCount = log.importedIds?.length || 0;
    const updatedCount = log.updatedIds?.length || 0;
    if (importedCount > 0 || updatedCount > 0) return Math.max(importedCount - updatedCount, 0);
    if (typeof log.successCount === 'number') return log.successCount;
    if (typeof log.failCount === 'number') return Math.max((log.recordCount || 0) - log.failCount, 0);
    return log.status === 'Failed' ? 0 : log.recordCount || 0;
  };

  const getFailedImportCount = (log: ImportRecord) => {
    return log.failedItems?.length || log.failCount || 0;
  };

  const isItemDetailMissing = (log: ImportRecord) => {
    return getNewImportCount(log) + (log.updatedIds?.length || 0) + getFailedImportCount(log) > 0
      && (log.importedIds?.length || 0) === 0
      && (log.updatedIds?.length || 0) === 0
      && (log.failedItems?.length || 0) === 0;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {analyzingLog && (
        <Modal
          onClose={() => setAnalyzingLog(null)}
          maxWidth="max-w-5xl"
          title={
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-neutral-100 rounded-sm">
                <FileSpreadsheet className="text-neutral-700" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-neutral-900">{analyzingLog.filename}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-tighter border flex items-center gap-1 ${analyzingLog.status === 'Success' ? 'bg-neutral-900 text-white border-neutral-900' :
                      analyzingLog.status === 'Partial' ? 'bg-neutral-100 text-neutral-700 border-neutral-200' :
                        'bg-white text-neutral-500 border-neutral-200'
                    }`}>
                    {analyzingLog.status === 'Success' && <CheckCircle size={10} />}
                    {analyzingLog.status === 'Partial' && <HelpCircle size={10} />}
                    {analyzingLog.status === 'Failed' && <AlertCircle size={10} />}
                    {analyzingLog.status}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    {analyzingLog.recordCount} Records
                  </span>
                </div>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full -m-8">
            {/* Modal Tabs */}
            <div className="px-8 border-b border-neutral-200 flex items-center space-x-8 bg-white sticky top-0 z-10">
              <button
                onClick={() => setAnalysisTab('imported')}
                className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'imported'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                New ({getNewImportCount(analyzingLog)})
              </button>
              <button
                onClick={() => setAnalysisTab('repeating')}
                className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'repeating'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                Repeated ({analyzingLog.updatedIds?.length || 0})
              </button>
              <button
                onClick={() => setAnalysisTab('failed')}
                className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${analysisTab === 'failed'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                  }`}
              >
                Failed ({getFailedImportCount(analyzingLog)})
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-neutral-50/30">
              {(() => {
                if (analysisTab === 'failed') {
                  const failedItems = analyzingLog.failedItems || [];
                  if (failedItems.length === 0) {
                    const failedCount = getFailedImportCount(analyzingLog);
                    if (failedCount > 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-64 text-center max-w-md mx-auto">
                          <div className="w-16 h-16 bg-amber-50 rounded-sm flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
                            <HelpCircle size={32} />
                          </div>
                          <p className="text-neutral-700 font-bold">{failedCount} failed item{failedCount === 1 ? '' : 's'} were recorded.</p>
                          <p className="text-sm text-neutral-500 mt-2">
                            This older import log did not save row-level failure details, so the exact failed rows cannot be displayed.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-300 mb-4">
                          <Shield size={32} />
                        </div>
                        <p className="text-neutral-500 font-bold">No failed items found.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {failedItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-md border border-rose-100 shadow-sm flex flex-col md:flex-row gap-4">
                          <div className="flex flex-col items-center justify-center w-16 h-16 bg-rose-50 text-rose-600 rounded-sm flex-shrink-0 border border-rose-100">
                            <span className="text-[10px] uppercase font-bold text-rose-400">Row</span>
                            <span className="text-xl font-black">{item.rowNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2 mb-1">
                              <AlertCircle size={14} className="text-rose-500" />
                              Import Failed
                            </h4>
                            <p className="text-sm text-neutral-600 font-medium mb-3">{item.reason}</p>
                            <div className="bg-neutral-50 rounded-sm border border-neutral-100 overflow-hidden">
                              <div className="p-3 text-xs font-mono text-neutral-600 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(item.data, null, 2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                const artworksToShow = getLogArtworks(analyzingLog, analysisTab === 'imported' ? 'imported' : 'updated');

                if (artworksToShow.length === 0) {
                  if (isItemDetailMissing(analyzingLog)) {
                    const count = analysisTab === 'imported'
                      ? getNewImportCount(analyzingLog)
                      : analyzingLog.updatedIds?.length || 0;

                    if (count > 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-64 text-center max-w-md mx-auto">
                          <div className="w-16 h-16 bg-amber-50 rounded-sm flex items-center justify-center text-amber-500 mb-4 border border-amber-100">
                            <HelpCircle size={32} />
                          </div>
                          <p className="text-neutral-700 font-bold">{count} {analysisTab === 'imported' ? 'new' : 'repeating'} item{count === 1 ? '' : 's'} were recorded.</p>
                          <p className="text-sm text-neutral-500 mt-2">
                            This older import log only saved summary counts, so the exact artwork list is unavailable.
                          </p>
                        </div>
                      );
                    }
                  }

                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <div className="w-16 h-16 bg-neutral-100 rounded-sm flex items-center justify-center text-neutral-300 mb-4">
                        {analysisTab === 'imported' ? <FileSpreadsheet size={32} /> : <Copy size={32} />}
                      </div>
                      <p className="text-neutral-500 font-bold">No {analysisTab === 'imported' ? 'imported' : 'repeating'} artworks found.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artworksToShow.map(art => (
                      <div
                        key={art.id}
                        onClick={() => onViewArtwork(art)}
                        className="bg-white p-4 rounded-md border border-neutral-200 hover:border-neutral-900 transition-all cursor-pointer group"
                      >
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-md bg-neutral-100 overflow-hidden flex-shrink-0">
                            {art.imageUrl ? (
                              <OptimizedImage src={art.imageUrl || undefined} alt={art.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-neutral-900 truncate group-hover:text-neutral-900 transition-colors">
                              {art.title}
                            </h4>
                            <p className="text-xs text-neutral-500 truncate mb-1">{art.artist}</p>
                            <span className="inline-block px-2 py-0.5 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-sm">
                              {art.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {comparingLogs && (() => {
        const [oldLog, newLog] = comparingLogs;
        const oldIds = oldLog.importedIds || [];
        const newIds = newLog.importedIds || [];

        // Calculate diffs
        const addedIds = newIds.filter(id => !oldIds.includes(id));
        const repeatedIds = newIds.filter(id => oldIds.includes(id));

        const addedArtworks = permittedArtworks.filter(a => addedIds.includes(a.id));
        const repeatedArtworks = permittedArtworks.filter(a => repeatedIds.includes(a.id));

        return (
          <Modal
            onClose={() => setComparingLogs(null)}
            maxWidth="max-w-7xl"
            title={
              <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest">
                <ArrowRightLeft size={14} />
                <span>Import Comparison</span>
              </div>
            }
          >
            <div className="flex flex-col md:flex-row -m-8 h-[70vh]">
              {/* Added Column */}
              <div className="flex-1 flex flex-col border-r border-neutral-100 bg-green-50/10">
                <div className="px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-green-700 flex items-center gap-2">
                    <CheckCircle size={14} />
                    Added ({addedArtworks.length})
                  </h3>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-3">
                  {addedArtworks.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400">
                      <p className="text-xs font-bold">No new artworks added.</p>
                    </div>
                  ) : (
                    addedArtworks.map(art => (
                      <div key={art.id} onClick={() => onViewArtwork(art)} className="bg-white p-3 rounded-md border border-green-100 hover:border-green-300 shadow-sm cursor-pointer transition-all flex gap-3 group">
                        <div className="w-12 h-12 rounded-sm bg-neutral-100 overflow-hidden flex-shrink-0">
                          {art.imageUrl ? (
                            <img src={art.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300"><ImageIcon size={16} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-neutral-900 truncate text-sm">{art.title}</h4>
                          <p className="text-[10px] text-neutral-500 truncate">{art.artist}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Repeated Column */}
              <div className="flex-1 flex flex-col bg-neutral-50/30">
                <div className="px-6 py-4 border-b border-neutral-100 bg-white sticky top-0 z-10 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                    <RefreshCw size={14} />
                    Repeated ({repeatedArtworks.length})
                  </h3>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-3">
                  {repeatedArtworks.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400">
                      <p className="text-xs font-bold">No repeated artworks found.</p>
                    </div>
                  ) : (
                    repeatedArtworks.map(art => (
                      <div key={art.id} onClick={() => onViewArtwork(art)} className="bg-white p-3 rounded-md border border-neutral-200 hover:border-neutral-300 shadow-sm cursor-pointer transition-all flex gap-3 opacity-75 hover:opacity-100">
                        <div className="w-12 h-12 rounded-sm bg-neutral-100 overflow-hidden flex-shrink-0">
                          {art.imageUrl ? (
                            <img src={art.imageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300"><ImageIcon size={16} /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-neutral-900 truncate text-sm">{art.title}</h4>
                          <p className="text-[10px] text-neutral-500 truncate">{art.artist}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-h-[88px]">
          <>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Import History</h1>
              <p className="text-sm text-neutral-500">Track all Excel/CSV file imports and their status.</p>
            </div>

            <div className="flex items-center space-x-3">
              <div
                onClick={() => onTogglePreventDuplicates(!preventDuplicates)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md border cursor-pointer transition-all select-none shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${preventDuplicates
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                    : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
              >
                {preventDuplicates ? <Shield size={18} /> : <ShieldAlert size={18} />}
                <span className="text-sm font-bold">
                  {preventDuplicates ? 'Duplicates Blocked' : 'Allow Duplicates'}
                </span>
                <div className={`w-8 h-4 rounded-sm relative transition-colors ml-2 ${preventDuplicates ? 'bg-neutral-900' : 'bg-neutral-300'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-sm transition-transform ${preventDuplicates ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </div>

              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by filename or user..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-md text-sm focus:ring-2 focus:ring-neutral-500/20 outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportImportLogs()}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as CSV"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as PDF"
                >
                  <FileText size={18} />
                </button>
                <button
                  onClick={handleExportImage}
                  className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-200 text-neutral-700 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all shadow-sm hover:shadow-md"
                  title="Export as Image"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            </div>
          </>
      </div>

      {/* Floating Bottom Action Bar */}
      {selectedLogs.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-lg text-neutral-900 pl-6 pr-4 py-3 rounded-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center gap-5 z-40 animate-in slide-in-from-bottom-8 fade-in duration-300 border border-neutral-200/60 max-w-[90vw]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">Selection</span>
            <span className="font-bold text-base leading-none">{selectedLogs.size} Logs</span>
          </div>
          <div className="h-7 w-px bg-neutral-200/60 mx-1"></div>
          {selectedLogs.size === 2 && (
            <button
              onClick={() => {
                const selected = logs.filter(l => selectedLogs.has(l.id));
                if (selected.length === 2) {
                  const sorted = selected.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  setComparingLogs([sorted[0], sorted[1]]);
                }
              }}
              className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
            >
              <ArrowRightLeft size={14} />
              <span>Compare</span>
            </button>
          )}
          <button
            onClick={() => {
              const logsToExport = logs.filter(l => selectedLogs.has(l.id));
              exportImportLogs(logsToExport);
            }}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${selectedLogs.size} logs? This action cannot be undone.`)) {
                onDeleteLogs(Array.from(selectedLogs));
                setSelectedLogs(new Set());
              }
            }}
            className="bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200/60 px-5 py-2.5 rounded-md text-sm font-bold transition-all shadow-sm transform active:scale-95 flex items-center gap-2"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setSelectedLogs(new Set())}
            className="p-1.5 hover:bg-neutral-100 rounded-sm text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div ref={printRef} className="bg-white rounded-md border border-neutral-200 shadow-sm overflow-hidden p-6 overflow-x-auto custom-scrollbar">
        <div className="">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="pl-6 py-4 w-12 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                  <button onClick={toggleSelectAll} className="hover:text-neutral-900 transition-colors">
                    {selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Filename</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Imported By</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Records</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Details</th>
                <th className="pr-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setAnalyzingLog(log)}
                  className={`group transition-colors cursor-pointer ${selectedLogs.has(log.id) ? 'bg-neutral-50' : 'hover:bg-neutral-50/50'
                    }`}
                >
                  <td className="pl-6 py-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(log.id); }}
                      className={`transition-colors ${selectedLogs.has(log.id) ? 'text-neutral-900' : 'text-neutral-300 group-hover:text-neutral-500'}`}
                    >
                      {selectedLogs.has(log.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-neutral-600 font-bold text-sm">
                      <Clock size={14} className="text-neutral-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet size={16} className="text-neutral-400" />
                      <span className="font-bold text-neutral-900">{log.filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-bold bg-neutral-100 text-neutral-600">
                      {log.importedBy}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-neutral-600">
                    {log.recordCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-sm text-xs font-black uppercase tracking-tight border ${log.status === 'Success' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        log.status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                      {log.status === 'Success' && <CheckCircle size={12} />}
                      {log.status === 'Partial' && <HelpCircle size={12} />}
                      {log.status === 'Failed' && <AlertCircle size={12} />}
                      <span>{log.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-neutral-500 text-sm font-medium" title={log.details}>
                    {log.details || '-'}
                  </td>
                  <td className="pr-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setAnalyzingLog(log); }}
                        className="p-2 bg-white border border-neutral-200 text-neutral-600 rounded-md hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
                        title="Analyze Import"
                      >
                        <Search size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this import log?')) {
                            onDeleteLogs([log.id]);
                          }
                        }}
                        className="p-2 bg-white border border-neutral-200 text-neutral-400 rounded-md hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm"
                        title="Delete Log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-neutral-50 rounded-sm">
                        <Search size={24} className="text-neutral-300" />
                      </div>
                      <p className="font-bold text-neutral-500">No import logs found</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImportHistoryPage;
