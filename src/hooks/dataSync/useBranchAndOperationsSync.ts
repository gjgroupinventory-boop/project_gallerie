import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import {
  ActivityLog,
  FramerRecord,
  ImportRecord,
  InventoryAudit,
  ReturnRecord,
  TransferRecord,
  TransferRequest,
  UserAccount
} from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import {
  isSupabaseBadQueryError,
  isSupabaseMissingRelationError,
  normalizeBranchLogo,
  OPERATIONS_ROW_LIMITS,
  removeRealtimeRecord,
  updateRealtimeRecord,
  upsertRealtimeRecord,
  getGlobalSyncChannel,
  subscribeGlobalSyncChannel,
  unsubscribeGlobalSyncChannel
} from './shared';

interface UseBranchAndOperationsSyncParams {
  currentUser: UserAccount | null;
  shouldSyncOperationalData: boolean;
  setBranches: Dispatch<SetStateAction<string[]>>;
  setBranchAddresses: Dispatch<SetStateAction<Record<string, string>>>;
  setBranchCategories: Dispatch<SetStateAction<Record<string, string>>>;
  setBranchLogos: Dispatch<SetStateAction<Record<string, string>>>;
  setExclusiveBranches: Dispatch<SetStateAction<string[]>>;
  setLogs: Dispatch<SetStateAction<ActivityLog[]>>;
  setAudits: Dispatch<SetStateAction<InventoryAudit[]>>;
  setImportLogs: Dispatch<SetStateAction<ImportRecord[]>>;
  setReturnRecords: Dispatch<SetStateAction<ReturnRecord[]>>;
  setFramerRecords: Dispatch<SetStateAction<FramerRecord[]>>;
  setTransfers: Dispatch<SetStateAction<TransferRecord[]>>;
  setTransferRequests: Dispatch<SetStateAction<TransferRequest[]>>;
}

const normalizeActivityLog = (row: any): ActivityLog => {
  const mapped = mapFromSnakeCase(row) as ActivityLog & { userName?: string; user?: string };
  const actorName = mapped.user || mapped.userName || 'Unknown User';

  return {
    ...mapped,
    user: actorName,
    userName: mapped.userName || actorName
  };
};

const parseJsonArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || value.trim() === '') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

const normalizeImportRecord = (row: any): ImportRecord => {
  const mapped = mapFromSnakeCase(row) as any;
  return {
    ...mapped,
    timestamp: mapped.importedAt || mapped.timestamp || row.imported_at || row.timestamp,
    recordCount: mapped.totalItems !== undefined ? mapped.totalItems : (mapped.recordCount !== undefined ? mapped.recordCount : row.total_items),
    successCount: mapped.successCount ?? row.success_count,
    failCount: mapped.failCount ?? row.fail_count,
    importedIds: parseJsonArray<string>(mapped.importedIds),
    updatedIds: parseJsonArray<string>(mapped.updatedIds),
    failedItems: parseJsonArray(mapped.failedItems)
  };
};

export const useBranchAndOperationsSync = ({
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
}: UseBranchAndOperationsSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const syncBranches = async () => {
      const branchesRes = await supabase
        .from('branches')
        .select('name, address, category, logo_url, is_exclusive');
      if (branchesRes.data) {
        const mapped = mapFromSnakeCase(branchesRes.data);
        const names = mapped.map((b: any) => b.name);
        const addresses = mapped.reduce((acc: any, b: any) => { if (b.address) acc[b.name] = b.address; return acc; }, {});
        const categories = mapped.reduce((acc: any, b: any) => { if (b.category) acc[b.name] = b.category; return acc; }, {});
        const logoEntries = await Promise.all(
          mapped.map(async (b: any) => {
            const normalizedLogo = await normalizeBranchLogo(b.logoUrl);
            return normalizedLogo ? [b.name, normalizedLogo] as const : null;
          })
        );
        const logos = logoEntries.reduce((acc: any, entry) => {
          if (entry) acc[entry[0]] = entry[1];
          return acc;
        }, {});
        const exclusive = mapped.filter((b: any) => b.isExclusive).map((b: any) => b.name);
        setBranches(names);
        setBranchAddresses(addresses);
        setBranchCategories(categories);
        setBranchLogos(logos);
        setExclusiveBranches(exclusive);
      }
    };

    const handleBranchRealtime = async (payload: any) => {
      const branchName = payload.eventType === 'DELETE' ? payload.old?.name : payload.new?.name;
      const oldBranchName = payload.old?.name;

      if (payload.eventType === 'DELETE') {
        setBranches(prev => prev.filter(name => name !== branchName));
        setBranchAddresses(prev => {
          const next = { ...prev };
          delete next[branchName];
          return next;
        });
        setBranchCategories(prev => {
          const next = { ...prev };
          delete next[branchName];
          return next;
        });
        setBranchLogos(prev => {
          const next = { ...prev };
          delete next[branchName];
          return next;
        });
        setExclusiveBranches(prev => prev.filter(name => name !== branchName));
        return;
      }

      const mappedBranch = mapFromSnakeCase(payload.new) as {
        name: string;
        address?: string;
        category?: string;
        logoUrl?: string;
        isExclusive?: boolean;
      };
      const normalizedLogo = await normalizeBranchLogo(mappedBranch.logoUrl);

      setBranches(prev => {
        const withoutOldName = oldBranchName && oldBranchName !== mappedBranch.name
          ? prev.filter(name => name !== oldBranchName)
          : prev;
        return withoutOldName.includes(mappedBranch.name)
          ? withoutOldName
          : [...withoutOldName, mappedBranch.name].sort((a, b) => a.localeCompare(b));
      });

      setBranchAddresses(prev => {
        const next = { ...prev };
        if (oldBranchName && oldBranchName !== mappedBranch.name) delete next[oldBranchName];
        if (mappedBranch.address) next[mappedBranch.name] = mappedBranch.address;
        else delete next[mappedBranch.name];
        return next;
      });

      setBranchCategories(prev => {
        const next = { ...prev };
        if (oldBranchName && oldBranchName !== mappedBranch.name) delete next[oldBranchName];
        if (mappedBranch.category) next[mappedBranch.name] = mappedBranch.category;
        else delete next[mappedBranch.name];
        return next;
      });

      setBranchLogos(prev => {
        const next = { ...prev };
        if (oldBranchName && oldBranchName !== mappedBranch.name) delete next[oldBranchName];
        if (normalizedLogo) next[mappedBranch.name] = normalizedLogo;
        else delete next[mappedBranch.name];
        return next;
      });

      setExclusiveBranches(prev => {
        const withoutOldName = oldBranchName && oldBranchName !== mappedBranch.name
          ? prev.filter(name => name !== oldBranchName)
          : prev;
        if (mappedBranch.isExclusive) {
          return withoutOldName.includes(mappedBranch.name)
            ? withoutOldName
            : [...withoutOldName, mappedBranch.name];
        }
        return withoutOldName.filter(name => name !== mappedBranch.name);
      });
    };

    void syncBranches();
    const channel = supabase.channel(`artisflow-branches-sync-${currentUser.id}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, handleBranchRealtime);
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, setBranchAddresses, setBranchCategories, setBranchLogos, setBranches, setExclusiveBranches]);

  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id || !shouldSyncOperationalData) return;

    const operationsWarningCache = new Set<string>();
    const warnOnce = (key: string, message: string, error?: any) => {
      if (operationsWarningCache.has(key)) return;
      operationsWarningCache.add(key);
      console.warn(message, error?.message || error || '');
    };

    const safeSelectOrdered = async (
      table: string,
      orderColumn: string,
      limit: number,
      fallbackOrderColumn?: string
    ) => {
      const primary = await supabase.from(table).select('*').order(orderColumn, { ascending: false }).limit(limit);
      if (!primary.error) return primary;

      if (fallbackOrderColumn && isSupabaseBadQueryError(primary.error)) {
        const fallback = await supabase.from(table).select('*').order(fallbackOrderColumn, { ascending: false }).limit(limit);
        if (!fallback.error) return fallback;
        if (isSupabaseMissingRelationError(fallback.error) || isSupabaseBadQueryError(fallback.error)) {
          warnOnce(`${table}-fallback`, `[Operations Sync] Skipping ${table} due to schema mismatch.`, fallback.error);
          return { data: null, error: null };
        }
        return fallback;
      }

      if (isSupabaseMissingRelationError(primary.error) || isSupabaseBadQueryError(primary.error)) {
        warnOnce(table, `[Operations Sync] Skipping ${table} due to schema mismatch.`, primary.error);
        return { data: null, error: null };
      }

      return primary;
    };

    const parseReturnRecord = (row: any): ReturnRecord => {
      const mapped = mapFromSnakeCase(row) as ReturnRecord;
      return {
        ...mapped,
        artworkSnapshot: typeof mapped.artworkSnapshot === 'string' ? JSON.parse(mapped.artworkSnapshot) : mapped.artworkSnapshot,
        proofImage: typeof mapped.proofImage === 'string' && (mapped.proofImage.startsWith('[') || mapped.proofImage.startsWith('{')) ? JSON.parse(mapped.proofImage) : mapped.proofImage
      };
    };

    const parseFramerRecord = (row: any): FramerRecord => {
      const mapped = mapFromSnakeCase(row) as FramerRecord;
      return {
        ...mapped,
        artworkSnapshot: typeof mapped.artworkSnapshot === 'string' ? JSON.parse(mapped.artworkSnapshot) : mapped.artworkSnapshot,
        attachmentUrl: typeof mapped.attachmentUrl === 'string' && (mapped.attachmentUrl.startsWith('[') || mapped.attachmentUrl.startsWith('{')) ? JSON.parse(mapped.attachmentUrl) : mapped.attachmentUrl
      };
    };

    const parseTransferRequest = (row: any): TransferRequest => {
      const mapped = mapFromSnakeCase(row) as TransferRequest;
      return {
        ...mapped,
        itdrUrl: typeof mapped.itdrUrl === 'string' && (mapped.itdrUrl.startsWith('[') || mapped.itdrUrl.startsWith('{')) ? JSON.parse(mapped.itdrUrl) : (mapped.itdrUrl || [])
      };
    };

    const syncOperations = async () => {
      const [logsRes, auditsRes, importsRes, returnsRes, framersRes, transfersRes, requestsRes] = await Promise.all([
        safeSelectOrdered('activity_logs', 'timestamp', OPERATIONS_ROW_LIMITS.logs, 'created_at'),
        safeSelectOrdered('audits', 'confirmed_at', OPERATIONS_ROW_LIMITS.audits, 'created_at'),
        safeSelectOrdered('import_records', 'imported_at', OPERATIONS_ROW_LIMITS.imports, 'timestamp'),
        safeSelectOrdered('returns', 'created_at', OPERATIONS_ROW_LIMITS.returns),
        safeSelectOrdered('framer_records', 'created_at', OPERATIONS_ROW_LIMITS.framers),
        safeSelectOrdered('transfers', 'created_at', OPERATIONS_ROW_LIMITS.transfers),
        supabase.from('transfer_requests').select('*').order('requested_at', { ascending: false }).limit(200)
      ]);

      if (logsRes.data) setLogs(logsRes.data.map(normalizeActivityLog));
      if (auditsRes.data) setAudits(mapFromSnakeCase(auditsRes.data) as InventoryAudit[]);
      if (returnsRes.data) setReturnRecords(returnsRes.data.map(parseReturnRecord));
      if (framersRes.data) setFramerRecords(framersRes.data.map(parseFramerRecord));
      if (transfersRes.data) setTransfers(mapFromSnakeCase(transfersRes.data) as TransferRecord[]);
      if (requestsRes.data) setTransferRequests(requestsRes.data.map(parseTransferRequest));
      if (importsRes.data) setImportLogs(importsRes.data.map(normalizeImportRecord));
    };

    const handleListRealtime = <T extends { id: string }>(
      payload: any,
      setter: Dispatch<SetStateAction<T[]>>,
      limit?: number,
      transform?: (row: any) => T
    ) => {
      if (payload.eventType === 'DELETE') {
        setter(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const rawItem = payload.new;
      if (!rawItem) return;

      const mapped = transform ? transform(rawItem) : (mapFromSnakeCase(rawItem) as T);
      if (payload.eventType === 'INSERT') {
        setter(prev => upsertRealtimeRecord(prev, mapped, limit));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setter(prev => updateRealtimeRecord(prev, mapped));
      }
    };

    void syncOperations();
    const channel = supabase.channel(`artisflow-operations-sync-${currentUser.id}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, payload =>
        handleListRealtime(payload, setLogs, OPERATIONS_ROW_LIMITS.logs, normalizeActivityLog as any))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audits' }, payload =>
        handleListRealtime(payload, setAudits, OPERATIONS_ROW_LIMITS.audits))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'import_records' }, payload =>
        handleListRealtime(payload, setImportLogs, OPERATIONS_ROW_LIMITS.imports, normalizeImportRecord))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, payload =>
        handleListRealtime(payload, setReturnRecords, OPERATIONS_ROW_LIMITS.returns, parseReturnRecord))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'framer_records' }, payload =>
        handleListRealtime(payload, setFramerRecords, OPERATIONS_ROW_LIMITS.framers, parseFramerRecord))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, payload =>
        handleListRealtime(payload, setTransfers, OPERATIONS_ROW_LIMITS.transfers))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_requests' }, payload =>
        handleListRealtime(payload, setTransferRequests, 200, parseTransferRequest));

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, shouldSyncOperationalData, setAudits, setFramerRecords, setImportLogs, setLogs, setReturnRecords, setTransfers, setTransferRequests]);
};
