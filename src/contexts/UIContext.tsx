import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Artwork } from '../types';

interface HistoryState {
  tab: string;
  operationsView?: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales';
}

interface ImportStatus {
  isVisible: boolean;
  title?: string;
  message?: string;
  progress?: { current: number; total: number };
  skippedItems?: string[];
  summary?: {
    created: Artwork[];
    updated: Artwork[];
    failed: any[];
  };
}

interface UIContextType {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
  inventoryInitialStatus: string | undefined;
  setInventoryInitialStatus: React.Dispatch<React.SetStateAction<string | undefined>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  historyStack: HistoryState[];
  setHistoryStack: React.Dispatch<React.SetStateAction<HistoryState[]>>;
  selectedArtworkId: string | null;
  setSelectedArtworkId: React.Dispatch<React.SetStateAction<string | null>>;
  operationsView: 'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales';
  setOperationsView: React.Dispatch<React.SetStateAction<'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales'>>;
  importStatus: ImportStatus;
  setImportStatus: React.Dispatch<React.SetStateAction<ImportStatus>>;
  isMasterViewOpen: boolean;
  setIsMasterViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  targetSaleId: string | null;
  setTargetSaleId: React.Dispatch<React.SetStateAction<string | null>>;
  timeTravelDate: string | null;
  setTimeTravelDate: React.Dispatch<React.SetStateAction<string | null>>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [inventoryInitialStatus, setInventoryInitialStatus] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [historyStack, setHistoryStack] = useState<HistoryState[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [operationsView, setOperationsView] = useState<'inventory' | 'events' | 'branches' | 'returned' | 'framer' | 'auctions' | 'reservations' | 'monitoring' | 'sales'>('branches');
  const [importStatus, setImportStatus] = useState<ImportStatus>({ isVisible: false });
  const [isMasterViewOpen, setIsMasterViewOpen] = useState(false);
  const [targetSaleId, setTargetSaleId] = useState<string | null>(null);
  const [timeTravelDate, setTimeTravelDate] = useState<string | null>(null);

  return (
    <UIContext.Provider
      value={{
        activeTab, setActiveTab,
        showProfile, setShowProfile,
        inventoryInitialStatus, setInventoryInitialStatus,
        isMobileMenuOpen, setIsMobileMenuOpen,

        historyStack, setHistoryStack,
        selectedArtworkId, setSelectedArtworkId,
        operationsView, setOperationsView,
        importStatus, setImportStatus,
        isMasterViewOpen, setIsMasterViewOpen,
        targetSaleId, setTargetSaleId,
        timeTravelDate, setTimeTravelDate
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
