import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import {
  Artwork, SaleRecord, TransferRequest, ActivityLog, UserAccount,
  ExhibitionEvent, InventoryAudit, AppNotification, ImportRecord,
  ReturnRecord, FramerRecord, TransferRecord, Conversation, ChatMessage,
  ArtworkStatus
} from '../types';

interface DataContextType {
  artworks: Artwork[];
  allArtworksIncludingDeleted: Artwork[];
  setArtworks: React.Dispatch<React.SetStateAction<Artwork[]>>;
  setAllArtworksIncludingDeleted: React.Dispatch<React.SetStateAction<Artwork[]>>;
  sales: SaleRecord[];
  setSales: React.Dispatch<React.SetStateAction<SaleRecord[]>>;
  branches: string[];
  setBranches: React.Dispatch<React.SetStateAction<string[]>>;
  branchAddresses: Record<string, string>;
  setBranchAddresses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  branchCategories: Record<string, string>;
  setBranchCategories: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  branchLogos: Record<string, string>;
  setBranchLogos: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  exclusiveBranches: string[];
  setExclusiveBranches: React.Dispatch<React.SetStateAction<string[]>>;
  syncError: string | null;
  setSyncError: React.Dispatch<React.SetStateAction<string | null>>;
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  accounts: UserAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  isLoadingArtworks: boolean;
  setIsLoadingArtworks: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingSales: boolean;
  setIsLoadingSales: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingEvents: boolean;
  setIsLoadingEvents: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingUsers: boolean;
  setIsLoadingUsers: React.Dispatch<React.SetStateAction<boolean>>;
  transferRequests: TransferRequest[];
  setTransferRequests: React.Dispatch<React.SetStateAction<TransferRequest[]>>;
  transfers: TransferRecord[];
  setTransfers: React.Dispatch<React.SetStateAction<TransferRecord[]>>;
  events: ExhibitionEvent[];
  setEvents: React.Dispatch<React.SetStateAction<ExhibitionEvent[]>>;
  audits: InventoryAudit[];
  setAudits: React.Dispatch<React.SetStateAction<InventoryAudit[]>>;
  importLogs: ImportRecord[];
  setImportLogs: React.Dispatch<React.SetStateAction<ImportRecord[]>>;
  preventDuplicateImports: boolean;
  setPreventDuplicateImports: React.Dispatch<React.SetStateAction<boolean>>;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  returnRecords: ReturnRecord[];
  setReturnRecords: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  framerRecords: FramerRecord[];
  setFramerRecords: React.Dispatch<React.SetStateAction<FramerRecord[]>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  // Raw unfiltered data for TimeMachine controls
  rawArtworks: Artwork[];
  rawAllArtworksIncludingDeleted: Artwork[];
  rawSales: SaleRecord[];
  rawEvents: ExhibitionEvent[];
  rawReturnRecords: ReturnRecord[];
  rawFramerRecords: FramerRecord[];
  rawTransfers: TransferRecord[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { activeTab, selectedArtworkId, timeTravelDate } = useUI();
  
  const rawData = useDataSync({ activeTab, currentUser, selectedArtworkId });

  const data = useMemo(() => {
    if (!timeTravelDate) {
      return {
        ...rawData,
        rawArtworks: rawData.artworks,
        rawAllArtworksIncludingDeleted: rawData.allArtworksIncludingDeleted,
        rawSales: rawData.sales,
        rawEvents: rawData.events,
        rawReturnRecords: rawData.returnRecords,
        rawFramerRecords: rawData.framerRecords,
        rawTransfers: rawData.transfers,
      };
    }

    const targetTime = new Date(timeTravelDate).getTime() + (24 * 60 * 60 * 1000) - 1;

    const getEffectiveCreationDate = (art: Artwork): string => {
      if (art.importPeriod) return `${art.importPeriod}-01`;
      if (art.createdAt) return art.createdAt;
      return '2020-01-01';
    };

    // 1. Filter return records that existed on/before targetTime
    const filteredReturnRecords = rawData.returnRecords.map(r => {
      const isPast = new Date(r.returnDate).getTime() <= targetTime;
      if (!isPast) return null;
      const resolvedAtTime = r.resolvedAt ? new Date(r.resolvedAt).getTime() : null;
      const isResolved = resolvedAtTime && resolvedAtTime <= targetTime;
      return {
        ...r,
        resolvedAt: isResolved ? r.resolvedAt : null,
      };
    }).filter(Boolean) as ReturnRecord[];

    // 2. Filter framer records that existed on/before targetTime
    const filteredFramerRecords = rawData.framerRecords.map(f => {
      const isPast = new Date(f.sentDate).getTime() <= targetTime;
      if (!isPast) return null;
      const resolvedAtTime = f.resolvedAt ? new Date(f.resolvedAt).getTime() : null;
      const isResolved = resolvedAtTime && resolvedAtTime <= targetTime;
      return {
        ...f,
        resolvedAt: isResolved ? f.resolvedAt : null,
      };
    }).filter(Boolean) as FramerRecord[];

    // 3. Filter sales that occurred on/before targetTime
    const filteredSales = rawData.sales.filter(s => {
      return new Date(s.saleDate).getTime() <= targetTime && !s.isCancelled;
    });

    // 4. Filter existed artworks as of targetTime
    const existed = rawData.allArtworksIncludingDeleted.filter(art => {
      if (!art.id || !art.title) return false;
      const effectiveDateStr = getEffectiveCreationDate(art);
      if (new Date(effectiveDateStr).getTime() > targetTime) return false;
      if ((art as any).deletedAt && new Date((art as any).deletedAt).getTime() <= targetTime) return false;
      return true;
    });

    // 5. Map artworks to their historical state
    const historicalArtworks = existed.map(art => {
      const sale = filteredSales.find(s => s.artworkId === art.id);
      let historicalStatus = ArtworkStatus.AVAILABLE;
      let saleDetails = undefined;
      let isSold = false;

      if (sale) {
        isSold = true;
        historicalStatus = ArtworkStatus.SOLD;
        saleDetails = { price: (sale as any).amount || sale.artworkSnapshot?.price || 0, clientName: sale.clientName };
      } else if (art.status === ArtworkStatus.SOLD || art.status === ArtworkStatus.DELIVERED) {
        const saleAfter = rawData.sales.find(s => s.artworkId === art.id && new Date(s.saleDate).getTime() > targetTime);
        if (!saleAfter) {
          isSold = true;
          historicalStatus = ArtworkStatus.SOLD;
          saleDetails = { price: art.price, clientName: 'Imported/External' };
        }
      }

      if (!isSold) {
        const activeReturn = filteredReturnRecords.find(r => !r.resolvedAt && r.artworkId === art.id);
        if (activeReturn) {
          historicalStatus = ArtworkStatus.RETURNED;
        } else {
          const activeFramer = filteredFramerRecords.find(f => !f.resolvedAt && f.artworkId === art.id);
          if (activeFramer) {
            historicalStatus = ArtworkStatus.FOR_FRAMING;
          } else {
            const activeEvent = rawData.events.find(e => 
              e?.artworkIds?.includes(art.id) && 
              new Date(e.startDate).getTime() <= targetTime && 
              new Date(e.endDate).getTime() >= targetTime
            );
            if (activeEvent) {
              historicalStatus = ArtworkStatus.RESERVED;
            } else if (art.status === ArtworkStatus.RESERVED) {
              historicalStatus = ArtworkStatus.RESERVED;
            }
          }
        }
      }

      // Compute historical branch
      let historicalBranch = art.currentBranch;
      if (isSold && art.soldAtBranch) {
        historicalBranch = art.soldAtBranch;
      } else if (rawData.transfers && rawData.transfers.length > 0) {
        const artTransfers = rawData.transfers.filter(t => t.artworkId === art.id)
          .sort((a, b) => new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime());
        const lastValid = [...artTransfers].reverse().find(t => new Date(t.timestamp || '').getTime() <= targetTime);
        if (lastValid) {
          historicalBranch = lastValid.destination;
        } else if (artTransfers[0] && artTransfers[0].origin) {
          historicalBranch = artTransfers[0].origin;
        }
      }

      return {
        ...art,
        status: historicalStatus,
        currentBranch: historicalBranch,
        saleDetails,
      };
    });

    const userRole = currentUser?.role;
    const userBranch = currentUser?.branch;
    const finalArtworks = (userRole === 'Branch User' && userBranch)
      ? historicalArtworks.filter(a => (a.currentBranch || '').trim().toLowerCase() === userBranch.trim().toLowerCase())
      : historicalArtworks;

    return {
      ...rawData,
      artworks: finalArtworks,
      allArtworksIncludingDeleted: finalArtworks,
      sales: filteredSales,
      returnRecords: filteredReturnRecords,
      framerRecords: filteredFramerRecords,
      rawArtworks: rawData.artworks,
      rawAllArtworksIncludingDeleted: rawData.allArtworksIncludingDeleted,
      rawSales: rawData.sales,
      rawEvents: rawData.events,
      rawReturnRecords: rawData.returnRecords,
      rawFramerRecords: rawData.framerRecords,
      rawTransfers: rawData.transfers,
    };
  }, [rawData, timeTravelDate, currentUser]);

  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
