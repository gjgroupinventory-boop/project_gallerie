import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityLog,
  AppNotification,
  Artwork,
  ChatMessage,
  Conversation,
  ExhibitionEvent,
  FramerRecord,
  ImportRecord,
  InventoryAudit,
  ReturnRecord,
  SaleRecord,
  TransferRecord,
  TransferRequest,
  UserAccount,
  ArtworkStatus
} from '../types';
import { IS_DEMO_MODE } from '../constants';
import { supabase } from '../supabase';
import { mapToSnakeCase } from '../utils/supabaseUtils';
import {
  compactArtworkForCache,
  hydrateCachedArtwork,
  readCache,
  writeCache
} from './dataSync/shared';
import { useAccountsSync } from './dataSync/useAccountsSync';
import { useArtworkSync } from './dataSync/useArtworkSync';
import { useBusinessSync } from './dataSync/useBusinessSync';
import { useBranchAndOperationsSync } from './dataSync/useBranchAndOperationsSync';
import { useMessagingSync } from './dataSync/useMessagingSync';

interface UseDataSyncProps {
  activeTab: string;
  currentUser: UserAccount | null;
  selectedArtworkId?: string | null;
}

export const useDataSync = ({ activeTab, currentUser, selectedArtworkId }: UseDataSyncProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [allArtworksIncludingDeleted, setAllArtworksIncludingDeleted] = useState<Artwork[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchAddresses, setBranchAddresses] = useState<Record<string, string>>({});
  const [branchCategories, setBranchCategories] = useState<Record<string, string>>({});
  const [branchLogos, setBranchLogos] = useState<Record<string, string>>({});
  const [exclusiveBranches, setExclusiveBranches] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isLoadingArtworks, setIsLoadingArtworks] = useState(!IS_DEMO_MODE);
  const [isLoadingSales, setIsLoadingSales] = useState(!IS_DEMO_MODE);
  const [isLoadingEvents, setIsLoadingEvents] = useState(!IS_DEMO_MODE);
  const [isLoadingUsers, setIsLoadingUsers] = useState(!IS_DEMO_MODE);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [events, setEvents] = useState<ExhibitionEvent[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [importLogs, setImportLogs] = useState<ImportRecord[]>([]);
  const [preventDuplicateImports, setPreventDuplicateImports] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>([]);
  const [framerRecords, setFramerRecords] = useState<FramerRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const shouldLoadFullArtworks = ['inventory', 'operations', 'artwork-transfer', 'master-view', 'galleria', 'analytics', 'finance', 'sales-history', 'approvals', 'requests', 'snapshots', 'audit-logs', 'import-history', 'framer', 'returned', 'deliveries', 'delivery-requests'].includes(activeTab) || !!selectedArtworkId;
  const shouldLoadFullBusinessData = ['inventory', 'operations', 'artwork-transfer', 'master-view', 'galleria', 'analytics', 'finance', 'sales-history', 'approvals', 'requests', 'snapshots', 'framer', 'returned', 'deliveries', 'delivery-requests'].includes(activeTab) || !!selectedArtworkId;
  const shouldSyncOperationalData = ['operations', 'artwork-transfer', 'audit-logs', 'import-history', 'analytics', 'finance', 'snapshots', 'master-view', 'framer', 'returned', 'deliveries', 'delivery-requests'].includes(activeTab);
  const shouldSyncMessaging = activeTab === 'chat';

  const handleSyncError = useCallback((error: any, context: string) => {
    if (!currentUser && error?.status === 401) return;
    console.error(`Sync Error (${context}):`, error.message);
    setSyncError(`Sync Error (${context}): ${error.message}`);
  }, [currentUser]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const cachedArtworksRaw = readCache<Partial<Artwork>[]>(currentUser.id, 'artworks');
    const cachedAllArtworksRaw = readCache<Partial<Artwork>[]>(currentUser.id, 'all-artworks');
    const cachedSales = readCache<SaleRecord[]>(currentUser.id, 'sales');
    const cachedEvents = readCache<ExhibitionEvent[]>(currentUser.id, 'events');
    const cachedAccounts = readCache<UserAccount[]>(currentUser.id, 'accounts');
    const cachedBranches = readCache<{
      branches: string[];
      branchAddresses: Record<string, string>;
      branchCategories: Record<string, string>;
      branchLogos: Record<string, string>;
      exclusiveBranches: string[];
    }>(currentUser.id, 'branches');
    const cachedFramerRecords = readCache<FramerRecord[]>(currentUser.id, 'framer-records');
    const cachedReturnRecords = readCache<ReturnRecord[]>(currentUser.id, 'return-records');

    const cachedAllArtworks = (cachedAllArtworksRaw || []).map(hydrateCachedArtwork).filter(Boolean) as Artwork[];
    const cachedArtworks = (cachedArtworksRaw || []).map(hydrateCachedArtwork).filter(Boolean) as Artwork[];

    if (cachedAllArtworks.length) setAllArtworksIncludingDeleted(cachedAllArtworks);
    if (cachedArtworks.length) setArtworks(cachedArtworks);
    if (cachedSales?.length) setSales(cachedSales);
    if (cachedEvents?.length) setEvents(cachedEvents);
    if (cachedAccounts?.length) setAccounts(cachedAccounts);
    if (cachedBranches) {
      setBranches(cachedBranches.branches || []);
      setBranchAddresses(cachedBranches.branchAddresses || {});
      setBranchCategories(cachedBranches.branchCategories || {});
      setBranchLogos(cachedBranches.branchLogos || {});
      setExclusiveBranches(cachedBranches.exclusiveBranches || []);
    }
    if (cachedFramerRecords?.length) setFramerRecords(cachedFramerRecords);
    if (cachedReturnRecords?.length) setReturnRecords(cachedReturnRecords);
  }, [currentUser?.id]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || artworks.length === 0) return;
    writeCache(currentUser.id, 'artworks', artworks.map(compactArtworkForCache));
  }, [currentUser?.id, artworks]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || allArtworksIncludingDeleted.length === 0) return;
    writeCache(currentUser.id, 'all-artworks', allArtworksIncludingDeleted.map(compactArtworkForCache));
  }, [currentUser?.id, allArtworksIncludingDeleted]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || sales.length === 0) return;
    writeCache(currentUser.id, 'sales', sales);
  }, [currentUser?.id, sales]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || events.length === 0) return;
    writeCache(currentUser.id, 'events', events);
  }, [currentUser?.id, events]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || accounts.length === 0) return;
    writeCache(currentUser.id, 'accounts', accounts);
  }, [currentUser?.id, accounts]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || branches.length === 0) return;
    writeCache(currentUser.id, 'branches', {
      branches,
      branchAddresses,
      branchCategories,
      branchLogos,
      exclusiveBranches
    });
  }, [currentUser?.id, branches, branchAddresses, branchCategories, branchLogos, exclusiveBranches]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || framerRecords.length === 0) return;
    writeCache(currentUser.id, 'framer-records', framerRecords);
  }, [currentUser?.id, framerRecords]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || returnRecords.length === 0) return;
    writeCache(currentUser.id, 'return-records', returnRecords);
  }, [currentUser?.id, returnRecords]);

  useAccountsSync({
    currentUser,
    activeTab,
    accounts,
    setAccounts,
    setIsLoadingUsers,
    handleSyncError
  });

  useArtworkSync({
    currentUser,
    shouldLoadFullArtworks,
    setArtworks,
    setAllArtworksIncludingDeleted,
    setIsLoadingArtworks,
    handleSyncError
  });

  useBusinessSync({
    currentUser,
    shouldLoadFullBusinessData,
    setSales,
    setEvents,
    setIsLoadingSales,
    setIsLoadingEvents
  });

  useBranchAndOperationsSync({
    currentUser,
    shouldSyncOperationalData,
    setBranches,
    setBranchAddresses,
    setBranchCategories,
    setBranchLogos,
    setExclusiveBranches,
    setLogs,
    setAudits,
    setImportLogs,
    setReturnRecords,
    setFramerRecords,
    setTransfers,
    setTransferRequests
  });

  useMessagingSync({
    currentUser,
    shouldSyncMessaging,
    conversations,
    setNotifications,
    setConversations,
    setMessages
  });

  // Self-healing: repair artworks that are in an event's artworkIds but have wrong status
  const hasRepairedRef = useRef(false);
  useEffect(() => {
    if (hasRepairedRef.current || IS_DEMO_MODE || !currentUser?.id) return;
    if (artworks.length === 0 || events.length === 0 || isLoadingArtworks || isLoadingEvents) return;

    // Mark as repaired IMMEDIATELY to prevent re-entrant loops if state changes during scan
    hasRepairedRef.current = true;

    const artworksToRepair: { id: string; eventId: string; eventTitle: string; eventType: string }[] = [];
    const artworksMap = new Map<string, Artwork>();
    for (const a of artworks) {
      artworksMap.set(a.id, a);
    }
    const repairedIdsSet = new Set<string>();

    for (const event of events) {
      if (!event.artworkIds || event.artworkIds.length === 0) continue;
      for (const artId of event.artworkIds) {
        // Skip if we already tagged this art for repair in this pass
        if (repairedIdsSet.has(artId)) continue;

        const art = artworksMap.get(artId);
        if (!art) continue;

        const isPersonReserved = art.status === ArtworkStatus.RESERVED && (art.remarks || '').includes('Type: Person');
        
        const needsRepair = 
          !isPersonReserved && (
            art.status === ArtworkStatus.AVAILABLE || 
            (art.status === ArtworkStatus.RESERVED && !art.reservedForEventId)
          );

        if (needsRepair) {
          artworksToRepair.push({
            id: artId,
            eventId: event.id,
            eventTitle: event.title,
            eventType: event.type || 'Exhibition'
          });
          repairedIdsSet.add(artId);
        }
      }
    }

    if (artworksToRepair.length === 0) return;

    console.log(`[DataSync] Auto-repairing ${artworksToRepair.length} artworks with inconsistent event status`);

    // Create a fast map for repairs
    const repairsMap = new Map<string, { id: string; eventId: string; eventTitle: string; eventType: string }>();
    for (const r of artworksToRepair) {
      repairsMap.set(r.id, r);
    }

    // Fix local state
    setArtworks(prev => prev.map(a => {
      const repair = repairsMap.get(a.id);
      if (!repair) return a;
      return {
        ...a,
        status: ArtworkStatus.RESERVED,
        reservedForEventId: repair.eventId,
        reservedForEventName: repair.eventTitle,
        remarks: `[Reserved For ${repair.eventType}: ${repair.eventTitle}]`
      };
    }));
    setAllArtworksIncludingDeleted(prev => prev.map(a => {
      const repair = repairsMap.get(a.id);
      if (!repair) return a;
      return {
        ...a,
        status: ArtworkStatus.RESERVED,
        reservedForEventId: repair.eventId,
        reservedForEventName: repair.eventTitle,
        remarks: `[Reserved For ${repair.eventType}: ${repair.eventTitle}]`
      };
    }));

    // Fix Supabase in background
    const repairIds = artworksToRepair.map(r => r.id);
    const groupedByEvent = artworksToRepair.reduce((acc, r) => {
      if (!acc[r.eventId]) acc[r.eventId] = { ids: [], title: r.eventTitle, type: r.eventType };
      acc[r.eventId].ids.push(r.id);
      return acc;
    }, {} as Record<string, { ids: string[]; title: string; type: string }>);

    Object.entries(groupedByEvent).forEach(async ([eventId, group]) => {
      try {
        await supabase.from('artworks').update(mapToSnakeCase({
          status: ArtworkStatus.RESERVED,
          reservedForEventId: eventId,
          reservedForEventName: group.title,
          remarks: `[Reserved For ${group.type}: ${group.title}]`,
          updatedAt: new Date().toISOString()
        })).in('id', group.ids);
        console.log(`[DataSync] Repaired ${group.ids.length} artworks for event "${group.title}"`);
      } catch (err) {
        console.error('[DataSync] Repair failed for event', eventId, err);
      }
    });
  }, [artworks, events, isLoadingArtworks, isLoadingEvents, currentUser?.id]);

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    
    // Check if we have persisted fallback data in localStorage
    const storedArtworks = localStorage.getItem('artisflow-demo-artworks');
    const storedSales = localStorage.getItem('artisflow-demo-sales');
    const storedEvents = localStorage.getItem('artisflow-demo-events');
    const storedAccounts = localStorage.getItem('artisflow-demo-accounts');
    const storedLogs = localStorage.getItem('artisflow-demo-logs');

    if (storedArtworks && storedSales && storedEvents && storedAccounts && storedLogs) {
      try {
        setArtworks(JSON.parse(storedArtworks));
        setSales(JSON.parse(storedSales));
        setEvents(JSON.parse(storedEvents));
        setAccounts(JSON.parse(storedAccounts));
        setLogs(JSON.parse(storedLogs));
        setIsLoadingArtworks(false);
        setIsLoadingUsers(false);
        setIsLoadingEvents(false);
        setIsLoadingSales(false);
        return;
      } catch (e) {
        console.error('Failed to parse demo local fallback', e);
      }
    }

    // Load initial demo data if fallback is empty or failed
    if (artworks.length === 0) {
      import('../data').then(data => {
        setArtworks(data.INITIAL_ARTWORKS);
        setAccounts(data.INITIAL_ACCOUNTS);
        setEvents(data.INITIAL_EVENTS);
        setSales(data.INITIAL_SALES);
        setLogs(data.INITIAL_LOGS);

        localStorage.setItem('artisflow-demo-artworks', JSON.stringify(data.INITIAL_ARTWORKS));
        localStorage.setItem('artisflow-demo-sales', JSON.stringify(data.INITIAL_SALES));
        localStorage.setItem('artisflow-demo-events', JSON.stringify(data.INITIAL_EVENTS));
        localStorage.setItem('artisflow-demo-accounts', JSON.stringify(data.INITIAL_ACCOUNTS));
        localStorage.setItem('artisflow-demo-logs', JSON.stringify(data.INITIAL_LOGS));

        setIsLoadingArtworks(false);
        setIsLoadingUsers(false);
        setIsLoadingEvents(false);
        setIsLoadingSales(false);
      });
    }
  }, [artworks.length]);

  // Sync back to localStorage when state changes in IS_DEMO_MODE
  useEffect(() => {
    if (!IS_DEMO_MODE || artworks.length === 0) return;
    localStorage.setItem('artisflow-demo-artworks', JSON.stringify(artworks));
  }, [artworks]);

  useEffect(() => {
    if (!IS_DEMO_MODE || sales.length === 0) return;
    localStorage.setItem('artisflow-demo-sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    if (!IS_DEMO_MODE || events.length === 0) return;
    localStorage.setItem('artisflow-demo-events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (!IS_DEMO_MODE || accounts.length === 0) return;
    localStorage.setItem('artisflow-demo-accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (!IS_DEMO_MODE || logs.length === 0) return;
    localStorage.setItem('artisflow-demo-logs', JSON.stringify(logs));
  }, [logs]);

  const filteredArtworks = useMemo(() => {
    if (currentUser?.role === 'Branch User' && currentUser.branch) {
      const userBranch = currentUser.branch.trim().toLowerCase();
      return artworks.filter(a => (a.currentBranch || '').trim().toLowerCase() === userBranch);
    }
    return artworks;
  }, [artworks, currentUser]);

  const filteredAllArtworks = useMemo(() => {
    if (currentUser?.role === 'Branch User' && currentUser.branch) {
      const userBranch = currentUser.branch.trim().toLowerCase();
      return allArtworksIncludingDeleted.filter(a => (a.currentBranch || '').trim().toLowerCase() === userBranch);
    }
    return allArtworksIncludingDeleted;
  }, [allArtworksIncludingDeleted, currentUser]);

  const filteredReturnRecords = useMemo(() => {
    if (currentUser?.role === 'Branch User' && currentUser.branch) {
      const userBranch = currentUser.branch.trim().toLowerCase();
      return returnRecords.filter(r => (r.artworkSnapshot?.currentBranch || '').trim().toLowerCase() === userBranch);
    }
    return returnRecords;
  }, [returnRecords, currentUser]);

  const filteredFramerRecords = useMemo(() => {
    if (currentUser?.role === 'Branch User' && currentUser.branch) {
      const userBranch = currentUser.branch.trim().toLowerCase();
      return framerRecords.filter(f => (f.artworkSnapshot?.currentBranch || '').trim().toLowerCase() === userBranch);
    }
    return framerRecords;
  }, [framerRecords, currentUser]);

  const hydratedTransferRequests = useMemo(() => {
    return transferRequests.map(req => {
      const artwork = filteredArtworks.find(a => String(a.id) === String(req.artworkId));
      if (!artwork) return req;
      return {
        ...req,
        artworkTitle: req.artworkTitle || artwork.title,
        artworkCode: req.artworkCode || artwork.code,
        artworkImage: req.artworkImage || artwork.imageUrl
      };
    });
  }, [transferRequests, filteredArtworks]);

  return {
    artworks: filteredArtworks,
    allArtworksIncludingDeleted: filteredAllArtworks,
    sales,
    branches,
    branchAddresses,
    branchCategories,
    branchLogos,
    exclusiveBranches,
    syncError,
    logs,
    accounts,
    isLoadingArtworks,
    isLoadingSales,
    isLoadingEvents,
    isLoadingUsers,
    transferRequests: hydratedTransferRequests,
    transfers,
    events,
    audits,
    importLogs,
    preventDuplicateImports,
    notifications,
    returnRecords: filteredReturnRecords,
    framerRecords: filteredFramerRecords,
    conversations,
    messages,
    setArtworks,
    setAllArtworksIncludingDeleted,
    setSales,
    setBranches,
    setBranchAddresses,
    setBranchCategories,
    setBranchLogos,
    setExclusiveBranches,
    setEvents,
    setAccounts,
    setLogs,
    setSyncError,
    setAudits,
    setIsLoadingArtworks,
    setIsLoadingSales,
    setIsLoadingEvents,
    setIsLoadingUsers,
    setTransferRequests,
    setTransfers,
    setImportLogs,
    setPreventDuplicateImports,
    setNotifications,
    setReturnRecords,
    setFramerRecords,
    setConversations,
    setMessages
  };
};
